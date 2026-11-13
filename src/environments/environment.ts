// Production settings. Values here are built into the page, so never put secrets here.
export const environment = {
  production: true,
  site: 'https://www.qarqal.com',
  // Root of the public (no-login) API used by the calculators, e.g. https://api.example.com/api/v1/public.
  // Leave empty to hide the calculators on the live build.
  apiBaseUrl: '',
  // Quote and purchase flow, as the "QarQal Web" partner. Pointed at staging for the demo build.
  // DEMO ONLY: the secret below is public once built. Replace with server-side signing (AWS) before go-live.
  // Set root to '' to fall back to the "continue in the app" panel.
  quoteApi: {
    root: 'https://staging.qarqal.com/api/v1',
    partnerId: 'fee35475-cad7-4504-b926-488a28557ccb',
    apiKey: '12345678',
    apiSecret: '12345678',
  },
};
