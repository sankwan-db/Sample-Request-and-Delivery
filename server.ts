import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  findOrCreateSpreadsheet, 
  readSheet, 
  appendRow, 
  setupGoogleSheetsDatabase, 
  findExistingSpreadsheet 
} from './src/server/sheets.js';
import { 
  getDatabaseConfig, 
  saveDatabaseConfig, 
  resetDatabaseConfig 
} from './src/server/db.js';
import { 
  getRDDepartments, saveRDDepartment, getRunningNumbers, 
  generateSampleNumber, setupRunningNumber, skipRunningNumber, 
  changeDepartmentAndVoidSampleNo, getAuditLogs, getVoidedNumbers,
  addAuditLog
} from './src/server/sequenceService.js';
import { serviceRouter } from './src/server/serviceRoutes.js';
import { SHEETS_SCHEMA } from './src/server/schema.js';

const GOOGLE_TOKEN_FILE = path.join(process.cwd(), '.google_token.txt');
const ACCESS_REQUESTS_FILE = path.join(process.cwd(), '.access_requests.json');

let latestGoogleToken: string | null = null;
try {
  if (fs.existsSync(GOOGLE_TOKEN_FILE)) {
    latestGoogleToken = fs.readFileSync(GOOGLE_TOKEN_FILE, 'utf-8').trim();
  }
} catch (e) {
  // ignore
}

function saveGoogleToken(token: string) {
  if (token && token !== 'undefined' && token.length > 20) {
    latestGoogleToken = token;
    try {
      fs.writeFileSync(GOOGLE_TOKEN_FILE, token, 'utf-8');
    } catch (e) {
      // ignore
    }
  }
}

function getAccessRequests(): any[] {
  const defaultDemoUsers = [
    {
      id: "DEMO-ADMIN",
      email: "admin@company.com",
      password: "123456",
      name: "System Admin",
      department: "IT / Administration",
      status: "APPROVED",
      role: "ADMIN",
      menus: [
        'Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)',
        'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'จับคู่ข้อมูลการขาย (Sales Match / SO)',
        'จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)', 'การตั้งค่า (Settings)',
        'Sequence Setup & Running No', 'User & Access Control'
      ],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-SALE",
      email: "sale@company.com",
      password: "123456",
      name: "Anucha (Sale Specialist)",
      department: "Commercial Sale",
      status: "APPROVED",
      role: "SALE",
      menus: ['Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-MANAGER",
      email: "manager@company.com",
      password: "123456",
      name: "Nattapong (Sale Manager)",
      department: "Commercial Sale",
      status: "APPROVED",
      role: "SALE_MANAGER",
      menus: ['Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)', 'อนุมัติ / ปฏิเสธ (Approve / Reject)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-RD-RAW",
      email: "rd.rawmeat@company.com",
      password: "123456",
      name: "Dr. Prasert (RD Lead)",
      department: "R&D Raw Meat",
      status: "APPROVED",
      role: "RD",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-RD-RM",
      email: "rd-rm@company.com",
      password: "123456",
      name: "RD RM Specialist",
      department: "R&D Raw Meat",
      status: "APPROVED",
      role: "RD",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-RD-RTC",
      email: "rd-rtc@company.com",
      password: "123456",
      name: "RD RTC Specialist",
      department: "R&D Ready to Cook",
      status: "APPROVED",
      role: "RD",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-RD-FUR",
      email: "rd-fur@company.com",
      password: "123456",
      name: "RD Further Specialist",
      department: "R&D Further Processing",
      status: "APPROVED",
      role: "RD",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-COSALE",
      email: "cosale@company.com",
      password: "123456",
      name: "Wichai (Co-Sale Specialist)",
      department: "Co-Sale",
      status: "APPROVED",
      role: "CO_SALE",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'จับคู่ข้อมูลการขาย (Sales Match / SO)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    },
    {
      id: "DEMO-LOGISTIC",
      email: "logistic@company.com",
      password: "123456",
      name: "Somchai (Logistic Dispatcher)",
      department: "Logistics",
      status: "APPROVED",
      role: "LOGISTIC",
      menus: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)', 'การตั้งค่า (Settings)'],
      requestDate: "2026-09-05 00:00",
      approvedDate: "2026-09-05 00:00"
    }
  ];

  let currentRequests: any[] = [];
  try {
    if (fs.existsSync(ACCESS_REQUESTS_FILE)) {
      const data = fs.readFileSync(ACCESS_REQUESTS_FILE, 'utf-8');
      currentRequests = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading access requests file:', err);
  }

  // Ensure all default demo users exist in the requests file
  let changed = false;
  for (const demoUser of defaultDemoUsers) {
    if (!currentRequests.some(r => r.email.toLowerCase() === demoUser.email.toLowerCase())) {
      currentRequests.push(demoUser);
      changed = true;
    }
  }

  if (changed || !fs.existsSync(ACCESS_REQUESTS_FILE)) {
    try {
      fs.writeFileSync(ACCESS_REQUESTS_FILE, JSON.stringify(currentRequests, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error auto-seeding demo users:', err);
    }
  }

  return currentRequests;
}

function saveAccessRequests(requests: any[]): void {
  try {
    fs.writeFileSync(ACCESS_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing access requests file:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Intercept incoming Google OAuth Tokens and cache them
  app.use((req, res, next) => {
    let token = req.body?.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }
    if (token && token.length > 20 && token !== 'undefined' && token !== 'custom_email_password_token') {
      saveGoogleToken(token);
    }
    next();
  });

  // Mount Central Google Sheets Service Layer API
  app.use('/api/services', serviceRouter);

  // ==========================================
  // ACCESS REQUESTS & CUSTOM LOGIN APIS
  // ==========================================

  app.post('/api/auth/request-access', (req, res) => {
    try {
      const { email, password, name, department } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      }

      const requests = getAccessRequests();
      const existing = requests.find(r => r.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        if (existing.status === 'PENDING') {
          return res.status(400).json({ success: false, error: 'คำขอของคุณยังอยู่ระหว่างการพิจารณาโดย Admin' });
        } else if (existing.status === 'APPROVED') {
          return res.status(400).json({ success: false, error: 'อีเมลนี้ได้รับอนุมัติสิทธิ์การใช้งานแล้ว สามารถล็อกอินได้ทันที' });
        }
      }

      const newRequest = {
        id: `REQ-${Date.now()}`,
        email: email.trim().toLowerCase(),
        password: password,
        name: name.trim(),
        department: (department || 'Commercial Sale').trim(),
        status: 'PENDING',
        requestDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };

      requests.push(newRequest);
      saveAccessRequests(requests);

      res.json({ success: true, message: 'ส่งขอสิทธิ์ใช้งานสำเร็จ กรุณารอการพิจารณาจาก Admin' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/access-requests', (req, res) => {
    try {
      const requests = getAccessRequests();
      res.json({ success: true, data: requests });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/approve-request', async (req, res) => {
    try {
      const { requestId, role, department, menus } = req.body;
      if (!requestId || !role) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
      }

      const requests = getAccessRequests();
      const requestIndex = requests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) {
        return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลคำขอนี้' });
      }

      const reqData = requests[requestIndex];
      reqData.status = 'APPROVED';
      reqData.role = role;
      reqData.department = department || reqData.department;
      reqData.menus = menus || [];
      reqData.approvedDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

      requests[requestIndex] = reqData;
      saveAccessRequests(requests);

      // Now add user to Google Sheets USERS table (01_USERS)
      const token = latestGoogleToken;
      const config = getDatabaseConfig();
      if (token && config.configured && config.spreadsheetId) {
        try {
          const userRecord = {
            User_ID: `U-${Date.now().toString().slice(-4)}`,
            Employee_ID: `EMP-${Date.now().toString().slice(-4)}`,
            User_Name: reqData.name,
            Email: reqData.email,
            Department: reqData.department,
            Role: role,
            Active: 'TRUE',
            Created_Date: new Date().toISOString().slice(0, 10),
            Created_By: 'System Admin Approval'
          };
          const schema = SHEETS_SCHEMA['01_USERS'];
          const row = schema.map(col => (userRecord as any)[col] || '');
          await appendRow(token, config.spreadsheetId, '01_USERS', row);
        } catch (e: any) {
          console.warn('Could not add approved user to Google Sheets 01_USERS:', e.message);
        }
      }

      res.json({ success: true, message: 'อนุมัติสิทธิ์การใช้งานและกำหนดสิทธิ์เมนูเสร็จสิ้น' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/reject-request', (req, res) => {
    try {
      const { requestId } = req.body;
      if (!requestId) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
      }

      const requests = getAccessRequests();
      const requestIndex = requests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) {
        return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลคำขอนี้' });
      }

      requests[requestIndex].status = 'REJECTED';
      saveAccessRequests(requests);

      res.json({ success: true, message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
      }

      const requests = getAccessRequests();
      const userReq = requests.find(r => r.email.toLowerCase() === email.toLowerCase() && r.password === password);
      
      if (!userReq) {
        return res.status(401).json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      }

      if (userReq.status === 'PENDING') {
        return res.status(403).json({ success: false, error: 'คำขอของคุณยังอยู่ระหว่างการพิจารณาโดย Admin' });
      }

      if (userReq.status === 'REJECTED') {
        return res.status(403).json({ success: false, error: 'คำขอสิทธิ์การใช้งานของคุณถูกปฏิเสธโดย Admin' });
      }

      // Check if system config has a spreadsheetId
      const config = getDatabaseConfig();
      const spreadsheetId = config.configured ? config.spreadsheetId : null;

      res.json({
        success: true,
        user: {
          email: userReq.email,
          name: userReq.name,
          role: userReq.role || 'SALE',
          allowedMenus: userReq.menus || [],
          isEmailPassword: true
        },
        spreadsheetId
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // DATABASE STATUS & SETUP WIZARD APIS
  // ==========================================

  // Get current database status
  app.get('/api/database/status', (req, res) => {
    try {
      const config = getDatabaseConfig();
      res.json({ success: true, ...config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check if spreadsheet exists on Drive
  app.post('/api/database/check-existing', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Missing access token' });
      }
      const existing = await findExistingSpreadsheet(token);
      res.json({ 
        success: true, 
        exists: !!existing, 
        file: existing || null 
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // First Run Database Setup Wizard (Part 24)
  app.post('/api/database/setup', async (req, res) => {
    try {
      const { token, companyInfo, adminUser, emailConfig, initialDepartments, runningConfigs, overwriteExisting } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุ Google OAuth Access Token เพื่อสร้างฐานข้อมูล' });
      }

      const result = await setupGoogleSheetsDatabase(token, {
        companyInfo,
        adminUser,
        emailConfig,
        initialDepartments,
        runningConfigs,
        overwriteExisting: overwriteExisting !== false
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Database setup wizard error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset database configuration (for test or re-run)
  app.post('/api/database/reset', (req, res) => {
    try {
      resetDatabaseConfig();
      res.json({ success: true, message: 'Database configuration reset' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Proxy for DB ops
  app.post('/api/auth/validate', async (req, res) => {
    try {
      const { token, email } = req.body;
      if (!token || !email) {
        return res.status(400).json({ error: 'Missing token or email' });
      }

      const spreadsheetId = await findOrCreateSpreadsheet(token, email);
      const users = await readSheet(token, spreadsheetId, 'USERS');
      
      const userRecord = users.find((u: any) => u['Email']?.toLowerCase() === email.toLowerCase());

      if (!userRecord) {
        return res.json({ allowed: false, error: 'คุณยังไม่มีสิทธิ์เข้าใช้งานระบบ', spreadsheetId });
      }

      if (userRecord['Active'] !== 'TRUE') {
        return res.json({ allowed: false, error: 'บัญชีนี้ถูกระงับการใช้งาน', spreadsheetId });
      }

      res.json({ 
        allowed: true, 
        role: userRecord['Role'] || 'SALE', 
        spreadsheetId,
        userProfile: userRecord 
      });

    } catch (error: any) {
      console.error('Auth validation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sheets/read', async (req, res) => {
    try {
      const { spreadsheetId, sheetName, token } = req.body;
      if (!token || !spreadsheetId || !sheetName) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      const data = await readSheet(token, spreadsheetId, sheetName);
      res.json({ data });
    } catch (error: any) {
      console.error('Sheets read error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/sheets/append', async (req, res) => {
    try {
      const { spreadsheetId, sheetName, rowData, token } = req.body;
      if (!token || !spreadsheetId || !sheetName || !rowData) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      await appendRow(token, spreadsheetId, sheetName, rowData);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Sheets append error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // RD DEPARTMENT & SEQUENCE MANAGEMENT APIS
  // ==========================================

  // Get all RD Departments (Part 6)
  app.get('/api/rd-departments', (req, res) => {
    res.json({ success: true, data: getRDDepartments() });
  });

  // Add or update RD Department (Part 6 - Admin can add new departments or change prefix without code change)
  app.post('/api/rd-departments', (req, res) => {
    try {
      const { dept, userEmail } = req.body;
      const updated = saveRDDepartment(dept, userEmail);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Get running numbers master (Part 9, 10)
  app.get('/api/sequence/list', (req, res) => {
    res.json({ success: true, data: getRunningNumbers() });
  });

  // Server-side generate sample number (Part 13, 14, 15)
  app.post('/api/sequence/generate', async (req, res) => {
    try {
      const { rdDepartmentCode, year, userEmail, userName } = req.body;
      if (!rdDepartmentCode) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุแผนก RD (RD Department Code)' });
      }
      const result = await generateSampleNumber(rdDepartmentCode, year || 2026, userEmail, userName);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Setup / Initialize Starting Running Number (Part 8, 10, 11, 12)
  app.post('/api/sequence/setup', async (req, res) => {
    try {
      const updated = await setupRunningNumber(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Skip Ahead in Running Number with Admin Reason & Audit Log (Part 12)
  app.post('/api/sequence/skip', async (req, res) => {
    try {
      const updated = await skipRunningNumber(req.body);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Change RD Department on Draft & VOID old number (Part 16)
  app.post('/api/sequence/change-dept', async (req, res) => {
    try {
      const result = await changeDepartmentAndVoidSampleNo(req.body);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Audit logs & voided logs
  app.get('/api/audit-logs', (req, res) => {
    res.json({ success: true, data: getAuditLogs() });
  });

  app.post('/api/audit-logs', (req, res) => {
    try {
      const entry = req.body;
      const logged = addAuditLog(entry);
      res.json({ success: true, data: logged });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/voided-numbers', (req, res) => {
    res.json({ success: true, data: getVoidedNumbers() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
