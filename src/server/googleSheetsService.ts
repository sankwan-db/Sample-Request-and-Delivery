import { 
  readSheet, 
  appendRow, 
  appendRows, 
  updateRowByColumn, 
  setupGoogleSheetsDatabase, 
  uploadFileToDrive,
  findExistingSpreadsheet,
  SetupOptions
} from './sheets.js';
import { getDatabaseConfig, saveDatabaseConfig } from './db.js';
import { 
  getRDDepartments as getRDDepartmentsLocal,
  saveRDDepartment as saveRDDepartmentLocal,
  getRunningNumbers as getRunningNumbersLocal,
  setupRunningNumber as setupRunningNumberLocal,
  skipRunningNumber as skipRunningNumberLocal,
  generateSampleNumber as generateSampleNumberLocal,
  getAuditLogs as getAuditLogsLocal,
  addAuditLog,
  getVoidedNumbers as getVoidedNumbersLocal
} from './sequenceService.js';
import { SHEETS_SCHEMA } from './schema.js';
import { sendEmailViaGmail, generateEmailBody } from './emailService.js';

// In-Memory store for fast lookup and fallback cache
interface StoreData {
  requests: Map<string, any>;
  lines: Map<string, any[]>;
  logisticTasks: Map<string, any>;
  rdTasks: Map<string, any[]>;
  coSaleTasks: Map<string, any>;
  approvals: Map<string, any[]>;
  emailLogs: any[];
  issues: any[];
  auditLogs: any[];
}

const memoryStore: StoreData = {
  requests: new Map(),
  lines: new Map(),
  logisticTasks: new Map(),
  rdTasks: new Map(),
  coSaleTasks: new Map(),
  approvals: new Map(),
  emailLogs: [],
  issues: [],
  auditLogs: []
};

// Helper to get active spreadsheetId from config or param
function getActiveSpreadsheetId(providedId?: string): string | null {
  if (providedId) return providedId;
  const config = getDatabaseConfig();
  return config.configured && config.spreadsheetId ? config.spreadsheetId : null;
}

// ============================================================
// 1. DATABASE & INITIALIZATION SERVICES
// ============================================================

export async function setupDatabase(options: SetupOptions, token?: string) {
  if (!token) {
    throw new Error('Google OAuth access token is required for setupDatabase');
  }
  const result = await setupGoogleSheetsDatabase(token, options);
  await writeAuditLog({
    user: options.adminUser?.name || 'Admin',
    userEmail: options.adminUser?.email || 'admin@company.com',
    role: 'ADMIN',
    module: 'DATABASE_SETUP',
    action: 'SETUP',
    reason: 'Initial Google Sheets Database Setup (26 Canonical Sheets)'
  }, token, result.spreadsheetId);
  return result;
}

export async function createAllSheets(spreadsheetId: string, token: string) {
  return setupGoogleSheetsDatabase(token, { overwriteExisting: false });
}

export async function initializeDefaultMasterData(spreadsheetId: string, token: string, options?: SetupOptions) {
  return setupGoogleSheetsDatabase(token, { ...options, overwriteExisting: true });
}

// ============================================================
// 2. MASTER DATA SERVICES
// ============================================================

export async function getUsers(token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const users = await readSheet(token, sId, '01_USERS');
      if (users.length > 0) return users;
    } catch (e: any) {
      console.warn('Sheets read 01_USERS error, returning default:', e.message);
    }
  }
  return [
    { User_ID: 'U-001', Employee_ID: 'EMP-001', User_Name: 'System Admin', Email: 'sankwans@gmail.com', Department: 'IT', Role: 'ADMIN', Active: 'TRUE' },
    { User_ID: 'U-002', Employee_ID: 'EMP-002', User_Name: 'Anucha (Sale Specialist)', Email: 'sale@company.com', Department: 'SALES', Role: 'SALE', Active: 'TRUE' },
    { User_ID: 'U-003', Employee_ID: 'EMP-003', User_Name: 'Somchai (Logistic Dispatcher)', Email: 'logistic@company.com', Department: 'LOGISTICS', Role: 'LOGISTIC', Active: 'TRUE' },
    { User_ID: 'U-004', Employee_ID: 'EMP-004', User_Name: 'Nattapong (Sale Manager)', Email: 'manager@company.com', Department: 'SALES', Role: 'SALE_MANAGER', Active: 'TRUE' },
    { User_ID: 'U-005', Employee_ID: 'EMP-005', User_Name: 'Dr. Prasert (RD Lead)', Email: 'rd.rawmeat@company.com', Department: 'R&D', Role: 'RD', Active: 'TRUE' },
    { User_ID: 'U-006', Employee_ID: 'EMP-006', User_Name: 'Wichai (Co-Sale Specialist)', Email: 'cosale@company.com', Department: 'CO-SALE', Role: 'CO_SALE', Active: 'TRUE' }
  ];
}

export async function getCustomers(token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const customers = await readSheet(token, sId, '06_CUSTOMER_MASTER');
      if (customers.length > 0) return customers;
    } catch (e: any) {
      console.warn('Sheets read 06_CUSTOMER_MASTER error, returning fallback:', e.message);
    }
  }
  return [
    {
      Customer_Code: 'CUST-001',
      Customer_Name: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)',
      Customer_Group: 'Corporate Key Account',
      Sales_Channel: 'Modern Trade',
      Sale_Owner: 'Anucha (Sale)',
      Contact_Name: 'คุณสมศักดิ์ วัฒนา',
      Contact_Phone: '02-785-5555 ต่อ 1234',
      Contact_Email: 'somsak@thaibev.com',
      Ship_To_Code: 'ST-001',
      Delivery_Address: '14 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร',
      District: 'จตุจักร',
      Province: 'กรุงเทพมหานคร',
      Default_Route: 'BKK-CENTRAL (Zone A)',
      Default_Delivery_Time: '10:00 - 12:00',
      Default_Documents: 'Commercial Invoice, Product Specification, Halal Certificate',
      Active: 'TRUE'
    },
    {
      Customer_Code: 'CUST-002',
      Customer_Name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
      Customer_Group: 'Modern Trade Retail',
      Sales_Channel: 'Modern Trade',
      Sale_Owner: 'Anucha (Sale)',
      Contact_Name: 'คุณกรรณิการ์ จิตเจริญ',
      Contact_Phone: '02-071-9000',
      Contact_Email: 'kannika@cpall.co.th',
      Ship_To_Code: 'ST-002',
      Delivery_Address: 'ศูนย์กระจายสินค้าซีพี ออลล์ ลาดกระบัง ถ.ฉลองกรุง',
      District: 'ลาดกระบัง',
      Province: 'กรุงเทพมหานคร',
      Default_Route: 'BKK-EAST (Zone C)',
      Default_Delivery_Time: '08:30 - 11:00',
      Default_Documents: 'Commercial Invoice, Halal Certificate, Traceability',
      Active: 'TRUE'
    },
    {
      Customer_Code: 'CUST-003',
      Customer_Name: 'บริษัท ไมเนอร์ ฟู้ด กรุ๊ป จำกัด (มหาชน)',
      Customer_Group: 'Food Service Chain',
      Sales_Channel: 'HORECA',
      Sale_Owner: 'Suda (Sale)',
      Contact_Name: 'คุณธนภัทร เลิศวรพงษ์',
      Contact_Phone: '02-365-7500',
      Contact_Email: 'thanapat@minor.com',
      Ship_To_Code: 'ST-003',
      Delivery_Address: '88 อาคารเดอะปาร์ค ชั้น 11 ถ.รัชดาภิเษก',
      District: 'คลองเตย',
      Province: 'กรุงเทพมหานคร',
      Default_Route: 'BKK-SOUTH (Zone B)',
      Default_Delivery_Time: '13:00 - 15:00',
      Default_Documents: 'Commercial Invoice, Product Specification',
      Active: 'TRUE'
    }
  ];
}

export async function upsertCustomer(customerData: any, token: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (!sId) throw new Error('Spreadsheet not configured');

  const sheetName = '06_CUSTOMER_MASTER';
  const customerCode = customerData.Customer_Code;
  
  if (!customerCode) throw new Error('Customer_Code is required');

  const existing = await readSheet(token, sId, sheetName);
  const found = existing.find((c: any) => c.Customer_Code === customerCode);

  const payload = {
    ...customerData,
    Updated_Date: new Date().toISOString().split('T')[0]
  };

  if (found) {
    return updateRowByColumn(token, sId, sheetName, 'Customer_Code', customerCode, payload);
  } else {
    return appendRow(token, sId, sheetName, payload);
  }
}

export async function upsertProduct(productData: any, token: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (!sId) throw new Error('Spreadsheet not configured');

  const sheetName = '07_PRODUCT_MASTER';
  const itemCode = productData.Item_Code;
  
  if (!itemCode) throw new Error('Item_Code is required');

  const existing = await readSheet(token, sId, sheetName);
  const found = existing.find((p: any) => p.Item_Code === itemCode);

  const payload = {
    ...productData,
    Updated_Date: new Date().toISOString().split('T')[0]
  };

  if (found) {
    return updateRowByColumn(token, sId, sheetName, 'Item_Code', itemCode, payload);
  } else {
    return appendRow(token, sId, sheetName, payload);
  }
}

export async function getProducts(token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const products = await readSheet(token, sId, '07_PRODUCT_MASTER');
      if (products.length > 0) return products;
    } catch (e: any) {
      console.warn('Sheets read 07_PRODUCT_MASTER error, returning fallback:', e.message);
    }
  }
  return [
    { Item_Code: 'SKU-RM-001', Product_Name: 'Premium Wagyu Striploin A4 Sliced', Category: 'Beef', Product_Type: 'Raw Meat', UOM: 'กิโลกรัม', Standard_Price: 1850, Storage_Type: 'Chilled', Temperature: 'Chilled (0°C to 4°C)', Shelf_Life: '21 วัน', Active: 'TRUE' },
    { Item_Code: 'SKU-RM-002', Product_Name: 'Kurobuta Pork Collar Shabu Sliced 1.5mm', Category: 'Pork', Product_Type: 'Raw Meat', UOM: 'กิโลกรัม', Standard_Price: 350, Storage_Type: 'Chilled', Temperature: 'Chilled (0°C to 4°C)', Shelf_Life: '14 วัน', Active: 'TRUE' },
    { Item_Code: 'SKU-RTC-001', Product_Name: 'Marinated Teriyaki Pork Skewers', Category: 'Pork', Product_Type: 'Ready to Cook', UOM: 'กล่อง', Standard_Price: 340, Storage_Type: 'Frozen', Temperature: 'Frozen (-18°C)', Shelf_Life: '180 วัน', Active: 'TRUE' },
    { Item_Code: 'SKU-FUR-001', Product_Name: 'Smoked Pepper Bacon Slab', Category: 'Processed Meat', Product_Type: 'Further Processing', UOM: 'กิโลกรัม', Standard_Price: 420, Storage_Type: 'Chilled', Temperature: 'Chilled (0°C to 4°C)', Shelf_Life: '45 วัน', Active: 'TRUE' }
  ];
}

export async function getRDDepartments(token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const depts = await readSheet(token, sId, '04_RD_DEPARTMENT_MASTER');
      if (depts.length > 0) return depts;
    } catch (e: any) {
      console.warn('Sheets read 04_RD_DEPARTMENT_MASTER error:', e.message);
    }
  }
  return getRDDepartmentsLocal();
}

export async function getRunningNumberConfig(token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const running = await readSheet(token, sId, '05_DOCUMENT_RUNNING_NO');
      if (running.length > 0) return running;
    } catch (e: any) {
      console.warn('Sheets read 05_DOCUMENT_RUNNING_NO error:', e.message);
    }
  }
  return getRunningNumbersLocal();
}

export async function initializeRunningNumber(payload: any, token?: string, spreadsheetId?: string) {
  const updated = await setupRunningNumberLocal(payload);
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(
        token,
        sId,
        '05_DOCUMENT_RUNNING_NO',
        'Running_ID',
        `RUN-${payload.year || 2026}-${payload.deptCode}`,
        {
          Starting_No: payload.startingNo,
          Next_No: payload.startingNo,
          Digit_Length: payload.digitLength || 3,
          Initialized: 'TRUE',
          Initialization_Remark: payload.remark || '',
          Updated_Date: new Date().toISOString().split('T')[0],
          Updated_By: payload.userEmail || 'Admin'
        }
      );
    } catch (e: any) {
      console.warn('Sheets update 05_DOCUMENT_RUNNING_NO warning:', e.message);
    }
  }
  return updated;
}

export async function generateSampleNumber(
  deptCode: string,
  year: number = 2026,
  userEmail: string = 'sale@company.com',
  userName: string = 'Sale Specialist',
  token?: string,
  spreadsheetId?: string
) {
  const result = await generateSampleNumberLocal(deptCode, year, userEmail, userName);
  const sId = getActiveSpreadsheetId(spreadsheetId);
  const runningNumber = result.record ? result.record.Last_Used_No : 1;
  if (token && sId) {
    try {
      await updateRowByColumn(
        token,
        sId,
        '05_DOCUMENT_RUNNING_NO',
        'Running_ID',
        `RUN-${year}-${deptCode.toUpperCase()}`,
        {
          Last_Used_No: runningNumber,
          Next_No: runningNumber + 1,
          Updated_Date: new Date().toISOString().split('T')[0],
          Updated_By: userEmail
        }
      );
    } catch (e: any) {
      console.warn('Sync sequence to Google Sheets error:', e.message);
    }
  }
  return {
    ...result,
    runningNumber
  };
}

// ============================================================
// 3. SAMPLE REQUEST HEADER & LINES SERVICES
// ============================================================

export async function getSampleRequests(filters?: any, token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  let requests: any[] = [];
  let lines: any[] = [];

  if (token && sId) {
    try {
      requests = await readSheet(token, sId, '10_SAMPLE_REQUEST_HEADER');
      lines = await readSheet(token, sId, '11_SAMPLE_REQUEST_LINES');
    } catch (e: any) {
      console.warn('Reading Sample Requests from Sheets failed, using memory store:', e.message);
    }
  }

  // Fallback to memory store if empty
  if (requests.length === 0) {
    requests = Array.from(memoryStore.requests.values());
  }

  // Attach lines to requests
  return requests.map(req => {
    const sampleNo = req.Sample_No || req.sampleNo;
    const reqLines = lines.filter(l => (l.Sample_No || l.sampleNo) === sampleNo);
    return {
      ...req,
      lines: reqLines.length > 0 ? reqLines : (memoryStore.lines.get(sampleNo) || [])
    };
  });
}

export async function getSampleRequestById(sampleNo: string, token?: string, spreadsheetId?: string) {
  const all = await getSampleRequests(undefined, token, spreadsheetId);
  const found = all.find(r => (r.Sample_No || r.sampleNo) === sampleNo);
  if (!found) {
    // Check memory store directly
    const memReq = memoryStore.requests.get(sampleNo);
    if (memReq) {
      return {
        ...memReq,
        lines: memoryStore.lines.get(sampleNo) || []
      };
    }
    return null;
  }
  return found;
}

export async function createSampleRequest(requestData: any, token?: string, spreadsheetId?: string) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const sampleNo = requestData.sampleNo || requestData.Sample_No;
  const revision = requestData.revision || requestData.Revision_No || 'REV.00';
  const headerRowData = {
    Sample_No: sampleNo,
    Full_Document_No: `${sampleNo} ${revision}`,
    Revision_No: revision,
    Sample_Year: 2026,
    Sample_Running_No: 1,
    Created_Date: dateStr,
    Created_Time: timeStr,
    Created_Timestamp: now.toISOString(),
    Created_By: requestData.createdBy || requestData.saleEmail || 'Sale Specialist',
    Sale_Name: requestData.saleName || 'Sale Specialist',
    Sale_Email: requestData.saleEmail || 'sale@company.com',
    Department: requestData.department || 'RM',
    Sales_Channel: 'Modern Trade',
    RD_Department_Code: requestData.department || 'RM',
    RD_Department_Name: requestData.departmentName || requestData.department || 'RM',
    RD_Department_Prefix: requestData.departmentPrefix || requestData.department || 'RM',
    Customer_Code: requestData.customerCode,
    Customer_Name: requestData.customerName,
    Contact_Name: requestData.contactName || '',
    Contact_Phone: requestData.contactPhone || '',
    Contact_Email: requestData.contactEmail || '',
    Sample_Type: requestData.sampleType || 'New Product Presentation',
    Sample_Purpose: requestData.samplePurpose || '',
    Purpose_Detail: requestData.purposeDetail || '',
    Priority: requestData.priority || 'NORMAL',
    Preparation_Department: requestData.department || 'RM',
    Preparation_Date: dateStr,
    Preparation_Due_Time: '16:00',
    Delivery_Date: requestData.deliveryDate,
    Delivery_Time_From: requestData.deliveryTimeFrom || '10:00',
    Delivery_Time_To: requestData.deliveryTimeTo || '12:00',
    Delivery_Address: requestData.deliveryAddress || '',
    District: requestData.district || '',
    Province: requestData.province || '',
    Route: requestData.route || '',
    Depot: 'Main Depot',
    Temperature: requestData.temperature || 'Chilled (0°C to 4°C)',
    Delivery_Type: requestData.deliveryType || 'Direct to Customer',
    Required_Documents: Array.isArray(requestData.requiredDocuments) ? requestData.requiredDocuments.join(', ') : (requestData.requiredDocuments || ''),
    Customer_Requirement: requestData.customerRequirement || '',
    Sale_Remark: requestData.saleRemark || '',
    Total_Qty: requestData.totalQty || (requestData.lines?.reduce((sum: number, l: any) => sum + (Number(l.requestQty) || 0), 0)) || 0,
    Total_Weight: requestData.totalWeight || 0,
    Grand_Total: requestData.totalValue || 0,
    Current_Status: requestData.isDraft ? 'DRAFT' : 'LOGISTIC PRE-CHECK',
    Current_Process: requestData.isDraft ? 'DRAFT_SAVED' : 'LOGISTIC_PRECHECK',
    Current_Owner: requestData.isDraft ? requestData.saleName : 'Somchai (Logistic Dispatcher)',
    SLA_Status: 'NORMAL',
    Document_Status: 'DRAFT',
    Updated_Timestamp: now.toISOString()
  };

  // Save in memory
  memoryStore.requests.set(sampleNo, headerRowData);
  memoryStore.lines.set(sampleNo, requestData.lines || []);

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const headerSchema = SHEETS_SCHEMA['10_SAMPLE_REQUEST_HEADER'];
      const headerRow = headerSchema.map((col: string) => (headerRowData as any)[col] !== undefined ? String((headerRowData as any)[col]) : '');
      await appendRow(token, sId, '10_SAMPLE_REQUEST_HEADER', headerRow);

      if (requestData.lines && requestData.lines.length > 0) {
        const lineSchema = SHEETS_SCHEMA['11_SAMPLE_REQUEST_LINES'];
        const lineRows = requestData.lines.map((l: any, idx: number) => {
          const lineObj: any = {
            Line_ID: `L-${sampleNo}-${idx + 1}`,
            Sample_No: sampleNo,
            Line_No: idx + 1,
            Item_Code: l.itemCode,
            Product_Name: l.productName,
            Product_Type: l.category || 'Raw Meat',
            Category: l.category || 'Raw Meat',
            Storage_Type: l.storageType || 'Chilled',
            UOM: l.uom || 'กิโลกรัม',
            Request_Qty: l.requestQty || 1,
            Unit_Price: l.price || 0,
            Line_Value: (Number(l.requestQty) || 0) * (Number(l.price) || 0),
            Remark: l.remark || ''
          };
          return lineSchema.map((col: string) => lineObj[col] !== undefined ? String(lineObj[col]) : '');
        });
        await appendRows(token, sId, '11_SAMPLE_REQUEST_LINES', lineRows);
      }
    } catch (e: any) {
      console.warn('Writing Sample Request to Sheets warning:', e.message);
    }
  }

  // Create corresponding logistic task
  await getLogisticTasks(sampleNo, token, spreadsheetId);

  await writeAuditLog({
    sampleNo,
    user: requestData.saleName || 'Sale',
    userEmail: requestData.saleEmail || 'sale@company.com',
    role: 'SALE',
    module: 'SAMPLE_REQUEST',
    action: requestData.isDraft ? 'CREATE_DRAFT' : 'SUBMIT_REQUEST',
    newValue: sampleNo,
    reason: `Created sample request ${sampleNo}`
  }, token, sId || undefined);

  return { success: true, sampleNo, data: headerRowData };
}

export async function updateSampleRequest(sampleNo: string, updateData: any, token?: string, spreadsheetId?: string) {
  const existing = memoryStore.requests.get(sampleNo) || {};
  const merged = { ...existing, ...updateData, Updated_Timestamp: new Date().toISOString() };
  memoryStore.requests.set(sampleNo, merged);

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '10_SAMPLE_REQUEST_HEADER', 'Sample_No', sampleNo, updateData);
    } catch (e: any) {
      console.warn('Sheets updateSampleRequest error:', e.message);
    }
  }

  return { success: true, sampleNo, data: merged };
}

export async function submitSampleRequest(sampleNo: string, submitter: any, token?: string, spreadsheetId?: string) {
  const result = await updateSampleRequest(
    sampleNo,
    {
      Current_Status: 'LOGISTIC PRE-CHECK',
      Current_Process: 'LOGISTIC_PRECHECK',
      Current_Owner: 'Somchai (Logistic Dispatcher)'
    },
    token,
    spreadsheetId
  );

  await sendWorkflowEmail('EVENT_SUBMITTED', sampleNo, {
    toEmail: 'logistic.precheck@company.com',
    saleEmail: submitter?.email || 'sale@company.com'
  }, token, spreadsheetId);

  return result;
}

// ============================================================
// 4. LOGISTIC PRE-CHECK & VEHICLE ASSIGNMENT SERVICES
// ============================================================

export async function getLogisticTasks(sampleNo?: string, token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  let tasks: any[] = [];
  if (token && sId) {
    try {
      tasks = await readSheet(token, sId, '12_LOGISTIC_TASK');
    } catch (e: any) {
      console.warn('Sheets read 12_LOGISTIC_TASK error:', e.message);
    }
  }

  if (tasks.length === 0) {
    tasks = Array.from(memoryStore.logisticTasks.values());
  }

  if (sampleNo) {
    return tasks.find(t => (t.Sample_No || t.sampleNo) === sampleNo) || null;
  }
  return tasks;
}

export async function confirmLogisticPrecheck(
  taskId: string,
  decision: 'FEASIBLE' | 'ALTERNATIVE_PROPOSED',
  proposedData: any = {},
  remark: string = '',
  user: any = { name: 'Somchai (Logistic)', email: 'logistic@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const now = new Date();
  const updatePayload = {
    Feasibility: decision,
    Precheck_Status: decision === 'FEASIBLE' ? 'PASS' : 'ALTERNATIVE_PROPOSED',
    Precheck_Remark: remark,
    Precheck_By: user.name,
    Precheck_Time: now.toISOString(),
    Proposed_Date: proposedData.date || '',
    Proposed_Time_From: proposedData.timeFrom || '',
    Proposed_Time_To: proposedData.timeTo || '',
    Task_Status: 'COMPLETED'
  };

  memoryStore.logisticTasks.set(taskId, { ...(memoryStore.logisticTasks.get(taskId) || {}), ...updatePayload });

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '12_LOGISTIC_TASK', 'Logistic_Task_ID', taskId, updatePayload);
    } catch (e: any) {
      console.warn('Sheets update 12_LOGISTIC_TASK error:', e.message);
    }
  }

  // Update Header status to WAITING APPROVAL
  const task = memoryStore.logisticTasks.get(taskId);
  const sampleNo = task?.Sample_No || task?.sampleNo || taskId;
  await updateSampleRequest(sampleNo, {
    Current_Status: 'WAITING APPROVAL',
    Current_Process: 'SALE_MANAGER_APPROVAL',
    Current_Owner: 'Nattapong (Sale Manager)'
  }, token, spreadsheetId);

  await sendWorkflowEmail('EVENT_SUBMITTED', sampleNo, {
    toEmail: 'manager@company.com',
    remark
  }, token, spreadsheetId);

  return { success: true, taskId, status: 'WAITING APPROVAL' };
}

export async function assignVehicle(
  taskId: string,
  vehicleData: { vehicleType: string; vehicleNo: string; driverName: string; driverPhone: string },
  user: any = { name: 'Somchai', email: 'logistic@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const updates = {
    Vehicle_Type: vehicleData.vehicleType,
    Vehicle_No: vehicleData.vehicleNo,
    Driver_Name: vehicleData.driverName,
    Driver_Phone: vehicleData.driverPhone,
    Task_Status: 'VEHICLE_ASSIGNED'
  };

  memoryStore.logisticTasks.set(taskId, { ...(memoryStore.logisticTasks.get(taskId) || {}), ...updates });
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '12_LOGISTIC_TASK', 'Logistic_Task_ID', taskId, updates);
    } catch (e: any) {
      console.warn('Sheets assignVehicle error:', e.message);
    }
  }
  return { success: true, taskId, ...updates };
}

export async function confirmVehicle(
  taskId: string,
  confirmationData: any = {},
  user: any = { name: 'Somchai', email: 'logistic@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const updates = {
    Task_Status: 'CONFIRMED',
    Complete_Time: new Date().toISOString()
  };

  memoryStore.logisticTasks.set(taskId, { ...(memoryStore.logisticTasks.get(taskId) || {}), ...updates });
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '12_LOGISTIC_TASK', 'Logistic_Task_ID', taskId, updates);
    } catch (e: any) {
      console.warn('Sheets confirmVehicle error:', e.message);
    }
  }
  return { success: true, taskId, status: 'CONFIRMED' };
}

export async function updateDeliveryStatus(
  taskId: string,
  deliveryStatus: string,
  podUrl: string = '',
  issueRemark: string = '',
  user: any = { name: 'Dispatcher', email: 'logistic@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const updates = {
    Delivery_Status: deliveryStatus,
    POD_URL: podUrl,
    Delivery_Issue: issueRemark,
    Actual_Delivery: deliveryStatus === 'DELIVERED' ? new Date().toISOString() : ''
  };

  memoryStore.logisticTasks.set(taskId, { ...(memoryStore.logisticTasks.get(taskId) || {}), ...updates });
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '12_LOGISTIC_TASK', 'Logistic_Task_ID', taskId, updates);
    } catch (e: any) {
      console.warn('Sheets updateDeliveryStatus error:', e.message);
    }
  }

  const task = memoryStore.logisticTasks.get(taskId);
  const sampleNo = task?.Sample_No || taskId;

  if (deliveryStatus === 'DELIVERED') {
    await updateSampleRequest(sampleNo, {
      Current_Status: 'DELIVERED',
      Current_Process: 'COMPLETED',
      Current_Owner: '-'
    }, token, spreadsheetId);

    await sendWorkflowEmail('EVENT_DELIVERED', sampleNo, { podUrl }, token, spreadsheetId);
  }

  return { success: true, deliveryStatus };
}

// ============================================================
// 5. APPROVAL WORKFLOW SERVICES
// ============================================================

export async function getApprovalQueue(userEmail?: string, token?: string, spreadsheetId?: string) {
  const requests = await getSampleRequests(undefined, token, spreadsheetId);
  return requests.filter(r => (r.Current_Status || r.currentStatus) === 'WAITING APPROVAL');
}

export async function approveRequest(
  sampleNo: string,
  approver: any = { name: 'Nattapong (Sale Manager)', email: 'manager@company.com' },
  comment: string = 'Approved',
  token?: string,
  spreadsheetId?: string
) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  const existingRequest = await getSampleRequestById(sampleNo, token, spreadsheetId);
  const existingStatus = existingRequest?.Current_Status || existingRequest?.currentStatus;
  if (!existingRequest) throw new Error(`Sample Request '${sampleNo}' not found`);
  if (existingStatus !== 'WAITING APPROVAL') {
    throw new Error(`Sample Request '${sampleNo}' is already processed (status: ${existingStatus || 'UNKNOWN'})`);
  }

  const approvalRecord = {
    Approval_ID: `APP-${Date.now()}`,
    Sample_No: sampleNo,
    Approval_Level: 'Sale Manager',
    Approver_Name: approver.name,
    Approver_Email: approver.email,
    Approval_Status: 'APPROVED',
    Approval_Date: dateStr,
    Approval_Time: timeStr,
    Revision_Remark: comment,
    SLA_Status: 'NORMAL'
  };

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const schema = SHEETS_SCHEMA['13_APPROVAL'];
      const row = schema.map(col => (approvalRecord as any)[col] || '');
      await appendRow(token, sId, '13_APPROVAL', row);
    } catch (e: any) {
      console.warn('Sheets append 13_APPROVAL error:', e.message);
    }
  }

  // Update Header to APPROVED & Fan out parallel tasks (RD, Co-Sale, Logistic)
  await updateSampleRequest(sampleNo, {
    Current_Status: 'APPROVED',
    Current_Process: 'PARALLEL_TASKS',
    Current_Owner: 'RD, Co-Sale, Logistic Teams'
  }, token, spreadsheetId);

  // Auto-generate parallel tasks
  const req = await getSampleRequestById(sampleNo, token, spreadsheetId);
  await createRDTasks(sampleNo, req?.lines || [], token, spreadsheetId);
  await createCoSaleTask(sampleNo, req, token, spreadsheetId);

  await sendWorkflowEmail('EVENT_APPROVED', sampleNo, { comment }, token, spreadsheetId);
  return { success: true, sampleNo, status: 'APPROVED' };
}

export async function rejectRequest(
  sampleNo: string,
  approver: any = { name: 'Nattapong (Sale Manager)', email: 'manager@company.com' },
  reason: string = '',
  token?: string,
  spreadsheetId?: string
) {
  await updateSampleRequest(sampleNo, {
    Current_Status: 'REJECTED',
    Current_Process: 'REJECTED_CLOSED',
    Current_Owner: '-'
  }, token, spreadsheetId);

  await writeAuditLog({
    sampleNo,
    user: approver.name,
    userEmail: approver.email,
    role: 'SALE_MANAGER',
    module: 'APPROVAL',
    action: 'REJECT',
    reason
  }, token, spreadsheetId);

  return { success: true, sampleNo, status: 'REJECTED' };
}

export async function requestRevision(
  sampleNo: string,
  approver: any = { name: 'Nattapong (Sale Manager)', email: 'manager@company.com' },
  sections: string = 'General Details',
  remark: string = '',
  token?: string,
  spreadsheetId?: string
) {
  const existingRequest = await getSampleRequestById(sampleNo, token, spreadsheetId);
  if (!existingRequest) throw new Error(`Sample Request '${sampleNo}' not found`);
  const currentStatus = existingRequest.Current_Status || existingRequest.currentStatus || '';
  const currentRevision = existingRequest.Revision_No || existingRequest.revision || 'REV.00';
  const documentWasDistributed = ['APPROVED', 'PROCESSING', 'READY TO DELIVER', 'PICKED UP', 'OUT FOR DELIVERY', 'ARRIVED', 'DELIVERED', 'CUSTOMER RECEIVED', 'COMPLETED'].includes(currentStatus);
  const revisionMatch = String(currentRevision).match(/(\d+)$/);
  const nextRevision = documentWasDistributed && revisionMatch
    ? `REV.${String(Number(revisionMatch[1]) + 1).padStart(2, '0')}`
    : currentRevision;

  await updateSampleRequest(sampleNo, {
    Current_Status: 'REVISION REQUIRED',
    Current_Process: 'SALE_REVISE',
    Current_Owner: 'Sale Specialist',
    Revision_No: nextRevision
  }, token, spreadsheetId);

  await sendWorkflowEmail('EVENT_REVISION', sampleNo, { sections, remark, revision: nextRevision }, token, spreadsheetId);
  return { success: true, sampleNo, status: 'REVISION_REQUESTED', revision: nextRevision };
}

// ============================================================
// 6. RD & CO-SALE PARALLEL TASKS SERVICES
// ============================================================

export async function createRDTasks(sampleNo: string, items: any[] = [], token?: string, spreadsheetId?: string) {
  const tasks = items.map((item, idx) => ({
    RD_Task_ID: `RDT-${sampleNo}-${idx + 1}`,
    Sample_No: sampleNo,
    RD_Department_Code: item.Category || 'RM',
    Assigned_To: 'Dr. Prasert (RD Lead)',
    Assigned_Email: 'rd.rawmeat@company.com',
    Task_Create_Time: new Date().toISOString(),
    Item_Code: item.Item_Code || item.itemCode,
    Product_Name: item.Product_Name || item.productName,
    Required_Qty: item.Request_Qty || item.requestQty || 1,
    Task_Status: 'PENDING',
    SLA_Status: 'NORMAL'
  }));

  memoryStore.rdTasks.set(sampleNo, tasks);

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId && tasks.length > 0) {
    try {
      const schema = SHEETS_SCHEMA['14_RD_TASK'];
      const rows = tasks.map(t => schema.map(col => (t as any)[col] || ''));
      await appendRows(token, sId, '14_RD_TASK', rows);
    } catch (e: any) {
      console.warn('Sheets append 14_RD_TASK error:', e.message);
    }
  }
  return tasks;
}

export async function updateRDTask(taskId: string, updateData: any, token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '14_RD_TASK', 'RD_Task_ID', taskId, updateData);
    } catch (e: any) {
      console.warn('Sheets updateRDTask error:', e.message);
    }
  }
  return { success: true, taskId, ...updateData };
}

export async function completeRDTask(
  taskId: string,
  lot: string,
  actualQty: number,
  productionDate: string = '',
  expiryDate: string = '',
  remark: string = '',
  user: any = { name: 'Dr. Prasert', email: 'rd@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const updatePayload = {
    Lot: lot,
    Actual_Qty: actualQty,
    Production_Date: productionDate || new Date().toISOString().split('T')[0],
    Expiry_Date: expiryDate,
    Preparation_Remark: remark,
    Complete_Time: new Date().toISOString(),
    Task_Status: 'COMPLETED'
  };

  const res = await updateRDTask(taskId, updatePayload, token, spreadsheetId);
  return res;
}

export async function createCoSaleTask(sampleNo: string, coSaleData: any = {}, token?: string, spreadsheetId?: string) {
  const task = {
    CoSale_Task_ID: `COST-${sampleNo}`,
    Sample_No: sampleNo,
    Assigned_To: 'Wichai (Co-Sale Specialist)',
    Assigned_Email: 'cosale@company.com',
    Customer_Code: coSaleData.Customer_Code || coSaleData.customerCode || '',
    Ship_To: coSaleData.Ship_To_Code || 'ST-001',
    Sample_Type: coSaleData.Sample_Type || 'New Product Presentation',
    Task_Create_Time: new Date().toISOString(),
    Task_Status: 'IN_PROGRESS',
    SLA_Status: 'NORMAL'
  };

  memoryStore.coSaleTasks.set(sampleNo, task);

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const schema = SHEETS_SCHEMA['15_CO_SALE_TASK'];
      const row = schema.map(col => (task as any)[col] || '');
      await appendRow(token, sId, '15_CO_SALE_TASK', row);
    } catch (e: any) {
      console.warn('Sheets append 15_CO_SALE_TASK error:', e.message);
    }
  }
  return task;
}

export async function completeSO(
  taskId: string,
  soNumber: string,
  soDate: string,
  erpStatus: string = 'RELEASED',
  remark: string = '',
  user: any = { name: 'Wichai', email: 'cosale@company.com' },
  token?: string,
  spreadsheetId?: string
) {
  const updates = {
    SO_Number: soNumber,
    SO_Date: soDate,
    ERP_Status: erpStatus,
    Document_Status: 'READY',
    Complete_Time: new Date().toISOString(),
    Task_Status: 'COMPLETED'
  };

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      await updateRowByColumn(token, sId, '15_CO_SALE_TASK', 'CoSale_Task_ID', taskId, updates);
    } catch (e: any) {
      console.warn('Sheets completeSO error:', e.message);
    }
  }
  return { success: true, taskId, ...updates };
}

// ============================================================
// 7. READY TO DELIVER GATE & AUTOMATION
// ============================================================

export async function checkReadyToDeliverGate(sampleNo: string, token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  let rdCompleted = true;
  let soCompleted = true;
  let vehicleConfirmed = true;

  if (token && sId) {
    try {
      const rdTasks = await readSheet(token, sId, '14_RD_TASK');
      const sampleRd = rdTasks.filter(t => t.Sample_No === sampleNo);
      if (sampleRd.length > 0) {
        rdCompleted = sampleRd.every(t => t.Task_Status === 'COMPLETED');
      }

      const coSaleTasks = await readSheet(token, sId, '15_CO_SALE_TASK');
      const sampleCoSale = coSaleTasks.find(t => t.Sample_No === sampleNo);
      if (sampleCoSale) {
        soCompleted = sampleCoSale.Task_Status === 'COMPLETED' && !!sampleCoSale.SO_Number;
      }

      const logTasks = await readSheet(token, sId, '12_LOGISTIC_TASK');
      const sampleLog = logTasks.find(t => t.Sample_No === sampleNo);
      if (sampleLog) {
        vehicleConfirmed = sampleLog.Task_Status === 'CONFIRMED' || !!sampleLog.Vehicle_No;
      }
    } catch (e: any) {
      console.warn('Gate check reading error:', e.message);
    }
  }

  const isReady = rdCompleted && soCompleted && vehicleConfirmed;
  if (isReady) {
    await updateSampleRequest(sampleNo, {
      Current_Status: 'READY TO DELIVER',
      Current_Process: 'LOGISTIC_DISPATCH',
      Current_Owner: 'Somchai (Logistic Dispatcher)'
    }, token, spreadsheetId);

    await sendWorkflowEmail('EVENT_READY_TO_DELIVER', sampleNo, {}, token, spreadsheetId);
  }

  return {
    isReady,
    criteria: { rdCompleted, soCompleted, vehicleConfirmed }
  };
}

// ============================================================
// 8. DOCUMENT REGISTER & PDF GENERATION SERVICES
// ============================================================

export async function generateSampleDocument(sampleNo: string, token?: string, spreadsheetId?: string) {
  const req = await getSampleRequestById(sampleNo, token, spreadsheetId);
  return {
    documentId: `DOC-${sampleNo}-V1`,
    sampleNo,
    header: req,
    generatedAt: new Date().toISOString()
  };
}

export async function generatePDF(sampleNo: string, documentType: string = 'Official Sample Request', token?: string, spreadsheetId?: string, revision: string = 'REV.00', department: string = 'RM') {
  const doc = await generateSampleDocument(sampleNo, token, spreadsheetId);
  const revRaw = revision.replace(/[^0-9]/g, '');
  const revStr = revRaw ? `REV${revRaw.padStart(2, '0')}` : 'REV00';
  const cleanSample = sampleNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanSample}_${revStr}.pdf`;
  const dummyPdfContent = `%PDF-1.4\n% Official Sample Request Document: ${sampleNo}\nRevision: ${revStr}\nDepartment: ${department}\nType: ${documentType}\nGenerated: ${new Date().toISOString()}`;

  let driveResult: any = {
    fileId: `DRIVE-${Date.now()}`,
    webViewLink: `https://drive.google.com/preview?doc=${sampleNo}`
  };

  if (token) {
    try {
      driveResult = await savePDFToDrive(sampleNo, dummyPdfContent, fileName, token, spreadsheetId, department, revision);
    } catch (e: any) {
      console.warn('Save PDF to Drive warning:', e.message);
    }
  }

  return {
    success: true,
    documentId: doc.documentId,
    sampleNo,
    fileName,
    ...driveResult
  };
}

export async function savePDFToDrive(
  sampleNo: string, 
  pdfContent: string, 
  fileName?: string, 
  token?: string, 
  spreadsheetId?: string,
  department: string = 'RM',
  revision: string = 'REV.00'
) {
  if (!token) {
    throw new Error('Google OAuth access token is required to save to Drive');
  }
  const revRaw = revision.replace(/[^0-9]/g, '');
  const revStr = revRaw ? `REV${revRaw.padStart(2, '0')}` : 'REV00';
  const cleanSample = sampleNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const name = fileName || `${cleanSample}_${revStr}.pdf`;
  const currentYear = new Date().getFullYear();
  const folderPath = `Sample Request/${currentYear}/${department.toUpperCase()}/${sampleNo}`;

  const driveFile = await uploadFileToDrive(token, name, 'application/pdf', pdfContent, folderPath);

  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (sId) {
    try {
      const now = new Date();
      const row = [
        `DOC-${Date.now()}`,
        sampleNo,
        'Official Sample Request (PDF)',
        revStr,
        'ACTIVE',
        now.toISOString().split('T')[0],
        now.toTimeString().split(' ')[0],
        'System Generator',
        'Approved',
        now.toISOString().split('T')[0],
        driveFile.fileName,
        driveFile.webViewLink,
        driveFile.fileId,
        'READY',
        now.toISOString(),
        '-',
        now.toISOString()
      ];
      await appendRow(token, sId, '16_DOCUMENT_REGISTER', row);
    } catch (e: any) {
      console.warn('Register PDF to 16_DOCUMENT_REGISTER error:', e.message);
    }
  }

  return driveFile;
}

// ============================================================
// 9. EMAIL & NOTIFICATION SERVICES
// ============================================================

export async function getEmailRecipients(eventCode: string, department: string = 'ALL', token?: string, spreadsheetId?: string) {
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const recipients = await readSheet(token, sId, '18_EMAIL_RECIPIENT_MASTER');
      const filtered = recipients.filter(r => 
        (r.Event_Code === eventCode || r.Event_Code === 'ALL') &&
        (r.Department === department || r.Department === 'ALL' || department === 'ALL') &&
        r.Active === 'TRUE'
      );
      if (filtered.length > 0) return filtered;
    } catch (e: any) {
      console.warn('Sheets read 18_EMAIL_RECIPIENT_MASTER error:', e.message);
    }
  }
  return [
    { Recipient_Name: 'Sale Manager', Email: 'manager@company.com', Recipient_Type: 'TO' },
    { Recipient_Name: 'Logistic Desk', Email: 'logistic@company.com', Recipient_Type: 'TO' }
  ];
}

export async function sendWorkflowEmail(
  eventCode: string,
  sampleNo: string,
  customData: any = {},
  token?: string,
  spreadsheetId?: string
) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  const toEmail = customData.toEmail || 'team@company.com';
  const ccEmail = customData.ccEmail || 'sankwans@gmail.com';
  const subject = customData.subject || `[${eventCode}] Sample Request Notification - ${sampleNo}`;
  const body = generateEmailBody(eventCode, sampleNo, customData);

  let sendStatus = 'SENT';
  let errorMessage = '';

  if (token && token !== 'custom_email_password_token') {
    try {
      await sendEmailViaGmail(token, toEmail, ccEmail, subject, body);
    } catch (e: any) {
      console.error('Workflow email failed:', e.message);
      sendStatus = 'FAILED';
      errorMessage = e.message;
    }
  } else {
    console.warn('Skipping actual email send: No valid OAuth token available');
    sendStatus = 'LOGGED';
  }

  const logEntry = {
    Email_Log_ID: `EML-${Date.now()}`,
    Sample_No: sampleNo,
    Event_Code: eventCode,
    Send_Date: dateStr,
    Send_Time: timeStr,
    TO_Email: toEmail,
    CC_Email: ccEmail,
    BCC_Email: '',
    Subject: subject,
    Template_Code: `TMPL_${eventCode}`,
    Attachment_File: customData.podUrl || '',
    Send_Status: sendStatus,
    Retry_Count: 0,
    Error_Message: errorMessage,
    Message_ID: `MSG-${Date.now()}`
  };

  await writeEmailLog(logEntry, token, spreadsheetId);
  return { success: sendStatus === 'SENT', ...logEntry };
}

export async function writeEmailLog(logData: any, token?: string, spreadsheetId?: string) {
  memoryStore.emailLogs.unshift(logData);
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const schema = SHEETS_SCHEMA['21_EMAIL_LOG'];
      const row = schema.map(col => logData[col] !== undefined ? String(logData[col]) : '');
      await appendRow(token, sId, '21_EMAIL_LOG', row);
    } catch (e: any) {
      console.warn('Sheets append 21_EMAIL_LOG error:', e.message);
    }
  }
  return logData;
}

// ============================================================
// 10. ISSUE & AUDIT LOG SERVICES
// ============================================================

export async function createIssue(issueData: any, token?: string, spreadsheetId?: string) {
  const now = new Date();
  const issue = {
    Issue_ID: `ISS-${Date.now()}`,
    Sample_No: issueData.sampleNo || '',
    Process: issueData.process || 'GENERAL',
    Issue_Type: issueData.issueType || 'OTHER',
    Severity: issueData.severity || 'MEDIUM',
    Description: issueData.description || '',
    Owner: issueData.owner || 'System',
    Created_Time: now.toISOString(),
    Expected_Resolve: issueData.expectedResolve || '',
    Resolution: '',
    Resolved_Time: '',
    Status: 'OPEN'
  };

  memoryStore.issues.unshift(issue);
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const schema = SHEETS_SCHEMA['22_ISSUE_LOG'];
      const row = schema.map(col => (issue as any)[col] || '');
      await appendRow(token, sId, '22_ISSUE_LOG', row);
    } catch (e: any) {
      console.warn('Sheets append 22_ISSUE_LOG error:', e.message);
    }
  }
  return issue;
}

export async function writeAuditLog(auditData: any, token?: string, spreadsheetId?: string) {
  const entry = addAuditLog(auditData);
  const sId = getActiveSpreadsheetId(spreadsheetId);
  if (token && sId) {
    try {
      const schema = SHEETS_SCHEMA['25_AUDIT_LOG'];
      const auditObj: any = {
        Audit_ID: entry.Audit_ID,
        Timestamp: entry.Timestamp,
        User: entry.User,
        User_Email: entry.User_Email,
        Role: entry.Role,
        Module: entry.Module,
        Sample_No: entry.Sample_No || '',
        Action: entry.Action,
        Field_Name: entry.Field_Name || '',
        Old_Value: entry.Old_Value || '',
        New_Value: entry.New_Value || '',
        Reason: entry.Reason || ''
      };
      const row = schema.map(col => auditObj[col] !== undefined ? String(auditObj[col]) : '');
      await appendRow(token, sId, '25_AUDIT_LOG', row);
    } catch (e: any) {
      console.warn('Sheets append 25_AUDIT_LOG error:', e.message);
    }
  }
  return entry;
}
