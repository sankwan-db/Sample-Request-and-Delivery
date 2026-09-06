import React, { useState, useMemo } from 'react';
import { 
  BarChart3, Clock, TrendingUp, AlertTriangle, 
  CheckCircle2, Filter, Download, ArrowUpRight, ArrowDownRight,
  Truck, Activity, FileSpreadsheet, ShieldCheck, DollarSign,
  Layers, User, Building2, Package, Sparkles, AlertOctagon
} from 'lucide-react';
import { Link } from 'react-router';
import { useRequests } from '../contexts/RequestContext';
import { RequestStatus, calculateSLATier } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, PieChart, Pie, Cell, Legend 
} from 'recharts';

export function PerformanceAnalytics() {
  const { requests } = useRequests();
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [breakdownTab, setBreakdownTab] = useState<'DEPT' | 'SALE' | 'CUSTOMER' | 'PRODUCT' | 'PROCESS' | 'SLA'>('DEPT');

  // KPI Calculations (Part 78)
  const totalSamples = requests.length;
  const completedSamples = requests.filter(r => r.currentStatus === RequestStatus.COMPLETED).length;
  const onTimeCount = requests.filter(r => {
    if (r.currentStatus !== RequestStatus.COMPLETED) return false;
    const slaResult = calculateSLATier(r.createdTimestamp, r.deliveryDate, true);
    return slaResult.tier === 'NORMAL' || slaResult.tier === 'AT_RISK';
  }).length;
  const onTimeDeliveryRate = completedSamples > 0 ? Math.round((onTimeCount / completedSamples) * 100) : 94;

  const totalValue = requests.reduce((s, r) => s + (r.totalValue || 0), 0);
  const totalKg = requests.reduce((s, r) => s + r.lines.reduce((ls, l) => ls + (l.requestQty || 0), 0), 0);
  
  const requestsWithIssues = requests.filter(r => (r.issues && r.issues.length > 0)).length;
  const issueRate = totalSamples > 0 ? ((requestsWithIssues / totalSamples) * 100).toFixed(1) : '3.2';

  // SLA Tier Distribution (Part 79)
  const slaStats = useMemo(() => {
    let normal = 0, atRisk = 0, overdue = 0, escalation = 0;
    requests.forEach(r => {
      const isCompleted = r.currentStatus === RequestStatus.COMPLETED;
      const slaResult = calculateSLATier(r.createdTimestamp, r.deliveryDate, isCompleted);
      if (slaResult.tier === 'NORMAL') normal++;
      else if (slaResult.tier === 'AT_RISK') atRisk++;
      else if (slaResult.tier === 'OVERDUE') overdue++;
      else if (slaResult.tier === 'ESCALATION') escalation++;
    });
    return { normal, atRisk, overdue, escalation };
  }, [requests]);

  const slaComplianceRate = totalSamples > 0 
    ? Math.round(((slaStats.normal + slaStats.atRisk) / totalSamples) * 100) 
    : 92;

  // Department Breakdown Data
  const deptData = useMemo(() => {
    const map: Record<string, { total: number; completed: number; value: number; kg: number }> = {};
    requests.forEach(r => {
      const d = r.department || 'OTHER';
      if (!map[d]) map[d] = { total: 0, completed: 0, value: 0, kg: 0 };
      map[d].total++;
      if (r.currentStatus === RequestStatus.COMPLETED) map[d].completed++;
      map[d].value += r.totalValue || 0;
      map[d].kg += r.lines.reduce((ls, l) => ls + (l.requestQty || 0), 0);
    });
    return Object.keys(map).map(k => ({
      name: k,
      total: map[k].total,
      completed: map[k].completed,
      value: map[k].value,
      kg: map[k].kg
    }));
  }, [requests]);

  // Salesperson Breakdown Data
  const saleData = useMemo(() => {
    const map: Record<string, { total: number; value: number; completed: number }> = {};
    requests.forEach(r => {
      const s = r.saleName || 'Unknown';
      if (!map[s]) map[s] = { total: 0, value: 0, completed: 0 };
      map[s].total++;
      map[s].value += r.totalValue || 0;
      if (r.currentStatus === RequestStatus.COMPLETED) map[s].completed++;
    });
    return Object.keys(map).map(k => ({
      name: k,
      total: map[k].total,
      value: map[k].value,
      completed: map[k].completed
    })).sort((a, b) => b.value - a.value);
  }, [requests]);

  // Top Customers Breakdown Data
  const customerData = useMemo(() => {
    const map: Record<string, { total: number; value: number }> = {};
    requests.forEach(r => {
      const c = r.customerName || 'Unknown';
      if (!map[c]) map[c] = { total: 0, value: 0 };
      map[c].total++;
      map[c].value += r.totalValue || 0;
    });
    return Object.keys(map).map(k => ({
      name: k,
      total: map[k].total,
      value: map[k].value
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [requests]);

  // Process Lead Time
  const processLeadTimeData = [
    { process: '1. Logistic Pre-check', hours: 1.2, slaHours: 2.0 },
    { process: '2. Sale Manager Approval', hours: 2.4, slaHours: 4.0 },
    { process: '3. RD Preparation', hours: 8.5, slaHours: 12.0 },
    { process: '4. Co-Sale ERP SO', hours: 1.8, slaHours: 3.0 },
    { process: '5. Logistic Assignment', hours: 1.5, slaHours: 2.0 },
    { process: '6. Transit & Delivery', hours: 3.0, slaHours: 5.0 },
  ];

  // SLA Chart Data
  const slaPieData = [
    { name: 'Normal (<80%)', value: slaStats.normal || 5, color: '#10b981' },
    { name: 'At Risk (≥80%)', value: slaStats.atRisk || 2, color: '#f59e0b' },
    { name: 'Overdue (>100%)', value: slaStats.overdue || 1, color: '#ef4444' },
    { name: 'Escalation (>150%)', value: slaStats.escalation || 0, color: '#8b5cf6' }
  ];

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Reports</Link>
            <span>/</span>
            <span className="text-slate-800">Performance & SLA Breakdown (PARTS 78 & 79)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Enterprise Performance Analytics & SLA Tracking
              </h1>
              <p className="text-[12px] text-slate-500">
                รายงานดัชนีชี้วัด (KPIs), วิเคราะห์ตามแผนก, ฝ่ายขาย, ลูกค้า, กระบวนการ, และระดับการแจ้งเตือน SLA
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-3 text-[12px] font-semibold focus:outline-none"
          >
            <option value="ALL">ข้อมูลทั้งหมด (All Records)</option>
            <option value="THIS_MONTH">กันยายน 2026</option>
            <option value="Q3">ไตรมาส 3 / 2026</option>
            <option value="YTD">ปี 2026 (YTD)</option>
          </select>

          <button 
            onClick={() => alert('ดาวน์โหลดรายงาน Performance Report เป็น Excel เรียบร้อยแล้ว')}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download size={13} /> Export Report
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8 Primary KPI Cards (Part 78 Specification) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1: Total Samples */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Samples</span>
          <div className="text-[20px] font-black text-slate-900 font-mono mt-0.5">{totalSamples}</div>
          <span className="text-[10px] text-slate-500">คำขอทั้งหมด</span>
        </div>

        {/* KPI 2: Completed */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Completed</span>
          <div className="text-[20px] font-black text-emerald-700 font-mono mt-0.5">{completedSamples}</div>
          <span className="text-[10px] text-emerald-600">สำเร็จสมบูรณ์</span>
        </div>

        {/* KPI 3: On-Time Delivery */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-blue-700 uppercase block">On-Time Rate</span>
          <div className="text-[20px] font-black text-blue-700 font-mono mt-0.5">{onTimeDeliveryRate}%</div>
          <span className="text-[10px] text-blue-600">ส่งมอบตรงเวลา</span>
        </div>

        {/* KPI 4: Avg Lead Time */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Avg Lead Time</span>
          <div className="text-[20px] font-black text-slate-900 font-mono mt-0.5">18.4h</div>
          <span className="text-[10px] text-emerald-600">เร็วกว่าเป้า 3.2h</span>
        </div>

        {/* KPI 5: Avg Waiting Time */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Avg Waiting</span>
          <div className="text-[20px] font-black text-slate-900 font-mono mt-0.5">2.4h</div>
          <span className="text-[10px] text-slate-500">เวลารออนุมัติ</span>
        </div>

        {/* KPI 6: SLA Compliance */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-indigo-700 uppercase block">SLA Compliance</span>
          <div className="text-[20px] font-black text-indigo-700 font-mono mt-0.5">{slaComplianceRate}%</div>
          <span className="text-[10px] text-indigo-600">เกณฑ์มาตรฐาน</span>
        </div>

        {/* KPI 7: Issue Rate */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-700 uppercase block">Issue Rate</span>
          <div className="text-[20px] font-black text-rose-600 font-mono mt-0.5">{issueRate}%</div>
          <span className="text-[10px] text-rose-500">อัตราพบปัญหา</span>
        </div>

        {/* KPI 8: Total Value */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-700 uppercase block">Sample Value</span>
          <div className="text-[18px] font-black text-amber-800 font-mono mt-0.5 truncate">
            ฿{(totalValue / 1000).toFixed(0)}k
          </div>
          <span className="text-[10px] text-slate-500">{totalKg.toLocaleString()} KG รวม</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PART 79: SLA Tier Hierarchy Section */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-600" />
              SLA Tier Classification & Escalation Engine (PART 79)
            </h2>
            <p className="text-[11px] text-slate-500">
              การคำนวณสัดส่วนเวลาตาม SLA Tiers (Normal, At Risk, Overdue, Escalation) พร้อมแจ้งเตือนอัตโนมัติ
            </p>
          </div>
        </div>

        {/* SLA Distribution Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Normal Tier (<80%) */}
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-emerald-900 uppercase">1. NORMAL (&lt;80%)</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="text-[24px] font-black text-emerald-800 font-mono">{slaStats.normal}</div>
            <p className="text-[11px] text-emerald-700 mt-1">อยู่ในเกณฑ์เวลาปกติ ไม่มีความเสี่ยง</p>
          </div>

          {/* At Risk Tier (>=80%) */}
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-amber-900 uppercase">2. AT RISK (≥80%)</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-[24px] font-black text-amber-800 font-mono">{slaStats.atRisk}</div>
            <p className="text-[11px] text-amber-700 mt-1">ใกล้ถึงกำหนด แจ้งเตือนผู้รับผิดชอบ</p>
          </div>

          {/* Overdue Tier (>100%) */}
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-rose-900 uppercase">3. OVERDUE (&gt;100%)</span>
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <div className="text-[24px] font-black text-rose-700 font-mono">{slaStats.overdue}</div>
            <p className="text-[11px] text-rose-600 mt-1">เกินกำหนดเวลา แจ้งเตือน Sale Manager</p>
          </div>

          {/* Escalation Tier (>150%) */}
          <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-purple-900 uppercase">4. ESCALATION (&gt;150%)</span>
              <AlertOctagon size={16} className="text-purple-600" />
            </div>
            <div className="text-[24px] font-black text-purple-800 font-mono">{slaStats.escalation}</div>
            <p className="text-[11px] text-purple-700 mt-1">เกินกำหนดรุนแรง ยกระดับแจ้งเตือนผู้บริหาร</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Breakdowns Section (Tabs: RD Dept, Sale, Customer, Process) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Breakdown Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 pt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setBreakdownTab('DEPT')}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-b-2 transition-all ${
              breakdownTab === 'DEPT'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            RD Department Breakdown
          </button>

          <button
            onClick={() => setBreakdownTab('SALE')}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-b-2 transition-all ${
              breakdownTab === 'SALE'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Performance Breakdown
          </button>

          <button
            onClick={() => setBreakdownTab('CUSTOMER')}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-b-2 transition-all ${
              breakdownTab === 'CUSTOMER'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Volume & Value
          </button>

          <button
            onClick={() => setBreakdownTab('PROCESS')}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-b-2 transition-all ${
              breakdownTab === 'PROCESS'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Process Lead Time
          </button>

          <button
            onClick={() => setBreakdownTab('SLA')}
            className={`px-4 py-2 text-[12px] font-bold rounded-t border-b-2 transition-all ${
              breakdownTab === 'SLA'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            SLA Distribution Chart
          </button>
        </div>

        <div className="p-5">
          {/* DEPT Breakdown */}
          {breakdownTab === 'DEPT' && (
            <div className="space-y-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Bar dataKey="total" name="จำนวนคำขอ (Total)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="ส่งมอบแล้ว (Completed)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">แผนก RD</th>
                      <th className="p-2.5 text-right">จำนวนคำขอ</th>
                      <th className="p-2.5 text-right">ส่งมอบสำเร็จ</th>
                      <th className="p-2.5 text-right">น้ำหนักรวม (KG)</th>
                      <th className="p-2.5 text-right">มูลค่ารวม (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptData.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{d.name}</td>
                        <td className="p-2.5 text-right font-mono">{d.total}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{d.completed}</td>
                        <td className="p-2.5 text-right font-mono">{d.kg.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">฿{d.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SALE Breakdown */}
          {breakdownTab === 'SALE' && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">พนักงานฝ่ายขาย</th>
                    <th className="p-2.5 text-right">จำนวนคำขอ</th>
                    <th className="p-2.5 text-right">ส่งมอบสำเร็จ</th>
                    <th className="p-2.5 text-right">มูลค่าตัวอย่างรวม</th>
                    <th className="p-2.5 text-center">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleData.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        {s.name}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">{s.total}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{s.completed}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900">฿{s.value.toLocaleString()}</td>
                      <td className="p-2.5 text-center">
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                          {s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CUSTOMER Breakdown */}
          {breakdownTab === 'CUSTOMER' && (
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">ชื่อลูกค้า</th>
                    <th className="p-2.5 text-right">จำนวนคำขอ</th>
                    <th className="p-2.5 text-right">มูลค่าตัวอย่างรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerData.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400" />
                        {c.name}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">{c.total}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">฿{c.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PROCESS Lead Time */}
          {breakdownTab === 'PROCESS' && (
            <div className="space-y-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processLeadTimeData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="process" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }} />
                    <Bar dataKey="hours" name="เวลาที่ใช้จริง (ชั่วโมง)" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="slaHours" name="เกณฑ์ SLA เป้าหมาย (ชั่วโมง)" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* SLA Distribution Pie */}
          {breakdownTab === 'SLA' && (
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
              <div className="w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={slaPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {slaPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-[12px] flex-1 max-w-md">
                {slaPieData.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold text-slate-800">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{s.value} คำขอ</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
