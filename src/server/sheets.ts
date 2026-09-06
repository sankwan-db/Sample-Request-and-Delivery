import { google } from 'googleapis';
import { SHEETS_SCHEMA, resolveSheetName } from './schema.js';
import { saveDatabaseConfig, getDatabaseConfig } from './db.js';

export async function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

export async function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

export interface SetupOptions {
  companyInfo?: {
    nameTh: string;
    nameEn: string;
    taxId: string;
    address: string;
    phone: string;
  };
  adminUser?: {
    name: string;
    email: string;
    employeeId: string;
    role: string;
  };
  emailConfig?: {
    senderName: string;
    senderEmail: string;
  };
  initialDepartments?: Array<{
    code: string;
    nameTh: string;
    nameEn: string;
    prefix: string;
    defaultEmail: string;
    supervisorName: string;
    supervisorEmail: string;
  }>;
  runningConfigs?: Array<{
    deptCode: string;
    prefix: string;
    startingNo: number;
    digitLength: number;
    year: number;
  }>;
  overwriteExisting?: boolean;
}

export async function findExistingSpreadsheet(accessToken: string) {
  const drive = await getDriveClient(accessToken);
  const fileName = 'Sample Request & Delivery';
  
  const res = await drive.files.list({
    q: `name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name, webViewLink, createdTime, modifiedTime)',
    spaces: 'drive'
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0];
  }
  return null;
}

export async function setupGoogleSheetsDatabase(accessToken: string, options: SetupOptions = {}) {
  const drive = await getDriveClient(accessToken);
  const sheets = await getSheetsClient(accessToken);
  const fileName = 'Sample Request & Delivery';

  const stepsLog: string[] = [];

  // Step 1: Find or Create Spreadsheet
  stepsLog.push('Checking existing spreadsheet on Google Drive...');
  const existingFile = await findExistingSpreadsheet(accessToken);
  let spreadsheetId: string;
  let isNew = false;

  if (existingFile && existingFile.id) {
    spreadsheetId = existingFile.id;
    stepsLog.push(`Found existing spreadsheet: ${fileName} (${spreadsheetId}). Updating and replacing old schema sheets.`);
  } else {
    stepsLog.push(`Creating new Google Spreadsheet: ${fileName}...`);
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: fileName
        }
      }
    });
    spreadsheetId = createRes.data.spreadsheetId!;
    isNew = true;
    stepsLog.push(`Created spreadsheet ID: ${spreadsheetId}`);
  }

  // Step 2: Ensure all 26 Canonical Sheets exist and remove old/obsolete sheets
  stepsLog.push('Configuring 26 canonical sheets according to schema specification...');
  const targetSheetNames = Object.keys(SHEETS_SCHEMA);

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))'
  });

  const existingSheets = metadata.data.sheets || [];
  const existingSheetMap = new Map<string, number>();
  existingSheets.forEach(s => {
    if (s.properties?.title && s.properties.sheetId !== undefined) {
      existingSheetMap.set(s.properties.title, s.properties.sheetId);
    }
  });

  const initialRequests: any[] = [];

  // If there's an existing 'Sheet1' and '01_USERS' is not present, rename Sheet1 to '01_USERS'
  if (existingSheetMap.has('Sheet1') && !existingSheetMap.has(targetSheetNames[0])) {
    const sheet1Id = existingSheetMap.get('Sheet1')!;
    initialRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheet1Id,
          title: targetSheetNames[0]
        },
        fields: 'title'
      }
    });
    existingSheetMap.delete('Sheet1');
    existingSheetMap.set(targetSheetNames[0], sheet1Id);
  }

  // Add all target sheets that don't exist yet
  for (const name of targetSheetNames) {
    if (!existingSheetMap.has(name)) {
      initialRequests.push({
        addSheet: {
          properties: {
            title: name
          }
        }
      });
    }
  }

  if (initialRequests.length > 0) {
    const batchRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: initialRequests }
    });
    batchRes.data.replies?.forEach(reply => {
      if (reply.addSheet?.properties?.title && reply.addSheet.properties.sheetId !== undefined) {
        existingSheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
      }
    });
    stepsLog.push(`Added missing sheets to ensure all 26 sheets exist.`);
  }

  // Delete any old/obsolete sheets that do not belong to the 26 canonical schema
  // e.g. unnumbered 'USERS', 'CUSTOMER_MASTER', or leftover 'Sheet1'
  const deleteRequests: any[] = [];
  const updatedMetaBeforeDelete = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))'
  });
  
  updatedMetaBeforeDelete.data.sheets?.forEach(s => {
    const title = s.properties?.title;
    const sId = s.properties?.sheetId;
    if (title && sId !== undefined && !targetSheetNames.includes(title)) {
      deleteRequests.push({
        deleteSheet: {
          sheetId: sId
        }
      });
      stepsLog.push(`Removing obsolete sheet: "${title}"`);
    }
  });

  if (deleteRequests.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: deleteRequests }
      });
      stepsLog.push(`Deleted ${deleteRequests.length} legacy/obsolete sheets.`);
    } catch (err: any) {
      console.warn('Delete legacy sheets warning (non-fatal):', err.message);
    }
  }

  // Refresh metadata to get all exact sheetIds of the 26 canonical sheets
  const finalMeta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))'
  });
  const finalSheetMap = new Map<string, number>();
  finalMeta.data.sheets?.forEach(s => {
    if (s.properties?.title && s.properties.sheetId !== undefined) {
      finalSheetMap.set(s.properties.title, s.properties.sheetId);
    }
  });

  // Step 3: Populate Headers and Default Master Data
  stepsLog.push('Populating schema headers and default master data for all 26 sheets...');
  const valueRanges: any[] = [];
  const nowStr = new Date().toISOString();
  const todayStr = nowStr.split('T')[0];

  const adminEmail = options.adminUser?.email || 'sankwans@gmail.com';
  const adminName = options.adminUser?.name || 'System Admin';
  const adminEmpId = options.adminUser?.employeeId || 'EMP-001';

  for (const sheetName of targetSheetNames) {
    const headers = SHEETS_SCHEMA[sheetName as keyof typeof SHEETS_SCHEMA];
    const rows: any[][] = [[...headers]];

    // Populate default rows per user specification
    if (sheetName === '01_USERS') {
      rows.push(['U-001', adminEmpId, adminName, adminEmail, 'IT', 'ADMIN', '-', '-', 'TRUE', todayStr, adminName, todayStr, adminName]);
      rows.push(['U-002', 'EMP-002', 'Anucha (Sale Specialist)', 'sale@company.com', 'SALES', 'SALE', 'Nattapong (Sale Manager)', 'manager@company.com', 'TRUE', todayStr, adminName, todayStr, adminName]);
      rows.push(['U-003', 'EMP-003', 'Somchai (Logistic Dispatcher)', 'logistic@company.com', 'LOGISTICS', 'LOGISTIC', '-', '-', 'TRUE', todayStr, adminName, todayStr, adminName]);
      rows.push(['U-004', 'EMP-004', 'Nattapong (Sale Manager)', 'manager@company.com', 'SALES', 'SALE_MANAGER', '-', '-', 'TRUE', todayStr, adminName, todayStr, adminName]);
      rows.push(['U-005', 'EMP-005', 'Dr. Prasert (RD Lead)', 'rd.rawmeat@company.com', 'R&D', 'RD', '-', '-', 'TRUE', todayStr, adminName, todayStr, adminName]);
      rows.push(['U-006', 'EMP-006', 'Wichai (Co-Sale Specialist)', 'cosale@company.com', 'CO-SALE', 'CO_SALE', '-', '-', 'TRUE', todayStr, adminName, todayStr, adminName]);
    } else if (sheetName === '02_ROLE_PERMISSION') {
      rows.push(['PERM-001', 'ADMIN', 'ALL', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE']);
      rows.push(['PERM-002', 'SALE', 'SAMPLE_REQUEST', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'FALSE', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE']);
      rows.push(['PERM-003', 'SALE_MANAGER', 'APPROVAL', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'FALSE', 'TRUE']);
      rows.push(['PERM-004', 'LOGISTIC', 'LOGISTIC_TASK', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE']);
      rows.push(['PERM-005', 'RD', 'RD_TASK', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE']);
      rows.push(['PERM-006', 'CO_SALE', 'CO_SALE_TASK', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE']);
      rows.push(['PERM-007', 'MANAGEMENT', 'DASHBOARD', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE']);
    } else if (sheetName === '03_COMPANY_MASTER') {
      rows.push([
        'COMP-001',
        options.companyInfo?.nameTh || 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด (สำนักงานใหญ่)',
        options.companyInfo?.nameEn || 'SAMPLE FLOW ENTERPRISE FOOD CO., LTD.',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120',
        options.companyInfo?.address || '99/9 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
        options.companyInfo?.taxId || '0105558012345',
        options.companyInfo?.phone || '02-555-0199',
        'contact@sampleflow.co.th',
        'เอกสารคำขอตัวอย่างสินค้าและจัดส่ง (Sample Request & Delivery System)',
        'เอกสารนี้สร้างจากระบบอัตโนมัติ ห้ามแก้ไขข้อความโดยไม่ได้รับอนุญาต',
        'TRUE',
        todayStr,
        adminName
      ]);
    } else if (sheetName === '04_RD_DEPARTMENT_MASTER') {
      const defaultDepts = options.initialDepartments || [
        { code: 'RM', nameTh: 'Raw Material', nameEn: 'Raw Material', prefix: 'RM', defaultEmail: 'rd-rm@company.com', supervisorName: 'สุรชัย ชัยชนะ', supervisorEmail: 'surachai.c@company.com' },
        { code: 'RTC', nameTh: 'Ready to Cook', nameEn: 'Ready to Cook', prefix: 'RTC', defaultEmail: 'rd-rtc@company.com', supervisorName: 'วราภรณ์ สดใส', supervisorEmail: 'waraporn.s@company.com' },
        { code: 'FUR', nameTh: 'Further Processing', nameEn: 'Further Processing', prefix: 'FUR', defaultEmail: 'rd-fur@company.com', supervisorName: 'กิตติศักดิ์ พรหมดี', supervisorEmail: 'kittisak.p@company.com' }
      ];
      defaultDepts.forEach((d, idx) => {
        rows.push([
          `RD-0${idx + 1}`,
          d.code,
          d.nameTh,
          d.nameEn,
          d.prefix,
          d.defaultEmail,
          d.supervisorName,
          d.supervisorEmail,
          'TRUE',
          idx + 1,
          todayStr,
          adminName,
          todayStr,
          adminName
        ]);
      });
    } else if (sheetName === '05_DOCUMENT_RUNNING_NO') {
      const depts = options.initialDepartments || [
        { code: 'RM', prefix: 'RM' },
        { code: 'RTC', prefix: 'RTC' },
        { code: 'FUR', prefix: 'FUR' }
      ];
      depts.forEach((d) => {
        rows.push([
          `RUN-2026-${d.code}`,
          'SAMPLE_REQUEST',
          d.code,
          d.prefix,
          2026,
          1,
          0,
          1,
          3,
          'TRUE',
          'SETUP_WIZARD',
          `First Run Initialization for ${d.code}`,
          'TRUE',
          todayStr,
          adminName
        ]);
      });
    } else if (sheetName === '06_CUSTOMER_MASTER') {
      rows.push(['CUST-001', 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)', 'Corporate Key Account', 'Modern Trade', 'Anucha (Sale)', 'คุณสมศักดิ์ วัฒนา', '02-785-5555 ต่อ 1234', 'somsak@thaibev.com', 'ST-001', '14 ถ.วิภาวดีรังสิต แขวงจอมพล เขตจตุจักร', 'จตุจักร', 'กรุงเทพมหานคร', 'BKK-CENTRAL (Zone A)', '10:00 - 12:00', 'Commercial Invoice, Product Specification, Halal Certificate', 'TRUE', todayStr]);
      rows.push(['CUST-002', 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)', 'Modern Trade Retail', 'Modern Trade', 'Anucha (Sale)', 'คุณกรรณิการ์ จิตเจริญ', '02-071-9000', 'kannika@cpall.co.th', 'ST-002', 'ศูนย์กระจายสินค้าซีพี ออลล์ ลาดกระบัง ถ.ฉลองกรุง', 'ลาดกระบัง', 'กรุงเทพมหานคร', 'BKK-EAST (Zone C)', '08:30 - 11:00', 'Commercial Invoice, Halal Certificate, Traceability', 'TRUE', todayStr]);
      rows.push(['CUST-003', 'บริษัท ไมเนอร์ ฟู้ด กรุ๊ป จำกัด (มหาชน)', 'Food Service Chain', 'HORECA', 'Suda (Sale)', 'คุณธนภัทร เลิศวรพงษ์', '02-365-7500', 'thanapat@minor.com', 'ST-003', '88 อาคารเดอะปาร์ค ชั้น 11 ถ.รัชดาภิเษก', 'คลองเตย', 'กรุงเทพมหานคร', 'BKK-SOUTH (Zone B)', '13:00 - 15:00', 'Commercial Invoice, Product Specification', 'TRUE', todayStr]);
      rows.push(['CUST-004', 'บริษัท เซ็นทรัล ฟู้ด รีเทล จำกัด (Tops)', 'Supermarket Chain', 'Modern Trade', 'Anucha (Sale)', 'คุณปิยะพร อมรเวช', '02-831-7300', 'piyaporn@central.co.th', 'ST-004', 'ศูนย์กระจายสินค้าท็อปส์ บางบัวทอง', 'บางบัวทอง', 'นนทบุรี', 'NONTHABURI-WEST', '09:00 - 11:30', 'Commercial Invoice, Microbiology Result, Packing List', 'TRUE', todayStr]);
    } else if (sheetName === '07_PRODUCT_MASTER') {
      rows.push(['SKU-RM-001', 'Premium Wagyu Striploin A4 Sliced', 'Raw Meat', 'Beef', 'กิโลกรัม', 1.0, 5.0, 'Chilled', 'Chilled (0°C to 4°C)', '21 วัน', 1850, 'FIFO', 'TRUE', todayStr]);
      rows.push(['SKU-RM-002', 'Kurobuta Pork Collar Shabu Sliced 1.5mm', 'Raw Meat', 'Pork', 'กิโลกรัม', 1.0, 5.0, 'Chilled', 'Chilled (0°C to 4°C)', '14 วัน', 350, 'FIFO', 'TRUE', todayStr]);
      rows.push(['SKU-RTC-001', 'Marinated Teriyaki Pork Skewers (20 pcs/box)', 'Ready to Cook', 'Pork', 'กล่อง', 2.0, 10.0, 'Frozen', 'Frozen (-18°C)', '180 วัน', 340, 'FEFO', 'TRUE', todayStr]);
      rows.push(['SKU-RTC-002', 'Crispy Garlic Chicken Karaage', 'Ready to Cook', 'Poultry', 'ถุง', 1.0, 10.0, 'Frozen', 'Frozen (-18°C)', '180 วัน', 220, 'FEFO', 'TRUE', todayStr]);
      rows.push(['SKU-FUR-001', 'Smoked Pepper Bacon Slab', 'Further Processing', 'Processed Meat', 'กิโลกรัม', 1.5, 6.0, 'Chilled', 'Chilled (0°C to 4°C)', '45 วัน', 420, 'FEFO', 'TRUE', todayStr]);
      rows.push(['SKU-FUR-002', 'Signature Truffle Liver Pate', 'Further Processing', 'Delicacy', 'กระปุก', 0.2, 2.0, 'Chilled', 'Chilled (0°C to 4°C)', '60 วัน', 280, 'FEFO', 'TRUE', todayStr]);
    } else if (sheetName === '08_DELIVERY_ROUTE_MASTER') {
      rows.push(['RT-01', 'ROUTE-BKK-01', 'BKK Central & North (Bangkok - Nonthaburi)', 'กรุงเทพมหานคร', 'คลองหลวง DC', 'รถ 4 ล้อห้องเย็น 4 Temp', '09:00 - 12:00', 'TRUE']);
      rows.push(['RT-02', 'ROUTE-BKK-02', 'BKK East & Samut Prakan', 'สมุทรปราการ', 'บางนา DC', 'รถ 4 ล้อห้องเย็น 4 Temp', '10:00 - 14:00', 'TRUE']);
      rows.push(['RT-03', 'ROUTE-UPC-01', 'Eastern Seaboard (Chonburi - Rayong)', 'ชลบุรี', 'พานทอง DC', 'รถ 6 ล้อห้องเย็นควบคุมอุณหภูมิ', '11:00 - 16:00', 'TRUE']);
      rows.push(['RT-04', 'ROUTE-UPC-02', 'Central & West (Ayutthaya - Saraburi)', 'พระนครศรีอยุธยา', 'คลองหลวง DC', 'รถ 4 ล้อห้องเย็น', '08:30 - 12:30', 'TRUE']);
    } else if (sheetName === '09_DOCUMENT_TYPE_MASTER') {
      const docTypes = [
        'Commercial Invoice',
        'Form A',
        'MA Test Result',
        'Microbiology Result',
        'Traceability',
        'PR Analysis',
        'Chemical Analysis',
        'Sticker / Label',
        'EST Number',
        'Product Specification',
        'Halal Certificate',
        'Packing List',
        'Other'
      ];
      docTypes.forEach((doc, idx) => {
        rows.push([
          `DOC-${String(idx + 1).padStart(2, '0')}`,
          doc,
          doc,
          'QA/QC',
          idx + 1,
          'TRUE'
        ]);
      });
    } else if (sheetName === '18_EMAIL_RECIPIENT_MASTER') {
      rows.push(['RCP-001', 'SALES', 'ALL', 'SALE_MANAGER', 'INTERNAL', 'Sale Manager Group', 'manager@company.com', 'TO', 'EVENT_SUBMITTED', 1, todayStr, '2099-12-31', 'TRUE', 'ผู้อนุมัติคำขอตัวอย่าง']);
      rows.push(['RCP-002', 'LOGISTICS', 'ALL', 'LOGISTIC', 'INTERNAL', 'Logistics Dispatch Desk', 'logistic@company.com', 'TO', 'EVENT_APPROVED', 1, todayStr, '2099-12-31', 'TRUE', 'ฝ่ายจัดสรรยานพาหนะ']);
      rows.push(['RCP-003', 'CO-SALE', 'ALL', 'CO_SALE', 'INTERNAL', 'Co-Sale ERP Specialists', 'cosale@company.com', 'TO', 'EVENT_APPROVED', 1, todayStr, '2099-12-31', 'TRUE', 'ฝ่ายเปิด Sales Order']);
      rows.push(['RCP-004', 'R&D', 'RM', 'RD', 'INTERNAL', 'RD Raw Meat Team', 'rd-rm@company.com', 'TO', 'EVENT_APPROVED', 1, todayStr, '2099-12-31', 'TRUE', 'ผู้จัดเตรียมตัวอย่าง Raw Meat']);
      rows.push(['RCP-005', 'R&D', 'RTC', 'RD', 'INTERNAL', 'RD Ready to Cook Team', 'rd-rtc@company.com', 'TO', 'EVENT_APPROVED', 1, todayStr, '2099-12-31', 'TRUE', 'ผู้จัดเตรียมตัวอย่าง Ready to Cook']);
      rows.push(['RCP-006', 'R&D', 'FUR', 'RD', 'INTERNAL', 'RD Further Processing Team', 'rd-fur@company.com', 'TO', 'EVENT_APPROVED', 1, todayStr, '2099-12-31', 'TRUE', 'ผู้จัดเตรียมตัวอย่าง Further Processing']);
    } else if (sheetName === '19_EMAIL_TEMPLATE') {
      rows.push(['TMPL_SUBMIT', 'EVENT_SUBMITTED', 'ยืนยันการส่งคำขอตัวอย่าง', '[Sample Flow] คำขอตัวอย่างเลขที่ {{Sample_No}} ได้รับการบันทึกเข้าระบบแล้ว', '<p>เรียน {{Sale_Name}}, คำขอของคุณได้รับการส่งเพื่อทำ Logistic Pre-check แล้ว</p>', 'TRUE', adminName, todayStr]);
      rows.push(['TMPL_APPROVAL_SUCCESS', 'EVENT_APPROVED', 'แจ้งผลการอนุมัติและแตกงาน', '[APPROVED] คำขอตัวอย่าง {{Sample_No}} : {{Customer_Name}} ได้รับการอนุมัติแล้ว', '<p>เรียน ทีมงาน RD, Co-Sale, Logistic, คำขอได้รับการอนุมัติ กรุณาดำเนินการตาม Task</p>', 'TRUE', adminName, todayStr]);
      rows.push(['TMPL_READY_DELIVER', 'EVENT_READY_TO_DELIVER', 'แจ้งความพร้อมจัดส่งสินค้า', '[READY TO DELIVER] ตัวอย่างสินค้า {{Sample_No}} พร้อมจัดส่งแล้ว', '<p>ตัวอย่างสินค้าผ่าน Ready to Deliver Gate ครบถ้วน พร้อมส่งมอบให้ลูกค้าตามกำหนด</p>', 'TRUE', adminName, todayStr]);
      rows.push(['TMPL_REVISION_REQUEST', 'EVENT_REVISION', 'แจ้งขอแก้ไขรายละเอียดคำขอ', '[REVISION REQUIRED] ขอให้แก้ไขรายละเอียดคำขอ {{Sample_No}}', '<p>ผู้จัดการฝ่ายขายขอให้ทบทวนและแก้ไขรายละเอียดก่อนพิจารณาอนุมัติใหม่</p>', 'TRUE', adminName, todayStr]);
      rows.push(['TMPL_DELIVERED', 'EVENT_DELIVERED', 'แจ้งส่งมอบตัวอย่างสำเร็จ', '[DELIVERED] การจัดส่งตัวอย่าง {{Sample_No}} ส่งมอบให้ลูกค้าเรียบร้อยแล้ว', '<p>พนักงานจัดส่งได้ส่งมอบสินค้าตัวอย่างและรับเอกสารรับรองเรียบร้อยแล้ว</p>', 'TRUE', adminName, todayStr]);
    } else if (sheetName === '20_NOTIFICATION_RULE') {
      rows.push(['RULE-001', 'Notify Manager on Submit', 'EVENT_SUBMITTED', 'Current_Status', 'EQUALS', 'WAITING APPROVAL', 'EMAIL', 'manager@company.com', 'EMAIL', 'sale@company.com', 'NONE', '', 'TMPL_SUBMIT', 'IMMEDIATE', 0, 'TRUE']);
      rows.push(['RULE-002', 'Dispatch Parallel Tasks on Approve', 'EVENT_APPROVED', 'Current_Status', 'EQUALS', 'APPROVED', 'EMAIL', 'rd-rm@company.com, cosale@company.com, logistic@company.com', 'EMAIL', 'manager@company.com', 'NONE', '', 'TMPL_APPROVAL_SUCCESS', 'IMMEDIATE', 0, 'TRUE']);
      rows.push(['RULE-003', 'Alert Ready to Deliver', 'EVENT_READY_TO_DELIVER', 'Current_Status', 'EQUALS', 'READY TO DELIVER', 'EMAIL', 'logistic@company.com, sale@company.com', 'NONE', '', 'NONE', '', 'TMPL_READY_DELIVER', 'IMMEDIATE', 0, 'TRUE']);
    } else if (sheetName === '23_SLA_MASTER') {
      rows.push(['LOGISTIC_PRECHECK', 'การตรวจสายรถและความเป็นไปได้ในการจัดส่ง', 60, 80, 100, 'MON_FRI_8_17', 'TRUE']);
      rows.push(['APPROVAL', 'การพิจารณาอนุมัติโดย Sale Manager', 120, 80, 100, 'MON_FRI_8_17', 'TRUE']);
      rows.push(['RD_PREPARATION', 'การจัดเตรียมตัวอย่างและระบุ Lot โดย RD', 240, 80, 100, 'MON_FRI_8_17', 'TRUE']);
      rows.push(['CO_SALE_SO', 'การเปิด Sales Order ในระบบ ERP โดย Co-Sale', 180, 80, 100, 'MON_FRI_8_17', 'TRUE']);
      rows.push(['VEHICLE_ASSIGNMENT', 'การจัดสรรทะเบียนรถและพนักงานขับรถ', 120, 80, 100, 'MON_FRI_8_17', 'TRUE']);
      rows.push(['DELIVERY', 'การขนส่งและส่งมอบถึงมือลูกค้า', 360, 80, 100, 'MON_SAT_8_18', 'TRUE']);
    } else if (sheetName === '24_APPROVAL_MATRIX') {
      rows.push(['AM-001', 'Standard Sample Value Below 5,000', 'STANDARD', 'ALL', 0, 5000, 'manager@company.com', '-', '-', 1, todayStr, '2099-12-31', 'TRUE']);
      rows.push(['AM-002', 'High Value Sample Over 5,000', 'STANDARD', 'ALL', 5001, 999999, 'manager@company.com', 'vp.commercial@company.com', '-', 2, todayStr, '2099-12-31', 'TRUE']);
      rows.push(['AM-003', 'Special Trial Sample', 'TRIAL', 'ALL', 0, 999999, 'manager@company.com', 'rd.director@company.com', '-', 3, todayStr, '2099-12-31', 'TRUE']);
    } else if (sheetName === '25_AUDIT_LOG') {
      rows.push(['AUD-INIT-001', nowStr, adminName, adminEmail, 'ADMIN', 'SYSTEM_SETUP', 'SYSTEM', 'INITIALIZE', 'DATABASE', '-', '26_SHEETS_V1', 'Initialized 26 Canonical Google Sheets']);
    } else if (sheetName === '26_SYSTEM_SETTINGS') {
      rows.push(['COMPANY_NAME_TH', options.companyInfo?.nameTh || 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด (สำนักงานใหญ่)', 'ชื่อบริษัท (ไทย)', adminName, nowStr]);
      rows.push(['COMPANY_NAME_EN', options.companyInfo?.nameEn || 'SAMPLE FLOW ENTERPRISE FOOD CO., LTD.', 'Company Name (EN)', adminName, nowStr]);
      rows.push(['COMPANY_TAX_ID', options.companyInfo?.taxId || '0105558012345', 'Tax ID', adminName, nowStr]);
      rows.push(['COMPANY_ADDRESS', options.companyInfo?.address || '99/9 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120', 'Address', adminName, nowStr]);
      rows.push(['SPREADSHEET_ID', spreadsheetId, 'Google Sheets Database ID', adminName, nowStr]);
      rows.push(['DATABASE_VERSION', 'V1.0', 'Database Schema Version (26 Sheets)', adminName, nowStr]);
      rows.push(['TOTAL_SHEETS', '26', 'Canonical Sheets Count', adminName, nowStr]);
      rows.push(['SETUP_COMPLETED', 'TRUE', 'First Run Setup Status', adminName, nowStr]);
      rows.push(['SETUP_DATE', nowStr, 'Date Setup Completed', adminName, nowStr]);
      rows.push(['ADMIN_EMAIL', adminEmail, 'Primary System Admin', adminName, nowStr]);
      rows.push(['DEFAULT_NOTIFICATION_SENDER', options.emailConfig?.senderName || 'Sample Flow System', 'Email Sender Name', adminName, nowStr]);
    }

    valueRanges.push({
      range: `'${sheetName}'!A1`,
      values: rows
    });
  }

  // Clear existing content on sheets before writing new headers & master data
  try {
    for (const name of targetSheetNames) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${name}'!A1:AZ500`
      });
    }
  } catch (err) {
    // Non-fatal if sheet was just created
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: valueRanges
    }
  });
  stepsLog.push('Written headers and master rows to all 26 canonical sheets.');

  // Step 4: Formatting (Freeze Header, Enable Filter, Header Navy Style, Auto Resize)
  stepsLog.push('Applying Google Sheets formatting (Freeze row 1, set basic filter, navy corporate headers)...');
  const formatRequests: any[] = [];

  for (const sheetName of targetSheetNames) {
    const sId = finalSheetMap.get(sheetName);
    if (sId === undefined) continue;
    const headers = SHEETS_SCHEMA[sheetName as keyof typeof SHEETS_SCHEMA];

    // 1. Freeze row 1
    formatRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    });

    // 2. Format header row: Corporate Navy `#1E293B` (R: 0.12, G: 0.16, B: 0.23), bold white text
    formatRequests.push({
      repeatCell: {
        range: {
          sheetId: sId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headers.length
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.16, blue: 0.23 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10
            },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // 3. Enable Filter on columns
    formatRequests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: sId,
            startRowIndex: 0,
            endRowIndex: 500,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          }
        }
      }
    });

    // 4. Auto-resize columns
    formatRequests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId: sId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: headers.length
        }
      }
    });
  }

  // Execute formatting in batches to ensure robust completion
  if (formatRequests.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: formatRequests }
      });
      stepsLog.push('Successfully applied frozen headers, filters, and corporate styling.');
    } catch (err: any) {
      console.warn('Formatting warning (non-fatal):', err.message);
      stepsLog.push(`Note: Styling batch completed with note: ${err.message}`);
    }
  }

  // Step 5: Save Database Config locally
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  saveDatabaseConfig({
    configured: true,
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: fileName,
    setupDate: nowStr,
    setupBy: adminEmail,
    companyInfo: options.companyInfo || {
      nameTh: 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด (สำนักงานใหญ่)',
      nameEn: 'SAMPLE FLOW ENTERPRISE FOOD CO., LTD.',
      taxId: '0105558012345',
      address: '99/9 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
      phone: '02-555-0199'
    },
    adminUser: options.adminUser || {
      name: adminName,
      email: adminEmail,
      employeeId: adminEmpId,
      role: 'ADMIN'
    },
    emailConfig: options.emailConfig || {
      senderName: 'Sample Flow System',
      senderEmail: 'noreply.sampleflow@company.com'
    }
  });

  stepsLog.push(`Saved spreadsheet configuration: ${spreadsheetId}`);

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl,
    isNew,
    sheetCount: targetSheetNames.length,
    stepsLog
  };
}

export async function findOrCreateSpreadsheet(accessToken: string, email: string) {
  const config = getDatabaseConfig();
  if (config.configured && config.spreadsheetId) {
    return config.spreadsheetId;
  }
  const result = await setupGoogleSheetsDatabase(accessToken, {
    adminUser: {
      email,
      name: 'System Admin',
      employeeId: 'EMP-001',
      role: 'ADMIN'
    }
  });
  return result.spreadsheetId;
}

export async function readSheet(accessToken: string, spreadsheetId: string, sheetName: string) {
  const sheets = await getSheetsClient(accessToken);
  const actualSheet = resolveSheetName(sheetName);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${actualSheet}'`,
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
  
  return data;
}

export async function appendRow(accessToken: string, spreadsheetId: string, sheetName: string, rowData: any[]) {
  const sheets = await getSheetsClient(accessToken);
  const actualSheet = resolveSheetName(sheetName);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${actualSheet}'`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowData]
    }
  });
}

export function columnIndexToLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export async function appendRows(accessToken: string, spreadsheetId: string, sheetName: string, rows: any[][]) {
  if (!rows || rows.length === 0) return;
  const sheets = await getSheetsClient(accessToken);
  const actualSheet = resolveSheetName(sheetName);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${actualSheet}'`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });
}

export async function updateRowByColumn(
  accessToken: string, 
  spreadsheetId: string, 
  sheetName: string, 
  keyColumn: string, 
  keyValue: string, 
  updates: Record<string, any>
) {
  const sheets = await getSheetsClient(accessToken);
  const actualSheet = resolveSheetName(sheetName);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${actualSheet}'`,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) {
    throw new Error(`Sheet ${actualSheet} is empty or has only headers`);
  }

  const headers = rows[0] as string[];
  const keyColIndex = headers.indexOf(keyColumn);
  if (keyColIndex === -1) {
    throw new Error(`Column ${keyColumn} not found in sheet ${actualSheet}`);
  }

  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][keyColIndex] || '').trim().toLowerCase() === String(keyValue).trim().toLowerCase()) {
      targetRowIndex = i;
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error(`Record with ${keyColumn}='${keyValue}' not found in sheet ${actualSheet}`);
  }

  const currentRow = [...rows[targetRowIndex]];
  // Ensure array is long enough for all headers
  while (currentRow.length < headers.length) {
    currentRow.push('');
  }

  Object.entries(updates).forEach(([colName, val]) => {
    const colIdx = headers.indexOf(colName);
    if (colIdx !== -1) {
      currentRow[colIdx] = val !== undefined && val !== null ? String(val) : '';
    }
  });

  const rowNumber = targetRowIndex + 1;
  const endColLetter = columnIndexToLetter(headers.length - 1);
  const updateRange = `'${actualSheet}'!A${rowNumber}:${endColLetter}${rowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [currentRow]
    }
  });

  return { success: true, updatedRow: rowNumber };
}

export async function ensureDriveFolderPath(accessToken: string, folderPath: string): Promise<string | undefined> {
  const drive = await getDriveClient(accessToken);
  const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);
  let parentId: string | undefined = undefined;

  for (const segment of segments) {
    try {
      let query = `name='${segment.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }
      const listRes = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (listRes.data.files && listRes.data.files.length > 0) {
        parentId = listRes.data.files[0].id!;
      } else {
        const createRes = await drive.files.create({
          requestBody: {
            name: segment,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : []
          },
          fields: 'id'
        });
        parentId = createRes.data.id!;
      }
    } catch (err: any) {
      console.warn(`Drive folder creation for "${segment}" warning:`, err.message);
      break;
    }
  }

  return parentId;
}

export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  content: string,
  folderPath: string = 'Sample Request/2026/RM'
) {
  const drive = await getDriveClient(accessToken);

  // Find or create nested folder hierarchy (PART 66)
  let folderId: string | undefined;
  try {
    folderId = await ensureDriveFolderPath(accessToken, folderPath);
  } catch (err: any) {
    console.warn('Could not create/find Drive folder path, saving to root:', err.message);
  }

  // Create file
  const stream = require('stream');
  const bufferStream = new stream.PassThrough();
  bufferStream.end(Buffer.from(content, 'utf-8'));

  const fileMetadata: any = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };

  const media = {
    mimeType,
    body: bufferStream
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink'
  });

  // Make file viewable with link
  try {
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
  } catch (e: any) {
    // Ignore if enterprise domain restricts public sharing
  }

  return {
    fileId: file.data.id!,
    fileName: file.data.name!,
    webViewLink: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`,
    webContentLink: file.data.webContentLink || ''
  };
}

