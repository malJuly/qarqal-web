// Shared styles for the agent portal's list pages (Assist orders, Insurance orders, My sales):
// filter bar, a table from 900px and cards below, the row "View" button and the details popup.
// Used as the first entry of a page component's `styles` array. Kept dense: these are work screens.
export const AGENT_LIST_STYLES = `
  :host { display: block; }
  .ls-bar { display: flex; flex-wrap: wrap; align-items: end; gap: 8px 10px; margin-bottom: 10px; }
  .ls-filter { flex: 0 1 180px; min-width: 140px; }
  .ls-count { align-self: center; margin-left: auto; font-size: 0.8125rem; color: var(--ink-3); white-space: nowrap; }
  .ls-csv { min-height: 40px; padding-inline: 14px; font-size: 0.875rem; background: #fff; color: var(--navy); border: 1px solid var(--line); }
  .ls-csv:disabled { opacity: 0.5; cursor: default; }
  @media (max-width: 560px) { .ls-filter { flex: 1 1 140px; } .ls-count { margin-left: 0; } .ls-csv { margin-left: auto; } }
  .mono { font-variant-numeric: tabular-nums; }
  .num { text-align: right; white-space: nowrap; }

  .ls-table-wrap { display: none; overflow-x: auto; background: #fff; border: 1px solid var(--line); border-radius: 10px; }
  .ls-cards { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
  @media (min-width: 900px) { .ls-table-wrap { display: block; } .ls-cards { display: none; } }
  .ls-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
  .ls-table th { background: var(--bg-soft); text-align: left; font-size: 0.6875rem; font-weight: 800; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
  .ls-table th, .ls-table td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  .ls-table tbody tr:last-child td { border-bottom: 0; }
  .ls-table tbody tr:not(.ls-state):hover { background: #f8faff; }
  .ls-table td small { display: block; color: var(--ink-3); font-size: 0.6875rem; }
  /* "Loading…" / "No records found." inside the table, so the header stays put. */
  .ls-state td, li.ls-state { padding: 18px 10px; text-align: center; color: var(--ink-3); }
  .ls-view { min-height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: #fff; color: var(--navy); font: 700 0.75rem var(--font); cursor: pointer; white-space: nowrap; }
  .ls-view:hover { border-color: var(--navy); }

  .ls-card { padding: 10px 12px; background: #fff; border: 1px solid var(--line); border-radius: 10px; display: grid; gap: 8px; }
  .ls-card-head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
  .ls-card-head small { display: block; color: var(--ink-3); font-size: 0.75rem; }
  .ls-card-body, .ls-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 0; font-size: 0.875rem; }
  .ls-detail { gap: 10px 16px; }
  .ls-card-body dt, .ls-detail dt { font-size: 0.6875rem; color: var(--ink-3); font-weight: 700; }
  .ls-card-body dd, .ls-detail dd { margin: 1px 0 0; color: var(--ink); overflow-wrap: anywhere; }
  .ls-card-btn { width: 100%; min-height: 38px; font-size: 0.875rem; }
`;
