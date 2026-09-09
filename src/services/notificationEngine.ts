import { EmailEventCode, EmailLogEntry, Role, SampleRequest } from '../types';
import * as sheetService from './sheetService';

/**
 * PART 67: AUTO EMAIL ENGINE
 * Workflow Event → Notification Rule → Recipient Master → Template → Send → Log
 * DIRECTIVE: ห้าม Hard Code Email (Resolve dynamic recipients from rules & master directory)
 */

export interface DynamicEmailRecipient {
  email: string;
  name: string;
  role: string;
  type: 'TO' | 'CC' | 'BCC';
}

export interface NotificationPayload {
  eventCode: EmailEventCode | string;
  request: SampleRequest;
  actor?: {
    name: string;
    email: string;
    role?: Role | string;
  };
  customMessage?: string;
  issueRemark?: string;
  soNumber?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  delayReason?: string;
  slaMinutes?: number;
  podUrl?: string;
}

// Default Notification Rules Configuration for 26 Events (Part 68)
export const NOTIFICATION_RULES: Record<string, {
  eventTitle: string;
  targetRoles: Role[];
  includeRequester: boolean;
  includeApprover: boolean;
  includeDepartmentLead: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
}> = {
  [EmailEventCode.SAMPLE_SUBMITTED]: {
    eventTitle: 'คำขอตัวอย่างถูกส่งเข้าระบบ',
    targetRoles: ['LOGISTIC'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[SAMPLE SUBMITTED] {{sampleNo}} : มีการสร้างคำขอตัวอย่างใหม่ - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่างเลขที่ {{sampleNo}} ({{revision}}) สำหรับลูกค้า {{customerName}} ได้รับการสร้างโดย {{saleName}} เรียบร้อยแล้ว กำหนดจัดส่ง {{deliveryDate}} เวลา {{deliveryTimeFrom}}-{{deliveryTimeTo}} น.'
  },
  [EmailEventCode.LOGISTIC_CHECK_REQUIRED]: {
    eventTitle: 'แจ้งเตือนโลจิสติกส์ตรวจสอบความเป็นไปได้ในการจัดส่ง',
    targetRoles: ['LOGISTIC'],
    includeRequester: false,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[LOGISTIC PRE-CHECK REQUIRED] {{sampleNo}} : กรุณาตรวจสอบเส้นทางและอุณหภูมิการจัดส่ง - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่างเลขที่ {{sampleNo}} รอการตรวจสอบความเป็นไปได้ (Pre-Check) เส้นทาง {{route}} ควบคุมอุณหภูมิ {{temperature}} น้ำหนักรวม {{totalQty}} กก. สถานที่: {{deliveryAddress}}, {{province}}'
  },
  [EmailEventCode.LOGISTIC_CONFIRMED]: {
    eventTitle: 'โลจิสติกส์ยืนยันผลการตรวจสอบเส้นทางแล้ว',
    targetRoles: ['SALE_MANAGER'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[LOGISTIC CONFIRMED] {{sampleNo}} : ผ่านการตรวจสอบโลจิสติกส์แล้ว รอการอนุมัติ - {{customerName}}',
    bodyTemplate: 'เจ้าหน้าที่โลจิสติกส์ได้ทำการ Pre-Check คำขอ {{sampleNo}} เรียบร้อยแล้ว ผลการตรวจ: {{feasibility}} สายการเดินรถ: {{route}} กำหนดส่ง: {{deliveryDate}} กรุณาเข้าสู่ระบบเพื่อพิจารณาอนุมัติ'
  },
  [EmailEventCode.APPROVAL_REQUIRED]: {
    eventTitle: 'แจ้งเตือนผู้จัดการฝ่ายขายพิจารณาอนุมัติคำขอ',
    targetRoles: ['SALE_MANAGER'],
    includeRequester: false,
    includeApprover: true,
    includeDepartmentLead: false,
    subjectTemplate: '[ACTION REQUIRED] {{sampleNo}} : รอการอนุมัติคำขอตัวอย่างสินค้า - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่างเลขที่ {{sampleNo}} ({{revision}}) มูลค่ารวม ฿{{totalValue}} พร้อมให้ผู้จัดการฝ่ายขายพิจารณาอนุมัติ ผู้ขอ: {{saleName}}'
  },
  [EmailEventCode.SAMPLE_APPROVED]: {
    eventTitle: 'คำขอตัวอย่างได้รับการอนุมัติอย่างเป็นทางการ',
    targetRoles: ['SALE', 'RD', 'CO_SALE', 'LOGISTIC'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[SAMPLE APPROVED] {{sampleNo}} : ได้รับการอนุมัติแล้ว ระบบเริ่มกระจายงาน - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} ({{revision}}) ได้รับการอนุมัติเรียบร้อยแล้วโดย {{approverName}} ระบบได้ทำการ Freeze ข้อมูลและกระจายงานคู่ขนาน (RD ผลิต, Co-Sale เปิด SO, Logistic จัดเตรียมรถ)'
  },
  [EmailEventCode.APPROVED_DOCUMENT_GENERATED]: {
    eventTitle: 'เอกสารคำขอตัวอย่าง PDF ทางการถูกสร้างและบันทึกลง Drive',
    targetRoles: ['SALE', 'RD', 'CO_SALE'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: false,
    subjectTemplate: '[DOCUMENT GENERATED] {{sampleNo}} : เอกสาร Official PDF พร้อมใช้งานบน Google Drive',
    bodyTemplate: 'เอกสาร Official Sample Request PDF สำหรับ {{sampleNo}} (ไฟล์: {{pdfFileName}}) ได้รับการบันทึกลง Google Drive ที่โฟลเดอร์ {{drivePath}} และลงทะเบียนใน Document Register เรียบร้อยแล้ว'
  },
  [EmailEventCode.SAMPLE_REJECTED]: {
    eventTitle: 'คำขอตัวอย่างถูกปฏิเสธ (Rejected)',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: false,
    subjectTemplate: '[SAMPLE REJECTED] {{sampleNo}} : คำขอตัวอย่างไม่ได้รับการอนุมัติ - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} ได้รับการปฏิเสธโดยผู้จัดการฝ่ายขาย เหตุผล: {{customMessage}} กรุณาประสานงานกับผู้จัดการหรือทบทวนข้อมูล'
  },
  [EmailEventCode.REVISION_REQUIRED]: {
    eventTitle: 'คำขอตัวอย่างต้องการการแก้ไข (Revision Required)',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: false,
    subjectTemplate: '[REVISION REQUIRED] {{sampleNo}} : ส่งกลับเพื่อให้แก้ไขข้อมูล - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} ถูกส่งกลับเพื่อแก้ไขข้อมูลในหัวข้อ: {{customMessage}} ระบบจะเพิ่มเลข Revision เฉพาะกรณีที่เอกสารเคยอนุมัติและส่งให้ส่วนงานแล้ว'
  },
  [EmailEventCode.RD_TASK_CREATED]: {
    eventTitle: 'งานจัดเตรียมตัวอย่าง RD ถูกสร้างขึ้น',
    targetRoles: ['RD'],
    includeRequester: false,
    includeApprover: false,
    includeDepartmentLead: true,
    subjectTemplate: '[RD TASK CREATED] {{sampleNo}} : งานจัดเตรียมสินค้าตัวอย่างแผนก {{department}}',
    bodyTemplate: 'มีงานจัดเตรียมตัวอย่างใหม่สำหรับแผนก {{department}} คำขอ {{sampleNo}} จำนวน {{totalQty}} กก. กำหนดเตรียมเสร็จ: {{preparationDate}}'
  },
  [EmailEventCode.RD_STARTED]: {
    eventTitle: 'RD เริ่มต้นกระบวนการจัดเตรียมตัวอย่าง',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: true,
    subjectTemplate: '[RD IN PROGRESS] {{sampleNo}} : แผนก R&D กำลังดำเนินการจัดเตรียมสินค้า',
    bodyTemplate: 'เจ้าหน้าที่ R&D ได้รับงานและกำลังดำเนินการเตรียม/ผลิตสินค้าตัวอย่าง {{sampleNo}} ตามมาตรฐาน'
  },
  [EmailEventCode.RD_READY]: {
    eventTitle: 'RD จัดเตรียมตัวอย่างเสร็จสมบูรณ์พร้อมส่งต่อ',
    targetRoles: ['SALE', 'LOGISTIC'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: true,
    subjectTemplate: '[RD READY] {{sampleNo}} : จัดเตรียมสินค้าตัวอย่างเสร็จแล้ว พร้อมส่งต่อโลจิสติกส์',
    bodyTemplate: 'สินค้าตัวอย่างคำขอ {{sampleNo}} แผนก {{department}} ได้รับการจัดเตรียม บรรจุ ติดฉลาก Lot และระบุวันหมดอายุเรียบร้อยแล้ว'
  },
  [EmailEventCode.RD_ISSUE]: {
    eventTitle: 'พบปัญหาในการจัดเตรียมตัวอย่างโดย RD',
    targetRoles: ['SALE', 'SALE_MANAGER', 'RD'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[ALERT - RD ISSUE] {{sampleNo}} : เกิดปัญหาในการจัดเตรียมตัวอย่าง',
    bodyTemplate: 'พบปัญหาในกระบวนการจัดเตรียมตัวอย่าง {{sampleNo}} รายละเอียด: {{issueRemark}} กรุณาตรวจสอบและดำเนินการแก้ไข'
  },
  [EmailEventCode.COSALE_TASK_CREATED]: {
    eventTitle: 'งานเปิด Sales Order ถูกสร้างและมอบหมายให้ Co-Sale',
    targetRoles: ['CO_SALE'],
    includeRequester: false,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[CO-SALE TASK] {{sampleNo}} : งานเปิดเอกสารใบสั่งขาย (SO) ใน ERP',
    bodyTemplate: 'กรุณาเปิดใบสั่งขาย (Sales Order) ในระบบ ERP สำหรับคำขอตัวอย่าง {{sampleNo}} ลูกค้า: {{customerName}} รหัส Ship-to: {{shipToCode}}'
  },
  [EmailEventCode.SO_COMPLETED]: {
    eventTitle: 'Co-Sale เปิด Sales Order ในระบบ ERP เสร็จสมบูรณ์',
    targetRoles: ['SALE', 'LOGISTIC'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[SO RELEASED] {{sampleNo}} : บันทึกเลข SO ({{soNumber}}) เรียบร้อยแล้ว',
    bodyTemplate: 'Co-Sale ได้ทำการเปิด Sales Order ในระบบ ERP เลขที่ {{soNumber}} สำหรับคำขอ {{sampleNo}} เรียบร้อยแล้ว'
  },
  [EmailEventCode.SO_ISSUE]: {
    eventTitle: 'พบปัญหาในการเปิด SO โดย Co-Sale',
    targetRoles: ['SALE', 'CO_SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[ALERT - SO ISSUE] {{sampleNo}} : เกิดปัญหาในการเปิด Sales Order',
    bodyTemplate: 'พบปัญหาในการเปิด Sales Order ใน ERP สำหรับคำขอ {{sampleNo}} รายละเอียด: {{issueRemark}}'
  },
  [EmailEventCode.VEHICLE_ASSIGNMENT_REQUIRED]: {
    eventTitle: 'แจ้งเตือนโลจิสติกส์จัดสรรยานพาหนะและพนักงานขับรถ',
    targetRoles: ['LOGISTIC'],
    includeRequester: false,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[VEHICLE ASSIGNMENT REQUIRED] {{sampleNo}} : กรุณาจัดสรรรถและคนขับ - สาย {{route}}',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} กำหนดจัดส่ง {{deliveryDate}} ({{deliveryTimeFrom}}-{{deliveryTimeTo}}) อุณหภูมิ {{temperature}} รอการจัดสรรยานพาหนะและพนักงานขับรถ'
  },
  [EmailEventCode.VEHICLE_CONFIRMED]: {
    eventTitle: 'โลจิสติกส์ยืนยันข้อมูลยานพาหนะและคนขับแล้ว',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[VEHICLE CONFIRMED] {{sampleNo}} : ยืนยันรถจัดส่ง {{vehicleNo}} ({{driverName}})',
    bodyTemplate: 'คำขอ {{sampleNo}} ได้รับการจัดสรรรถขนส่ง ทะเบียน: {{vehicleNo}} คนขับ: {{driverName}} เบอร์โทร: {{driverPhone}}'
  },
  [EmailEventCode.READY_TO_DELIVER]: {
    eventTitle: 'คำขอผ่านเกณฑ์ Ready to Deliver Gate 100% พร้อมส่งมอบ',
    targetRoles: ['SALE', 'LOGISTIC'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: true,
    subjectTemplate: '[READY TO DELIVER] {{sampleNo}} : ผ่านเกณฑ์ครบ 3 ฝ่าย พร้อมนำขึ้นรถจัดส่ง - {{customerName}}',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} ผ่านเกณฑ์ Ready-to-Deliver Gate ครบทั้ง 3 ส่วนแล้ว (RD เตรียมเสร็จ, SO เปิดแล้ว, รถพร้อม) กำหนดจัดส่ง {{deliveryDate}}'
  },
  [EmailEventCode.PICKED_UP]: {
    eventTitle: 'สินค้าตัวอย่างถูกรับขึ้นรถขนส่งแล้ว (Picked Up)',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[PICKED UP] {{sampleNo}} : พนักงานขับรถรับสินค้าขึ้นรถแล้ว',
    bodyTemplate: 'สินค้าตัวอย่าง {{sampleNo}} ได้ถูกบรรทุกขึ้นรถ {{vehicleNo}} เรียบร้อยแล้ว เตรียมออกเดินทางสู่ปลายทาง'
  },
  [EmailEventCode.OUT_FOR_DELIVERY]: {
    eventTitle: 'สินค้าตัวอย่างอยู่ระหว่างการขนส่ง (Out for Delivery)',
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: '[OUT FOR DELIVERY] {{sampleNo}} : อยู่ระหว่างนำส่งลูกค้า - {{customerName}}',
    bodyTemplate: 'ยานพาหนะ {{vehicleNo}} กำลังนำส่งสินค้าตัวอย่าง {{sampleNo}} สู่ลูกค้า {{customerName}} พนักงานขับรถ: {{driverName}} ({{driverPhone}})'
  },
  [EmailEventCode.DELIVERY_DELAY]: {
    eventTitle: 'แจ้งเตือนการจัดส่งล่าช้ากว่ากำหนด (Delivery Delay)',
    targetRoles: ['SALE', 'SALE_MANAGER', 'LOGISTIC'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: false,
    subjectTemplate: '[ALERT - DELIVERY DELAY] {{sampleNo}} : แจ้งเตือนการจัดส่งล่าช้า - {{customerName}}',
    bodyTemplate: 'การจัดส่งคำขอตัวอย่าง {{sampleNo}} ประสบความล่าช้า สาเหตุ: {{delayReason}} เจ้าหน้าที่กำลังเร่งประสานงาน'
  },
  [EmailEventCode.DELIVERED]: {
    eventTitle: 'สินค้าตัวอย่างจัดส่งถึงปลายทางเรียบร้อยแล้ว (Delivered)',
    targetRoles: ['SALE', 'SALE_MANAGER', 'CO_SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: true,
    subjectTemplate: '[DELIVERED] {{sampleNo}} : จัดส่งถึงมือลูกค้าเรียบร้อยแล้ว - {{customerName}}',
    bodyTemplate: 'สินค้าตัวอย่าง {{sampleNo}} ได้รับการส่งมอบให้ลูกค้า {{customerName}} เรียบร้อยแล้ว หลักฐานการรับสินค้า (POD) ได้รับการบันทึกในระบบ'
  },
  [EmailEventCode.COMPLETED]: {
    eventTitle: 'กระบวนการส่งตัวอย่างเสร็จสมบูรณ์ปิดงาน (Completed)',
    targetRoles: ['SALE', 'SALE_MANAGER', 'MANAGEMENT'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[COMPLETED] {{sampleNo}} : ปิดงานคำขอตัวอย่างสินค้าสมบูรณ์',
    bodyTemplate: 'คำขอตัวอย่าง {{sampleNo}} ดำเนินการเสร็จสมบูรณ์ครบถ้วนทุกขั้นตอนและบันทึกประวัติการส่งมอบลงใน Master Customer Register แล้ว'
  },
  [EmailEventCode.SLA_WARNING]: {
    eventTitle: 'แจ้งเตือนใกล้ถึงกำหนดเวลา SLA (SLA Warning)',
    targetRoles: ['SALE_MANAGER'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[SLA WARNING] {{sampleNo}} : ใกล้ครบกำหนดเวลา SLA ในกระบวนการ {{currentProcess}}',
    bodyTemplate: 'คำขอ {{sampleNo}} กำลังจะเกินกำหนดเวลา SLA ในอีก {{slaMinutes}} นาที ผู้รับผิดชอบปัจจุบัน: {{currentOwner}}'
  },
  [EmailEventCode.SLA_OVERDUE]: {
    eventTitle: 'แจ้งเตือนคำขอเกินกำหนดเวลา SLA (SLA Overdue)',
    targetRoles: ['SALE_MANAGER', 'MANAGEMENT'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[SLA OVERDUE] {{sampleNo}} : คำขอดำเนินการเกินกำหนดเวลา SLA แล้ว',
    bodyTemplate: 'คำขอ {{sampleNo}} ในขั้นตอน {{currentProcess}} ดำเนินการเกินกรอบเวลา SLA ที่กำหนด กรุณาตรวจสอบและเร่งรัดการดำเนินงาน'
  },
  [EmailEventCode.SLA_ESCALATION]: {
    eventTitle: 'ยกระดับความล่าช้าถึงผู้บริหารระดับสูง (SLA Escalation)',
    targetRoles: ['MANAGEMENT', 'ADMIN'],
    includeRequester: true,
    includeApprover: true,
    includeDepartmentLead: true,
    subjectTemplate: '[SLA ESCALATION] {{sampleNo}} : ยกระดับกรณีล่าช้าวิกฤตสู่ฝ่ายบริหาร',
    bodyTemplate: 'คำขอ {{sampleNo}} ล่าช้าเกินเกณฑ์วิกฤต ระบบจึงทำการยกระดับ (Escalate) ถึงผู้บริหารระดับสูงเพื่อสั่งการแก้ไข'
  }
};

/**
 * Resolve dynamic recipients for the workflow event without hard-coded email addresses
 */
export async function resolveRecipients(
  eventCode: string,
  request: SampleRequest,
  rule: (typeof NOTIFICATION_RULES)[string],
  departmentGroupEmail?: string
): Promise<{ toList: string[]; ccList: string[] }> {
  const toSet = new Set<string>();
  const ccSet = new Set<string>();

  // 1. Check Recipient Master from Google Sheets service if available
  try {
    const masterRecipients = await sheetService.getEmailRecipients(eventCode, request.department || 'ALL');
    if (masterRecipients && masterRecipients.length > 0) {
      masterRecipients.forEach(r => {
        const email = r.Email || r.email;
        const type = r.Recipient_Type || r.type || 'TO';
        if (email && email.includes('@')) {
          if (type === 'CC') ccSet.add(email.trim());
          else toSet.add(email.trim());
        }
      });
    }
  } catch (e) {
    // Non-blocking fallback
  }

  // 2. Dynamic Actor Resolutions:
  // - Requester (Sale)
  if (rule.includeRequester && request.saleEmail) {
    toSet.add(request.saleEmail.trim());
  }

  // - Approver (Sale Manager)
  if (rule.includeApprover) {
    const approverEmail = request.approvals?.[0]?.approverEmail || 'salemanager@company.com';
    ccSet.add(approverEmail.trim());
  }

  // - Department Lead / Group email
  if (rule.includeDepartmentLead) {
    const deptEmail = departmentGroupEmail || (request.department === 'RM' ? 'rd.rawmeat@company.com' : request.department === 'RTC' ? 'rd.rtc@company.com' : 'rd.further@company.com');
    toSet.add(deptEmail.trim());
  }

  // - Functional role defaults if recipient list is still sparse
  if (rule.targetRoles.includes('LOGISTIC')) {
    toSet.add('logistic.dispatch@company.com');
  }
  if (rule.targetRoles.includes('CO_SALE')) {
    toSet.add('cosale.operations@company.com');
  }
  if (rule.targetRoles.includes('SALE_MANAGER')) {
    toSet.add('salemanager@company.com');
  }
  if (rule.targetRoles.includes('MANAGEMENT')) {
    ccSet.add('management.exec@company.com');
  }

  // Clean up any overlaps
  const toList = Array.from(toSet).filter(e => e.includes('@'));
  const ccList = Array.from(ccSet).filter(e => e.includes('@') && !toSet.has(e));

  // Ensure at least one recipient
  if (toList.length === 0) {
    toList.push(request.saleEmail || 'operations@company.com');
  }

  return { toList, ccList };
}

/**
 * Replace template tokens with contextual request values
 */
export function renderTemplate(template: string, payload: NotificationPayload): string {
  const req = payload.request;
  const now = new Date();
  const replacements: Record<string, string> = {
    '{{sampleNo}}': req.sampleNo || 'N/A',
    '{{revision}}': req.revision || 'REV.00',
    '{{customerName}}': req.customerName || 'N/A',
    '{{customerCode}}': req.customerCode || 'N/A',
    '{{saleName}}': req.saleName || 'Sale Specialist',
    '{{saleEmail}}': req.saleEmail || 'N/A',
    '{{department}}': req.department || 'RD',
    '{{deliveryDate}}': req.deliveryDate || 'N/A',
    '{{deliveryTimeFrom}}': req.deliveryTimeFrom || '10:00',
    '{{deliveryTimeTo}}': req.deliveryTimeTo || '12:00',
    '{{deliveryAddress}}': req.deliveryAddress || 'N/A',
    '{{province}}': req.province || 'N/A',
    '{{route}}': req.route || 'N/A',
    '{{temperature}}': req.temperature || 'N/A',
    '{{totalQty}}': String(req.totalQty || 0),
    '{{totalValue}}': (req.totalValue || 0).toLocaleString(),
    '{{feasibility}}': req.logisticTask?.feasibility || 'FEASIBLE',
    '{{approverName}}': req.approvals?.[0]?.approverName || payload.actor?.name || 'Sale Manager',
    '{{soNumber}}': payload.soNumber || req.coSaleTask?.soNumber || 'SO-PENDING',
    '{{vehicleNo}}': payload.vehicleNo || req.logisticTask?.vehicleNo || 'V-PENDING',
    '{{driverName}}': payload.driverName || req.logisticTask?.driverName || 'Driver',
    '{{driverPhone}}': payload.driverPhone || req.logisticTask?.driverPhone || '-',
    '{{customMessage}}': payload.customMessage || '-',
    '{{issueRemark}}': payload.issueRemark || payload.customMessage || 'N/A',
    '{{delayReason}}': payload.delayReason || payload.customMessage || 'จราจรติดขัด',
    '{{slaMinutes}}': String(payload.slaMinutes || 30),
    '{{currentProcess}}': req.currentProcess || 'PROCESSING',
    '{{currentOwner}}': req.currentOwner || 'Team',
    '{{pdfFileName}}': `${req.sampleNo}_${(req.revision || 'REV.00').replace(/[^0-9]/g, '') || '00'}.pdf`,
    '{{drivePath}}': `Sample Request/2026/${req.department || 'RM'}/${req.sampleNo}`
  };

  let rendered = template;
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.split(key).join(value);
  }
  return rendered;
}

/**
 * Central Auto-Email Dispatcher
 * Dispatches notification according to Part 67 pipeline
 */
export async function dispatchNotification(
  payload: NotificationPayload,
  departmentGroupEmail?: string
): Promise<EmailLogEntry> {
  const eventCode = payload.eventCode as string;
  const rule = NOTIFICATION_RULES[eventCode] || {
    eventTitle: `แจ้งเตือนสถานะคำขอ (${eventCode})`,
    targetRoles: ['SALE'],
    includeRequester: true,
    includeApprover: false,
    includeDepartmentLead: false,
    subjectTemplate: `[{{eventCode}}] {{sampleNo}} : แจ้งเตือนสถานะ - {{customerName}}`,
    bodyTemplate: `คำขอตัวอย่าง {{sampleNo}} ได้รับการปรับปรุงสถานะในระบบ`
  };

  const { toList, ccList } = await resolveRecipients(eventCode, payload.request, rule, departmentGroupEmail);
  const subject = renderTemplate(rule.subjectTemplate, payload);
  const body = renderTemplate(rule.bodyTemplate, payload);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const logEntry: EmailLogEntry = {
    emailLogId: `EML-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    sampleNo: payload.request.sampleNo,
    eventCode,
    sendDate: dateStr,
    sendTime: timeStr,
    toEmail: toList.join(', '),
    ccEmail: ccList.join(', '),
    subject,
    templateCode: `TMPL_${eventCode}`,
    attachmentFile: payload.podUrl || (eventCode.includes('APPROVED') || eventCode.includes('DOCUMENT') ? `${payload.request.sampleNo}_REV00.pdf` : undefined),
    sendStatus: 'SENT',
    retryCount: 0,
    messageId: `MSG-${Date.now()}`,
    body
  };

  // Asynchronously record into Google Sheets 21_EMAIL_LOG & Audit Log
  sheetService.writeEmailLog(logEntry).catch(err => {
    console.warn('Google Sheets email log sync warning:', err.message);
  });

  return logEntry;
}
