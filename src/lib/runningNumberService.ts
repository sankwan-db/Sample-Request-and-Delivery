import { 
  RDDepartmentMaster, DocumentRunningNo, AuditLogEntry, 
  VoidedSampleNo, ReadyToDeliverGateResult, SampleRequest, RequestStatus 
} from '../types';

// Default RD Department Master (Part 6)
export const INITIAL_RD_DEPARTMENTS: RDDepartmentMaster[] = [
  {
    RD_Department_ID: 'RD-01',
    RD_Department_Code: 'RM',
    RD_Department_Name_TH: 'เนื้อสัตว์สดและแปรรูปเบื้องต้น',
    RD_Department_Name_EN: 'Raw Material',
    Sample_No_Prefix: 'RM',
    Default_Email: 'rd-rm@company.com',
    Supervisor_Name: 'สุรชัย ชัยชนะ',
    Supervisor_Email: 'surachai.c@company.com',
    Active: true,
    Sort_Order: 1,
    Created_Date: '2026-01-01',
    Created_By: 'System Admin',
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin'
  },
  {
    RD_Department_ID: 'RD-02',
    RD_Department_Code: 'RTC',
    RD_Department_Name_TH: 'อาหารพร้อมปรุง',
    RD_Department_Name_EN: 'Ready to Cook',
    Sample_No_Prefix: 'RTC',
    Default_Email: 'rd-rtc@company.com',
    Supervisor_Name: 'วราภรณ์ สดใส',
    Supervisor_Email: 'waraporn.s@company.com',
    Active: true,
    Sort_Order: 2,
    Created_Date: '2026-01-01',
    Created_By: 'System Admin',
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin'
  },
  {
    RD_Department_ID: 'RD-03',
    RD_Department_Code: 'FURTHER',
    RD_Department_Name_TH: 'ผลิตภัณฑ์แปรรูปขั้นสูง',
    RD_Department_Name_EN: 'Further Processing',
    Sample_No_Prefix: 'FUR',
    Default_Email: 'rd-fur@company.com',
    Supervisor_Name: 'กิตติศักดิ์ พรหมดี',
    Supervisor_Email: 'kittisak.p@company.com',
    Active: true,
    Sort_Order: 3,
    Created_Date: '2026-01-01',
    Created_By: 'System Admin',
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin'
  }
];

// Initial Running Number Sequences (Part 8, 9)
export const INITIAL_RUNNING_NUMBERS: DocumentRunningNo[] = [
  {
    Running_ID: 'RUN-RM-2026',
    Document_Type: 'SRI',
    RD_Department_Code: 'RM',
    RD_Department_Prefix: 'RM',
    Year: 2026,
    Starting_No: 563,
    Last_Used_No: 562,
    Next_No: 563,
    Digit_Length: 3,
    Initialized: true,
    Initialization_Source: 'Manual Migration',
    Initialization_Remark: 'Migrated from manual book. Last manual document: SRI-RM562-2026',
    Active: true,
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin',
    generatedCount: 1
  },
  {
    Running_ID: 'RUN-RTC-2026',
    Document_Type: 'SRI',
    RD_Department_Code: 'RTC',
    RD_Department_Prefix: 'RTC',
    Year: 2026,
    Starting_No: 119,
    Last_Used_No: 118,
    Next_No: 119,
    Digit_Length: 3,
    Initialized: true,
    Initialization_Source: 'Manual Migration',
    Initialization_Remark: 'Migrated from manual book. Last manual document: SRI-RTC118-2026',
    Active: true,
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin',
    generatedCount: 0
  },
  {
    Running_ID: 'RUN-FUR-2026',
    Document_Type: 'SRI',
    RD_Department_Code: 'FURTHER',
    RD_Department_Prefix: 'FUR',
    Year: 2026,
    Starting_No: 1,
    Last_Used_No: 0,
    Next_No: 1,
    Digit_Length: 3,
    Initialized: true,
    Initialization_Source: 'New Sequence',
    Initialization_Remark: 'New division sequence starting from 001',
    Active: true,
    Updated_Date: '2026-01-01',
    Updated_By: 'System Admin',
    generatedCount: 0
  }
];

export const INITIAL_VOIDED_NUMBERS: VoidedSampleNo[] = [
  {
    sampleNo: 'SRI-RM561-2026',
    voidedDate: '2026-09-01 10:15',
    voidedBy: 'System Migration',
    oldDepartment: 'RM',
    newDepartment: 'RM',
    newSampleNo: 'SRI-RM562-2026',
    reason: 'Manual paper draft voided prior to system launch'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-01-01 00:00',
    action: 'SEQUENCE_INITIALIZED',
    userEmail: 'admin@company.com',
    userName: 'System Admin',
    role: 'ADMIN',
    targetType: 'RUNNING_SEQUENCE',
    targetId: 'RUN-RM-2026',
    details: 'Initialized RM sequence with Starting No. 563 (Last manual: 562)'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-01-01 00:00',
    action: 'SEQUENCE_INITIALIZED',
    userEmail: 'admin@company.com',
    userName: 'System Admin',
    role: 'ADMIN',
    targetType: 'RUNNING_SEQUENCE',
    targetId: 'RUN-RTC-2026',
    details: 'Initialized RTC sequence with Starting No. 119 (Last manual: 118)'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-01-01 00:00',
    action: 'SEQUENCE_INITIALIZED',
    userEmail: 'admin@company.com',
    userName: 'System Admin',
    role: 'ADMIN',
    targetType: 'RUNNING_SEQUENCE',
    targetId: 'RUN-FUR-2026',
    details: 'Initialized FURTHER sequence with Starting No. 1'
  }
];

/**
 * Format Running String based on digit length.
 * If number exceeds standard digit length (e.g. 1000 with digit length 3),
 * it expands without truncation.
 */
export function formatRunningNumber(num: number, digitLength: number = 3): string {
  const str = String(num);
  return str.length >= digitLength ? str : str.padStart(digitLength, '0');
}

/**
 * Part 7 — Sample Number Format:
 * SRI-{PREFIX}{RUNNING_NO}-{YEAR}
 * Example: SRI-RM563-2026 REV.00
 */
export function buildSampleNumber(prefix: string, runningNo: number, year: number, digitLength: number = 3): string {
  const numStr = formatRunningNumber(runningNo, digitLength);
  return `SRI-${prefix.toUpperCase()}${numStr}-${year}`;
}

/**
 * Parses Sample Number e.g. "SRI-RM563-2026" or "SRI-RM563-2026 REV.00"
 */
export function parseSampleNo(fullString: string) {
  const clean = fullString.trim();
  // Regex match SRI-{PREFIX}{NUMBER}-{YEAR} with optional REV.{XX}
  const match = clean.match(/^SRI-([A-Z]+)(\d+)-(\d{4})(?:\s+REV\.(\d{2}))?$/i);
  if (!match) {
    return {
      isValid: false,
      prefix: '',
      runningNo: 0,
      year: new Date().getFullYear(),
      revision: 'REV.00',
      revNumber: 0
    };
  }
  return {
    isValid: true,
    prefix: match[1].toUpperCase(),
    runningNo: parseInt(match[2], 10),
    year: parseInt(match[3], 10),
    revision: match[4] ? `REV.${match[4]}` : 'REV.00',
    revNumber: match[4] ? parseInt(match[4], 10) : 0
  };
}

/**
 * Part 17 — Revision:
 * Starts at REV.00.
 * Increments to REV.01, REV.02, REV.03.
 * Running number does NOT change!
 */
export function incrementRevisionString(currentRevision: string = 'REV.00'): string {
  const match = currentRevision.match(/REV\.(\d+)/i);
  if (!match) return 'REV.01';
  const num = parseInt(match[1], 10) + 1;
  return `REV.${String(num).padStart(2, '0')}`;
}

/**
 * Gate Check Function:
 * checkReadyToDeliverGate(sampleNo)
 *
 * Conditions:
 * RD_Ready = TRUE AND SO_Completed = TRUE AND Vehicle_Confirmed = TRUE
 *
 * If all true:
 * Current_Status = READY_TO_DELIVER
 *
 * If not all true:
 * Shows blockers e.g.:
 * ✓ RD เตรียมตัวอย่างพร้อมแล้ว
 * ✓ Co Sale สร้าง SO แล้ว
 * ✕ Logistic ยังไม่ยืนยันรถ
 *
 * Strictly: ห้าม User override Gate ด้วย Manual Status Change
 */
export function checkReadyToDeliverGate(request: SampleRequest): ReadyToDeliverGateResult {
  const rdReady = request.rdStatus === 'COMPLETED';
  const soCompleted = request.coSaleStatus === 'COMPLETED';
  const vehicleConfirmed = request.logisticStatus === 'COMPLETED' && 
                           Boolean(request.logisticTask?.vehicleNo?.trim()) && 
                           Boolean(request.logisticTask?.driverName?.trim());

  const blockers: string[] = [];
  
  if (rdReady) {
    blockers.push('✓ RD เตรียมตัวอย่างพร้อมแล้ว');
  } else {
    blockers.push('✕ RD ยังเตรียมตัวอย่างไม่เสร็จ');
  }

  if (soCompleted) {
    blockers.push('✓ Co Sale สร้าง SO ในระบบ ERP แล้ว');
  } else {
    blockers.push('✕ Co Sale ยังไม่ได้เปิด SO ในระบบ ERP');
  }

  if (vehicleConfirmed) {
    blockers.push('✓ Logistic ยืนยันรถและคนขับแล้ว');
  } else {
    blockers.push('✕ Logistic ยังไม่ยืนยันรถและคนขับ');
  }

  const isReady = rdReady && soCompleted && vehicleConfirmed;

  return {
    isReady,
    blockers,
    criteria: {
      rdReady,
      soCompleted,
      vehicleConfirmed
    }
  };
}
