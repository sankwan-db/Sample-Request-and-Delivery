import fs from 'fs';
import path from 'path';

export interface SystemDatabaseConfig {
  configured: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string;
  setupDate: string | null;
  setupBy: string | null;
  companyInfo: {
    nameTh: string;
    nameEn: string;
    taxId: string;
    address: string;
    phone: string;
  };
  adminUser: {
    name: string;
    email: string;
    employeeId: string;
    role: string;
  };
  emailConfig: {
    senderName: string;
    senderEmail: string;
  };
  version: string;
}

const CONFIG_FILE = path.join(process.cwd(), '.db_config.json');

const DEFAULT_CONFIG: SystemDatabaseConfig = {
  configured: false,
  spreadsheetId: null,
  spreadsheetUrl: null,
  spreadsheetTitle: 'Sample Request & Delivery',
  setupDate: null,
  setupBy: null,
  companyInfo: {
    nameTh: 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด (สำนักงานใหญ่)',
    nameEn: 'SAMPLE FLOW ENTERPRISE FOOD CO., LTD.',
    taxId: '0105558012345',
    address: '99/9 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
    phone: '02-555-0199'
  },
  adminUser: {
    name: 'System Admin',
    email: 'sankwans@gmail.com',
    employeeId: 'EMP-001',
    role: 'ADMIN'
  },
  emailConfig: {
    senderName: 'Sample Flow System',
    senderEmail: 'noreply.sampleflow@company.com'
  },
  version: 'V1.0'
};

export function getDatabaseConfig(): SystemDatabaseConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error reading database config file:', err);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveDatabaseConfig(config: Partial<SystemDatabaseConfig>): SystemDatabaseConfig {
  try {
    const current = getDatabaseConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error saving database config file:', err);
    return { ...DEFAULT_CONFIG, ...config };
  }
}

export function resetDatabaseConfig(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (err) {
    console.error('Error resetting database config file:', err);
  }
}
