import { Injectable, signal } from '@angular/core';
import SparkMD5 from 'spark-md5';
import { environment } from '../../environments/environment';

// Client for the QarQal app API (/auth/*, /insurance/*, /orders/*), used by the quote flow.
//
// Every request is signed as the "QarQal Web" partner so the backend records the sale as a website sale
// (backend: middleware/authMiddleware.ts + routes/helper.ts generatePartnerSignature):
//   x-signature = base64(md5(partnerId + apiKey + apiSecret + timestamp [+ quotationId]))
// quotationId is body.id ?? body.quotation_id, only when the body has one.
//
// When the visitor has verified their mobile number, the Bearer token is sent too, so purchase points can go
// to them once the backend accepts partner + user together (today a token makes the backend drop the partner).

export class ApiError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
    /** Backend error code when it sends one, e.g. "NOT_FOUND". */
    readonly code: string | null,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown>;

interface ApiEnvelope { status?: unknown; message?: unknown; code?: unknown; error_code?: unknown; data?: unknown }

const cfg = environment.quoteApi;
const TOKEN_KEY = 'qq.token';
const MOBILE_KEY = 'qq.mobile';

// sessionStorage can be missing (prerender) or blocked (privacy settings): fall back to memory only.
const readSession = (key: string): string | null => {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key); } catch { return null; }
};
const writeSession = (key: string, value: string | null): void => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value);
  } catch { /* ignore */ }
};

/** md5 → base64, the same as Node's createHash('md5').update(text).digest('base64'). */
const md5Base64 = (text: string): string => btoa(SparkMD5.hash(text, true));

@Injectable({ providedIn: 'root' })
export class QarqalApi {
  /** False when environment.quoteApi.root is empty: the form then shows the "continue in the app" panel. */
  readonly enabled = !!cfg.root;

  /** Access token from verify-otp, and the verified mobile (digits, no +60). Kept in sessionStorage for this tab. */
  readonly token = signal<string | null>(readSession(TOKEN_KEY));
  readonly mobile = signal<string | null>(readSession(MOBILE_KEY));

  setSession(token: string | null, mobile: string | null): void {
    this.token.set(token);
    this.mobile.set(mobile);
    writeSession(TOKEN_KEY, token);
    writeSession(MOBILE_KEY, mobile);
  }

  private readonly root = cfg.root.replace(/\/$/, '');

  post<T>(path: string, body: Body): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: Body): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private headers(body: Body | undefined): Record<string, string> {
    const timestamp = String(Date.now());
    const quotationId = body?.['id'] ?? body?.['quotation_id'];
    const signed = cfg.partnerId + cfg.apiKey + cfg.apiSecret + timestamp + (quotationId ? String(quotationId) : '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-partner-id': cfg.partnerId,
      'x-api-key': cfg.apiKey,
      'x-timestamp': timestamp,
      'x-signature': md5Base64(signed),
    };
    const token = this.token();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: Body): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.root}/${path}`, {
        method,
        headers: this.headers(body),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'Network error', 'NETWORK');
    }

    const json = (await res.json().catch(() => null)) as ApiEnvelope | null;
    const message = typeof json?.message === 'string' ? json.message : res.statusText;
    const rawCode = json?.error_code ?? json?.code;
    const code = typeof rawCode === 'string' ? rawCode : null;
    // Backend success: 2xx and status !== false. Auth routes return fields at the top level (access_token);
    // /static/* lists return a bare array.
    if (!res.ok || json === null || (!Array.isArray(json) && json.status === false)) throw new ApiError(res.status, message, code);
    return json as T;
  }
}
