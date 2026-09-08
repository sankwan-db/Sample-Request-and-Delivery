export type RequirementStage = 'New' | 'Quota Checked' | 'Quoting' | 'Closed Won' | 'Closed Lost';
export type MatchStatus = 'Available' | 'Near Limit' | 'Over Quota';

export const allocationMock = {
  customers: [
    { customerId: 'CUS-00482', companyName: 'Sakura Foods Co., Ltd.', country: 'Japan', channel: 'Export', salesRep: 'พิมพ์ชนก' },
    { customerId: 'CUS-00217', companyName: 'Golden Plate Trading', country: 'Singapore', channel: 'Food Service', salesRep: 'กิตติยา' },
    { customerId: 'CUS-00109', companyName: 'บริษัท ครัวกลางไทย จำกัด', country: 'Thailand', channel: 'Domestic', salesRep: 'วราพร' }
  ],
  products: [
    { productId: 'P001', productName: 'SBB • Skinless Boneless Breast', partGroup: 'Breast', uom: 'MT' },
    { productId: 'P002', productName: 'Whole Wing', partGroup: 'Wing', uom: 'MT' },
    { productId: 'P003', productName: 'Drumstick', partGroup: 'Leg', uom: 'MT' },
    { productId: 'P004', productName: 'Chicken Paws A Grade', partGroup: 'Paws', uom: 'MT' },
    { productId: 'P005', productName: 'MDM', partGroup: 'Further', uom: 'MT' }
  ],
  quota: [
    { quotaId: 'Q001', period: '2026-09', channel: 'Export', productId: 'P001', quotaMT: 820, usedMT: 704, reservedMT: 52 },
    { quotaId: 'Q002', period: '2026-09', channel: 'Food Service', productId: 'P002', quotaMT: 460, usedMT: 352, reservedMT: 44 },
    { quotaId: 'Q003', period: '2026-09', channel: 'Domestic', productId: 'P003', quotaMT: 520, usedMT: 508, reservedMT: 28 },
    { quotaId: 'Q004', period: '2026-09', channel: 'Export', productId: 'P004', quotaMT: 380, usedMT: 291, reservedMT: 18 },
    { quotaId: 'Q005', period: '2026-09', channel: 'Pet Food', productId: 'P005', quotaMT: 275, usedMT: 193, reservedMT: 22 }
  ],
  requirements: [
    { requirementId: 'REQ-2609-0187', linkId: 'REQ-9K7X2P', customerId: 'CUS-00482', totalMT: 128, stage: 'Quoting' as RequirementStage, matchStatus: 'Available' as MatchStatus },
    { requirementId: 'REQ-2609-0186', linkId: 'REQ-4H2D8M', customerId: 'CUS-00217', totalMT: 86.5, stage: 'Quota Checked' as RequirementStage, matchStatus: 'Available' as MatchStatus },
    { requirementId: 'REQ-2609-0185', linkId: 'REQ-7P3K1A', customerId: 'CUS-00109', totalMT: 54, stage: 'New' as RequirementStage, matchStatus: 'Over Quota' as MatchStatus }
  ]
} as const;

export const calculateAvailable = (quotaMT: number, usedMT: number, reservedMT: number) => quotaMT - usedMT - reservedMT;
export const calculateCoverage = (requirementMT: number, quotaMT: number) => quotaMT === 0 ? 0 : (requirementMT / quotaMT) * 100;
