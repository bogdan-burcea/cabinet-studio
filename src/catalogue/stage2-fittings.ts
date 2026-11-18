// Exact user-provided research references. These are not executable fitting packs.
// Geometry remains on its separately pinned application concept records.
export interface FittingReference {
  id: string; revision: 'reference-1'; role: string; manufacturer: string; article: string;
  supplierUrl: string; supplierCode: string; sourceChecked: '2026-11-18';
  status: 'reference-only'; modelEnabled: false; physicalTrial: 'not-recorded';
  primarySource: string | null; primarySourceStatus: 'page-reviewed' | 'search-evidence-only' | 'not-verified';
  limits: string; outstanding: string;
}
const common = { revision: 'reference-1', sourceChecked: '2026-11-18', status: 'reference-only', modelEnabled: false, physicalTrial: 'not-recorded' } as const;
export const stage2FittingReferences: FittingReference[] = [
  { ...common, id: 'axilo-clip-63738054', role: 'Plinth clip', manufacturer: 'Häfele', article: '637.38.054', supplierCode: '58909',
    supplierUrl: 'https://www.feroshop.ro/picioare/element-fixare-plinta-pal-mdf-la-picior-axilo-78-48',
    primarySource: 'https://www.hafele.com.br/INTERSHOP/static/WFS/Haefele-HBR-Site/-/Haefele-HBR/pt_BR/opentext/assets/HBR/Compact_2024.pdf', primarySourceStatus: 'search-evidence-only',
    limits: 'Screw-on plinth clip reference; no clip offset is applied to the model.', outstanding: 'Pin the regional assembly drawing, clip engagement and compatible stock/fixings; verify clearance with the chosen base/foot and trial fit.' },
  { ...common, id: 'axilo-foot-63776353', role: 'Foot', manufacturer: 'Häfele', article: '637.76.353', supplierCode: '58902',
    supplierUrl: 'https://www.feroshop.ro/picioare/picior-axilo-78-plastic-negru-100mm-max-250kg-bucata',
    primarySource: 'https://www.hafele.com.br/INTERSHOP/static/WFS/Haefele-HBR-Site/-/Haefele-HBR/pt_BR/opentext/assets/HBR/Compact_2024.pdf', primarySourceStatus: 'search-evidence-only',
    limits: 'Supplier declares nominal 100 mm and adjustment 90–120 mm; base required. Existing concept feet retain their separate 70–200 mm policy.', outstanding: 'Confirm installed-height reference faces, full footprint/base geometry, regional drawing and fixing rules. Supplier/manufacturer regional load claims differ; no capacity is adopted.' },
  { ...common, id: 'axilo-base-63776333', role: 'Foot base', manufacturer: 'Häfele', article: '637.76.333', supplierCode: '58907',
    supplierUrl: 'https://www.feroshop.ro/picioare/soclu-picior-plastic-axilo-78-montaj-suruburi',
    primarySource: 'https://www.hafele.com.br/INTERSHOP/static/WFS/Haefele-HBR-Site/-/Haefele-HBR/pt_BR/opentext/assets/HBR/Compact_2024.pdf', primarySourceStatus: 'search-evidence-only',
    limits: 'Screw-mounted AXILO 78 base reference.', outstanding: 'Regional footprint, screw pattern, fasteners, side-panel bearing/tab placement and trial fit with 637.76.353.' },
  { ...common, id: 'blum-hanger-48n051002', role: 'Right wall hanger', manufacturer: 'Blum', article: '48N0510.02S.AUF R250 W', supplierCode: '48122',
    supplierUrl: 'https://www.feroshop.ro/rafturi-si-polite/dispozitiv-suspendare-dreapta-cu-fixare-cu-surub-alb-48n0510-02s-auf-r250-w',
    primarySource: null, primarySourceStatus: 'not-verified',
    limits: 'Right screw-on hanger only. It is not a complete hanger/rail or wall-anchor assembly.', outstanding: 'Verify the matching left hanger, exact wall-hook/rail, anti-lift requirements, cabinet fixing/back preparation, fasteners and wall substrate. Candidate left reference: 48N0510.03S.AUF R250 W; not activated.' },
  { ...common, id: 'gtv-mr-tdl011-01', role: 'Adjustable shelf support', manufacturer: 'GTV', article: 'MR-TDL011-01', supplierCode: '12640',
    supplierUrl: 'https://www.feroshop.ro/rafturi-si-polite/suport-polita-5x16-za-duplo',
    primarySource: 'https://gtv.com.pl/en/produkt/MR-TDL011-01/', primarySourceStatus: 'page-reviewed',
    limits: 'DUPLO / L0011 press-fit steel support for wood/board; supplier names 5 × 16 mm. No manufacturer bore or load pattern is enabled.', outstanding: 'Pin and inspect the dimensioned product card, bore engagement/tolerances, shelf deduction and application/load fixtures; physical trial. Current 32 mm levels/pads remain application concepts.' },
  { ...common, id: 'blum-housing-404001', role: 'Fixed shelf connector housing', manufacturer: 'Blum', article: '40.4001 GEH V2500 W', supplierCode: '2470',
    supplierUrl: 'https://www.feroshop.ro/demontabili/carcasa-demontabil-polita-alb-40-4001',
    primarySource: null, primarySourceStatus: 'not-verified',
    limits: 'Press-in housing only; no complete connector or structural rating is selected.', outstanding: 'Verify mating stud/screw, housing machining and stock limits from a matched official drawing, then trial fit. Supplier lists 653.1450 VB-SR VI ZN and cover 41.5400 ABDECKK W as related references; compatibility remains unverified.' }
];
