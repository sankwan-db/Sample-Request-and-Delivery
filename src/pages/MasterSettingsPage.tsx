import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { 
  Database, Map, Clock, Shield, Save, CheckCircle, 
  Plus, Edit2, Sliders, Play, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';

export function MasterSettingsPage() {
  const { logAuditEntry } = useRequests();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ROUTE' | 'SLA' | 'APPROVAL'>('ROUTE');

  // Sync activeTab with URL path
  useEffect(() => {
    if (location.pathname === '/master/route') {
      setActiveTab('ROUTE');
    } else if (location.pathname === '/master/sla') {
      setActiveTab('SLA');
    } else if (location.pathname === '/master/approval-matrix') {
      setActiveTab('APPROVAL');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'ROUTE' | 'SLA' | 'APPROVAL') => {
    setActiveTab(tab);
    if (tab === 'ROUTE') {
      navigate('/master/route');
    } else if (tab === 'SLA') {
      navigate('/master/sla');
    } else if (tab === 'APPROVAL') {
      navigate('/master/approval-matrix');
    }
  };
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Delivery Routes State
  const [routes, setRoutes] = useState([
    { code: 'ROUTE-BKK-01', name: 'กรุงเทพฯ ฝั่งตะวันออก (BKK East)', zone: 'Bangkok Suburb', estLeadTime: '4 Hours', active: true },
    { code: 'ROUTE-BKK-02', name: 'กรุงเทพฯ ฝั่งตะวันตก (BKK West)', zone: 'Bangkok Suburb', estLeadTime: '5 Hours', active: true },
    { code: 'ROUTE-BKK-03', name: 'กรุงเทพฯ ปริมณฑลใต้ (BKK South Suburb)', zone: 'BKK Metropolitan', estLeadTime: '6 Hours', active: true },
    { code: 'ROUTE-EAST-01', name: 'ภาคตะวันออก - พัทยา/ชลบุรี (Eastern Zone)', zone: 'Upcountry East', estLeadTime: '8 Hours', active: true },
    { code: 'ROUTE-NORTH-01', name: 'ภาคเหนือ - พิจิตร/นครสวรรค์ (Northern Gateway)', zone: 'Upcountry North', estLeadTime: '12 Hours', active: true }
  ]);

  // SLA Configurations
  const [slaTiers, setSlaTiers] = useState([
    { tier: 'Normal', threshold: '< 80%', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'กระบวนการรันปกติ อยู่ในเกณฑ์มาตรฐานส่งมอบ' },
    { tier: 'At Risk', threshold: '>= 80% to 100%', color: 'text-amber-700 bg-amber-50 border-amber-200', desc: 'ใกล้เคียงเส้นเดดไลน์ขนส่ง/เตรียมของ: ระบบยิงเมลเตือนผู้เตรียมของ' },
    { tier: 'Overdue', threshold: '> 100%', color: 'text-rose-700 bg-rose-50 border-rose-200', desc: 'หลุดระยะเวลาสัญญา SLA หลัก: ระบบปักธงแดง และบันทึกประวัติความล่าช้า' },
    { tier: 'Escalation', threshold: '> 150%', color: 'text-red-700 bg-red-100 border-red-300', desc: 'วิกฤตขั้นสูง: แจ้งเมลผู้บริหาร และโอนสิทธิ์ไปปฏิบัติการด่วนพิเศษ' }
  ]);

  // Approval Limits
  const [approvalMatrix, setApprovalMatrix] = useState([
    { category: 'Raw Material', triggerLimit: '>= 20,000 THB หรือปริมาณ > 100 KG', role: 'SALE_MANAGER', bypassAllowed: false },
    { category: 'Ready-To-Cook', triggerLimit: '>= 10,000 THB หรือปริมาณ > 200 PACK', role: 'SALE_MANAGER', bypassAllowed: true },
    { category: 'Ready-To-Eat', triggerLimit: 'ทุกกรณี (เนื่องจากความปลอดภัยอาหารระดับพรีเมียม)', role: 'SALE_MANAGER', bypassAllowed: false },
    { category: 'Further Processed', triggerLimit: '>= 50,000 THB เท่านั้น', role: 'SALE_MANAGER', bypassAllowed: true }
  ]);

  const handleSaveRoutes = async () => {
    setSaveSuccess('ROUTE');
    await logAuditEntry('MASTER_CHANGE', 'ROUTE_MASTER', 'MASTER_DATA', 'Saved modifications to Delivery Route Master directories');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveSLA = async () => {
    setSaveSuccess('SLA');
    await logAuditEntry('MASTER_CHANGE', 'SLA_MASTER_LEVELS', 'MASTER_DATA', 'Updated Master SLA SLA Threshold levels');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveApproval = async () => {
    setSaveSuccess('APPROVAL');
    await logAuditEntry('MASTER_CHANGE', 'APPROVAL_MATRIX', 'MASTER_DATA', 'Adjusted Approval matrix rules for different product categories');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Database size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Master Data Configuration Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ทะเบียนค่ากลางระบบ: เส้นทางจัดรถจัดส่ง (Routes) ลำดับขั้นควบคุมเวลาส่งมอบ (SLA) และแผนภูมิอนุมัติของฝ่ายบริหาร (Approval Matrix)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => handleTabChange('ROUTE')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ROUTE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map size={14} />
          เส้นทางรถจัดส่ง (Transport Routes)
        </button>
        <button
          onClick={() => handleTabChange('SLA')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'SLA' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={14} />
          SLA Master Levels
        </button>
        <button
          onClick={() => handleTabChange('APPROVAL')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'APPROVAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield size={14} />
           Approval Matrix
        </button>
      </div>

      {/* Contents */}
      {activeTab === 'ROUTE' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">การจัดเตรียมเส้นทางวิ่งรถประจำวัน (Route Master)</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">ใช้จัดหมวดหมู่กลุ่มที่อยู่การส่งมอบ ให้สัมพันธ์กับรถยนต์ 4-Wheel Chilled</p>
            </div>
            <button
              onClick={handleSaveRoutes}
              className="px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
            >
              <Save size={13} />
              บันทึกโครงข่ายเส้นทาง
            </button>
          </div>

          {saveSuccess === 'ROUTE' && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold">
              จัดเซฟและซิงค์ข้อมูลเส้นทางกับ Logistic Pipeline สำเร็จ!
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">รหัสเส้นทาง (Route Code)</th>
                  <th className="py-2.5 px-4">ชื่อย่าน / พื้นที่บริการ</th>
                  <th className="py-2.5 px-4">เขตโซนโลจิสติกส์</th>
                  <th className="py-2.5 px-4 text-center">ประมาณเวลาขนส่ง</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {routes.map((rt, idx) => (
                  <tr key={rt.code} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold font-mono text-slate-800">{rt.code}</td>
                    <td className="py-3 px-4 font-semibold">{rt.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{rt.zone}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600 font-mono">{rt.estLeadTime}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded">
                        เปิดบริการ
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SLA' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">การแบ่งเขตความวิกฤตของเวลาการจัดส่ง (SLA Level Levels)</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">แบ่งชั้น Tier อิงสูตร % เพื่อส่ง Email ลิงก์แจ้งเตือนอัตโนมัติ</p>
            </div>
            <button
              onClick={handleSaveSLA}
              className="px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
            >
              <Save size={13} />
              บันทึกระดับ SLA
            </button>
          </div>

          {saveSuccess === 'SLA' && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold">
              บันทึกระดับความปลอดภัยของเวลาจัดส่ง (SLA Levels) สำเร็จ!
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {slaTiers.map((tier) => (
              <div key={tier.tier} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs uppercase">ระดับความรุนแรง: {tier.tier}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border ${tier.color}`}>
                      ความคืบหน้าเวลา {tier.threshold}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">
                    {tier.desc}
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-blue-600 font-bold flex items-center gap-1">
                  กลไกอัตโนมัติ <ArrowRight size={12} /> ทำงานทันทีเมื่อเวลาล่วงมาถึงช่วงนี้
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'APPROVAL' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">เงื่อนไขและลำดับการพิจารณาอนุมัติใบคำขอ (Approval Matrix Limits)</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">เงื่อนไขบังคับให้ส่งเอกสารให้ผู้บริหาร (Sales Manager) ตรวจสอบความถูกต้องก่อนออกรหัสตัวอย่าง</p>
            </div>
            <button
              onClick={handleSaveApproval}
              className="px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
            >
              <Save size={13} />
              บันทึกกติกาอนุมัติ
            </button>
          </div>

          {saveSuccess === 'APPROVAL' && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold">
              อัปเดตระบบตรวจสอบขีดจำกัดราคาและประเภทสินค้า (Approval Matrix Limits) ลงในโมดูลสร้างตัวอย่างสำเร็จ!
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">หมวดผลิตภัณฑ์ (Product Segment)</th>
                  <th className="py-2.5 px-4">เงื่อนไขการเรียกใบอนุมัติ (Trigger Constraint)</th>
                  <th className="py-2.5 px-4">บทบาทสิทธิ์ผู้อนุมัติ</th>
                  <th className="py-2.5 px-4 text-center">สามารถขอข้ามขั้นตอนชั่วคราว</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {approvalMatrix.map((ap) => (
                  <tr key={ap.category} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{ap.category}</td>
                    <td className="py-3.5 px-4 text-blue-700 font-bold font-mono text-[11px]">{ap.triggerLimit}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold font-mono">
                        {ap.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {ap.bypassAllowed ? (
                        <span className="text-amber-700 font-bold">ได้ (มีบันทึกเหตุผลใน Audit Log)</span>
                      ) : (
                        <span className="text-rose-700 font-bold">ไม่ได้โดยเด็ดขาด</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
