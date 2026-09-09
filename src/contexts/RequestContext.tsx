import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  SampleRequest, RequestStatus, TaskStatus, 
  LogisticTaskData, RDTaskData, CoSaleTaskData, 
  ApprovalRecord, EmailLogEntry, SampleLine,
  RDDepartmentMaster, DocumentRunningNo, AuditLogEntry,
  VoidedSampleNo, ReadyToDeliverGateResult, EmailEventCode,
  formatSamplePdfFileName, getSamplePdfDrivePath,
  CompanySettings, RequestIssue, IssueDecision
} from '../types';
import { 
  INITIAL_RD_DEPARTMENTS, INITIAL_RUNNING_NUMBERS, 
  INITIAL_AUDIT_LOGS, INITIAL_VOIDED_NUMBERS, 
  buildSampleNumber, checkReadyToDeliverGate,
  incrementRevisionString
} from '../lib/runningNumberService';
import { useAuth } from './AuthContext';
import * as sheetService from '../services/sheetService';
import { dispatchNotification } from '../services/notificationEngine';

interface CreateSamplePayload {
  sampleNo?: string;
  department: string;
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
  preparationDate?: string;
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
  documentRequirements?: any[];
  customerRequirement?: string;
  saleRemark?: string;
  lines: (Omit<SampleLine, 'id'> | SampleLine)[];
  isDraft?: boolean;
}

interface RequestContextType {
  requests: SampleRequest[];
  isLoading: boolean;
  selectedRequest: SampleRequest | null;
  setSelectedRequestId: (id: string | null) => void;
  getNextSampleNo: (deptCode: string) => string;
  createRequest: (payload: CreateSamplePayload) => Promise<SampleRequest>;
  logisticPrecheck: (
    sampleNo: string, 
    data: { 
      feasibility: 'Available' | 'Available with Change' | 'Not Available' | 'FEASIBLE' | 'ALTERNATIVE_PROPOSED' | 'NOT_FEASIBLE'; 
      route?: string; 
      proposedDate?: string; 
      proposedTimeFrom?: string;
      proposedTimeTo?: string;
      proposedRoute?: string;
      proposedDepot?: string;
      remark?: string;
      checkerName?: string;
      checkerEmail?: string;
    }
  ) => Promise<void>;
  approveRequest: (sampleNo: string, approverName: string, approverEmail: string, comment?: string) => Promise<void>;
  rejectRequest: (sampleNo: string, reason: string, approverName?: string, approverEmail?: string) => Promise<void>;
  requestRevision: (sampleNo: string, sections: string, remark: string, approverName?: string, approverEmail?: string) => Promise<void>;
  completeRdTask: (sampleNo: string, data: { lot: string; expiryDate: string; actualQty: number; remark?: string }) => void;
  completeCoSaleTask: (sampleNo: string, data: { soNumber: string; soDate: string; erpStatus: 'RELEASED' | 'DRAFT'; transactionType?: CoSaleTaskData['transactionType'] }) => void;
  completeLogisticAssignment: (sampleNo: string, data: { vehicleType: string; vehicleNo: string; driverName: string; driverPhone: string }) => void;
  advanceDeliveryPipeline: (sampleNo: string, nextStatus: RequestStatus, extra?: { podUrl?: string; receiverName?: string }) => void;
  recentEmails: EmailLogEntry[];
  dismissEmailNotice: (id: string) => void;
  
  // Company Settings (Part 80)
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<void>;
  
  // Issue Tracking (Parts 72, 73, 74, 75)
  reportIssue: (sampleNo: string, issue: Omit<RequestIssue, 'id' | 'reportedAt' | 'status'>) => Promise<void>;
  resolveIssue: (sampleNo: string, issueId: string, resolutionRemark: string) => Promise<void>;
  routeIssueToSales: (sampleNo: string, issueId: string) => Promise<void>;
  applyIssueDecision: (sampleNo: string, issueId: string, decision: IssueDecision, remark: string, newDeliveryDate?: string) => Promise<void>;
  
  // Updates for Task Workflows
  updateCoSaleTask: (sampleNo: string, data: Partial<CoSaleTaskData>) => void;
  updateLogisticTask: (sampleNo: string, data: Partial<LogisticTaskData>) => void;

  // RD Department Master & Sequence APIs (Parts 6, 8, 9, 10, 12, 16, 18)
  rdDepartments: RDDepartmentMaster[];
  runningNumbers: DocumentRunningNo[];
  auditLogs: AuditLogEntry[];
  voidedNumbers: VoidedSampleNo[];
  customers: any[];
  products: any[];
  refreshSequences: () => Promise<void>;
  saveRDDepartment: (dept: Partial<RDDepartmentMaster>) => Promise<void>;
  setupRunningNumber: (payload: any) => Promise<void>;
  skipRunningNumber: (payload: any) => Promise<void>;
  generateSampleNumberServer: (rdDeptCode: string, year?: number) => Promise<{ sampleNo: string; revision: string }>;
  changeDepartmentOnDraft: (sampleNo: string, newDeptCode: string, reason: string) => Promise<{ newSampleNo: string; revision: string }>;
  evaluateGate: (sampleNo: string) => ReadyToDeliverGateResult;
  logAuditEntry: (action: string, targetId: string, targetType: string, details: string) => Promise<void>;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

// Initial demo requests representing the System-Driven Workflow stages
const INITIAL_REQUESTS: SampleRequest[] = [];

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyNameTh: 'ชื่อบริษัท',
  companyNameEn: 'COMPANY NAME',
  companyLogoUrl: '',
  address: '',
  taxId: '',
  phone: '',
  email: 'operations@example.com',
  docHeaderTitleTh: 'คำขอตัวอย่าง',
  docHeaderTitleEn: 'SAMPLE REQUEST',
  docFooterNote: 'เอกสารทางการสำหรับฝ่ายขายและปฏิบัติการจัดส่งสินค้าตัวอย่าง',
  updatedAt: new Date().toISOString()
};

export function RequestProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SampleRequest[]>(INITIAL_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentEmails, setRecentEmails] = useState<EmailLogEntry[]>([]);

  // Company & Document Settings (Part 80)
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem('SAMPLEFLOW_COMPANY_SETTINGS');
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_SETTINGS;
    } catch {
      return DEFAULT_COMPANY_SETTINGS;
    }
  });

  const updateCompanySettings = async (settings: Partial<CompanySettings>) => {
    const updated = {
      ...companySettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || 'Administrator'
    };
    setCompanySettings(updated);
    try {
      localStorage.setItem('SAMPLEFLOW_COMPANY_SETTINGS', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save error for company settings:', e);
    }
  };

  // RD Departments, Running Numbers, and Audit Logs State (Parts 6, 8, 9, 12, 16)
  const [rdDepartments, setRdDepartments] = useState<RDDepartmentMaster[]>(INITIAL_RD_DEPARTMENTS);
  const [runningNumbers, setRunningNumbers] = useState<DocumentRunningNo[]>(INITIAL_RUNNING_NUMBERS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [voidedNumbers, setVoidedNumbers] = useState<VoidedSampleNo[]>(INITIAL_VOIDED_NUMBERS);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Sync with server API on mount and on demand
  const refreshSequences = async () => {
    try {
      const token = 
        sessionStorage.getItem('google_access_token') || 
        localStorage.getItem('google_access_token') || 
        sessionStorage.getItem('oauth_token') || 
        localStorage.getItem('oauth_token') || 
        sessionStorage.getItem('gsi_token') || 
        localStorage.getItem('gsi_token') || 
        '';
      const spreadsheetId = 
        sessionStorage.getItem('spreadsheet_id') || 
        localStorage.getItem('spreadsheet_id') || 
        '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (spreadsheetId) {
        headers['x-spreadsheet-id'] = spreadsheetId;
      }

      const [deptRes, seqRes, auditRes, voidRes, custRes, prodRes, reqRes, issueRes] = await Promise.all([
        fetch('/api/rd-departments', { headers }),
        fetch('/api/sequence/list', { headers }),
        fetch('/api/audit-logs', { headers }),
        fetch('/api/voided-numbers', { headers }),
        fetch('/api/services/getCustomers', { headers }),
        fetch('/api/services/getProducts', { headers }),
        fetch('/api/services/getSampleRequests', { headers }),
        fetch('/api/services/getIssues', { headers })
      ]);

      let issueRows: any[] = [];
      if (issueRes.ok) {
        const issuePayload = await issueRes.json();
        if (issuePayload.success && Array.isArray(issuePayload.data)) issueRows = issuePayload.data;
      }

      if (deptRes.ok) {
        const d = await deptRes.json();
        if (d.success && d.data) setRdDepartments(d.data);
      }
      if (seqRes.ok) {
        const s = await seqRes.json();
        if (s.success && s.data) setRunningNumbers(s.data);
      }
      if (auditRes.ok) {
        const a = await auditRes.json();
        if (a.success && a.data) setAuditLogs(a.data);
      }
      if (voidRes.ok) {
        const v = await voidRes.json();
        if (v.success && v.data) setVoidedNumbers(v.data);
      }
      if (custRes.ok) {
        const c = await custRes.json();
        if (c.success && c.data) {
          const mappedCust = c.data.map((item: any) => ({
            customerCode: item.Customer_Code || '',
            customerName: item.Customer_Name || '',
            customerGroup: item.Customer_Group || '',
            salesChannel: item.Sales_Channel || '',
            saleOwner: item.Sale_Owner || '',
            contactName: item.Contact_Name || '',
            contactPhone: item.Contact_Phone || '',
            contactEmail: item.Contact_Email || '',
            shipToCode: item.Ship_To_Code || '',
            deliveryAddress: item.Delivery_Address || '',
            district: item.District || '',
            province: item.Province || '',
            defaultRoute: item.Default_Route || '',
            defaultDepot: item.Default_Depot || '',
            defaultDeliveryTime: item.Default_Delivery_Time || '',
            defaultDocuments: item.Default_Documents || '',
            active: item.Active === 'TRUE' || item.Active === true
          }));
          setCustomers(mappedCust);
        }
      }
      if (prodRes.ok) {
        const p = await prodRes.json();
        if (p.success && p.data) {
          const mappedProd = p.data.map((item: any) => ({
            itemCode: item.Item_Code || '',
            productName: item.Product_Name || '',
            category: item.Category || '',
            deptCode: item.Product_Type || '',
            uom: item.UOM || '',
            kgPerBag: Number(item.Kg_Per_Bag) || 0,
            kgPerUnit: Number(item.Kg_Per_Unit) || 0,
            storageType: item.Storage_Type || '',
            temperature: item.Temperature || '',
            shelfLife: item.Shelf_Life || '',
            standardPrice: Number(item.Standard_Price) || 0,
            active: item.Active === 'TRUE' || item.Active === true
          }));
          setProducts(mappedProd);
        }
      }
      if (reqRes.ok) {
        const r = await reqRes.json();
        if (r.success && r.data) {
          const mappedReqs = r.data.map((item: any) => ({
            id: item.Sample_No || '',
            sampleNo: item.Sample_No || '',
            revision: item.Revision_No || 'REV.00',
            createdDate: item.Created_Date || '',
            createdTime: item.Created_Time || '',
            createdBy: item.Created_By || '',
            saleName: item.Sale_Name || '',
            saleEmail: item.Sale_Email || '',
            department: item.Department || '',
            departmentPrefix: item.RD_Department_Prefix || '',
            customerCode: item.Customer_Code || '',
            customerName: item.Customer_Name || '',
            contactName: item.Contact_Name || '',
            contactPhone: item.Contact_Phone || '',
            contactEmail: item.Contact_Email || '',
            sampleType: item.Sample_Type || '',
            samplePurpose: item.Sample_Purpose || '',
            purposeDetail: item.Purpose_Detail || '',
            priority: item.Priority || 'NORMAL',
            deliveryDate: item.Delivery_Date || '',
            deliveryTimeFrom: item.Delivery_Time_From || '',
            deliveryTimeTo: item.Delivery_Time_To || '',
            deliveryAddress: item.Delivery_Address || '',
            district: item.District || '',
            province: item.Province || '',
            depot: item.Depot || '',
            route: item.Route || '',
            temperature: item.Temperature || '',
            deliveryType: item.Delivery_Type || '',
            requiredDocuments: item.Required_Documents ? item.Required_Documents.split(',').map((s: string) => s.trim()) : [],
            totalQty: Number(item.Total_Qty) || 0,
            totalValue: Number(item.Grand_Total) || 0,
            currentStatus: (item.Current_Status || 'DRAFT') as any,
            isLocked: ['APPROVED', 'PROCESSING', 'READY TO DELIVER', 'PICKED UP', 'OUT FOR DELIVERY', 'ARRIVED', 'DELIVERED', 'CUSTOMER RECEIVED', 'COMPLETED'].includes(item.Current_Status),
            currentProcess: item.Current_Process || '',
            currentOwner: item.Current_Owner || '',
            lines: Array.isArray(item.lines) ? item.lines.map((l: any) => ({
              id: l.Line_ID || Math.random(),
              itemCode: l.Item_Code || '',
              productName: l.Product_Name || '',
              requestQty: Number(l.Request_Qty) || 0,
              uom: l.UOM || '',
              lineValue: Number(l.Line_Value) || 0
            })) : [],
            rdStatus: item.RD_Status || 'PENDING',
            coSaleStatus: item.CoSale_Status || 'PENDING',
            logisticStatus: item.Logistic_Status || 'PENDING',
            createdTimestamp: item.Created_Timestamp || '',
            updatedTimestamp: item.Updated_Timestamp || '',
            issues: issueRows.filter((issue: any) => (issue.Sample_No || issue.sampleNo) === (item.Sample_No || item.sampleNo)).map((issue: any) => ({
              id: issue.Issue_ID || issue.id || '',
              department: issue.Process || issue.department || 'OTHER',
              issueType: issue.Issue_Type || issue.issueType || 'OTHER',
              description: issue.Description || issue.description || '',
              reportedBy: issue.Owner || issue.reportedBy || 'System',
              reportedAt: issue.Created_Time || issue.reportedAt || '',
              status: issue.Status || issue.status || 'OPEN',
              resolvedBy: issue.Resolved_By || issue.resolvedBy || '',
              resolvedAt: issue.Resolved_Time || issue.resolvedAt || '',
              resolutionRemark: issue.Resolution || issue.resolutionRemark || ''
            }))
          }));
          setRequests(mappedReqs);
        }
      }
    } catch (err) {
      console.warn('Backend master data API sync note:', err);
    }
  };

  // Auto-sync interval (every 60 seconds)
  useEffect(() => {
    refreshSequences();
    const interval = setInterval(refreshSequences, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshSequences();
  }, []);

  // Save or Update RD Department (Part 6)
  const saveRDDepartment = async (dept: Partial<RDDepartmentMaster>) => {
    try {
      const res = await fetch('/api/rd-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept, userEmail: user?.email || 'admin@example.com' })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'ไม่สามารถบันทึกแผนก RD ได้');
      }
      await refreshSequences();
    } catch (err: any) {
      // Local fallback
      const now = new Date().toISOString().split('T')[0];
      setRdDepartments(prev => {
        const idx = prev.findIndex(d => d.RD_Department_Code.toUpperCase() === (dept.RD_Department_Code || '').toUpperCase());
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...dept, Updated_Date: now, Updated_By: user?.email || 'admin@example.com' };
          return updated;
        } else {
          const newDept: RDDepartmentMaster = {
            RD_Department_ID: `RD-${String(prev.length + 1).padStart(2, '0')}`,
            RD_Department_Code: (dept.RD_Department_Code || '').toUpperCase(),
            RD_Department_Name_TH: dept.RD_Department_Name_TH || '',
            RD_Department_Name_EN: dept.RD_Department_Name_EN || '',
            Sample_No_Prefix: (dept.Sample_No_Prefix || dept.RD_Department_Code || '').toUpperCase(),
            Default_Email: dept.Default_Email || '',
            Supervisor_Name: dept.Supervisor_Name || '',
            Supervisor_Email: dept.Supervisor_Email || '',
            Active: dept.Active !== undefined ? dept.Active : true,
            Sort_Order: dept.Sort_Order || prev.length + 1,
            Created_Date: now,
            Created_By: user?.email || 'admin@example.com',
            Updated_Date: now,
            Updated_By: user?.email || 'admin@example.com'
          };
          return [...prev, newDept];
        }
      });
    }
  };

  // Setup / Initialize Running Number (Part 8, 9, 10, 12)
  const setupRunningNumber = async (payload: any) => {
    const res = await fetch('/api/sequence/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'ไม่สามารถบันทึกการตั้งค่า Running Number ได้');
    }
    await refreshSequences();
  };

  // Skip Running Number (Part 12)
  const skipRunningNumber = async (payload: any) => {
    const res = await fetch('/api/sequence/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'ไม่สามารถข้ามเลข Running Number ได้');
    }
    await refreshSequences();
  };

  // Server-Side Generate Sample Number (Part 13, 14, 15)
  const generateSampleNumberServer = async (
    rdDeptCode: string, 
    year: number = new Date().getFullYear()
  ): Promise<{ sampleNo: string; revision: string }> => {
    try {
      const res = await fetch('/api/sequence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rdDepartmentCode: rdDeptCode,
          year,
          userEmail: user?.email || 'sale@example.com',
          userName: user?.name || 'Sale Specialist'
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'ไม่สามารถสร้างเลข Sample Number ได้');
      }

      await refreshSequences();
      return {
        sampleNo: data.sampleNo,
        revision: data.revision || 'REV.00'
      };
    } catch (err: any) {
      // Local fallback with initialization check (Part 11)
      const dept = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === rdDeptCode.toUpperCase());
      if (!dept) throw new Error(`ไม่พบแผนก RD: ${rdDeptCode}`);

      const record = runningNumbers.find(r => r.RD_Department_Code.toUpperCase() === rdDeptCode.toUpperCase() && r.Year === year);
      if (!record || !record.Initialized) {
        throw new Error(`ยังไม่ได้ตั้งค่าเลขเริ่มต้นของเอกสารสำหรับ ${rdDeptCode} ปี ${year} กรุณาติดต่อ Administrator`);
      }

      const allocated = record.Next_No;
      record.Last_Used_No = allocated;
      record.Next_No = allocated + 1;
      const numStr = String(allocated).length >= record.Digit_Length ? String(allocated) : String(allocated).padStart(record.Digit_Length, '0');
      const generatedNo = `SRI-${dept.Sample_No_Prefix.toUpperCase()}${numStr}-${year}`;
      return { sampleNo: generatedNo, revision: 'REV.00' };
    }
  };

  // Change Department on Draft & VOID previous number (Part 16)
  const changeDepartmentOnDraft = async (
    sampleNo: string, 
    newDeptCode: string, 
    reason: string
  ): Promise<{ newSampleNo: string; revision: string }> => {
    const target = requests.find(r => r.sampleNo === sampleNo);
    if (!target) throw new Error('ไม่พบคำขอตัวอย่าง');
    if (target.currentStatus !== RequestStatus.DRAFT) {
      throw new Error('ไม่อนุญาตให้เปลี่ยนผู้จัดเตรียมตัวอย่างเนื่องจากคำขอนี้พ้นสถานะ Draft แล้ว');
    }

    const res = await fetch('/api/sequence/change-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldSampleNo: sampleNo,
        newDepartmentCode: newDeptCode,
        reason,
        userEmail: user?.email || 'sale@example.com',
        userName: user?.name || 'Sale Representative',
        role: user?.role || 'SALE'
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'ไม่สามารถเปลี่ยนผู้จัดเตรียมตัวอย่างได้');
    }

    setRequests(prev => prev.map(r => {
      if (r.sampleNo !== sampleNo) return r;
      return {
        ...r,
        sampleNo: data.newSampleNo,
        department: newDeptCode,
        revision: 'REV.00'
      };
    }));

    await refreshSequences();
    return data;
  };

  // Evaluate Gate for a request
  const evaluateGate = (sampleNo: string): ReadyToDeliverGateResult => {
    const req = requests.find(r => r.sampleNo === sampleNo);
    if (!req) {
      return {
        isReady: false,
        blockers: ['ไม่พบคำขอตัวอย่างในระบบ'],
        criteria: { rdReady: false, soCompleted: false, vehicleConfirmed: false }
      };
    }
    return checkReadyToDeliverGate(req);
  };

  const logAuditEntry = async (action: string, targetId: string, targetType: string, details: string) => {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetId,
          targetType,
          details,
          userEmail: user?.email || 'system@example.com',
          userName: user?.name || user?.email?.split('@')[0] || 'System',
          role: user?.role || 'USER'
        })
      });
      await refreshSequences();
    } catch (err) {
      console.warn('Could not POST audit log, updating locally:', err);
      // fallback local update
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const newLog = {
        id: `AUD-${Date.now()}`,
        timestamp: nowStr,
        action,
        userEmail: user?.email || 'system@example.com',
        userName: user?.name || 'System',
        role: user?.role || 'USER',
        targetType,
        targetId,
        details
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Quick fallback for preview
  const getNextSampleNo = (deptCode: string): string => {
    const year = new Date().getFullYear();
    const deptUpper = deptCode.toUpperCase();
    const dept = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === deptUpper);
    const prefix = dept?.Sample_No_Prefix || deptUpper;
    const rec = runningNumbers.find(r => r.RD_Department_Code.toUpperCase() === deptUpper && r.Year === year);
    const nextNo = rec ? rec.Next_No : 1;
    return buildSampleNumber(prefix, nextNo, year, rec?.Digit_Length || 3);
  };

  const selectedRequest = requests.find(r => r.id === selectedRequestId || r.sampleNo === selectedRequestId) || null;

  const dismissEmailNotice = (id: string) => {
    setRecentEmails(prev => prev.filter(e => e.emailLogId !== id));
  };

  const triggerEmailNotification = (entry: EmailLogEntry) => {
    setRecentEmails(prev => [entry, ...prev.slice(0, 4)]);
  };

  // 1. Sale Submits Request -> System Validates -> Routes to LOGISTIC PRE-CHECK
  const createRequest = async (payload: CreateSamplePayload): Promise<SampleRequest> => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    // Part 15 — Generate Sample No on first Save Draft or Submit
    let finalSampleNo = payload.sampleNo || '';
    let finalRevision = 'REV.00';

    if (!finalSampleNo || finalSampleNo.includes('จะสร้าง') || finalSampleNo.trim() === '') {
      const generated = await generateSampleNumberServer(payload.department, 2026);
      finalSampleNo = generated.sampleNo;
      finalRevision = generated.revision || 'REV.00';
    }

    const totalQty = payload.lines.reduce((sum, l) => sum + (Number(l.requestQty) || 0), 0);
    const totalValue = payload.lines.reduce((sum, l) => sum + ((Number(l.requestQty) || 0) * (Number(l.price) || 0)), 0);

    const initialStatus = payload.isDraft ? RequestStatus.DRAFT : RequestStatus.LOGISTIC_PRE_CHECK;
    const initialProcess = payload.isDraft ? 'DRAFT_SAVED' : 'LOGISTIC_PRECHECK';
    const initialOwner = payload.isDraft ? `${user?.name || 'Sale'} (Owner)` : 'Logistic Team (Pre-check)';

    const deptObj = rdDepartments.find(d => d.RD_Department_Code.toUpperCase() === payload.department.toUpperCase());

    const newRequest: SampleRequest = {
      id: `REQ-${Date.now()}`,
      sampleNo: finalSampleNo,
      revision: finalRevision,
      createdDate: dateStr,
      createdTime: timeStr,
      createdBy: user?.email || 'EMP-SALE',
      saleName: user?.name || 'Sale Specialist',
      saleEmail: user?.email || 'sale@example.com',
      department: payload.department,
      departmentPrefix: deptObj?.Sample_No_Prefix || payload.department,
      isLocked: false,
      customerCode: payload.customerCode,
      customerName: payload.customerName,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      sampleType: payload.sampleType,
      samplePurpose: payload.samplePurpose,
      purposeDetail: payload.purposeDetail,
      priority: payload.priority,
      preparationDate: payload.preparationDate || dateStr,
      preparationDueTime: payload.preparationDueTime || '15:00',
      preparationRemark: payload.preparationRemark || '',
      deliveryDate: payload.deliveryDate,
      deliveryTimeFrom: payload.deliveryTimeFrom,
      deliveryTimeTo: payload.deliveryTimeTo,
      deliveryAddress: payload.deliveryAddress,
      district: payload.district,
      province: payload.province,
      depot: payload.depot || 'DEPOT-BKK-01',
      route: payload.route,
      temperature: payload.temperature,
      deliveryType: payload.deliveryType,
      vehicleRequirement: payload.vehicleRequirement || '4-Wheel Chilled Vehicle',
      deliveryRemark: payload.deliveryRemark || '',
      requiredDocuments: payload.requiredDocuments,
      documentRequirements: payload.documentRequirements || [],
      customerRequirement: payload.customerRequirement,
      saleRemark: payload.saleRemark,
      totalQty,
      totalValue,
      currentStatus: initialStatus,
      currentProcess: initialProcess,
      currentOwner: initialOwner,
      slaStatus: 'NORMAL',
      rdStatus: 'PENDING',
      coSaleStatus: 'PENDING',
      logisticStatus: 'PENDING',
      lines: payload.lines.map((line, idx) => ({
        ...line,
        id: `L-${Date.now()}-${idx}`
      })),
      createdTimestamp: now.toISOString(),
      updatedTimestamp: now.toISOString()
    };

    // If submitted, notify Logistic
    if (!payload.isDraft) {
      const emailLog: EmailLogEntry = {
        emailLogId: `EML-${Date.now()}`,
        sampleNo: finalSampleNo,
        eventCode: 'SUBMITTED_FOR_PRECHECK',
        sendDate: dateStr,
        sendTime: timeStr,
        toEmail: 'logistic.precheck@example.com',
        ccEmail: newRequest.saleEmail,
        subject: `[LOGISTIC PRE-CHECK] New Request ${finalSampleNo} - ${payload.customerName}`,
        templateCode: 'TMPL_LOGISTIC_PRECHECK',
        sendStatus: 'SENT',
        body: `คำขอใหม่ ${finalSampleNo} (${finalRevision}) จัดส่ง ${payload.deliveryDate} (${payload.deliveryTimeFrom}-${payload.deliveryTimeTo}) เส้นทาง ${payload.route} รอ Logistic ตรวจสอบความเป็นไปได้`
      };
      newRequest.emailLogs = [emailLog];
      triggerEmailNotification(emailLog);
    }

    setRequests(prev => [newRequest, ...prev]);

    // Central Google Sheets Service Layer Sync (Part 2 — Service Layer กลาง)
    sheetService.createSampleRequest(newRequest)
      .catch(err => console.warn('Central Sheet Service sync notification:', err.message));


    return newRequest;
  };

  // 2. Logistic Pre-check (PART 60) -> Routes to Sale Manager Approval
  const logisticPrecheck = async (
    sampleNo: string, 
    data: { 
      feasibility: 'Available' | 'Available with Change' | 'Not Available' | 'FEASIBLE' | 'ALTERNATIVE_PROPOSED' | 'NOT_FEASIBLE'; 
      route?: string; 
      proposedDate?: string; 
      proposedTimeFrom?: string;
      proposedTimeTo?: string;
      proposedRoute?: string;
      proposedDepot?: string;
      remark?: string;
      checkerName?: string;
      checkerEmail?: string;
    }
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const checker = data.checkerName || user?.name || 'Logistic Specialist';
    const checkerMail = data.checkerEmail || user?.email || 'logistic@example.com';

    // Normalize feasibility code
    let normFeas: 'Available' | 'Available with Change' | 'Not Available' = 'Available';
    if (data.feasibility === 'Available with Change' || data.feasibility === 'ALTERNATIVE_PROPOSED') {
      normFeas = 'Available with Change';
    } else if (data.feasibility === 'Not Available' || data.feasibility === 'NOT_FEASIBLE') {
      normFeas = 'Not Available';
    }

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const logTask: LogisticTaskData = {
        taskId: req.logisticTask?.taskId || `LOG-${Date.now()}`,
        sampleNo: req.sampleNo,
        precheckStatus: normFeas === 'Available' ? 'PASS' : 'PROPOSE_CHANGE',
        requestedDate: req.deliveryDate,
        requestedTimeFrom: req.deliveryTimeFrom,
        requestedTimeTo: req.deliveryTimeTo,
        deliveryAddress: req.deliveryAddress,
        province: req.province,
        route: data.proposedRoute || data.route || req.route,
        temperature: req.temperature,
        estimatedWeight: req.lines.reduce((s, l) => s + (l.weight || l.requestQty || 0), 0),
        feasibility: normFeas,
        proposedDate: data.proposedDate,
        proposedTimeFrom: data.proposedTimeFrom,
        proposedTimeTo: data.proposedTimeTo,
        proposedRoute: data.proposedRoute,
        proposedDepot: data.proposedDepot,
        precheckRemark: data.remark || (normFeas === 'Available' ? 'ตรวจสอบรอบรถและอุณหภูมิแล้ว ดำเนินการได้ตามกำหนด' : `มีข้อเสนอแนะปรับเปลี่ยน: ${data.remark || '-'}`),
        precheckBy: checker,
        precheckTime: `${dateStr} ${timeStr}`,
        taskStatus: 'PENDING',
        slaStatus: 'NORMAL'
      };

      const emailLog: EmailLogEntry = {
        emailLogId: `EML-${Date.now()}`,
        sampleNo: req.sampleNo,
        eventCode: 'PRECHECK_PASSED_WAIT_APPROVAL',
        sendDate: dateStr,
        sendTime: timeStr,
        toEmail: 'salemanager@example.com',
        ccEmail: req.saleEmail,
        subject: `[WAITING APPROVAL] ${req.sampleNo} : ผ่านการตรวจสอบโลจิสติกส์แล้ว (${normFeas}) - ${req.customerName}`,
        templateCode: 'TMPL_APPROVAL_REQUEST',
        sendStatus: 'SENT',
        body: `Logistic (${checker}) ได้ทำการ Pre-check คำขอ ${req.sampleNo} เรียบร้อยแล้ว (ผลการตรวจ: ${normFeas}) ${data.remark ? `หมายเหตุ: ${data.remark}` : ''} กรุณาพิจารณาอนุมัติในระบบ`
      };

      triggerEmailNotification(emailLog);

      return {
        ...req,
        route: data.proposedRoute || data.route || req.route,
        depot: data.proposedDepot || req.depot,
        currentStatus: RequestStatus.WAITING_APPROVAL,
        currentProcess: 'SALE_MANAGER_APPROVAL',
        currentOwner: 'Sale Manager (Pending Approval)',
        logisticTask: logTask,
        emailLogs: [emailLog, ...(req.emailLogs || [])],
        updatedTimestamp: now.toISOString()
      };
    }));

    // Persist changes to Google Sheets!
    try {
      await sheetService.updateSampleRequest(sampleNo, {
        Current_Status: RequestStatus.WAITING_APPROVAL,
        Current_Process: 'SALE_MANAGER_APPROVAL',
        Current_Owner: 'Sale Manager (Pending Approval)',
        Route: data.proposedRoute || data.route || '',
        Depot: data.proposedDepot || '',
        Logistic_Status: normFeas === 'Available' ? 'PASS' : 'PROPOSE_CHANGE'
      });
    } catch (err: any) {
      console.warn('Update Google Sheets for precheck failed:', err.message);
    }

    // Central Audit Log
    sheetService.writeAuditLog({
      timestamp: `${dateStr} ${timeStr}`,
      userEmail: checkerMail,
      userName: checker,
      action: 'LOGISTIC_PRECHECK_CONFIRM',
      module: 'LOGISTIC',
      targetId: sampleNo,
      details: `Logistic Pre-check confirmed with feasibility '${normFeas}'. Route: ${data.proposedRoute || data.route || '-'}, Depot: ${data.proposedDepot || '-'}, Remark: ${data.remark || 'N/A'}`
    }).catch(err => console.warn('Audit log write error:', err.message));
  };

  // 3. Sale Manager Approves (PART 62) -> 11 Actions Execution Pipeline!
  const approveRequest = async (sampleNo: string, approverName: string, approverEmail: string, comment?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const finalApproverName = approverName || user?.name || 'Sale Manager';
    const finalApproverEmail = approverEmail || user?.email || 'manager@example.com';
    const targetRequest = requests.find(req => req.sampleNo === sampleNo);
    if (!targetRequest) throw new Error('ไม่พบคำขอตัวอย่างที่ต้องการอนุมัติ');
    if (targetRequest.currentStatus !== RequestStatus.WAITING_APPROVAL || targetRequest.isLocked || targetRequest.approvals?.some(record => record.approvalStatus === 'APPROVED')) {
      throw new Error('คำขอนี้ผ่านการอนุมัติหรือถูกดำเนินการไปแล้ว ไม่สามารถอนุมัติซ้ำได้');
    }

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      // 1. Save Approval
      const approval: ApprovalRecord = {
        approvalId: `APP-${Date.now()}`,
        sampleNo: req.sampleNo,
        approvalLevel: 'Sale Manager',
        approverName: finalApproverName,
        approverEmail: finalApproverEmail,
        requestTime: req.createdTimestamp,
        approvalStatus: 'APPROVED',
        approvalDate: dateStr,
        approvalTime: timeStr,
        slaStatus: 'NORMAL'
      };

      // 2. Lock Approved Snapshot
      const lockedSnapshot = JSON.parse(JSON.stringify(req));

      // 4. Create RD Task
      const rdTasks: RDTaskData[] = req.lines.map((line, idx) => ({
        taskId: `RD-${Date.now()}-${idx}`,
        sampleNo: req.sampleNo,
        assignedTo: `${req.department || 'RD'} Specialist`,
        assignedEmail: 'rd@example.com',
        taskCreateTime: `${dateStr} ${timeStr}`,
        requiredDate: req.preparationDate || req.deliveryDate,
        itemCode: line.itemCode,
        productName: line.productName,
        requiredQty: line.requestQty,
        lot: line.lot || `LOT-${dateStr.replace(/-/g, '')}-0${idx + 1}`,
        preparationRemark: req.preparationRemark || line.remark || 'เตรียมตามสูตรและมาตรฐานคุณภาพ',
        taskStatus: 'PENDING',
        slaStatus: 'NORMAL'
      }));

      // 5. Create Co Sale Task
      const coSaleTask: CoSaleTaskData = {
        taskId: `COS-${Date.now()}`,
        sampleNo: req.sampleNo,
        assignedTo: 'Co-Sale Specialist',
        assignedEmail: 'cosale@example.com',
        customerCode: req.customerCode,
        shipTo: req.shipToCode || req.customerCode,
        sampleType: req.sampleType,
        taskCreateTime: `${dateStr} ${timeStr}`,
        erpStatus: 'NOT_CREATED',
        documentStatus: 'PENDING',
        taskStatus: 'PENDING',
        slaStatus: 'NORMAL'
      };

      // 6. Create Logistic Final Assignment Task
      const updatedLogisticTask: LogisticTaskData = {
        ...(req.logisticTask || {
          taskId: `LOG-${Date.now()}`,
          sampleNo: req.sampleNo,
          precheckStatus: 'PASS',
          requestedDate: req.deliveryDate,
          requestedTimeFrom: req.deliveryTimeFrom,
          requestedTimeTo: req.deliveryTimeTo,
          deliveryAddress: req.deliveryAddress,
          province: req.province,
          route: req.route,
          temperature: req.temperature,
          estimatedWeight: req.lines.reduce((s, l) => s + (l.weight || l.requestQty || 0), 0),
          feasibility: 'Available',
          taskStatus: 'PENDING',
          slaStatus: 'NORMAL'
        }),
        taskStatus: 'PENDING'
      };

      // 7. Generate Official Sample Request PDF metadata (Part 65: {SampleNo}_REV{Revision}.pdf)
      const pdfFileName = formatSamplePdfFileName(req.sampleNo, req.revision);

      // 8. Save PDF to Drive (Part 66: Sample Request/{Year}/{Dept}/{SampleNo}/{File})
      const driveHierarchy = getSamplePdfDrivePath(req.sampleNo, req.department, 2026, req.revision);
      const driveFile = {
        fileId: `DRV-PDF-${Date.now()}`,
        fileName: pdfFileName,
        folderPath: `Google Drive/${driveHierarchy.rootFolder}/${driveHierarchy.yearFolder}/${driveHierarchy.deptFolder}/${driveHierarchy.sampleFolder}`,
        webViewLink: `https://drive.google.com/file/d/sample_req_${req.sampleNo.replace(/[^a-zA-Z0-9_-]/g, '_')}/view`,
        fileSizeKb: 184,
        uploadedAt: `${dateStr} ${timeStr}`
      };

      // 9. Register Document in Document Register
      const documentRegister: {
        docId: string;
        registerDate: string;
        registerTime: string;
        checksum: string;
        driveUrl: string;
        status: 'REGISTERED' | 'ACTIVE' | 'ARCHIVED';
      } = {
        docId: `REG-${req.sampleNo}`,
        registerDate: dateStr,
        registerTime: timeStr,
        checksum: `SHA256:${Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
        driveUrl: driveFile.webViewLink,
        status: 'REGISTERED'
      };

      // 10. Send Auto Email Notifications (Part 67-68 Email Events)
      dispatchNotification({
        eventCode: EmailEventCode.SAMPLE_APPROVED,
        request: req,
        actor: { name: finalApproverName, email: finalApproverEmail, role: 'SALE_MANAGER' }
      }).then(log => triggerEmailNotification(log));

      dispatchNotification({
        eventCode: EmailEventCode.APPROVED_DOCUMENT_GENERATED,
        request: req,
        actor: { name: finalApproverName, email: finalApproverEmail, role: 'SALE_MANAGER' }
      }).then(log => triggerEmailNotification(log));

      const emailLog: EmailLogEntry = {
        emailLogId: `EML-${Date.now()}`,
        sampleNo: req.sampleNo,
        eventCode: EmailEventCode.SAMPLE_APPROVED,
        sendDate: dateStr,
        sendTime: timeStr,
        toEmail: `${req.saleEmail}, rd@example.com, cosale@example.com, logistic@example.com`,
        ccEmail: `${finalApproverEmail}, audit@example.com`,
        subject: `[SAMPLE APPROVED] ${req.sampleNo} (${req.revision}) : อนุมัติแล้ว พร้อมเอกสาร Official PDF - ${req.customerName}`,
        templateCode: 'TMPL_SAMPLE_APPROVED',
        attachmentFile: pdfFileName,
        sendStatus: 'SENT',
        body: `คำขอตัวอย่าง ${req.sampleNo} (${req.revision}) ได้รับการอนุมัติอย่างเป็นทางการโดย ${finalApproverName}. ระบบได้สร้างเอกสาร Official PDF (${pdfFileName}) และจัดเก็บลง Google Drive (${driveHierarchy.fullPath}) พร้อมทั้งลงทะเบียนใน Document Register (${documentRegister.docId}) และแตกงานย่อยให้ RD จัดเตรียม, Co-Sale เปิด SO, และ Logistic จัดสรรรถเรียบร้อยแล้ว`
      };

      triggerEmailNotification(emailLog);

      // 3. Current Status = APPROVED / PROCESSING
      return {
        ...req,
        isLocked: true,
        lockedSnapshot,
        currentStatus: RequestStatus.PROCESSING,
        currentProcess: 'PARALLEL_TASKS_EXECUTION',
        currentOwner: 'RD, Co-Sale & Logistic Teams (Parallel Execution)',
        approvals: [approval, ...(req.approvals || [])],
        rdTasks,
        coSaleTask,
        logisticTask: updatedLogisticTask,
        documentRegister,
        driveFile,
        rdStatus: 'PENDING',
        coSaleStatus: 'PENDING',
        logisticStatus: 'PENDING',
        emailLogs: [emailLog, ...(req.emailLogs || [])],
        updatedTimestamp: now.toISOString()
      };
    }));

    // Persist the approval transaction before the next auto-sync. This prevents
    // a refreshed record from returning to WAITING APPROVAL and being approved twice.
    try {
      await sheetService.approveRequest(sampleNo, {
        name: finalApproverName,
        email: finalApproverEmail
      }, comment);
    } catch (err: any) {
      console.warn('Approval persistence failed; keeping the optimistic update:', err.message);
    }

    // 11. Write Central Audit Log
    sheetService.writeAuditLog({
      timestamp: `${dateStr} ${timeStr}`,
      userEmail: finalApproverEmail,
      userName: finalApproverName,
      action: 'SAMPLE_APPROVED',
      module: 'SAMPLE_APPROVAL',
      targetId: sampleNo,
      details: `Sample Request ${sampleNo} approved by ${finalApproverName}. Tasks dispatched to RD, Co-Sale, Logistic. PDF generated and registered.`
    }).catch(err => console.warn('Audit log write error:', err.message));
  };

  // Reject
  const rejectRequest = async (sampleNo: string, reason: string, approverName?: string, approverEmail?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const finalApproverName = approverName || user?.name || 'Sale Manager';
    const finalApproverEmail = approverEmail || user?.email || 'manager@example.com';

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const emailLog: EmailLogEntry = {
        emailLogId: `EML-${Date.now()}`,
        sampleNo: req.sampleNo,
        eventCode: 'REQUEST_REJECTED',
        sendDate: dateStr,
        sendTime: timeStr,
        toEmail: req.saleEmail,
        ccEmail: finalApproverEmail,
        subject: `[REJECTED] ${req.sampleNo} : คำขอตัวอย่างไม่ได้รับการอนุมัติ - ${req.customerName}`,
        templateCode: 'TMPL_REJECT_NOTICE',
        sendStatus: 'SENT',
        body: `คำขอ ${req.sampleNo} ถูกปฏิเสธโดย ${finalApproverName}. เหตุผล: ${reason}`
      };

      triggerEmailNotification(emailLog);

      return {
        ...req,
        currentStatus: RequestStatus.REJECTED,
        currentProcess: 'REJECTED_BY_MANAGER',
        currentOwner: `${req.saleName} (Rejected)`,
        approvals: [
          {
            approvalId: `APP-${Date.now()}`,
            sampleNo: req.sampleNo,
            approvalLevel: 'Sale Manager',
            approverName: finalApproverName,
            approverEmail: finalApproverEmail,
            requestTime: req.createdTimestamp,
            approvalStatus: 'REJECTED',
            approvalDate: dateStr,
            approvalTime: timeStr,
            rejectReason: reason,
            slaStatus: 'NORMAL'
          },
          ...(req.approvals || [])
        ],
        emailLogs: [emailLog, ...(req.emailLogs || [])],
        updatedTimestamp: now.toISOString()
      };
    }));

    try {
      await sheetService.rejectRequest(sampleNo, {
        name: finalApproverName,
        email: finalApproverEmail
      }, reason);
    } catch (err: any) {
      console.warn('Rejection persistence failed; keeping the optimistic update:', err.message);
    }

    // Central Audit Log
    sheetService.writeAuditLog({
      timestamp: `${dateStr} ${timeStr}`,
      userEmail: finalApproverEmail,
      userName: finalApproverName,
      action: 'SAMPLE_REJECTED',
      module: 'SAMPLE_APPROVAL',
      targetId: sampleNo,
      details: `Sample Request ${sampleNo} rejected. Reason: ${reason}`
    }).catch(err => console.warn('Audit log write error:', err.message));
  };

  // Revision Required -> Keeps Sample Number constant, Increments REV.00 -> REV.01 -> REV.02 (Part 5, 17)
  const requestRevision = async (sampleNo: string, sections: string, remark: string, approverName?: string, approverEmail?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const finalApproverName = approverName || user?.name || 'Sale Manager';
    const finalApproverEmail = approverEmail || user?.email || 'manager@example.com';
    const targetRequest = requests.find(req => req.sampleNo === sampleNo);
    if (!targetRequest) throw new Error('ไม่พบคำขอตัวอย่างที่ต้องการส่งกลับแก้ไข');
    const documentWasDistributed = Boolean(
      targetRequest.isLocked ||
      targetRequest.documentRegister ||
      targetRequest.approvals?.some(record => record.approvalStatus === 'APPROVED')
    );
    const nextRevision = documentWasDistributed
      ? incrementRevisionString(targetRequest.revision || 'REV.00')
      : (targetRequest.revision || 'REV.00');

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;
      const newRev = nextRevision;

      const emailLog: EmailLogEntry = {
        emailLogId: `EML-${Date.now()}`,
        sampleNo: req.sampleNo,
        eventCode: 'REVISION_REQUESTED',
        sendDate: dateStr,
        sendTime: timeStr,
        toEmail: req.saleEmail,
        ccEmail: finalApproverEmail,
        subject: `[REVISION REQUESTED] ${req.sampleNo} (${newRev}) : มีรายการแก้ไขที่ต้องปรับปรุง - ${req.customerName}`,
        templateCode: 'TMPL_REVISION_REQUEST',
        sendStatus: 'SENT',
        body: `คำขอ ${req.sampleNo} ได้รับการร้องขอให้แก้ไขโดย ${finalApproverName}. ส่วนที่ต้องแก้ไข: ${sections}. ข้อคิดเห็น: ${remark}. ${documentWasDistributed ? `ระบบปรับเป็นรุ่น ${newRev}` : `ยังคงเลขรุ่น ${newRev} เนื่องจากเอกสารยังไม่เคยอนุมัติและส่งให้ส่วนงาน`}`
      };

      triggerEmailNotification(emailLog);

      return {
        ...req,
        revision: newRev,
        isLocked: false,
        currentStatus: RequestStatus.REVISION_REQUIRED,
        currentProcess: 'REVISION_REQUESTED',
        currentOwner: `${req.saleName} (Revision Required: ${newRev})`,
        approvals: [
          {
            approvalId: `APP-${Date.now()}`,
            sampleNo: req.sampleNo,
            approvalLevel: 'Sale Manager',
            approverName: finalApproverName,
            approverEmail: finalApproverEmail,
            requestTime: req.createdTimestamp,
            approvalStatus: 'REVISION_REQUIRED',
            approvalDate: dateStr,
            approvalTime: timeStr,
            revisionSections: sections,
            revisionRemark: remark,
            slaStatus: 'NORMAL'
          },
          ...(req.approvals || [])
        ],
        emailLogs: [emailLog, ...(req.emailLogs || [])],
        updatedTimestamp: now.toISOString()
      };
    }));

    try {
      await sheetService.requestRevision(sampleNo, {
        name: finalApproverName,
        email: finalApproverEmail
      }, sections, remark);
      if (documentWasDistributed) {
        await sheetService.updateSampleRequest(sampleNo, { Revision_No: nextRevision });
      }
    } catch (err: any) {
      console.warn('Revision persistence failed; keeping the optimistic update:', err.message);
    }

    // Central Audit Log
    sheetService.writeAuditLog({
      timestamp: `${dateStr} ${timeStr}`,
      userEmail: finalApproverEmail,
      userName: finalApproverName,
      action: 'SAMPLE_REVISION_REQUESTED',
      module: 'SAMPLE_APPROVAL',
      targetId: sampleNo,
      details: `Revision requested for ${sampleNo}. Target sections: ${sections}. Remarks: ${remark}`
    }).catch(err => console.warn('Audit log write error:', err.message));
  };

  // Strict Helper checking Ready to Deliver Gate
  // Criteria: RD READY + SO COMPLETED + VEHICLE CONFIRMED (Part 4)
  const checkGateStatusForReq = (
    req: SampleRequest, 
    newRdStatus: TaskStatus, 
    newCoSaleStatus: TaskStatus, 
    newLogisticStatus: TaskStatus,
    vehicleAssigned?: boolean
  ): { status: RequestStatus; process: string; owner: string; gatePassed: boolean } => {
    const isRdDone = newRdStatus === 'COMPLETED';
    const isSoDone = newCoSaleStatus === 'COMPLETED';
    const hasVehicle = vehicleAssigned !== undefined 
      ? vehicleAssigned 
      : Boolean(req.logisticTask?.vehicleNo && req.logisticTask?.driverName);
    const isLogDone = newLogisticStatus === 'COMPLETED' && hasVehicle;

    if (isRdDone && isSoDone && isLogDone) {
      return {
        status: RequestStatus.READY_TO_DELIVER,
        process: 'READY_TO_DELIVER_GATE_PASSED',
        owner: 'Logistic Dispatcher (Ready to Ship)',
        gatePassed: true
      };
    }
    return {
      status: RequestStatus.PROCESSING,
      process: 'PARALLEL_TASKS_EXECUTION',
      owner: 'RD, Co-Sale & Logistic Teams',
      gatePassed: false
    };
  };

  // 4. RD Completes Sample Preparation
  const completeRdTask = (sampleNo: string, data: { lot: string; expiryDate: string; actualQty: number; remark?: string }) => {
    const now = new Date();
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const updatedRdTasks = (req.rdTasks || []).map(t => ({
        ...t,
        taskStatus: 'COMPLETED' as TaskStatus,
        lot: data.lot || 'LOT-AUTO-2026',
        expiryDate: data.expiryDate,
        actualQty: data.actualQty || t.requiredQty,
        preparationRemark: data.remark || 'เตรียมสินค้าเสร็จสมบูรณ์ตามสเปค',
        completeTime: `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`
      }));

      const gate = checkGateStatusForReq(req, 'COMPLETED', req.coSaleStatus, req.logisticStatus);

      // If gate just passed, trigger auto email to Logistic Dispatcher
      if (gate.gatePassed && req.currentStatus !== RequestStatus.READY_TO_DELIVER) {
        const emailLog: EmailLogEntry = {
          emailLogId: `EML-${Date.now()}`,
          sampleNo: req.sampleNo,
          eventCode: 'READY_TO_DELIVER',
          sendDate: now.toISOString().split('T')[0],
          sendTime: now.toTimeString().substring(0, 5),
          toEmail: 'logistic.dispatcher@example.com',
          ccEmail: `${req.saleEmail}, cosale@example.com`,
          subject: `[READY TO DELIVER] ${req.sampleNo} ผ่าน Gate ครบ 3 เงื่อนไขแล้ว พร้อมจ่ายของ`,
          templateCode: 'TMPL_READY_DELIVER',
          sendStatus: 'SENT',
          body: `คำขอ ${req.sampleNo} ผ่าน Gate เรียบร้อย: 1) RD เตรียมสินค้าเสร็จ 2) Co-Sale ออก SO แล้ว 3) Logistic จัดรถ/คนขับเรียบร้อย สามารถกระจายสินค้าได้`
        };
        triggerEmailNotification(emailLog);
      }

      return {
        ...req,
        rdStatus: 'COMPLETED',
        rdTasks: updatedRdTasks,
        currentStatus: gate.status,
        currentProcess: gate.process,
        currentOwner: gate.owner,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  // 5. Co-Sale Completes SO Creation
  const completeCoSaleTask = (sampleNo: string, data: { soNumber: string; soDate: string; erpStatus: 'RELEASED' | 'DRAFT'; transactionType?: CoSaleTaskData['transactionType'] }) => {
    const now = new Date();
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const updatedCoSale: CoSaleTaskData = {
        ...(req.coSaleTask || {
          taskId: `COS-${Date.now()}`,
          sampleNo: req.sampleNo,
          assignedTo: 'Co-Sale',
          assignedEmail: 'cosale@example.com',
          customerCode: req.customerCode,
          shipTo: req.customerCode,
          sampleType: req.sampleType,
          taskCreateTime: now.toISOString(),
          taskStatus: 'COMPLETED',
          slaStatus: 'NORMAL'
        }),
        soNumber: data.soNumber,
        transactionType: data.transactionType || 'SALES_ORDER',
        stockAdjustmentRef: data.transactionType === 'FREE_SAMPLE_STOCK_ADJUSTMENT' ? data.soNumber : undefined,
        soDate: data.soDate,
        erpStatus: data.erpStatus,
        documentStatus: 'READY',
        taskStatus: 'COMPLETED',
        completeTime: `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`
      };

      const gate = checkGateStatusForReq(req, req.rdStatus, 'COMPLETED', req.logisticStatus);

      if (gate.gatePassed && req.currentStatus !== RequestStatus.READY_TO_DELIVER) {
        const emailLog: EmailLogEntry = {
          emailLogId: `EML-${Date.now()}`,
          sampleNo: req.sampleNo,
          eventCode: 'READY_TO_DELIVER',
          sendDate: now.toISOString().split('T')[0],
          sendTime: now.toTimeString().substring(0, 5),
          toEmail: 'logistic.dispatcher@example.com',
          ccEmail: `${req.saleEmail}, cosale@example.com`,
          subject: `[READY TO DELIVER] ${req.sampleNo} ผ่าน Gate ครบ 3 เงื่อนไขแล้ว พร้อมจ่ายของ`,
          templateCode: 'TMPL_READY_DELIVER',
          sendStatus: 'SENT',
          body: `คำขอ ${req.sampleNo} ผ่าน Gate เรียบร้อย: 1) RD เตรียมสินค้าเสร็จ 2) Co-Sale ออก SO แล้ว (${data.soNumber}) 3) Logistic จัดรถ/คนขับเรียบร้อย สามารถกระจายสินค้าได้`
        };
        triggerEmailNotification(emailLog);
      }

      return {
        ...req,
        coSaleStatus: 'COMPLETED',
        coSaleTask: updatedCoSale,
        currentStatus: gate.status,
        currentProcess: gate.process,
        currentOwner: gate.owner,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  // 6. Logistic Confirms Vehicle & Driver
  const completeLogisticAssignment = (sampleNo: string, data: { vehicleType: string; vehicleNo: string; driverName: string; driverPhone: string }) => {
    const now = new Date();
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const hasVeh = Boolean(data.vehicleNo?.trim() && data.driverName?.trim());
      const updatedLogistic: LogisticTaskData = {
        ...(req.logisticTask || {
          taskId: `LOG-${Date.now()}`,
          sampleNo: req.sampleNo,
          precheckStatus: 'PASS',
          requestedDate: req.deliveryDate,
          requestedTimeFrom: req.deliveryTimeFrom,
          requestedTimeTo: req.deliveryTimeTo,
          deliveryAddress: req.deliveryAddress,
          province: req.province,
          route: req.route,
          temperature: req.temperature,
          estimatedWeight: req.lines.reduce((s, l) => s + (l.weight || 0), 0),
          feasibility: 'FEASIBLE',
          taskStatus: 'COMPLETED',
          slaStatus: 'NORMAL'
        }),
        vehicleType: data.vehicleType,
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        taskStatus: 'COMPLETED'
      };

      const gate = checkGateStatusForReq(req, req.rdStatus, req.coSaleStatus, 'COMPLETED', hasVeh);

      if (gate.gatePassed && req.currentStatus !== RequestStatus.READY_TO_DELIVER) {
        const emailLog: EmailLogEntry = {
          emailLogId: `EML-${Date.now()}`,
          sampleNo: req.sampleNo,
          eventCode: 'READY_TO_DELIVER',
          sendDate: now.toISOString().split('T')[0],
          sendTime: now.toTimeString().substring(0, 5),
          toEmail: 'logistic.dispatcher@example.com',
          ccEmail: `${req.saleEmail}, cosale@example.com`,
          subject: `[READY TO DELIVER] ${req.sampleNo} ผ่าน Gate ครบ 3 เงื่อนไขแล้ว พร้อมจ่ายของ`,
          templateCode: 'TMPL_READY_DELIVER',
          sendStatus: 'SENT',
          body: `คำขอ ${req.sampleNo} ผ่าน Gate เรียบร้อย: 1) RD เตรียมสินค้าเสร็จ 2) Co-Sale ออก SO แล้ว 3) Logistic จัดรถ/คนขับ (${data.vehicleNo} / ${data.driverName}) เรียบร้อย สามารถกระจายสินค้าได้`
        };
        triggerEmailNotification(emailLog);
      }

      return {
        ...req,
        logisticStatus: 'COMPLETED',
        logisticTask: updatedLogistic,
        currentStatus: gate.status,
        currentProcess: gate.process,
        currentOwner: gate.owner,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  // Update Co-Sale Task Fields & Check Gate
  const updateCoSaleTask = (sampleNo: string, data: Partial<CoSaleTaskData>) => {
    const now = new Date();
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const updatedCoSale: CoSaleTaskData = {
        ...(req.coSaleTask || {
          taskId: `COS-${Date.now()}`,
          sampleNo: req.sampleNo,
          assignedTo: 'Co-Sale Specialist',
          assignedEmail: 'cosale@example.com',
          customerCode: req.customerCode,
          shipTo: req.customerCode,
          sampleType: req.sampleType,
          taskCreateTime: now.toISOString(),
          taskStatus: 'IN_PROGRESS',
          slaStatus: 'NORMAL'
        }),
        ...data,
        taskStatus: data.taskStatus || (data.soNumber && data.erpStatus === 'RELEASED' ? 'COMPLETED' : 'IN_PROGRESS')
      };

      const newCoSaleStatus = updatedCoSale.taskStatus;
      const gate = checkGateStatusForReq(req, req.rdStatus, newCoSaleStatus, req.logisticStatus);

      return {
        ...req,
        coSaleStatus: newCoSaleStatus,
        coSaleTask: updatedCoSale,
        currentStatus: gate.gatePassed ? RequestStatus.READY_TO_DELIVER : req.currentStatus,
        currentProcess: gate.gatePassed ? 'READY_TO_DELIVER_GATE_PASSED' : req.currentProcess,
        currentOwner: gate.gatePassed ? 'Logistic Dispatcher (Ready to Ship)' : req.currentOwner,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  // Update Logistic Task Fields & Check Gate (Part 73)
  const updateLogisticTask = (sampleNo: string, data: Partial<LogisticTaskData>) => {
    const now = new Date();
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const updatedLogistic: LogisticTaskData = {
        ...(req.logisticTask || {
          taskId: `LOG-${Date.now()}`,
          sampleNo: req.sampleNo,
          precheckStatus: 'PASS',
          requestedDate: req.deliveryDate,
          requestedTimeFrom: req.deliveryTimeFrom,
          requestedTimeTo: req.deliveryTimeTo,
          deliveryAddress: req.deliveryAddress,
          province: req.province,
          route: req.route,
          temperature: req.temperature,
          estimatedWeight: 10,
          feasibility: 'FEASIBLE',
          taskStatus: 'IN_PROGRESS',
          slaStatus: 'NORMAL'
        }),
        ...data
      };

      const hasVehicle = Boolean(updatedLogistic.vehicleNo?.trim() && updatedLogistic.driverName?.trim());
      const newLogisticStatus: TaskStatus = (data.taskStatus || (hasVehicle ? 'COMPLETED' : 'IN_PROGRESS')) as TaskStatus;
      updatedLogistic.taskStatus = newLogisticStatus;

      const gate = checkGateStatusForReq(req, req.rdStatus, req.coSaleStatus, newLogisticStatus, hasVehicle);

      return {
        ...req,
        logisticStatus: newLogisticStatus,
        logisticTask: updatedLogistic,
        currentStatus: gate.gatePassed ? RequestStatus.READY_TO_DELIVER : req.currentStatus,
        currentProcess: gate.gatePassed ? 'READY_TO_DELIVER_GATE_PASSED' : req.currentProcess,
        currentOwner: gate.gatePassed ? 'Logistic Dispatcher (Ready to Ship)' : req.currentOwner,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  // Report Issue (Parts 72, 73, 74, 75)
  const reportIssue = async (sampleNo: string, issueData: Omit<RequestIssue, 'id' | 'reportedAt' | 'status'>) => {
    const now = new Date();
    const targetRequest = requests.find(req => req.sampleNo === sampleNo);
    const searchable = `${issueData.issueType} ${issueData.description}`.toUpperCase();
    const revisionRequired = issueData.revisionRequired ?? /CUSTOMER_(REFUSED|REJECT)|WRONG_ADDRESS|RESCHEDULE|CHANGE_(PRODUCT|QUANTITY|ADDRESS)|DELIVERY_TERMS|PRODUCT_CHANGE|QUANTITY_CHANGE/.test(searchable);
    const financialImpact = issueData.financialImpact ?? /CREDIT|PAYMENT|PRICE|INVOICE|SO_|CUSTOMER_(REFUSED|REJECT)/.test(searchable);
    const recommendedAction: IssueDecision = issueData.recommendedAction || (revisionRequired ? 'RETURN_FOR_REVISION' : 'RESOLVE_OPERATIONAL');
    const newIssue: RequestIssue = {
      id: `ISS-${Date.now()}`,
      ...issueData,
      revisionRequired,
      financialImpact,
      recommendedAction,
      previousOwner: issueData.previousOwner || targetRequest?.currentOwner,
      previousProcess: issueData.previousProcess || targetRequest?.currentProcess,
      status: 'OPEN',
      reportedAt: `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`
    };

    const route = issueData.department === 'RD'
      ? { owner: 'Sale', process: 'RD_ISSUE_ACTION_REQUIRED' }
      : issueData.department === 'CO_SALE'
        ? { owner: 'Sale + Co-Sale', process: 'FINANCIAL_ACTION_REQUIRED' }
        : issueData.department === 'LOGISTIC'
          ? { owner: revisionRequired ? 'Sale + Co-Sale' : 'Logistic + Sale', process: revisionRequired ? 'DELIVERY_REVISION_REQUIRED' : 'DELIVERY_ACTION_REQUIRED' }
          : { owner: 'Sale', process: 'ISSUE_ACTION_REQUIRED' };

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;
      return {
        ...req,
        issues: [newIssue, ...(req.issues || [])],
        currentOwner: route.owner,
        currentProcess: route.process,
        updatedTimestamp: now.toISOString()
      };
    }));

    if (targetRequest) {
      const eventCode = issueData.department === 'RD'
        ? EmailEventCode.RD_ISSUE
        : issueData.department === 'CO_SALE'
          ? EmailEventCode.SO_ISSUE
          : EmailEventCode.DELIVERY_DELAY;
      dispatchNotification({
        eventCode,
        request: { ...targetRequest, currentOwner: route.owner, currentProcess: route.process },
        actor: { name: issueData.reportedBy, email: user?.email || '', role: user?.role || issueData.department },
        issueRemark: issueData.description,
        customMessage: revisionRequired ? 'ต้องส่งกลับฝ่ายขายเพื่อแก้ไขเอกสารและอนุมัติใหม่' : 'แก้ไขเชิงปฏิบัติการโดยไม่เพิ่ม Revision'
      }).then(log => triggerEmailNotification(log));
    }

    try {
      await sheetService.updateSampleRequest(sampleNo, {
        Current_Owner: route.owner,
        Current_Process: route.process,
        Updated_Timestamp: now.toISOString()
      });
      const saved = await sheetService.createIssue({
        sampleNo,
        process: issueData.department,
        issueType: issueData.issueType,
        description: issueData.description,
        owner: issueData.reportedBy,
        severity: issueData.department === 'LOGISTIC' ? 'HIGH' : 'MEDIUM'
      });
      setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
        ...req,
        issues: (req.issues || []).map(issue => issue.id === newIssue.id ? {
          ...issue,
          id: saved.Issue_ID || issue.id
        } : issue)
      }));
    } catch (error) {
      console.warn('Issue persistence failed; keeping the optimistic record:', error);
    }
  };

  // Resolve Issue (Parts 72, 73, 74, 75)
  const resolveIssue = async (sampleNo: string, issueId: string, resolutionRemark: string) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
    
    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;
      const updatedIssues = (req.issues || []).map(iss => {
        if (iss.id === issueId) {
          return {
            ...iss,
            status: 'RESOLVED' as const,
            resolvedBy: user?.name || 'Authorized Staff',
            resolvedAt: timeStr,
            resolutionRemark
          };
        }
        return iss;
      });

      // If in DELIVERED state and all issues are now resolved, auto-complete
      const openCount = updatedIssues.filter(i => i.status === 'OPEN').length;
      const shouldAutoComplete = req.currentStatus === RequestStatus.DELIVERED && openCount === 0;

      return {
        ...req,
        issues: updatedIssues,
        currentStatus: shouldAutoComplete ? RequestStatus.COMPLETED : req.currentStatus,
        currentProcess: shouldAutoComplete ? 'COMPLETED' : req.currentProcess,
        currentOwner: shouldAutoComplete ? 'Closed (งานเสร็จสมบูรณ์)' : req.currentOwner,
        completedTimestamp: shouldAutoComplete ? now.toISOString() : req.completedTimestamp,
        updatedTimestamp: now.toISOString()
      };
    }));

    try {
      await sheetService.resolveIssue(issueId, resolutionRemark, user?.name || 'Authorized Staff');
    } catch (error) {
      console.warn('Issue resolution persistence failed; keeping the optimistic update:', error);
    }
  };

  const routeIssueToSales = async (sampleNo: string, issueId: string) => {
    const request = requests.find(req => req.sampleNo === sampleNo);
    const issue = request?.issues?.find(item => item.id === issueId);
    if (!request || !issue) return;

    const deliveryIssue = issue.department === 'LOGISTIC' || /DELIVERY|CUSTOMER_REJECT|FAILED/i.test(issue.issueType);
    const currentOwner = deliveryIssue ? 'Sale + Co-Sale' : 'Sale';
    const currentProcess = deliveryIssue ? 'DELIVERY_ISSUE_ACTION_REQUIRED' : 'ISSUE_ACTION_REQUIRED';

    setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
      ...req,
      currentOwner,
      currentProcess,
      updatedTimestamp: new Date().toISOString()
    }));

    try {
      await sheetService.updateSampleRequest(sampleNo, {
        Current_Owner: currentOwner,
        Current_Process: currentProcess,
        Updated_Timestamp: new Date().toISOString()
      });
      await sheetService.writeAuditLog({
        user: user?.name || 'Authorized Staff',
        userEmail: user?.email || '',
        role: user?.role || 'AUTHORIZED_USER',
        module: 'ISSUE_CENTER',
        sampleNo,
        action: 'ROUTE_ISSUE_TO_SALES',
        targetId: issueId,
        reason: `ส่งกลับผู้รับผิดชอบ: ${currentOwner}`
      });
    } catch (error) {
      console.warn('Issue routing persistence failed; keeping the optimistic update:', error);
    }
  };

  const applyIssueDecision = async (
    sampleNo: string,
    issueId: string,
    decision: IssueDecision,
    remark: string,
    newDeliveryDate?: string
  ) => {
    const request = requests.find(req => req.sampleNo === sampleNo);
    const issue = request?.issues?.find(item => item.id === issueId);
    if (!request || !issue) throw new Error('ไม่พบ Issue ที่ต้องการดำเนินการ');
    if (!remark.trim()) throw new Error('กรุณาระบุเหตุผลหรือผลการดำเนินการ');
    if (decision === 'RESCHEDULE' && !newDeliveryDate) throw new Error('กรุณาระบุวันจัดส่งใหม่');

    setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
      ...req,
      issues: (req.issues || []).map(item => item.id !== issueId ? item : {
        ...item,
        decision,
        decisionRemark: remark.trim()
      })
    }));

    if (decision === 'RESOLVE_OPERATIONAL') {
      await resolveIssue(sampleNo, issueId, remark.trim());
      if (request.currentStatus !== RequestStatus.DELIVERED && (issue.previousOwner || issue.previousProcess)) {
        const timestamp = new Date().toISOString();
        const restoredOwner = issue.previousOwner || request.currentOwner;
        const restoredProcess = issue.previousProcess || request.currentProcess;
        setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
          ...req,
          currentOwner: restoredOwner,
          currentProcess: restoredProcess,
          updatedTimestamp: timestamp
        }));
        await sheetService.updateSampleRequest(sampleNo, {
          Current_Owner: restoredOwner,
          Current_Process: restoredProcess,
          Updated_Timestamp: timestamp
        });
      }
      return;
    }

    if (decision === 'CANCEL') {
      await resolveIssue(sampleNo, issueId, `ยกเลิกคำขอ: ${remark.trim()}`);
      const timestamp = new Date().toISOString();
      setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
        ...req,
        isLocked: true,
        currentStatus: RequestStatus.CANCELLED,
        currentProcess: 'CANCELLED_BY_EXCEPTION_DECISION',
        currentOwner: 'Closed (Cancelled)',
        updatedTimestamp: timestamp
      }));
      await sheetService.updateSampleRequest(sampleNo, {
        Current_Status: RequestStatus.CANCELLED,
        Current_Process: 'CANCELLED_BY_EXCEPTION_DECISION',
        Current_Owner: 'Closed (Cancelled)',
        Updated_Timestamp: timestamp
      });
      return;
    }

    if (decision === 'RESCHEDULE' && newDeliveryDate) {
      setRequests(prev => prev.map(req => req.sampleNo !== sampleNo ? req : {
        ...req,
        deliveryDate: newDeliveryDate,
        updatedTimestamp: new Date().toISOString()
      }));
      await sheetService.updateSampleRequest(sampleNo, { Delivery_Date: newDeliveryDate });
    }

    const sections = decision === 'RESCHEDULE'
      ? 'วันและเงื่อนไขการจัดส่ง'
      : `ข้อมูลที่เกี่ยวข้องกับ ${issue.issueType.replaceAll('_', ' ')}`;
    await requestRevision(sampleNo, sections, remark.trim(), user?.name, user?.email);
    await resolveIssue(sampleNo, issueId, `${decision === 'RESCHEDULE' ? `เลื่อนกำหนดส่งเป็น ${newDeliveryDate}; ` : ''}ส่งกลับฝ่ายขายเพื่อแก้ไขและอนุมัติใหม่: ${remark.trim()}`);
  };

  // 7. Advance Delivery Pipeline (Strict Gate Enforcement & Auto-Complete on Delivered with No Open Issues)
  const advanceDeliveryPipeline = (sampleNo: string, nextStatus: RequestStatus, extra?: { podUrl?: string; receiverName?: string; remark?: string }) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;

    const targetReq = requests.find(r => r.sampleNo === sampleNo);
    if (!targetReq) return;

    // Hard Gate check if user tries to advance to or past READY_TO_DELIVER
    const deliveryStages = [
      RequestStatus.READY_TO_DELIVER,
      RequestStatus.PICKED_UP,
      RequestStatus.OUT_FOR_DELIVERY,
      RequestStatus.ARRIVED,
      RequestStatus.DELIVERED,
      RequestStatus.CUSTOMER_RECEIVED,
      RequestStatus.COMPLETED
    ];

    if (deliveryStages.includes(nextStatus)) {
      const gate = checkReadyToDeliverGate(targetReq);
      if (!gate.isReady) {
        const blockerText = gate.blockers.join(' | ');
        alert(`⚠️ ไม่สามารถปรับสถานะข้าม Gate "Ready to Deliver" ได้\n\nเงื่อนไขที่ยังไม่ผ่าน:\n${blockerText}\n\n(ต้องผ่านครบทั้ง RD Ready + SO Completed + Vehicle Confirmed)`);
        return;
      }
    }

    setRequests(prev => prev.map(req => {
      if (req.sampleNo !== sampleNo) return req;

      const updatedLogTask: LogisticTaskData = {
        ...(req.logisticTask || {
          taskId: `LOG-${Date.now()}`,
          sampleNo: req.sampleNo,
          precheckStatus: 'PASS',
          requestedDate: req.deliveryDate,
          requestedTimeFrom: req.deliveryTimeFrom,
          requestedTimeTo: req.deliveryTimeTo,
          deliveryAddress: req.deliveryAddress,
          province: req.province,
          route: req.route,
          temperature: req.temperature,
          estimatedWeight: 10,
          feasibility: 'FEASIBLE',
          taskStatus: 'COMPLETED',
          slaStatus: 'NORMAL'
        }),
        podUrl: extra?.podUrl || req.logisticTask?.podUrl,
        actualPickup: nextStatus === RequestStatus.PICKED_UP ? timeStr : req.logisticTask?.actualPickup,
        actualArrival: nextStatus === RequestStatus.ARRIVED ? timeStr : req.logisticTask?.actualArrival,
        actualDelivery: (nextStatus === RequestStatus.DELIVERED || nextStatus === RequestStatus.CUSTOMER_RECEIVED || nextStatus === RequestStatus.COMPLETED) 
          ? (req.logisticTask?.actualDelivery || timeStr) 
          : req.logisticTask?.actualDelivery,
      };

      let finalStatus = nextStatus;
      let newOwner = req.currentOwner;

      if (nextStatus === RequestStatus.PICKED_UP || nextStatus === RequestStatus.OUT_FOR_DELIVERY) {
        newOwner = `Driver: ${req.logisticTask?.driverName || 'สมชาย ขับดี'} (${req.logisticTask?.vehicleNo || '1ฒผ-8899'})`;
      } else if (nextStatus === RequestStatus.ARRIVED) {
        newOwner = `Driver Arrived at ${req.customerName}`;
      } else if (nextStatus === RequestStatus.DELIVERED || nextStatus === RequestStatus.CUSTOMER_RECEIVED) {
        newOwner = `Customer: ${extra?.receiverName || req.contactName}`;
        
        // Part 74: เมื่อ Delivered และไม่มี Open Issue -> COMPLETED ทันที
        const openIssues = (req.issues || []).filter(i => i.status === 'OPEN');
        if (openIssues.length === 0) {
          finalStatus = RequestStatus.COMPLETED;
          newOwner = 'Closed (ส่งมอบและเสร็จสมบูรณ์)';
        }
      } else if (nextStatus === RequestStatus.COMPLETED) {
        newOwner = 'Closed (งานเสร็จสมบูรณ์)';
      }

      return {
        ...req,
        currentStatus: finalStatus,
        currentProcess: finalStatus,
        currentOwner: newOwner,
        logisticTask: updatedLogTask,
        completedTimestamp: finalStatus === RequestStatus.COMPLETED ? (req.completedTimestamp || now.toISOString()) : undefined,
        updatedTimestamp: now.toISOString()
      };
    }));
  };

  return (
    <RequestContext.Provider
      value={{
        requests,
        isLoading,
        selectedRequest,
        setSelectedRequestId,
        getNextSampleNo,
        createRequest,
        logisticPrecheck,
        approveRequest,
        rejectRequest,
        requestRevision,
        completeRdTask,
        completeCoSaleTask,
        completeLogisticAssignment,
        advanceDeliveryPipeline,
        updateCoSaleTask,
        updateLogisticTask,
        reportIssue,
        resolveIssue,
        routeIssueToSales,
        applyIssueDecision,
        companySettings,
        updateCompanySettings,
        recentEmails,
        dismissEmailNotice,
        
        rdDepartments,
        runningNumbers,
        auditLogs,
        voidedNumbers,
        customers,
        products,
        refreshSequences,
        saveRDDepartment,
        setupRunningNumber,
        skipRunningNumber,
        generateSampleNumberServer,
        changeDepartmentOnDraft,
        evaluateGate,
        logAuditEntry
      }}
    >
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
}
