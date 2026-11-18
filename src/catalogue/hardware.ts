// Research candidates only. No executable fitting rules or implied assembly validation.
export interface HardwareCandidate {
  id: string; revision: string; manufacturer: string; articles: string[];
  status: 'candidate'; enabled: false; source: string; region: string;
  verificationDate: null; outstanding: string[];
}
export const hardwareShortlist: HardwareCandidate[] = [
  { id: 'clip-110-overlay-reference', revision: 'research-1', manufacturer: 'Blum', articles: ['71B3550', '173H7100'], status: 'candidate', enabled: false,
    source: 'https://d2.blum.com/services/BEC003/mem008b-p_fl_dok_bsg_%24sen-sg_%24aof_%24v1.pdf', region: 'Singapore leaflet — EU variant to confirm', verificationDate: null,
    outstanding: ['Official drawing revision and pages', 'Matched regional assembly and screws', 'Thickness, overlay and drilling fixtures', 'Quantity policy and physical trial'] },
  { id: 'cabineo-8-white', revision: 'research-1', manufacturer: 'Lamello', articles: ['186310'], status: 'candidate', enabled: false,
    source: 'https://lamello.com/products/drilling-system/cabineo-8', region: 'International — regional purchase to confirm', verificationDate: null,
    outstanding: ['Pin official drawing revision and pages', 'Companions, driver and fasteners', 'Machining and material fixtures', 'Construction layout and physical trial'] },
  { id: 'antaro-m-500-reference', revision: 'research-1', manufacturer: 'Blum', articles: ['578.5001M', '378M5002SA', 'Z30M000S.04', 'ZSF.35A2'], status: 'candidate', enabled: false,
    source: 'https://d2.blum.com/services/BEC003/me57421162_ep_dok_bau_%24sen-ca_%24aof_%24v1.pdf', region: 'Reference booklet en-CA — EU variant to confirm', verificationDate: null,
    outstanding: ['Independently verify all matched articles and handed variants', 'Official revision, pages 44–45 and 66', 'Companions and fasteners', 'Board deductions and application fixtures', 'Physical trial and regional availability'] }
];
