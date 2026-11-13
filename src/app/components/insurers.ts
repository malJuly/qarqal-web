// The insurers quoting in the app (list confirmed 2026-10-20). Logos from each insurer's own website
// (generali.com.my, zurich.com.my, berjayasompo.com.my, tuneprotect.com, pacificinsurance.com.my) or the Flutter app.
// pacific_insurance.png: their navy-background logo recoloured for white (navy made transparent, the white Fairfax line set in navy).
export interface Insurer { name: string; logo: string; wide?: boolean }

const L = '/assets/logos/';
export const INSURERS: Insurer[] = [
  { name: 'Generali', logo: `${L}generali.png`, wide: true },
  { name: 'Allianz', logo: `${L}allianz_logo.svg` },
  { name: 'Zurich', logo: `${L}zurich_general.svg` },
  { name: 'Zurich Takaful', logo: `${L}zurich_logo.svg` },
  { name: 'Takaful Malaysia', logo: `${L}takaful_malaysia_logo.svg` },
  { name: 'Takaful Ikhlas', logo: `${L}takaful_ikhlas_logo.svg` },
  { name: 'Berjaya Sompo Insurance', logo: `${L}berjaya_sompo.png`, wide: true },
  { name: 'Chubb', logo: `${L}chubb.svg` },
  { name: 'MSIG', logo: `${L}msig.svg` },
  { name: 'Tune Protect', logo: `${L}tune_protect.png` },
  { name: 'Pacific Insurance', logo: `${L}pacific_insurance.png` },
];
