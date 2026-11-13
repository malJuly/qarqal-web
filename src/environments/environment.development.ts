// `ng serve` settings.
// apiBaseUrl is a relative path: the dev server forwards /api/* to https://staging.qarqal.com (proxy.conf.json),
// so the browser sees same-origin requests and staging's CORS list (PUBLIC_CORS_ORIGINS) doesn't need localhost.
// Set it to '' to use the built-in sample numbers instead (calculator.mock.ts).
export const environment = {
  production: false,
  site: 'https://www.qarqal.com',
  apiBaseUrl: '/api/v1/public',
  // Quote and purchase flow (hero "Compare quotes"). Calls /auth/* and /insurance/* as the "QarQal Web" partner,
  // so the backend knows the sale came from the website. root goes through the same dev proxy.
  // DEMO ONLY: these credentials are built into the page and visible to anyone. Move signing server-side
  // (AWS) before real credentials are used. Set root to '' to turn the flow off.
  quoteApi: {
    root: '/api/v1',
    partnerId: 'fee35475-cad7-4504-b926-488a28557ccb',
    apiKey: '12345678',
    apiSecret: '12345678',
  },
};
