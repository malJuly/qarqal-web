// `ng serve` settings.
// Pointed at the LOCAL backend (qarqal-backend on http://localhost:3000) for testing before deploy.
// To go back to staging through the dev proxy (proxy.conf.json), use the relative paths in the comments.
//
// CORS: /api/v1/public (calculators) only answers origins listed in the backend's PUBLIC_CORS_ORIGINS, so add
// http://localhost:4200 there for the calculators to load. The other roots use the backend's open CORS.
export const LOCAL_API = 'http://localhost:3000/api/v1';

export const environment = {
  production: false,
  site: 'https://www.qarqal.com',
  // Staging via proxy: '/api/v1/public'. Set to '' to use the built-in sample numbers instead (calculator.mock.ts).
  apiBaseUrl: `${LOCAL_API}/public`,
  // Quote and purchase flow (hero "Compare quotes"). Calls /auth/* and /insurance/* as the "QarQal Web" partner,
  // so the backend knows the sale came from the website. Staging via proxy: '/api/v1'.
  // DEMO ONLY: these credentials are built into the page and visible to anyone. Move signing server-side
  // (AWS) before real credentials are used. Set root to '' to turn the flow off.
  quoteApi: {
    root: LOCAL_API,
    partnerId: 'fee35475-cad7-4504-b926-488a28557ccb',
    apiKey: '12345678',
    apiSecret: '12345678',
  },
  // Agent portal (/agent). Staging via proxy: '/api/v1'. See environment.ts.
  agentApi: {
    root: LOCAL_API,
  },
};
