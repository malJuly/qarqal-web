import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ApiError } from '../core/qarqal-api';

// HTTP client for the agent portal. Sends only the agent's Bearer token, never the "QarQal Web" partner
// signature: the backend treats a signed request as the partner itself and would ignore the agent's token
// (backend middleware/authMiddleware.ts checks the partner headers first).
//
// Errors are thrown as ApiError (core/qarqal-api.ts), with the backend's error_code when it sends one.

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT';

interface ErrorBody { status?: unknown; message?: unknown; error_code?: unknown; code?: unknown }

const root = environment.agentApi.root.replace(/\/$/, '');

@Injectable({ providedIn: 'root' })
export class AgentApi {
  /** False when environment.agentApi.root is empty: the login page says the portal is unavailable. */
  readonly enabled = !!root;

  async request<T>(method: Method, path: string, opts: { body?: unknown; token?: string | null } = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

    let res: Response;
    try {
      res = await fetch(`${root}/${path.replace(/^\//, '')}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
    } catch {
      throw new ApiError(0, 'Network error', 'NETWORK');
    }

    const json = (await res.json().catch(() => null)) as unknown;
    const body = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as ErrorBody;
    if (!res.ok || json === null || body.status === false) throw toApiError(res, body);
    return json as T;
  }

  /**
   * POST whose answer is NDJSON (one JSON object per line, sent as each is ready), e.g. bulk quote.
   * onLine gets each object as it arrives. A refused request (400/401/403…) answers with a normal JSON
   * error and throws ApiError like request(). Aborting via `signal` throws ApiError with code 'ABORTED'.
   */
  async stream(path: string, body: unknown, token: string, onLine: (line: unknown) => void, signal?: AbortSignal): Promise<void> {
    const aborted = (): ApiError => new ApiError(0, 'Aborted', 'ABORTED');
    let res: Response;
    try {
      res = await fetch(`${root}/${path.replace(/^\//, '')}`, {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson, application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal,
      });
    } catch {
      throw signal?.aborted ? aborted() : new ApiError(0, 'Network error', 'NETWORK');
    }
    if (!res.ok || !res.body) {
      const json = (await res.json().catch(() => null)) as unknown;
      throw toApiError(res, (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as ErrorBody);
    }

    const emit = (text: string): void => {
      const line = text.trim();
      if (!line) return;
      try { onLine(JSON.parse(line)); } catch { /* a half-written line: the caller treats its vehicle as unanswered */ }
    };
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          emit(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
        }
      }
    } catch {
      // Connection dropped mid-stream (or aborted): vehicles not answered yet are the caller's to retry.
      throw signal?.aborted ? aborted() : new ApiError(0, 'Network error', 'NETWORK');
    }
    emit(buffer);
  }
}

const toApiError = (res: Response, body: ErrorBody): ApiError => {
  const rawCode = body.error_code ?? body.code;
  return new ApiError(
    res.status,
    typeof body.message === 'string' ? body.message : res.statusText,
    typeof rawCode === 'string' ? rawCode : null,
  );
};
