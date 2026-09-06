import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { 
  Mail, Users, FileText, Settings, History, Save, Plus, 
  Trash2, Play, Search, Eye, RefreshCw, Send, CheckCircle
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';

export function EmailSettingsPage() {
  const { recentEmails, logAuditEntry } = useRequests();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'RECIPIENTS' | 'TEMPLATES' | 'RULES' | 'LOGS'>('RECIPIENTS');

  // Sync activeTab with URL path
  useEffect(() => {
    if (location.pathname === '/monitoring/email-recipients') {
      setActiveTab('RECIPIENTS');
    } else if (location.pathname === '/monitoring/email-template') {
      setActiveTab('TEMPLATES');
    } else if (location.pathname === '/monitoring/notification-rules') {
      setActiveTab('RULES');
    } else if (location.pathname === '/monitoring/email-log') {
      setActiveTab('LOGS');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'RECIPIENTS' | 'TEMPLATES' | 'RULES' | 'LOGS') => {
    setActiveTab(tab);
    if (tab === 'RECIPIENTS') {
      navigate('/monitoring/email-recipients');
    } else if (tab === 'TEMPLATES') {
      navigate('/monitoring/email-template');
    } else if (tab === 'RULES') {
      navigate('/monitoring/notification-rules');
    } else if (tab === 'LOGS') {
      navigate('/monitoring/email-log');
    }
  };
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Email Recipients Configuration
  const [recipients, setRecipients] = useState([
    { event: 'LOGISTIC_PRECHECK', eventName: 'Logistic Pre-Check Notification', to: 'logistic.precheck@company.com', cc: 'sale.dept@company.com' },
    { event: 'APPROVAL_REQUESTED', eventName: 'Approval Workflow Requested', to: 'sale.manager@company.com', cc: 'sale.dept@company.com' },
    { event: 'RD_TASK_ASSIGNED', eventName: 'RD Task Assigned & Queue', to: 'rd.supervisor@company.com', cc: 'logistic@company.com' },
    { event: 'SO_CREATION_WAITING', eventName: 'Co-Sale SO Wait / Task Out', to: 'cosale.team@company.com', cc: 'sale@company.com' },
    { event: 'VEHICLE_ASSIGNMENT', eventName: 'Logistic Vehicle Selection', to: 'logistic.dispatch@company.com', cc: 'delivery@company.com' },
    { event: 'DELIVERY_DISPATCH', eventName: 'Delivery Dispatch & Update', to: 'logistic.dispatch@company.com', cc: 'sale@company.com' },
  ]);

  // Email Templates Configuration
  const [templates, setTemplates] = useState([
    { code: 'TMPL_LOGISTIC_PRECHECK', name: 'Logistic Pre-Check Template', subject: '[LOGISTIC PRE-CHECK] New Request {SampleNo} - {CustomerName}', body: 'เรียน ทีมงานขนส่ง,\n\nมีคำขอส่งผลิตภัณฑ์ตัวอย่างใหม่หมายเลข {SampleNo} จัดส่งไปยังลูกค้า {CustomerName} วันที่ {DeliveryDate} กรุณาตรวจสอบความเป็นไปได้ในการบริการจัดรถ\n\nขอบคุณค่ะ\nระบบจัดเตรียมเอกสารอัตโนมัติ' },
    { code: 'TMPL_APPROVAL_REQ', name: 'Manager Approval Required', subject: '[APPROVAL REQ] Request {SampleNo} - {CustomerName} (Total: {TotalValue} THB)', body: 'เรียน ผู้จัดการฝ่ายขาย,\n\nกรุณาพิจารณาอนุมัติคำขอตัวอย่างสินค้าหมายเลข {SampleNo} ลูกค้า {CustomerName} ยอดเงินรวม {TotalValue} บาท ที่ได้รับส่งเอกสารมา\n\nตรวจสอบรายละเอียดและทำรายการอนุมัติได้ในระบระบบ\n\nขอบคุณค่ะ' },
    { code: 'TMPL_RD_START', name: 'RD Preparation Active Notification', subject: '[RD ACTIVE] RD Department {Dept} started preparation for {SampleNo}', body: 'เรียน แผนก RD และผู้เกี่ยวข้อง,\n\nใบคำขอตัวอย่างเลขที่ {SampleNo} ได้เริ่มขั้นตอนการผลิตคัดเตรียมตัวอย่างโดย RD {Dept} แล้ว เป้าหมายแล้วเสร็จ {PreparationDate} {PreparationTime}\n\nขอบคุณค่ะ' }
  ]);

  // Notification Rules
  const [rules, setRules] = useState([
    { id: 'R-01', name: 'SLA At Risk Trigger', trigger: 'SLA Level >= 80%', action: 'ส่งอีเมลเตือนผู้ปฏิบัติงาน + CC Supervisor', active: true },
    { id: 'R-02', name: 'SLA Overdue Escalation', trigger: 'SLA Level > 100%', action: 'ส่งอีเมลเตือนผู้บริหารระดับสูง + ดึงสิทธิ์เข้าส่วนกลาง', active: true },
    { id: 'R-03', name: 'Issue Logged Rule', trigger: 'แจ้งปัญหาขนส่ง/คลังสบ', action: 'ส่งอีเมลรายงาน Co-Sale และ Sale ทันที', active: true },
  ]);

  const handleUpdateRecipient = (index: number, field: 'to' | 'cc', value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const handleSaveRecipients = async () => {
    setSaveSuccess('RECIPIENTS');
    await logAuditEntry('MASTER_CHANGE', 'EMAIL_RECIPIENTS', 'CONFIG_SETTINGS', 'Modified Email Recipients Configuration list');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveTemplates = async () => {
    setSaveSuccess('TEMPLATES');
    await logAuditEntry('MASTER_CHANGE', 'EMAIL_TEMPLATES', 'CONFIG_SETTINGS', 'Modified Custom System Email Templates');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Mail size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Email & Notification Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ปรับแต่งสิทธิ์การส่งอีเมล ผู้รับปลายทาง เทมเพลต และตรวจสอบ Logs การส่งจดหมายแจ้งเตือนอัตโนมัติของระบบ
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => handleTabChange('RECIPIENTS')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'RECIPIENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} />
          ผู้รับ Email (Recipients)
        </button>
        <button
          onClick={() => handleTabChange('TEMPLATES')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'TEMPLATES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={14} />
          Email Templates
        </button>
        <button
          onClick={() => handleTabChange('RULES')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'RULES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings size={14} />
          เงื่อนไข Notification Rules
        </button>
        <button
          onClick={() => handleTabChange('LOGS')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'LOGS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History size={14} />
          ประวัติจัดส่ง (Email Logs)
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'RECIPIENTS' && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">กำหนดอีเมลผู้รับประจำขั้นตอน (Part 82 — Email Recipient Change)</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">เปลี่ยนผู้รับ CC หรือ To ของแต่ละอีเวนต์การออกวิ่งงาน</p>
            </div>
            <button
              onClick={handleSaveRecipients}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Save size={13} />
              บันทึกการตั้งค่า
            </button>
          </div>

          {saveSuccess === 'RECIPIENTS' && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold">
              บันทึกการแก้ไขผู้รับจดหมายปลายทางลงฐานข้อมูลระบบและซิงค์ใช้งานเรียบร้อยแล้ว!
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">เหตุการณ์ระบบ (Event Trigger)</th>
                  <th className="py-2.5 px-4">To (ผู้รับหลัก) *</th>
                  <th className="py-2.5 px-4">Cc (ผู้ร่วมรับทราบ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((rec, i) => (
                  <tr key={rec.event} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{rec.eventName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.event}</div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={rec.to}
                        onChange={(e) => handleUpdateRecipient(i, 'to', e.target.value)}
                        className="w-full h-8 px-2.5 border border-slate-200 rounded font-mono text-slate-700 bg-slate-50/50 focus:bg-white text-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={rec.cc}
                        onChange={(e) => handleUpdateRecipient(i, 'cc', e.target.value)}
                        className="w-full h-8 px-2.5 border border-slate-200 rounded font-mono text-slate-500 bg-slate-50/50 focus:bg-white text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">จัดการ Email Template ประจำเซสชัน</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">แก้ไขหัวจดหมาย และรูปแบบเนื้อความที่จะถูกยิงเตือนผู้เกี่ยวข้อง</p>
            </div>
            <button
              onClick={handleSaveTemplates}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Save size={13} />
              บันทึกโครงสร้างจดหมาย
            </button>
          </div>

          {saveSuccess === 'TEMPLATES' && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold">
              อัปเดต Template เทมเพลตอีเมลระบบและรักษาสิทธิ์สาระสำคัญอัตโนมัติสำเร็จแล้ว!
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {templates.map((tmpl, index) => (
              <div key={tmpl.code} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/40">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">รหัสอ้างอิง: {tmpl.code}</span>
                  <span className="font-bold text-slate-800 text-xs block mt-0.5">{tmpl.name}</span>
                </div>
                <hr className="border-slate-200/60" />
                <div className="space-y-2 text-[11px]">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-0.5">หัวข้ออีเมล (Subject)</label>
                    <input
                      type="text"
                      value={tmpl.subject}
                      onChange={(e) => {
                        const copy = [...templates];
                        copy[index].subject = e.target.value;
                        setTemplates(copy);
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-[11px] text-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-0.5">เนื้อความหลัก (Body Text)</label>
                    <textarea
                      rows={4}
                      value={tmpl.body}
                      onChange={(e) => {
                        const copy = [...templates];
                        copy[index].body = e.target.value;
                        setTemplates(copy);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-[10px] font-mono leading-normal text-slate-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'RULES' && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">เงื่อนไขการส่งแจ้งเตือนและยกระดับการจัดการ (SLA Escalation Rules)</h3>
            <p className="text-slate-400 text-[11px] mt-0.5">กฎเกณฑ์การแจ้งเตือนตามระดับวิกฤตของตัวชี้วัด (At Risk, Overdue, Escalation)</p>
          </div>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs text-slate-700">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-slate-50/40">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {rule.name}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    เงื่อนไขสมการ: {rule.trigger} &rarr; การกระทำ: {rule.action}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    Active (ทำงานอยู่)
                  </span>
                  <button className="text-rose-600 hover:text-rose-700 font-bold text-xs">ปิด</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'LOGS' && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">บันทึกประวัติการยิงเมลแจ้งเตือน (Email Event Logs - Part 82)</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">ตรวจสอบจดหมายทุกฉบับที่ออกจากเซิร์ฟเวอร์ย้อนหลังเรียลไทม์</p>
            </div>
            <button className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-500">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs text-slate-700">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-16">เวลาที่ส่ง</th>
                  <th className="py-2.5 px-4">เลขคำขอ</th>
                  <th className="py-2.5 px-4">หัวข้อจดหมาย (Email Subject)</th>
                  <th className="py-2.5 px-4">ผู้รับ (To / CC)</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      ไม่พบบันทึกการจัดส่งอีเมลล่าสุด (กรุณาลองทำรายการส่งคำขอเพื่อดูประวัติย้อนหลัง)
                    </td>
                  </tr>
                ) : (
                  recentEmails.map(email => (
                    <tr key={email.emailLogId} className="hover:bg-slate-50/30">
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        <div>{email.sendDate}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{email.sendTime}</div>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-slate-800">{email.sampleNo}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate" title={email.subject}>
                        {email.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                        <div>To: {email.toEmail}</div>
                        {email.ccEmail && <div className="text-slate-400">CC: {email.ccEmail}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <CheckCircle size={10} />
                          {email.sendStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
