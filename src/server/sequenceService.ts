import { 
  RDDepartmentMaster, DocumentRunningNo, AuditLogEntry, 
  VoidedSampleNo 
} from '../types.js';

// In-memory persistent state on server
let rdDepartments: RDDepartmentMaster[] = [
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
    RD_Department_Code: 'FUR',
    RD_Department_Name_TH: 'ผลิตภัณฑ์แปรรูปขั้นสูง (Further Processing)',
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

let runningNumbers: DocumentRunningNo[] = [
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
    RD_Department_Code: 'FUR',
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

let voidedNumbers: VoidedSampleNo[] = [];

let auditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-01-01 08:00',
    action: 'SEQUENCE_INITIALIZED',
    userEmail: 'admin@company.com',
    userName: 'System Admin',
    role: 'ADMIN',
    targetType: 'RUNNING_SEQUENCE',
    targetId: 'RUN-RM-2026',
    details: 'Initial setup: Last used = 562, Next = 563'
  }
];

// Simple server-side async mutex for concurrency protection (Part 14)
class SimpleMutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async lock(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  unlock(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

const sequenceMutex = new SimpleMutex();

export function getRDDepartments(): RDDepartmentMaster[] {
  return rdDepartments;
}

export function saveRDDepartment(dept: Partial<RDDepartmentMaster>, userEmail: string = 'admin@company.com'): RDDepartmentMaster {
  const existingIdx = rdDepartments.findIndex(d => d.RD_Department_Code.toUpperCase() === (dept.RD_Department_Code || '').toUpperCase());
  const now = new Date().toISOString().split('T')[0];
  
  if (existingIdx >= 0) {
    const updated = {
      ...rdDepartments[existingIdx],
      ...dept,
      Updated_Date: now,
      Updated_By: userEmail
    };
    rdDepartments[existingIdx] = updated;

    // Also update prefix in corresponding running number record if prefix changed
    const runIdx = runningNumbers.findIndex(r => r.RD_Department_Code.toUpperCase() === updated.RD_Department_Code.toUpperCase());
    if (runIdx >= 0 && dept.Sample_No_Prefix) {
      runningNumbers[runIdx].RD_Department_Prefix = dept.Sample_No_Prefix.toUpperCase();
      runningNumbers[runIdx].Updated_Date = now;
      runningNumbers[runIdx].Updated_By = userEmail;
    }

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'UPDATE_RD_DEPARTMENT',
      userEmail,
      userName: userEmail.split('@')[0],
      role: 'ADMIN',
      targetType: 'RD_DEPARTMENT',
      targetId: updated.RD_Department_Code,
      details: `Updated RD Department ${updated.RD_Department_Code}: Name TH=${updated.RD_Department_Name_TH}, Prefix=${updated.Sample_No_Prefix}`
    });

    return updated;
  } else {
    const newDept: RDDepartmentMaster = {
      RD_Department_ID: `RD-${String(rdDepartments.length + 1).padStart(2, '0')}`,
      RD_Department_Code: (dept.RD_Department_Code || '').toUpperCase(),
      RD_Department_Name_TH: dept.RD_Department_Name_TH || '',
      RD_Department_Name_EN: dept.RD_Department_Name_EN || '',
      Sample_No_Prefix: (dept.Sample_No_Prefix || dept.RD_Department_Code || '').toUpperCase(),
      Default_Email: dept.Default_Email || '',
      Supervisor_Name: dept.Supervisor_Name || '',
      Supervisor_Email: dept.Supervisor_Email || '',
      Active: dept.Active !== undefined ? dept.Active : true,
      Sort_Order: dept.Sort_Order || rdDepartments.length + 1,
      Created_Date: now,
      Created_By: userEmail,
      Updated_Date: now,
      Updated_By: userEmail
    };
    rdDepartments.push(newDept);

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'CREATE_RD_DEPARTMENT',
      userEmail,
      userName: userEmail.split('@')[0],
      role: 'ADMIN',
      targetType: 'RD_DEPARTMENT',
      targetId: newDept.RD_Department_Code,
      details: `Created RD Department ${newDept.RD_Department_Code}: Prefix=${newDept.Sample_No_Prefix}`
    });

    return newDept;
  }
}

export function getRunningNumbers(): DocumentRunningNo[] {
  return runningNumbers;
}

export function getAuditLogs(): AuditLogEntry[] {
  return auditLogs;
}

export function addAuditLog(entry: any): any {
  const newEntry: any = {
    Audit_ID: `AUD-${Date.now()}`,
    id: `AUD-${Date.now()}`,
    Timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    User: entry.User || entry.user || entry.userName || 'System',
    User_Email: entry.User_Email || entry.userEmail || 'system@company.com',
    Role: entry.Role || entry.role || 'USER',
    Module: entry.Module || entry.targetType || 'GENERAL',
    Sample_No: entry.Sample_No || entry.targetId || '',
    Action: entry.Action || entry.action || 'LOG',
    Field_Name: entry.Field_Name || '',
    Old_Value: entry.Old_Value || '',
    New_Value: entry.New_Value || '',
    Reason: entry.Reason || entry.reason || entry.details || '',
    details: entry.details || entry.reason || '',
    targetType: entry.targetType || entry.Module || 'GENERAL',
    targetId: entry.targetId || entry.Sample_No || ''
  };
  auditLogs.unshift(newEntry);
  return newEntry;
}

export function getVoidedNumbers(): VoidedSampleNo[] {
  return voidedNumbers;
}

/**
 * Server-side Number Generation Function (Part 13 & 14)
 * generateSampleNumber(rdDepartmentCode, year)
 */
export async function generateSampleNumber(
  rdDepartmentCode: string,
  year: number = 2026,
  userEmail: string = 'sale@company.com',
  userName: string = 'Sale Representative'
): Promise<{ sampleNo: string; revision: string; record: DocumentRunningNo }> {
  await sequenceMutex.lock();
  try {
    const normalizedDept = rdDepartmentCode.trim().toUpperCase();

    // 1. Validate RD Department
    const dept = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === normalizedDept && d.Active);
    if (!dept) {
      throw new Error(`ไม่พบแผนก RD: ${rdDepartmentCode} หรือแผนกถูกปิดการใช้งาน`);
    }

    // 2. Read Sample_No_Prefix
    const prefix = dept.Sample_No_Prefix.toUpperCase();

    // 3. Read Running Number Record
    let recordIndex = runningNumbers.findIndex(
      r => r.RD_Department_Code.toUpperCase() === normalizedDept && r.Year === year && r.Active
    );

    // 4. Validate Initialized = TRUE (Part 11)
    if (recordIndex === -1 || !runningNumbers[recordIndex].Initialized) {
      throw new Error(`ยังไม่ได้ตั้งค่าเลขเริ่มต้นของเอกสารสำหรับ ${normalizedDept} ปี ${year} กรุณาติดต่อ Administrator`);
    }

    const record = runningNumbers[recordIndex];

    // 5. Reserve Next Number
    const allocatedNo = record.Next_No;

    // 6. Generate Running String (e.g. 563 with digit length 3)
    const numStr = String(allocatedNo).length >= record.Digit_Length 
      ? String(allocatedNo) 
      : String(allocatedNo).padStart(record.Digit_Length, '0');

    // 7. Generate Sample No
    const sampleNo = `SRI-${prefix}${numStr}-${year}`;

    // 8. Update Last Used & Calculate Next
    record.Last_Used_No = allocatedNo;
    record.Next_No = allocatedNo + 1;
    record.generatedCount = (record.generatedCount || 0) + 1;
    record.Updated_Date = new Date().toISOString().split('T')[0];
    record.Updated_By = userEmail;

    // 10. Write Audit Log
    auditLogs.unshift({
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'GENERATE_SAMPLE_NO',
      userEmail,
      userName,
      role: 'SALE',
      targetType: 'SAMPLE_NO',
      targetId: sampleNo,
      details: `Generated Sample Number ${sampleNo} REV.00 (Allocated: ${allocatedNo}, Next: ${record.Next_No})`,
      metadata: { allocatedNo, nextNo: record.Next_No, department: normalizedDept, prefix, year }
    });

    // 11. Return Sample No and REV.00
    return {
      sampleNo,
      revision: 'REV.00',
      record: { ...record }
    };
  } finally {
    sequenceMutex.unlock();
  }
}

/**
 * Configure / Setup Starting Running Number (Part 8, 9, 10, 12)
 */
export async function setupRunningNumber(payload: {
  documentType?: string;
  rdDepartmentCode: string;
  prefix?: string;
  year: number;
  option: 'LAST_USED' | 'STARTING_NO';
  numberValue: number;
  digitLength?: number;
  initializationSource?: string;
  remark?: string;
  userEmail: string;
  userName: string;
  role: string;
}): Promise<DocumentRunningNo> {
  await sequenceMutex.lock();
  try {
    const {
      rdDepartmentCode,
      year,
      option,
      numberValue,
      digitLength = 3,
      initializationSource = 'Admin Config',
      remark = '',
      userEmail,
      userName,
      role
    } = payload;

    const normalizedDept = rdDepartmentCode.trim().toUpperCase();
    const dept = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === normalizedDept);
    if (!dept) {
      throw new Error(`ไม่พบแผนก RD: ${rdDepartmentCode}`);
    }

    const prefix = (payload.prefix || dept.Sample_No_Prefix).toUpperCase();
    const docType = payload.documentType || 'SRI';

    let lastUsed = 0;
    let nextNo = 1;
    let startingNo = 1;

    if (option === 'LAST_USED') {
      lastUsed = numberValue;
      nextNo = lastUsed + 1;
      startingNo = nextNo;
    } else {
      startingNo = numberValue;
      lastUsed = Math.max(0, startingNo - 1);
      nextNo = startingNo;
    }

    const existingIndex = runningNumbers.findIndex(
      r => r.RD_Department_Code.toUpperCase() === normalizedDept && r.Year === year
    );

    const now = new Date().toISOString().split('T')[0];

    if (existingIndex >= 0) {
      const existing = runningNumbers[existingIndex];

      // Part 12 - Running Number Edit Safety
      const hasGeneratedWebDocs = (existing.generatedCount || 0) > 0;
      if (hasGeneratedWebDocs) {
        if (lastUsed < existing.Last_Used_No) {
          throw new Error(`ไม่อนุญาตให้ลด Last Used Number เนื่องจากมีเอกสารในระบบถูก Generate แล้ว (ปัจจุบัน: ${existing.Last_Used_No})`);
        }
        if (nextNo <= existing.Last_Used_No) {
          throw new Error(`ห้ามกำหนด Next Number ย้อนหลังหรือซ้ำกับเลขที่เคยออกแล้ว (Last Used: ${existing.Last_Used_No})`);
        }
      }

      existing.Starting_No = startingNo;
      existing.Last_Used_No = lastUsed;
      existing.Next_No = nextNo;
      existing.Digit_Length = digitLength;
      existing.Initialized = true;
      existing.Initialization_Source = initializationSource;
      existing.Initialization_Remark = remark;
      existing.Updated_Date = now;
      existing.Updated_By = userEmail;

      auditLogs.unshift({
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'UPDATE_RUNNING_SEQUENCE',
        userEmail,
        userName,
        role,
        targetType: 'RUNNING_SEQUENCE',
        targetId: existing.Running_ID,
        details: `Updated sequence for ${normalizedDept} (${year}): Starting=${startingNo}, LastUsed=${lastUsed}, Next=${nextNo}. Remark: ${remark}`
      });

      return { ...existing };
    } else {
      const newRecord: DocumentRunningNo = {
        Running_ID: `RUN-${normalizedDept}-${year}`,
        Document_Type: docType,
        RD_Department_Code: normalizedDept,
        RD_Department_Prefix: prefix,
        Year: year,
        Starting_No: startingNo,
        Last_Used_No: lastUsed,
        Next_No: nextNo,
        Digit_Length: digitLength,
        Initialized: true,
        Initialization_Source: initializationSource,
        Initialization_Remark: remark,
        Active: true,
        Updated_Date: now,
        Updated_By: userEmail,
        generatedCount: 0
      };

      runningNumbers.push(newRecord);

      auditLogs.unshift({
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'INITIALIZE_RUNNING_SEQUENCE',
        userEmail,
        userName,
        role,
        targetType: 'RUNNING_SEQUENCE',
        targetId: newRecord.Running_ID,
        details: `Initialized new sequence for ${normalizedDept} (${year}): Starting=${startingNo}, LastUsed=${lastUsed}, Next=${nextNo}. Remark: ${remark}`
      });

      return newRecord;
    }
  } finally {
    sequenceMutex.unlock();
  }
}

/**
 * Skip Ahead in Running Number (Part 12)
 * e.g. Last used = 580, admin sets next to 600.
 * Requires Admin, Reason, writes audit log, marks 581-599 as reserved/skipped.
 */
export async function skipRunningNumber(payload: {
  rdDepartmentCode: string;
  year: number;
  newNextNo: number;
  reason: string;
  userEmail: string;
  userName: string;
  role: string;
}): Promise<DocumentRunningNo> {
  await sequenceMutex.lock();
  try {
    const { rdDepartmentCode, year, newNextNo, reason, userEmail, userName, role } = payload;
    if (role !== 'ADMIN') {
      throw new Error('การข้ามเลขเอกสารอนุญาตเฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้น');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('กรุณาระบุเหตุผลในการข้ามเลขเอกสาร (อย่างน้อย 5 ตัวอักษร)');
    }

    const normalizedDept = rdDepartmentCode.trim().toUpperCase();
    const record = runningNumbers.find(
      r => r.RD_Department_Code.toUpperCase() === normalizedDept && r.Year === year
    );
    if (!record) {
      throw new Error(`ไม่พบ Sequence สำหรับ ${normalizedDept} ปี ${year}`);
    }

    if (newNextNo <= record.Next_No) {
      throw new Error(`เลขใหม่ (${newNextNo}) ต้องมากกว่า Next Number ปัจจุบัน (${record.Next_No})`);
    }

    const skippedStart = record.Next_No;
    const skippedEnd = newNextNo - 1;

    record.Last_Used_No = newNextNo - 1;
    record.Next_No = newNextNo;
    record.Updated_Date = new Date().toISOString().split('T')[0];
    record.Updated_By = userEmail;

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'SKIP_RUNNING_SEQUENCE',
      userEmail,
      userName,
      role,
      targetType: 'RUNNING_SEQUENCE',
      targetId: record.Running_ID,
      details: `Admin skipped numbers from ${skippedStart} to ${skippedEnd}. Next Number is now ${newNextNo}. Reason: ${reason}`
    });

    return { ...record };
  } finally {
    sequenceMutex.unlock();
  }
}

/**
 * Change RD Department on Draft Sample Request (Part 16)
 * 1. Confirm & void old number
 * 2. Store old number in VOIDED list (never reused)
 * 3. Generate new number for new department
 * 4. Write audit log
 */
export async function changeDepartmentAndVoidSampleNo(payload: {
  oldSampleNo: string;
  newDepartmentCode: string;
  reason: string;
  userEmail: string;
  userName: string;
  role: string;
}): Promise<{ newSampleNo: string; oldSampleNo: string; revision: string }> {
  await sequenceMutex.lock();
  try {
    const { oldSampleNo, newDepartmentCode, reason, userEmail, userName, role } = payload;
    const cleanOld = oldSampleNo.trim().split(' ')[0]; // Remove REV.xx if attached

    // Check if already voided
    if (voidedNumbers.some(v => v.sampleNo === cleanOld)) {
      throw new Error(`เลขเอกสาร ${cleanOld} ถูก VOID ไปแล้ว`);
    }

    // Determine year from old sample no
    const yearMatch = cleanOld.match(/-(\d{4})$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    // 1 & 2. Record VOID
    voidedNumbers.unshift({
      sampleNo: cleanOld,
      voidedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      voidedBy: `${userName} (${userEmail})`,
      oldDepartment: cleanOld,
      newDepartment: newDepartmentCode,
      reason: reason || 'เปลี่ยนผู้จัดเตรียมตัวอย่าง / RD Department'
    });

    // Write audit log for VOID
    auditLogs.unshift({
      id: `AUD-${Date.now()}-VOID`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'VOID_SAMPLE_NO',
      userEmail,
      userName,
      role,
      targetType: 'SAMPLE_NO',
      targetId: cleanOld,
      details: `VOID ${cleanOld} due to changing RD department to ${newDepartmentCode}. Reason: ${reason}`
    });

    // 3. Generate new number using new department (release mutex temporarily by calling internal logic)
    const normalizedNewDept = newDepartmentCode.trim().toUpperCase();
    const dept = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === normalizedNewDept && d.Active);
    if (!dept) {
      throw new Error(`ไม่พบแผนก RD: ${newDepartmentCode}`);
    }

    const record = runningNumbers.find(
      r => r.RD_Department_Code.toUpperCase() === normalizedNewDept && r.Year === year && r.Active
    );
    if (!record || !record.Initialized) {
      throw new Error(`ยังไม่ได้ตั้งค่าเลขเริ่มต้นของเอกสารสำหรับ ${normalizedNewDept} ปี ${year} กรุณาติดต่อ Administrator`);
    }

    const allocatedNo = record.Next_No;
    const numStr = String(allocatedNo).length >= record.Digit_Length 
      ? String(allocatedNo) 
      : String(allocatedNo).padStart(record.Digit_Length, '0');

    const newSampleNo = `SRI-${dept.Sample_No_Prefix.toUpperCase()}${numStr}-${year}`;

    record.Last_Used_No = allocatedNo;
    record.Next_No = allocatedNo + 1;
    record.generatedCount = (record.generatedCount || 0) + 1;
    record.Updated_Date = new Date().toISOString().split('T')[0];
    record.Updated_By = userEmail;

    // Update void record with new sample number reference
    voidedNumbers[0].newSampleNo = newSampleNo;

    // Write audit log for new generation
    auditLogs.unshift({
      id: `AUD-${Date.now()}-NEW`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'REASSIGN_SAMPLE_NO',
      userEmail,
      userName,
      role,
      targetType: 'SAMPLE_NO',
      targetId: newSampleNo,
      details: `Reassigned from ${cleanOld} to ${newSampleNo} after RD Department change to ${normalizedNewDept}`
    });

    return {
      newSampleNo,
      oldSampleNo: cleanOld,
      revision: 'REV.00'
    };
  } finally {
    sequenceMutex.unlock();
  }
}
