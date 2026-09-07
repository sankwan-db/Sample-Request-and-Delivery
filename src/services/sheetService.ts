/**
 * CENTRAL GOOGLE SHEETS SERVICE LAYER (CLIENT-SIDE)
 * ============================================================
 * Directive: ห้าม React Component เขียน Sheets โดยตรงทุกหน้า
 * React components must never write directly to Google Sheets or import Google APIs.
 * All operations pass through this centralized service layer, which delegates to
 * secure backend service endpoints with full audit logging, validation, and schema synchronization.
 */

function getAuthHeader(): Record<string, string> {
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

  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Service request failed with HTTP ${res.status}`);
  }
  return (json.data !== undefined ? json.data : json) as T;
}

// ============================================================
// 1. SETUP & DATABASE INITIALIZATION SERVICES
// ============================================================

export async function setupDatabase(options: any = {}): Promise<any> {
  const res = await fetch('/api/services/setupDatabase', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ options })
  });
  return handleResponse(res);
}

export async function createAllSheets(spreadsheetId?: string): Promise<any> {
  const res = await fetch('/api/services/createAllSheets', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ spreadsheetId })
  });
  return handleResponse(res);
}

export async function initializeDefaultMasterData(spreadsheetId?: string, options?: any): Promise<any> {
  const res = await fetch('/api/services/initializeDefaultMasterData', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ spreadsheetId, options })
  });
  return handleResponse(res);
}

// ============================================================
// 2. MASTER DATA SERVICES
// ============================================================

export async function getUsers(): Promise<any[]> {
  const res = await fetch('/api/services/getUsers', {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function getCustomers(): Promise<any[]> {
  const res = await fetch('/api/services/getCustomers', {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function getProducts(): Promise<any[]> {
  const res = await fetch('/api/services/getProducts', {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function upsertCustomer(customerData: any): Promise<any> {
  const res = await fetch('/api/services/upsertCustomer', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(customerData)
  });
  return handleResponse(res);
}

export async function upsertProduct(productData: any): Promise<any> {
  const res = await fetch('/api/services/upsertProduct', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(productData)
  });
  return handleResponse(res);
}

export async function getRDDepartments(): Promise<any[]> {
  const res = await fetch('/api/services/getRDDepartments', {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function getRunningNumberConfig(): Promise<any[]> {
  const res = await fetch('/api/services/getRunningNumberConfig', {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function initializeRunningNumber(config: {
  deptCode: string;
  year: number;
  startingNo: number;
  digitLength: number;
  userEmail?: string;
  remark?: string;
}): Promise<any> {
  const res = await fetch('/api/services/initializeRunningNumber', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(config)
  });
  return handleResponse(res);
}

export async function generateSampleNumber(
  deptCode: string,
  year: number = 2026,
  userEmail: string = 'sale@company.com',
  userName: string = 'Sale Specialist'
): Promise<{ sampleNo: string; revision: string; runningNumber: number }> {
  const res = await fetch('/api/services/generateSampleNumber', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ deptCode, year, userEmail, userName })
  });
  return handleResponse(res);
}

// ============================================================
// 3. SAMPLE REQUEST HEADER & LINES SERVICES
// ============================================================

export async function getSampleRequests(filters?: any): Promise<any[]> {
  const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
  const res = await fetch(`/api/services/getSampleRequests${query}`, {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function getSampleRequestById(sampleNo: string): Promise<any> {
  const res = await fetch(`/api/services/getSampleRequestById/${encodeURIComponent(sampleNo)}`, {
    headers: getAuthHeader()
  });
  return handleResponse<any>(res);
}

export async function createSampleRequest(requestData: any): Promise<any> {
  const res = await fetch('/api/services/createSampleRequest', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(requestData)
  });
  return handleResponse(res);
}

export async function updateSampleRequest(sampleNo: string, updateData: any): Promise<any> {
  const res = await fetch('/api/services/updateSampleRequest', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, updateData })
  });
  return handleResponse(res);
}

export async function submitSampleRequest(sampleNo: string, submitter?: any): Promise<any> {
  const res = await fetch('/api/services/submitSampleRequest', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, submitter })
  });
  return handleResponse(res);
}

// ============================================================
// 4. LOGISTIC PRE-CHECK & VEHICLE ASSIGNMENT SERVICES
// ============================================================

export async function getLogisticTasks(sampleNo?: string): Promise<any> {
  const query = sampleNo ? `?sampleNo=${encodeURIComponent(sampleNo)}` : '';
  const res = await fetch(`/api/services/getLogisticTasks${query}`, {
    headers: getAuthHeader()
  });
  return handleResponse(res);
}

export async function confirmLogisticPrecheck(
  taskId: string,
  decision: 'FEASIBLE' | 'ALTERNATIVE_PROPOSED',
  proposedData?: any,
  remark?: string,
  user?: any
): Promise<any> {
  const res = await fetch('/api/services/confirmLogisticPrecheck', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, decision, proposedData, remark, user })
  });
  return handleResponse(res);
}

export async function assignVehicle(
  taskId: string,
  vehicleData: { vehicleType: string; vehicleNo: string; driverName: string; driverPhone: string },
  user?: any
): Promise<any> {
  const res = await fetch('/api/services/assignVehicle', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, vehicleData, user })
  });
  return handleResponse(res);
}

export async function confirmVehicle(taskId: string, confirmationData: any = {}, user?: any): Promise<any> {
  const res = await fetch('/api/services/confirmVehicle', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, confirmationData, user })
  });
  return handleResponse(res);
}

export async function updateDeliveryStatus(
  taskId: string,
  deliveryStatus: string,
  podUrl?: string,
  issueRemark?: string,
  user?: any
): Promise<any> {
  const res = await fetch('/api/services/updateDeliveryStatus', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, deliveryStatus, podUrl, issueRemark, user })
  });
  return handleResponse(res);
}

// ============================================================
// 5. APPROVAL WORKFLOW SERVICES
// ============================================================

export async function getApprovalQueue(userEmail?: string): Promise<any[]> {
  const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
  const res = await fetch(`/api/services/getApprovalQueue${query}`, {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function approveRequest(sampleNo: string, approver?: any, comment?: string): Promise<any> {
  const res = await fetch('/api/services/approveRequest', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, approver, comment })
  });
  return handleResponse(res);
}

export async function rejectRequest(sampleNo: string, approver?: any, reason: string = ''): Promise<any> {
  const res = await fetch('/api/services/rejectRequest', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, approver, reason })
  });
  return handleResponse(res);
}

export async function requestRevision(sampleNo: string, approver?: any, sections: string = 'General Details', remark: string = ''): Promise<any> {
  const res = await fetch('/api/services/requestRevision', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, approver, sections, remark })
  });
  return handleResponse(res);
}

// ============================================================
// 6. RD & CO-SALE PARALLEL TASKS SERVICES
// ============================================================

export async function createRDTasks(sampleNo: string, items: any[]): Promise<any> {
  const res = await fetch('/api/services/createRDTasks', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, items })
  });
  return handleResponse(res);
}

export async function updateRDTask(taskId: string, updateData: any): Promise<any> {
  const res = await fetch('/api/services/updateRDTask', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, updateData })
  });
  return handleResponse(res);
}

export async function completeRDTask(
  taskId: string,
  lot: string,
  actualQty: number,
  productionDate?: string,
  expiryDate?: string,
  remark?: string,
  user?: any
): Promise<any> {
  const res = await fetch('/api/services/completeRDTask', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, lot, actualQty, productionDate, expiryDate, remark, user })
  });
  return handleResponse(res);
}

export async function createCoSaleTask(sampleNo: string, coSaleData: any): Promise<any> {
  const res = await fetch('/api/services/createCoSaleTask', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, coSaleData })
  });
  return handleResponse(res);
}

export async function completeSO(
  taskId: string,
  soNumber: string,
  soDate: string,
  erpStatus: string = 'RELEASED',
  remark?: string,
  user?: any
): Promise<any> {
  const res = await fetch('/api/services/completeSO', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ taskId, soNumber, soDate, erpStatus, remark, user })
  });
  return handleResponse(res);
}

// ============================================================
// 7. READY TO DELIVER GATE & AUTOMATION
// ============================================================

export async function checkReadyToDeliverGate(sampleNo: string): Promise<{
  isReady: boolean;
  criteria: { rdCompleted: boolean; soCompleted: boolean; vehicleConfirmed: boolean };
}> {
  const res = await fetch(`/api/services/checkReadyToDeliverGate/${encodeURIComponent(sampleNo)}`, {
    headers: getAuthHeader()
  });
  return handleResponse(res);
}

// ============================================================
// 8. DOCUMENT REGISTER & PDF GENERATION SERVICES
// ============================================================

export async function generateSampleDocument(sampleNo: string): Promise<any> {
  const res = await fetch(`/api/services/generateSampleDocument/${encodeURIComponent(sampleNo)}`, {
    headers: getAuthHeader()
  });
  return handleResponse(res);
}

export async function generatePDF(sampleNo: string, documentType: string = 'Sample Request Form'): Promise<any> {
  const res = await fetch('/api/services/generatePDF', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, documentType })
  });
  return handleResponse(res);
}

export async function savePDFToDrive(sampleNo: string, pdfData: string, fileName?: string): Promise<any> {
  const res = await fetch('/api/services/savePDFToDrive', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ sampleNo, pdfData, fileName })
  });
  return handleResponse(res);
}

// ============================================================
// 9. EMAIL & NOTIFICATION SERVICES
// ============================================================

export async function getEmailRecipients(eventCode: string, department?: string): Promise<any[]> {
  const params = new URLSearchParams({ eventCode, department: department || 'ALL' });
  const res = await fetch(`/api/services/getEmailRecipients?${params.toString()}`, {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function sendWorkflowEmail(eventCode: string, sampleNo: string, customData: any = {}): Promise<any> {
  const res = await fetch('/api/services/sendWorkflowEmail', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ eventCode, sampleNo, customData })
  });
  return handleResponse(res);
}

export async function writeEmailLog(logData: any): Promise<any> {
  const res = await fetch('/api/services/writeEmailLog', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(logData)
  });
  return handleResponse(res);
}

// ============================================================
// 10. ISSUE & AUDIT LOG SERVICES
// ============================================================

export async function createIssue(issueData: any): Promise<any> {
  const res = await fetch('/api/services/createIssue', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(issueData)
  });
  return handleResponse(res);
}

export async function getIssues(sampleNo?: string): Promise<any[]> {
  const query = sampleNo ? `?sampleNo=${encodeURIComponent(sampleNo)}` : '';
  const res = await fetch(`/api/services/getIssues${query}`, {
    headers: getAuthHeader()
  });
  return handleResponse<any[]>(res);
}

export async function resolveIssue(issueId: string, resolution: string, resolvedBy: string): Promise<any> {
  const res = await fetch('/api/services/resolveIssue', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ issueId, resolution, resolvedBy })
  });
  return handleResponse(res);
}

export async function writeAuditLog(auditData: any): Promise<any> {
  const res = await fetch('/api/services/writeAuditLog', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(auditData)
  });
  return handleResponse(res);
}
