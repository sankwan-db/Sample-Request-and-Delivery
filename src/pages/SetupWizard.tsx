import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Database, Layers, GitBranch, 
  Hash, UserCheck, Mail, CheckCircle2, 
  ArrowRight, ArrowLeft, ExternalLink, RefreshCw, 
  AlertCircle, ShieldCheck, Sparkles, Check, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { setupDatabase } from '../services/sheetService';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: 1, title: 'Company Information', subtitle: 'ข้อมูลองค์กรและบริษัท', icon: <Building2 size={18} /> },
  { id: 2, title: 'Create Google Sheets DB', subtitle: 'เชื่อมต่อ Google Drive & Sheets', icon: <Database size={18} /> },
  { id: 3, title: 'Create Master Sheets', subtitle: 'สร้างชีตหลัก 20 Tabs ตาม Schema', icon: <Layers size={18} /> },
  { id: 4, title: 'Initial RD Departments', subtitle: 'กำหนดแผนก RD และ Prefix', icon: <GitBranch size={18} /> },
  { id: 5, title: 'Configure Running Numbers', subtitle: 'กำหนดเลขรันและโครงสร้างเอกสาร', icon: <Hash size={18} /> },
  { id: 6, title: 'Configure Admin User', subtitle: 'กำหนดบัญชีผู้ดูแลระบบหลัก', icon: <UserCheck size={18} /> },
  { id: 7, title: 'Configure Email', subtitle: 'ตั้งค่าระบบแจ้งเตือนและเทมเพลต', icon: <Mail size={18} /> },
  { id: 8, title: 'Finish Setup', subtitle: 'ตรวจสอบและสร้างฐานข้อมูล', icon: <CheckCircle2 size={18} /> },
];

export function SetupWizard() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<{
    spreadsheetId?: string;
    spreadsheetUrl?: string;
    isNew?: boolean;
    sheetCount?: number;
    stepsLog?: string[];
  } | null>(null);

  // Form State
  const [companyInfo, setCompanyInfo] = useState({
    nameTh: 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด (สำนักงานใหญ่)',
    nameEn: 'SAMPLE FLOW ENTERPRISE FOOD CO., LTD.',
    taxId: '0105558012345',
    address: '99/9 หมู่ 5 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
    phone: '02-555-0199'
  });

  const [adminUser, setAdminUser] = useState({
    name: user?.name || 'System Admin',
    email: user?.email || 'sankwans@gmail.com',
    employeeId: 'EMP-001',
    role: 'ADMIN'
  });

  const [emailConfig, setEmailConfig] = useState({
    senderName: 'Sample Flow System',
    senderEmail: 'noreply.sampleflow@company.com'
  });

  const [rdDepartments, setRdDepartments] = useState([
    { code: 'RM', nameTh: 'Raw Material', nameEn: 'Raw Material', prefix: 'RM', enabled: true },
    { code: 'RTC', nameTh: 'Ready to Cook', nameEn: 'Ready to Cook', prefix: 'RTC', enabled: true },
    { code: 'FUR', nameTh: 'Further Processing', nameEn: 'Further Processing', prefix: 'FUR', enabled: true },
    { code: 'FD', nameTh: 'Food Service & HORECA', nameEn: 'Food Service', prefix: 'FD', enabled: false },
    { code: 'SEA', nameTh: 'Seasonings & Sauces', nameEn: 'Seasoning', prefix: 'SEA', enabled: false },
    { code: 'PKG', nameTh: 'Packaging Innovation', nameEn: 'Packaging', prefix: 'PKG', enabled: false }
  ]);

  const [runningConfig, setRunningConfig] = useState({
    year: 2026,
    startingNo: 1,
    digitLength: 3,
    initialRevision: 'REV.00'
  });

  // Sync admin user email if user logs in
  useEffect(() => {
    if (user?.email && adminUser.email !== user.email) {
      setAdminUser(prev => ({
        ...prev,
        email: user.email,
        name: user.name || prev.name
      }));
    }
  }, [user]);

  // Check current status on mount
  useEffect(() => {
    fetch('/api/database/status')
      .then(res => res.json())
      .then(data => {
        if (data.configured && data.spreadsheetId) {
          setSetupResult({
            spreadsheetId: data.spreadsheetId,
            spreadsheetUrl: data.spreadsheetUrl,
            sheetCount: 20
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleExecuteSetup = async () => {
    setIsSettingUp(true);
    setSetupError(null);

    try {
      // Check for access token
      let token = user?.accessToken;
      if (!token) {
        // If not logged in with Google, prompt login
        await login();
        // After login, retrieve updated token
        token = (window as any).__cachedAccessToken || user?.accessToken;
      }

      if (!token) {
        throw new Error('ไม่พบ Google Access Token กรุณาเข้าสู่ระบบด้วย Google เพื่ออนุญาตการสร้าง Google Spreadsheet');
      }

      const activeDepts = rdDepartments.filter(d => d.enabled).map(d => ({
        code: d.code,
        nameTh: d.nameTh,
        nameEn: d.nameEn,
        prefix: d.prefix,
        defaultEmail: `rd.${d.code.toLowerCase()}@company.com`,
        supervisorName: 'RD Lead',
        supervisorEmail: `lead.${d.code.toLowerCase()}@company.com`
      }));

      const data = await setupDatabase({
        token,
        companyInfo,
        adminUser,
        emailConfig,
        initialDepartments: activeDepts,
        overwriteExisting: true
      });


      setSetupResult(data);
      setSetupComplete(true);
    } catch (err: any) {
      console.error('Setup error:', err);
      setSetupError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-4">
      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PART 24 — FIRST RUN SETUP
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">Google Sheets Persistent Storage V1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">เริ่มต้นตั้งค่าระบบ</h1>
          <p className="text-sm text-slate-600 mt-1">
            ระบบตั้งค่าฐานข้อมูลอัตโนมัติ สร้าง Spreadsheet: <strong className="text-slate-800">Sample Request & Delivery</strong> พร้อม 26 Master Sheets และโครงสร้างเลขรันเอกสาร (แทนชีตเดิมทั้งหมด)
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{user.email}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Steps Left, Content Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">ขั้นตอนการตั้งค่า (8 Steps)</h2>
            <div className="space-y-1">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isPast = currentStep > step.id || setupComplete;
                return (
                  <button
                    key={step.id}
                    onClick={() => !isSettingUp && setCurrentStep(step.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-all ${
                      isActive 
                        ? 'bg-blue-50/80 border border-blue-200 text-blue-900 font-semibold' 
                        : isPast 
                          ? 'text-slate-700 hover:bg-slate-50 font-medium' 
                          : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : isPast 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isPast ? <Check size={14} /> : step.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs leading-tight truncate">{step.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{step.subtitle}</div>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schema Summary Card */}
          <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold mb-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>ความปลอดภัยและการจัดโครงสร้าง</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>สร้างทับ Spreadsheet: Sample Request & Delivery เดิม</li>
              <li>ระบบสร้างทุก Tab อัตโนมัติ (ห้าม User ต้องสร้างเอง)</li>
              <li>Freeze Header Row (ล็อกหัวตารางบรรทัดแรก)</li>
              <li>เปิด Basic Filter ค้นหาและกรองข้อมูลทันที</li>
              <li>ตกแต่งสีหัวตารางแบบ Corporate Navy</li>
            </ul>
          </div>
        </div>

        {/* Step Content Main Panel */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm min-h-[520px] flex flex-col justify-between">
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    1. Company Information (ข้อมูลองค์กร)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ระบุรายละเอียดบริษัทสำหรับใช้ในหัวเอกสารใบขอตัวอย่างและใบกำกับส่งของ</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อบริษัท (ภาษาไทย) *</label>
                    <input 
                      type="text" 
                      value={companyInfo.nameTh}
                      onChange={e => setCompanyInfo({ ...companyInfo, nameTh: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Company Name (English) *</label>
                    <input 
                      type="text" 
                      value={companyInfo.nameEn}
                      onChange={e => setCompanyInfo({ ...companyInfo, nameEn: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                    <input 
                      type="text" 
                      value={companyInfo.taxId}
                      onChange={e => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ (Phone)</label>
                    <input 
                      type="text" 
                      value={companyInfo.phone}
                      onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ที่อยู่สำนักงาน / โรงงาน *</label>
                    <textarea 
                      rows={2}
                      value={companyInfo.address}
                      onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Create Google Sheets Database */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Database className="text-blue-600" size={20} />
                    2. Create Google Sheets Database (ฐานข้อมูลคลาวด์)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">เชื่อมต่อและเตรียมไฟล์ Google Spreadsheet สำหรับจัดเก็บข้อมูลแบบถาวร (Persistent Storage V1)</p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                      GS
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">เป้าหมาย Spreadsheet: Sample Request & Delivery</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        ระบบจะทำการตรวจสอบไฟล์บน Google Drive หากพบไฟล์เดิมที่มีชื่อเดียวกัน จะทำการอัปเดตแก้ไขทับ (In-place Overwrite) หรือหากยังไม่มีไฟล์ จะทำการสร้างใหม่อัตโนมัติทันที
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">สถานะการอนุญาตสิทธิ์ (Google Authorization)</h4>
                  {user ? (
                    <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 p-3 rounded border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>เข้าสู่ระบบแล้ว: <strong>{user.email}</strong> พร้อมสิทธิ์แก้ไข Drive & Sheets</span>
                      </div>
                      <span className="font-bold text-[11px] bg-emerald-200/60 px-2 py-0.5 rounded">พร้อมทำงาน</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-800 p-3 rounded border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        <span>ยังไม่ได้เชื่อมต่อ Google Account</span>
                      </div>
                      <button 
                        onClick={login}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
                      >
                        เข้าสู่ระบบด้วย Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Create Master Sheets */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="text-blue-600" size={20} />
                    3. Create Master Sheets (สร้างชีตหลัก 26 Tabs)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">โครงสร้างชีตทั้งหมด 26 แผ่นงานตามข้อกำหนดที่จะถูกสร้างและจัดรูปแบบโดยอัตโนมัติ (ทดแทนชีตเดิม)</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {[
                    { name: '01_USERS', desc: 'ผู้ใช้งานและสิทธิ์' },
                    { name: '02_ROLE_PERMISSION', desc: 'สิทธิ์ตามบทบาท' },
                    { name: '03_COMPANY_MASTER', desc: 'ข้อมูลบริษัท' },
                    { name: '04_RD_DEPARTMENT_MASTER', desc: 'แผนก RD และ Prefix' },
                    { name: '05_DOCUMENT_RUNNING_NO', desc: 'การรันเลขที่เอกสาร' },
                    { name: '06_CUSTOMER_MASTER', desc: 'ข้อมูลลูกค้าและที่อยู่' },
                    { name: '07_PRODUCT_MASTER', desc: 'สินค้าและสเปก' },
                    { name: '08_DELIVERY_ROUTE_MASTER', desc: 'เส้นทางและสายรถจัดส่ง' },
                    { name: '09_DOCUMENT_TYPE_MASTER', desc: 'ประเภทเอกสารแนบ' },
                    { name: '10_SAMPLE_REQUEST_HEADER', desc: 'หัวคำขอตัวอย่าง' },
                    { name: '11_SAMPLE_REQUEST_LINES', desc: 'รายการสินค้าตัวอย่าง' },
                    { name: '12_LOGISTIC_TASK', desc: 'งานขนส่งและรถ' },
                    { name: '13_APPROVAL', desc: 'ประวัติการอนุมัติ' },
                    { name: '14_RD_TASK', desc: 'งานจัดเตรียมตัวอย่าง' },
                    { name: '15_CO_SALE_TASK', desc: 'งานเปิด SO ใน ERP' },
                    { name: '16_DOCUMENT_REGISTER', desc: 'ทะเบียนเอกสาร PDF' },
                    { name: '17_DOCUMENT_REVISION', desc: 'ประวัติ Revision เอกสาร' },
                    { name: '18_EMAIL_RECIPIENT_MASTER', desc: 'รายชื่อผู้รับอีเมล' },
                    { name: '19_EMAIL_TEMPLATE', desc: 'เทมเพลตอีเมล' },
                    { name: '20_NOTIFICATION_RULE', desc: 'กฎการแจ้งเตือน' },
                    { name: '21_EMAIL_LOG', desc: 'บันทึกการส่งอีเมล' },
                    { name: '22_ISSUE_LOG', desc: 'บันทึกปัญหาในกระบวนการ' },
                    { name: '23_SLA_MASTER', desc: 'กำหนดเวลา SLA' },
                    { name: '24_APPROVAL_MATRIX', desc: 'เมทริกซ์การอนุมัติ' },
                    { name: '25_AUDIT_LOG', desc: 'ประวัติการแก้ไขระบบ' },
                    { name: '26_SYSTEM_SETTINGS', desc: 'การตั้งค่าระบบ' }
                  ].map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <span className="font-mono text-[11px] font-bold text-blue-900 truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1">{s.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-600" />
                    <span>ระบบจะจัดรูปแบบ Freeze Row 1, Basic Filter และ Corporate Navy Header ให้อัตโนมัติทุกชีต</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">26 Sheets Complete</span>
                </div>
              </div>
            )}

            {/* Step 4: Initial RD Departments */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <GitBranch className="text-blue-600" size={20} />
                    4. Create Initial RD Departments (แผนก RD เริ่มต้น)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">กำหนดแผนก RD เพื่อใช้แยกสายการรันเลขที่คำขอตัวอย่าง (ห้าม Hard code)</p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {rdDepartments.map((dept, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-slate-300 bg-white">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={dept.enabled}
                          onChange={e => {
                            const updated = [...rdDepartments];
                            updated[idx].enabled = e.target.checked;
                            setRdDepartments(updated);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{dept.nameTh}</div>
                          <div className="text-[10px] text-slate-500">{dept.nameEn}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Prefix:</span>
                        <input 
                          type="text"
                          value={dept.prefix}
                          onChange={e => {
                            const updated = [...rdDepartments];
                            updated[idx].prefix = e.target.value;
                            setRdDepartments(updated);
                          }}
                          className="w-24 text-xs font-mono font-bold px-2 py-1 border border-slate-300 rounded uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Configure Running Numbers */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Hash className="text-blue-600" size={20} />
                    5. Configure Running Numbers (กำหนดรูปแบบเลขที่เอกสาร)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">โครงสร้างเลขที่เอกสารแยกตามแผนก RD พร้อมการรองรับ Revision</p>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2">
                  <div className="text-xs text-slate-400">ตัวอย่างเลขที่คำขอที่ระบบจะออก:</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 tracking-wider">
                    SRI-RM001-2026 REV.00
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    เลขที่คงที่แม้ขอแก้ไข (Revision แตกเป็น REV.01, REV.02) และหากเปลี่ยนแผนกในสถานะ Draft ระบบจะ Void เลขเดิมพร้อมบันทึก Audit Log
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ปีศักราชเริ่มต้น (Year)</label>
                    <input 
                      type="number" 
                      value={runningConfig.year}
                      onChange={e => setRunningConfig({ ...runningConfig, year: parseInt(e.target.value) || 2026 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">เลขเริ่มต้น (Starting No.)</label>
                    <input 
                      type="number" 
                      value={runningConfig.startingNo}
                      onChange={e => setRunningConfig({ ...runningConfig, startingNo: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนหลัก (Digit Length)</label>
                    <input 
                      type="number" 
                      value={runningConfig.digitLength}
                      onChange={e => setRunningConfig({ ...runningConfig, digitLength: parseInt(e.target.value) || 3 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Configure Admin User */}
            {currentStep === 6 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={20} />
                    6. Configure Admin User (ผู้ดูแลระบบหลัก)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">กำหนดบัญชีผู้ดูแลระบบแรกที่จะได้รับสิทธิ์ระดับ ADMIN ในชีต USERS</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ดูแลระบบ (Admin Name) *</label>
                    <input 
                      type="text" 
                      value={adminUser.name}
                      onChange={e => setAdminUser({ ...adminUser, name: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รหัสพนักงาน (Employee ID)</label>
                    <input 
                      type="text" 
                      value={adminUser.employeeId}
                      onChange={e => setAdminUser({ ...adminUser, employeeId: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลผู้ดูแลระบบ (Admin Google Email) *</label>
                    <input 
                      type="email" 
                      value={adminUser.email}
                      onChange={e => setAdminUser({ ...adminUser, email: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">บัญชีนี้จะถูกบันทึกใน USERS และ SYSTEM_SETTINGS พร้อมสิทธิ์ ADMIN สูงสุด</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Configure Email */}
            {currentStep === 7 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="text-blue-600" size={20} />
                    7. Configure Email (ระบบแจ้งเตือนและอีเมล)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ตั้งค่าชื่อและอีเมลผู้ส่งสำหรับระบบแจ้งเตือนคำขอตัวอย่างอัตโนมัติ</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ส่ง (Sender Display Name)</label>
                    <input 
                      type="text" 
                      value={emailConfig.senderName}
                      onChange={e => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลแจ้งเตือน (Sender Email)</label>
                    <input 
                      type="email" 
                      value={emailConfig.senderEmail}
                      onChange={e => setEmailConfig({ ...emailConfig, senderEmail: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
                  <span className="text-xs font-bold text-slate-800">เทมเพลตอีเมลเริ่มต้น 5 เหตุการณ์:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>• ยืนยันการส่งคำขอ (Submit)</div>
                    <div>• แจ้งผลอนุมัติและแตกงาน (Approved)</div>
                    <div>• ผ่านเกณฑ์พร้อมจัดส่ง (Ready to Deliver Gate)</div>
                    <div>• แจ้งขอแก้ไขรายละเอียด (Revision Request)</div>
                    <div>• ส่งมอบตัวอย่างสำเร็จ (Delivered POD)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Finish Setup */}
            {currentStep === 8 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="text-blue-600" size={20} />
                    8. Finish Setup (ยืนยันและเริ่มสร้างฐานข้อมูล)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ตรวจสอบสรุปข้อมูลการตั้งค่าก่อนทำการสร้างฐานข้อมูล Google Sheets</p>
                </div>

                {setupError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>เกิดข้อผิดพลาด:</strong> {setupError}
                    </div>
                  </div>
                )}

                {setupComplete && setupResult ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <Check size={20} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-emerald-900">สร้างฐานข้อมูล Google Sheets สำเร็จเรียบร้อย!</h4>
                        <p className="text-xs text-emerald-700">
                          Spreadsheet ID: <span className="font-mono">{setupResult.spreadsheetId}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      {setupResult.spreadsheetUrl && (
                        <a 
                          href={setupResult.spreadsheetUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-800 border border-emerald-300 rounded font-bold text-xs hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                          <ExternalLink size={14} />
                          เปิดดูบน Google Sheets
                        </a>
                      )}

                      <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow transition-colors"
                      >
                        เข้าสู่ระบบและเริ่มใช้งาน
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded border border-slate-200 bg-slate-50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">บริษัท</span>
                        <span className="font-bold text-slate-800 text-xs truncate block">{companyInfo.nameTh}</span>
                      </div>

                      <div className="p-3 rounded border border-slate-200 bg-slate-50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Spreadsheet</span>
                        <span className="font-bold text-slate-800 text-xs block">Sample Request & Delivery</span>
                      </div>

                      <div className="p-3 rounded border border-slate-200 bg-slate-50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">จำนวนแผนก RD</span>
                        <span className="font-bold text-slate-800 text-xs block">{rdDepartments.filter(d => d.enabled).length} แผนกเริ่มต้น</span>
                      </div>

                      <div className="p-3 rounded border border-slate-200 bg-slate-50">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">ผู้ดูแลระบบ (Admin)</span>
                        <span className="font-bold text-slate-800 text-xs block truncate">{adminUser.name} ({adminUser.email})</span>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-blue-900">พร้อมดำเนินการบันทึกข้อมูลและสร้างโครงสร้างชีต</div>
                        <div className="text-[11px] text-blue-700">ระบบจะทำการล็อกหัวตาราง, เปิด Filter และลง Master Data ให้อัตโนมัติ</div>
                      </div>

                      <button
                        onClick={handleExecuteSetup}
                        disabled={isSettingUp}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded shadow transition-colors flex items-center gap-2"
                      >
                        {isSettingUp ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            กำลังสร้างฐานข้อมูล...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            สร้างฐานข้อมูล Google Sheets
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Step Navigation Bar */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1 || isSettingUp}
                className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                ย้อนกลับ
              </button>

              <div className="flex items-center gap-1">
                {STEPS.map(s => (
                  <span 
                    key={s.id} 
                    className={`w-2 h-2 rounded-full transition-all ${
                      s.id === currentStep ? 'bg-blue-600 w-4' : s.id < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} 
                  />
                ))}
              </div>

              {currentStep < 8 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
                  disabled={isSettingUp}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  ถัดไป
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteSetup}
                  disabled={isSettingUp || setupComplete}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isSettingUp ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      กำลังประมวลผล...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      สร้างฐานข้อมูล Google Sheets
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
