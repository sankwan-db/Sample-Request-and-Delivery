export type Role = 'SALE' | 'LOGISTIC' | 'SALE_MANAGER' | 'RD' | 'CO_SALE' | 'ADMIN' | 'MANAGEMENT';

export enum RequestStatus {
  DRAFT = 'DRAFT',
  LOGISTIC_PRE_CHECK = 'LOGISTIC PRE-CHECK',
  WAITING_APPROVAL = 'WAITING APPROVAL',
  REJECTED = 'REJECTED',
  REVISION_REQUIRED = 'REVISION REQUIRED',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING', // When parallel tasks are running
  READY_TO_DELIVER = 'READY TO DELIVER',
  PICKED_UP = 'PICKED UP',
  OUT_FOR_DELIVERY = 'OUT FOR DELIVERY',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  CUSTOMER_RECEIVED = 'CUSTOMER RECEIVED',
  COMPLETED = 'COMPLETED'
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface RDDepartmentMaster {
  RD_Department_ID: string;
  RD_Department_Code: string;
  RD_Department_Name_TH: string;
  RD_Department_Name_EN: string;
  Sample_No_Prefix: string;
  Default_Email: string;
  Supervisor_Name: string;
  Supervisor_Email: string;
  Active: boolean;
  Sort_Order: number;
  Created_Date: string;
  Created_By: string;
  Updated_Date: string;
  Updated_By: string;
}

export interface DocumentRunningNo {
  Running_ID: string;
  Document_Type: string;
  RD_Department_Code: string;
  RD_Department_Prefix: string;
  Year: number;
  Starting_No: number;
  Last_Used_No: number;
  Next_No: number;
  Digit_Length: number;
  Initialized: boolean;
  Initialization_Source: string;
  Initialization_Remark?: string;
  Active: boolean;
  Updated_Date: string;
  Updated_By: string;
  generatedCount?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userEmail: string;
  userName: string;
  role: string;
  targetType: string;
  targetId: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface VoidedSampleNo {
  sampleNo: string;
  voidedDate: string;
  voidedBy: string;
  oldDepartment: string;
  newDepartment: string;
  newSampleNo?: string;
  reason: string;
}

export interface ReadyToDeliverGateResult {
  isReady: boolean;
  blockers: string[];
  criteria: {
    rdReady: boolean;
    soCompleted: boolean;
    vehicleConfirmed: boolean;
  };
}

export interface DocumentTypeMaster {
  docCode: string;
  docName: string;
  description: string;
  isRequiredDefault: boolean;
  active: boolean;
  sortOrder: number;
}

export interface DocumentRequirementItem {
  docCode: string;
  docName: string;
  required: boolean;
  remark: string;
}

export interface SampleLine {
  id: string | number;
  itemCode: string;
  productName: string;
  category: string; // Type
  uom: string;
  storageType: string; // Fz/Ch/Ambient
  kgPerBag?: number; // KG/Bag
  bagQty?: number; // Bag
  requestQty: number; // KG = kgPerBag * bagQty
  weight?: number;
  price: number; // บาท/กก. (Unit Price)
  value: number; // ยอดเงิน (Line Value = requestQty * price)
  refCode?: string; // Reference Code
  remark: string; // Note
  stockDeduction?: 'DEDUCT' | 'NO_DEDUCT' | 'SAMPLE_STOCK'; // Stock Deduction option
  lot?: string;
  actualQty?: number;
  expiryDate?: string;
}

export interface LogisticTaskData {
  taskId: string;
  sampleNo: string;
  precheckStatus: 'PASS' | 'PROPOSE_CHANGE' | 'PENDING';
  requestedDate: string;
  requestedTimeFrom: string;
  requestedTimeTo: string;
  deliveryAddress: string;
  province: string;
  route: string;
  temperature: string;
  estimatedWeight: number;
  feasibility: 'Available' | 'Available with Change' | 'Not Available' | 'FEASIBLE' | 'ALTERNATIVE_PROPOSED' | 'NOT_FEASIBLE';
  proposedDate?: string;
  proposedTimeFrom?: string;
  proposedTimeTo?: string;
  proposedRoute?: string;
  proposedDepot?: string;
  precheckRemark?: string;
  precheckBy?: string;
  precheckTime?: string;
  vehicleType?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  pickupTime?: string;
  eta?: string;
  actualPickup?: string;
  actualArrival?: string;
  actualDelivery?: string;
  deliveryStatus?: string;
  deliveryIssue?: string;
  deliveryRemark?: string;
  podUrl?: string;
  taskStatus: TaskStatus;
  slaStatus: 'NORMAL' | 'WARNING' | 'BREACHED';
}

export interface RDTaskData {
  taskId: string;
  sampleNo: string;
  assignedTo: string;
  assignedEmail: string;
  taskCreateTime: string;
  acceptTime?: string;
  startTime?: string;
  requiredDate: string;
  completeTime?: string;
  itemCode: string;
  productName: string;
  requiredQty: number;
  actualQty?: number;
  lot?: string;
  productionDate?: string;
  expiryDate?: string;
  preparationRemark?: string;
  issueType?: string;
  issueRemark?: string;
  taskStatus: TaskStatus;
  slaStatus: 'NORMAL' | 'WARNING' | 'BREACHED';
}

export interface CoSaleTaskData {
  taskId: string;
  sampleNo: string;
  assignedTo: string;
  assignedEmail: string;
  customerCode: string;
  shipTo: string;
  sampleType: string;
  taskCreateTime: string;
  startTime?: string;
  soNumber?: string;
  soDate?: string;
  erpStatus?: 'NOT_CREATED' | 'DRAFT' | 'RELEASED' | 'HOLD';
  documentStatus?: 'PENDING' | 'READY';
  issueType?: string;
  issueRemark?: string;
  completeTime?: string;
  taskStatus: TaskStatus;
  slaStatus: 'NORMAL' | 'WARNING' | 'BREACHED';
}

export interface ApprovalRecord {
  approvalId: string;
  sampleNo: string;
  approvalLevel: string;
  approverName: string;
  approverEmail: string;
  requestTime: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';
  approvalDate?: string;
  approvalTime?: string;
  rejectReason?: string;
  revisionSections?: string;
  revisionRemark?: string;
  slaStatus: 'NORMAL' | 'WARNING' | 'BREACHED';
}

export enum EmailEventCode {
  SAMPLE_SUBMITTED = 'SAMPLE_SUBMITTED',
  LOGISTIC_CHECK_REQUIRED = 'LOGISTIC_CHECK_REQUIRED',
  LOGISTIC_CONFIRMED = 'LOGISTIC_CONFIRMED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  SAMPLE_APPROVED = 'SAMPLE_APPROVED',
  APPROVED_DOCUMENT_GENERATED = 'APPROVED_DOCUMENT_GENERATED',
  SAMPLE_REJECTED = 'SAMPLE_REJECTED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  RD_TASK_CREATED = 'RD_TASK_CREATED',
  RD_STARTED = 'RD_STARTED',
  RD_READY = 'RD_READY',
  RD_ISSUE = 'RD_ISSUE',
  COSALE_TASK_CREATED = 'COSALE_TASK_CREATED',
  SO_COMPLETED = 'SO_COMPLETED',
  SO_ISSUE = 'SO_ISSUE',
  VEHICLE_ASSIGNMENT_REQUIRED = 'VEHICLE_ASSIGNMENT_REQUIRED',
  VEHICLE_CONFIRMED = 'VEHICLE_CONFIRMED',
  READY_TO_DELIVER = 'READY_TO_DELIVER',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERY_DELAY = 'DELIVERY_DELAY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  SLA_WARNING = 'SLA_WARNING',
  SLA_OVERDUE = 'SLA_OVERDUE',
  SLA_ESCALATION = 'SLA_ESCALATION'
}

export interface NotificationRule {
  ruleId: string;
  eventCode: EmailEventCode | string;
  department: string;
  recipientRoles: Role[];
  includeRequester: boolean;
  includeApprover: boolean;
  includeDepartmentGroup: boolean;
  includeCustomer: boolean;
  templateCode: string;
  subjectTemplate: string;
  bodyTemplate: string;
  active: boolean;
}

export interface EmailRecipientMaster {
  recipientId: string;
  eventCode: string;
  department: string;
  recipientName: string;
  email: string;
  recipientType: 'TO' | 'CC' | 'BCC';
  role: Role | string;
  active: boolean;
}

export interface EmailLogEntry {
  emailLogId: string;
  sampleNo: string;
  eventCode: EmailEventCode | string;
  sendDate: string;
  sendTime: string;
  toEmail: string;
  ccEmail: string;
  bccEmail?: string;
  subject: string;
  templateCode: string;
  attachmentFile?: string;
  sendStatus: 'SENT' | 'FAILED' | 'QUEUED';
  retryCount?: number;
  errorMessage?: string;
  messageId?: string;
  body?: string;
}

/**
 * Format official PDF file name according to PART 65
 * Pattern: {SampleNo}_REV{Revision}.pdf
 * e.g. SRI-RM563-2026_REV00.pdf
 */
export function formatSamplePdfFileName(sampleNo: string, revision?: string): string {
  const cleanSample = (sampleNo || 'SR-001').replace(/[^a-zA-Z0-9_-]/g, '_');
  const revRaw = (revision || 'REV.00').toUpperCase().replace(/[^0-9]/g, '');
  const revStr = revRaw ? `REV${revRaw.padStart(2, '0')}` : 'REV00';
  return `${cleanSample}_${revStr}.pdf`;
}

/**
 * Get Google Drive storage path according to PART 66
 * Sample Request/{Year}/{RD_Department_Code}/{SampleNo}/{SampleNo}_REV{Revision}.pdf
 */
export function getSamplePdfDrivePath(sampleNo: string, deptCode: string = 'RM', year: number = 2026, revision?: string): {
  rootFolder: string;
  yearFolder: string;
  deptFolder: string;
  sampleFolder: string;
  fileName: string;
  fullPath: string;
} {
  const fileName = formatSamplePdfFileName(sampleNo, revision);
  const cleanDept = (deptCode || 'RM').toUpperCase();
  const rootFolder = 'Sample Request';
  const yearFolder = String(year);
  const deptFolder = cleanDept;
  const sampleFolder = sampleNo;
  const fullPath = `${rootFolder}/${yearFolder}/${deptFolder}/${sampleFolder}/${fileName}`;
  return { rootFolder, yearFolder, deptFolder, sampleFolder, fileName, fullPath };
}

export interface RequestIssue {
  id: string;
  department: 'SALE' | 'RD' | 'CO_SALE' | 'LOGISTIC' | 'OTHER';
  issueType: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionRemark?: string;
}

export interface SampleRequest {
  id: string;
  sampleNo: string;
  revision: string; // e.g. 'REV.00', 'REV.01'
  createdDate: string;
  createdTime: string;
  createdBy: string;
  saleName: string;
  saleEmail: string;
  department: string; // Department Code e.g. 'RM', 'RTC', 'FURTHER'
  departmentPrefix?: string; // e.g. 'RM', 'RTC', 'FUR'
  isLocked?: boolean;
  lockedSnapshot?: any;
  
  customerCode: string;
  customerName: string;
  customerGroup?: string;
  salesChannel?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  shipToCode?: string;
  
  sampleType: string;
  samplePurpose: string;
  purposeDetail?: string;
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  
  preparationDate: string;
  preparationDueTime?: string;
  preparationRemark?: string;
  deliveryDate: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  deliveryAddress: string;
  district: string;
  province: string;
  depot?: string;
  route: string;
  temperature: string;
  deliveryType: string;
  vehicleRequirement?: string;
  deliveryRemark?: string;
  requiredDocuments: string[];
  documentRequirements?: DocumentRequirementItem[];
  customerRequirement?: string;
  saleRemark?: string;
  internalRemark?: string;
  
  totalQty: number;
  totalValue: number;
  currentStatus: RequestStatus;
  currentProcess: string;
  currentOwner: string;
  slaStatus: 'NORMAL' | 'WARNING' | 'BREACHED';
  
  lines: SampleLine[];
  
  // System-Driven Breakdown Tasks
  logisticTask?: LogisticTaskData;
  rdTasks?: RDTaskData[];
  coSaleTask?: CoSaleTaskData;
  approvals?: ApprovalRecord[];
  emailLogs?: EmailLogEntry[];
  issues?: RequestIssue[];
  
  // Official Document Registry & Drive File Storage (Part 62)
  documentRegister?: {
    docId: string;
    registerDate: string;
    registerTime: string;
    checksum: string;
    driveUrl: string;
    status: 'REGISTERED' | 'ACTIVE' | 'ARCHIVED';
  };
  driveFile?: {
    fileId: string;
    fileName: string;
    folderPath: string;
    webViewLink: string;
    fileSizeKb: number;
    uploadedAt: string;
  };
  
  // Quick status flags for Parallel Processing Gate
  rdStatus: TaskStatus;
  coSaleStatus: TaskStatus;
  logisticStatus: TaskStatus;
  
  createdTimestamp: string;
  updatedTimestamp: string;
  completedTimestamp?: string;
}

export interface CompanySettings {
  companyNameTh: string;
  companyNameEn: string;
  companyLogoUrl: string;
  address: string;
  taxId: string;
  phone: string;
  email: string;
  docHeaderTitleTh: string;
  docHeaderTitleEn: string;
  docFooterNote: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type SLATier = 'NORMAL' | 'AT_RISK' | 'OVERDUE' | 'ESCALATION';

export function calculateSLATier(
  arg1: number | string | undefined,
  arg2?: string,
  isCompleted?: boolean
): {
  tier: SLATier;
  label: string;
  colorClass: string;
  bgClass: string;
  badgeClass: string;
} {
  let elapsedPercent = 50;

  if (typeof arg1 === 'number') {
    elapsedPercent = arg1;
  } else if (typeof arg1 === 'string' && arg2) {
    if (isCompleted) {
      elapsedPercent = 60; // Completed within SLA
    } else {
      const created = new Date(arg1).getTime() || Date.now() - 86400000;
      const target = new Date(arg2).getTime() || Date.now() + 86400000;
      const now = Date.now();
      const total = Math.max(1, target - created);
      const elapsed = Math.max(0, now - created);
      elapsedPercent = Math.round((elapsed / total) * 100);
    }
  }

  if (elapsedPercent > 150) {
    return {
      tier: 'ESCALATION',
      label: 'SLA Escalation (>150%)',
      colorClass: 'text-red-700 font-black',
      bgClass: 'bg-red-100 border-red-500',
      badgeClass: 'bg-red-600 text-white animate-pulse'
    };
  }
  if (elapsedPercent > 100) {
    return {
      tier: 'OVERDUE',
      label: 'SLA Overdue (>100%)',
      colorClass: 'text-rose-700 font-bold',
      bgClass: 'bg-rose-50 border-rose-300',
      badgeClass: 'bg-rose-500 text-white'
    };
  }
  if (elapsedPercent >= 80) {
    return {
      tier: 'AT_RISK',
      label: 'At Risk (>=80%)',
      colorClass: 'text-amber-700 font-bold',
      bgClass: 'bg-amber-50 border-amber-300',
      badgeClass: 'bg-amber-500 text-white'
    };
  }
  return {
    tier: 'NORMAL',
    label: 'Normal (<80%)',
    colorClass: 'text-emerald-700 font-medium',
    bgClass: 'bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-600 text-white'
  };
}

export interface CustomerMaster {
  customerCode: string;
  customerName: string;
  customerGroup: string;
  salesChannel?: string;
  saleOwner: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shipToCode: string;
  deliveryAddress: string;
  district: string;
  province: string;
  defaultRoute: string;
  defaultDepot?: string;
  defaultDeliveryTime: string;
  defaultDocuments: string;
  active: boolean;
}

export interface ProductMaster {
  itemCode: string;
  productName: string;
  category: string;
  deptCode: string;
  uom: string;
  kgPerBag?: number;
  kgPerUnit: number;
  storageType: string;
  temperature: string;
  shelfLife: string;
  standardPrice: number;
  active: boolean;
}
