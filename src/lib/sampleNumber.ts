export interface RDDepartment {
  code: string;
  nameEn: string;
  nameTh: string;
}

export const RD_DEPARTMENTS: RDDepartment[] = [
  { code: 'RM', nameEn: 'Raw Meat', nameTh: 'เนื้อสัตว์สดและแช่แข็ง' },
  { code: 'RTC', nameEn: 'Ready to Cook', nameTh: 'อาหารพร้อมปรุง' },
  { code: 'RTE', nameEn: 'Ready to Eat', nameTh: 'อาหารพร้อมทาน' },
  { code: 'BEV', nameEn: 'Beverage', nameTh: 'เครื่องดื่ม' },
  { code: 'BAK', nameEn: 'Bakery', nameTh: 'เบเกอรี่' },
  { code: 'SEA', nameEn: 'Seasoning & Sauce', nameTh: 'ซอสและเครื่องปรุงรส' },
  { code: 'DRY', nameEn: 'Dry Goods', nameTh: 'อาหารแห้งและวัตถุดิบแปรรูป' }
];

/**
 * Format: SR-[DEPART][XXX]-[YYYY] REV.[XX]
 * Example: SR-RM001-2026 REV.00
 */
export function generateSampleNo(
  deptCode: string = 'RM',
  runningNo: number = 1,
  year: number = new Date().getFullYear(),
  revNumber: number = 0
): string {
  const padRunning = String(runningNo).padStart(3, '0');
  const padRev = String(revNumber).padStart(2, '0');
  return `SR-${deptCode.toUpperCase()}${padRunning}-${year} REV.${padRev}`;
}

export function parseSampleNo(sampleNo: string) {
  // Regex: SR-([A-Z]+)([0-9]{3})-([0-9]{4})\s+REV\.([0-9]{2})
  const regex = /^SR-([A-Z]+)(\d{3})-(\d{4})\s+REV\.(\d{2})$/i;
  const match = sampleNo.trim().match(regex);
  if (!match) {
    return {
      isValid: false,
      deptCode: 'RM',
      runningNo: 1,
      year: new Date().getFullYear(),
      revNumber: 0
    };
  }
  return {
    isValid: true,
    deptCode: match[1].toUpperCase(),
    runningNo: parseInt(match[2], 10),
    year: parseInt(match[3], 10),
    revNumber: parseInt(match[4], 10)
  };
}

export function incrementRevision(currentSampleNo: string): string {
  const parsed = parseSampleNo(currentSampleNo);
  if (!parsed.isValid) {
    return `${currentSampleNo} REV.01`;
  }
  const nextRev = parsed.revNumber + 1;
  return generateSampleNo(parsed.deptCode, parsed.runningNo, parsed.year, nextRev);
}
