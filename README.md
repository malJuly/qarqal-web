# QarQal landing page (Angular)

Marketing page for the QarQal app, ported from the Astro version (`../qarqal_landing_page`).
Angular 20.3 (stable), standalone components, signals, zoneless. Every route is prerendered to static HTML
at build time (`outputMode: "static"`), so the output is plain files for Netlify, like the Astro site.

| Route | Language | Text file |
| --- | --- | --- |
| `/` | English (base) | `src/app/i18n/en.json` |
| `/ms/` | Bahasa Melayu | `src/app/i18n/ms.json` |
| `/zh/` | Chinese (Simplified) | `src/app/i18n/zh.json` |
| `/ta/` | Tamil | `src/app/i18n/ta.json` |

Each language also has `privacy-policy/` and `terms-and-conditions/`.

## Run it

```bash
npm install
npm start          # http://localhost:4200 (calculators run on sample numbers)
npm run build      # static site in dist/qarqal_landing_page_angular/browser/
npm run preview    # serve the built site locally
npm run check:i18n # list keys missing from ms / zh / ta
```

Requires Node 20.19+ or 22.12+.

## Where things live

- **All page text:** `src/app/i18n/*.json`. English is the source; a key missing in another language falls back to English.
- **Store links, contact email, company number, video:** `src/app/config/site.json`. Videos: list them under `video.clips`
  (`{ "src": "/assets/videos/01-x.mp4", "title": "…", "poster": "…" }`) and put the files in `public/assets/videos/`.
- **Calculator API:** `apiBaseUrl` in `src/environments/environment.ts` (production) and `environment.development.ts` (`npm start`).
  Empty in production hides the calculator section and its menu link.
- **Pages and routes:** `src/app/app.routes.ts`, `src/app/pages/`.
- **Sections:** `src/app/components/` (one file per section, assembled in `pages/landing.page.ts`).
- **App screens:** `src/app/components/phone/`, rebuilt from the Flutter widgets with sample data (English only, like the app).
- **Head tags (title, canonical, hreflang, Open Graph, JSON-LD):** `src/app/core/seo.service.ts`.
- **Design tokens:** `src/styles.css`. Notes on the visual system: `DESIGN.md`.
- **Images:** `public/assets/` (copied from the Flutter repo `assets/`).

## Adding a language

1. Copy `src/app/i18n/en.json` to `src/app/i18n/<code>.json` and translate it.
2. Import it in `src/app/i18n/index.ts` and add the code to `Lang` and `LANGS`.
3. Add it to `languages` in `src/app/config/site.json`.
4. If the script needs its own font, add a `src/fonts/<code>.css` bundle in `angular.json` and load it in `SeoService`.
5. Run `npm run check:i18n`.
