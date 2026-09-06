import React, { useState, useMemo } from 'react';
import { 
  FileText, Clock, AlertTriangle, CheckCircle2, 
  TrendingUp, Activity, ArrowRight, Plus,
  Check, X, Filter, Search, Sparkles, Truck,
  FileSpreadsheet, FlaskConical, Navigation, 
  Calendar, Building2, User, ChevronRight, Eye, Layers,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestStatus, SampleRequest, calculateSLATier } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function Dashboard() {
  const { requests, auditLogs, refreshSequences } = useRequests();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSequences();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Global Filters (Part 76)
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [saleFilter, setSaleFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pdfModalRequest, setPdfModalRequest] = useState<SampleRequest | null>(null);

  // Extract unique Sales & Customers for dropdowns
  const salesList = useMemo(() => Array.from(new Set(requests.map(r => r.saleName))).filter(Boolean), [requests]);
  const customerList = useMemo(() => Array.from(new Set(requests.map(r => r.customerName))).filter(Boolean), [requests]);

  // Apply Global Filters
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (deptFilter !== 'ALL' && req.department !== deptFilter) return false;
      if (saleFilter !== 'ALL' && req.saleName !== saleFilter) return false;
      if (customerFilter !== 'ALL' && req.customerName !== customerFilter) return false;
      if (statusFilter !== 'ALL' && req.currentStatus !== statusFilter) return false;

      if (dateRange === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        if (req.createdDate !== today && req.deliveryDate !== today) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          req.sampleNo.toLowerCase().includes(q) ||
          req.customerName.toLowerCase().includes(q) ||
          req.saleName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [requests, deptFilter, saleFilter, customerFilter, statusFilter, dateRange, searchTerm]);

  // ROW 1 Metrics
  const waitingApprovalRequests = filteredRequests.filter(r => r.currentStatus === RequestStatus.WAITING_APPROVAL);
  const waitingApprovalCount = waitingApprovalRequests.length;
  const waitingApprovalValue = waitingApprovalRequests.reduce((s, r) => s + (r.totalValue || 0), 0);

  const readyToDeliverRequests = filteredRequests.filter(r => r.currentStatus === RequestStatus.READY_TO_DELIVER);
  const readyToDeliverCount = readyToDeliverRequests.length;
  const readyToDeliverValue = readyToDeliverRequests.reduce((s, r) => s + (r.totalValue || 0), 0);

  const overdueRequests = filteredRequests.filter(r => {
    const isCompleted = r.currentStatus === RequestStatus.COMPLETED;
    const slaResult = calculateSLATier(r.createdTimestamp, r.deliveryDate, isCompleted);
    return slaResult.tier === 'OVERDUE' || slaResult.tier === 'ESCALATION';
  });
  const overdueCount = overdueRequests.length;
  const overdueValue = overdueRequests.reduce((s, r) => s + (r.totalValue || 0), 0);

  // Trend Chart Data (Last 7 Days / Periods)
  const trendData = useMemo(() => {
    const data = [];
    const baseDate = new Date('2026-09-05');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const label = `${mm}/${dd}`;

      const createdCount = filteredRequests.filter(r => r.createdDate === dateStr).length;
      const completedCount = filteredRequests.filter(r => r.createdDate === dateStr && r.currentStatus === RequestStatus.COMPLETED).length;

      data.push({
        day: label,
        requests: createdCount,
        completed: completedCount
      });
    }
    return data;
  }, [filteredRequests]);

  // ROW 2 Process Summary
  const approvalActive = filteredRequests.filter(r => r.currentStatus === RequestStatus.WAITING_APPROVAL).length;
  const rdActive = filteredRequests.filter(r => r.rdStatus === 'IN_PROGRESS' || r.currentStatus === RequestStatus.PROCESSING).length;
  const coSaleActive = filteredRequests.filter(r => r.coSaleStatus === 'IN_PROGRESS' && !r.coSaleTask?.soNumber).length;
  const logisticActive = filteredRequests.filter(r => r.logisticStatus === 'IN_PROGRESS' && !r.logisticTask?.vehicleNo).length;
  const deliveryActive = filteredRequests.filter(r => [RequestStatus.READY_TO_DELIVER, RequestStatus.PICKED_UP, RequestStatus.OUT_FOR_DELIVERY, RequestStatus.ARRIVED].includes(r.currentStatus)).length;

  // ROW 3: Delivery Today
  const todayStr = '2026-09-05';
  const deliveryTodayList = filteredRequests.filter(r => r.deliveryDate === todayStr || r.deliveryDate === '2026-09-07' || r.currentStatus === RequestStatus.READY_TO_DELIVER).slice(0, 5);

  // ROW 3: My Tasks
  const myPendingTasks = useMemo(() => {
    const tasks = [];
    filteredRequests.forEach(req => {
      if (req.currentStatus === RequestStatus.WAITING_APPROVAL) {
        tasks.push({ id: req.sampleNo, title: `อนุมัติคำขอ ${req.sampleNo}`, dept: 'Approval', deadline: req.deliveryDate, priority: req.priority, link: `/sample/${req.sampleNo}` });
      } else if (!req.coSaleTask?.soNumber && req.coSaleStatus !== 'COMPLETED') {
        tasks.push({ id: req.sampleNo, title: `ออก SO สำหรับ ${req.sampleNo}`, dept: 'Co-Sale', deadline: req.deliveryDate, priority: req.priority, link: '/co-sale' });
      } else if (!req.logisticTask?.vehicleNo && req.logisticStatus !== 'COMPLETED') {
        tasks.push({ id: req.sampleNo, title: `มอบหมายรถ ${req.sampleNo}`, dept: 'Logistic', deadline: req.deliveryDate, priority: req.priority, link: '/logistic' });
      }
    });
    return tasks.slice(0, 5);
  }, [filteredRequests]);

  // ROW 3: Latest Activity
  const latestActivities = useMemo(() => {
    if (auditLogs && auditLogs.length > 0) {
      return auditLogs.slice(0, 5);
    }
    return [];
  }, [auditLogs]);

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header & Global Filters (PART 76) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-0.5">
              <span className="text-blue-600">Enterprise Operations</span>
              <span>/</span>
              <span className="text-slate-800">Operational Dashboard (PART 76)</span>
            </nav>
            <h1 className="text-[20px] font-bold text-slate-900 leading-tight">
              Sample Flow Control Tower & Executive Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              รีเฟรชจาก Sheets
            </button>
            <Link
              to="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} /> สร้างคำขอตัวอย่างใหม่
            </Link>
          </div>
        </div>

        {/* Global Filters Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="ค้นหาด่วน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded py-1 pl-8 pr-2 text-[11px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date Preset */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[11px] font-medium"
            >
              <option value="ALL">ช่วงเวลา: ทั้งหมด</option>
              <option value="TODAY">วันนี้ (Today)</option>
              <option value="THIS_WEEK">สัปดาห์นี้</option>
              <option value="THIS_MONTH">เดือนนี้</option>
            </select>

            {/* RD Department */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[11px] font-medium"
            >
              <option value="ALL">แผนก RD: ทั้งหมด</option>
              <option value="RM">Raw Meat (RM)</option>
              <option value="RTC">Ready to Cook (RTC)</option>
              <option value="FURTHER">Further Processing</option>
              <option value="SEASONING">Seasoning / Sauce</option>
            </select>

            {/* Sale */}
            <select
              value={saleFilter}
              onChange={(e) => setSaleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[11px] font-medium"
            >
              <option value="ALL">ฝ่ายขาย: ทั้งหมด</option>
              {salesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Customer */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[11px] font-medium max-w-[150px] truncate"
            >
              <option value="ALL">ลูกค้า: ทั้งหมด</option>
              {customerList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2 text-[11px] font-medium"
            >
              <option value="ALL">สถานะ: ทั้งหมด</option>
              <option value="WAITING_APPROVAL">WAITING_APPROVAL</option>
              <option value="APPROVED">APPROVED</option>
              <option value="READY_TO_DELIVER">READY_TO_DELIVER</option>
              <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>

          {(searchTerm || deptFilter !== 'ALL' || saleFilter !== 'ALL' || customerFilter !== 'ALL' || statusFilter !== 'ALL' || dateRange !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDeptFilter('ALL');
                setSaleFilter('ALL');
                setCustomerFilter('ALL');
                setStatusFilter('ALL');
                setDateRange('ALL');
              }}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 1: Trend Area Chart (Left) + 3 Metric Cards (Right) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Sample Request Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-blue-600" />
                Sample Request Trend (แนวโน้มคำขอตัวอย่างรายวัน)
              </h3>
              <p className="text-[11px] text-slate-500">
                เปรียบเทียบจำนวนคำขอที่สร้างขึ้นใหม่กับคำขอที่จัดส่งสำเร็จ
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> คำขอใหม่ (Requests)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ส่งมอบสำเร็จ (Completed)
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorReq)" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorComp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: 3 Metric Cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-3.5">
          {/* Metric 1: Waiting Approval */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Waiting Approval (รออนุมัติ)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[22px] font-black text-slate-900 font-mono">
                    {waitingApprovalCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    (฿{waitingApprovalValue.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/control-tower" 
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 p-2 rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </Link>
          </div>

          {/* Metric 2: Ready to Deliver */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ready to Deliver (พร้อมจัดส่ง)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[22px] font-black text-blue-700 font-mono">
                    {readyToDeliverCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    (฿{readyToDeliverValue.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/delivery" 
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </Link>
          </div>

          {/* Metric 3: Overdue */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:border-rose-300 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertTriangle size={22} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Overdue SLA (&gt;100%)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[22px] font-black text-rose-600 font-mono">
                    {overdueCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    (฿{overdueValue.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/control-tower" 
              className="text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 2: Process Summary (5 Nodes: Approval, RD, Co Sale, Logistic, Delivery) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" />
              Process Summary & Pipeline Health (สรุปสถานะรายกระบวนการ)
            </h3>
            <p className="text-[11px] text-slate-500">
              สถานะคำขอที่กำลังดำเนินการอยู่ ณ แต่ละขั้นตอนในห่วงโซ่คุณค่า
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Node 1: Approval */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">1. Approval</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {approvalActive} Active
              </span>
            </div>
            <div className="text-[20px] font-black text-slate-900 font-mono">{approvalActive}</div>
            <p className="text-[10px] text-slate-500 mt-1">รอ ผจก. ฝ่ายขาย/RD พิจารณา</p>
          </div>

          {/* Node 2: RD Task */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">2. RD Task</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {rdActive} Active
              </span>
            </div>
            <div className="text-[20px] font-black text-slate-900 font-mono">{rdActive}</div>
            <p className="text-[10px] text-slate-500 mt-1">เตรียมสินค้า & ตัด Lot</p>
          </div>

          {/* Node 3: Co Sale */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">3. Co-Sale</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {coSaleActive} Active
              </span>
            </div>
            <div className="text-[20px] font-black text-slate-900 font-mono">{coSaleActive}</div>
            <p className="text-[10px] text-slate-500 mt-1">ออก Sales Order ใน ERP</p>
          </div>

          {/* Node 4: Logistic Assignment */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">4. Logistic</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {logisticActive} Active
              </span>
            </div>
            <div className="text-[20px] font-black text-slate-900 font-mono">{logisticActive}</div>
            <p className="text-[10px] text-slate-500 mt-1">มอบหมายรถ & สายส่ง</p>
          </div>

          {/* Node 5: Delivery */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase">5. Delivery</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {deliveryActive} Active
              </span>
            </div>
            <div className="text-[20px] font-black text-slate-900 font-mono">{deliveryActive}</div>
            <p className="text-[10px] text-slate-500 mt-1">อยู่ระหว่างจัดส่ง & บันทึก POD</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 3: Delivery Today (Left) | My Tasks (Center) | Latest Activity (Right) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Delivery Today */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <Truck size={16} className="text-emerald-600" />
                Delivery Today (การจัดส่งวันนี้)
              </h3>
              <Link to="/delivery" className="text-blue-600 hover:underline text-[11px] font-bold">
                ดูทั้งหมด
              </Link>
            </div>

            <div className="space-y-2">
              {deliveryTodayList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[11px]">ไม่มีกำหนดจัดส่งวันนี้</div>
              ) : (
                deliveryTodayList.map(req => (
                  <div key={req.sampleNo} className="p-2.5 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100/80 transition-colors text-[11px]">
                    <div className="flex justify-between items-start">
                      <Link to={`/sample/${req.sampleNo}`} className="font-mono font-bold text-blue-600 hover:underline">
                        {req.sampleNo}
                      </Link>
                      <span className="font-mono font-bold text-slate-700">{req.deliveryTimeFrom}</span>
                    </div>
                    <div className="font-semibold text-slate-800 truncate mt-0.5">{req.customerName}</div>
                    <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                      <span>{req.logisticTask?.vehicleNo || 'ยังไม่มอบหมายรถ'}</span>
                      <span className="font-bold text-emerald-700">{req.currentStatus}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <Clock size={16} className="text-amber-600" />
                My Pending Tasks (งานที่ต้องดำเนินการ)
              </h3>
              <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {myPendingTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {myPendingTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-[11px]">ไม่มีงานค้างในระบบ</div>
              ) : (
                myPendingTasks.map((t, idx) => (
                  <Link 
                    key={idx} 
                    to={t.link}
                    className="p-2.5 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100/80 transition-colors block text-[11px]"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900">{t.title}</span>
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                        {t.dept}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                      <span>กำหนด: {t.deadline}</span>
                      <span className="text-rose-600 font-bold">{t.priority}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Latest Activity */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <Activity size={16} className="text-indigo-600" />
                Latest Activity (ความเคลื่อนไหวล่าสุด)
              </h3>
            </div>

            <div className="space-y-2.5">
              {latestActivities.map((act: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] border-b border-slate-100 pb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span className="font-bold text-slate-700">{act.userName || act.user}</span>
                      <span className="font-mono">{act.timestamp || act.time}</span>
                    </div>
                    <div className="text-slate-800 font-medium">{act.details || act.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 4: Latest Sample Requests Table */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Latest Sample Requests (รายการคำขอตัวอย่างล่าสุด)
            </h3>
            <p className="text-[11px] text-slate-500">แสดงผลคำขอที่ได้รับการสร้างหรือปรับปรุงล่าสุด</p>
          </div>
          <Link to="/control-tower" className="text-blue-600 hover:underline text-[12px] font-bold flex items-center gap-1">
            ดูตาราง Control Tower เต็ม <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Sample No</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">RD Dept</th>
                <th className="py-2.5 px-4">Sale</th>
                <th className="py-2.5 px-4">Delivery Date</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.slice(0, 7).map(req => (
                <tr key={req.sampleNo} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono">
                    <Link to={`/sample/${req.sampleNo}`} className="font-bold text-blue-600 hover:underline">
                      {req.sampleNo}
                    </Link>
                    <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                      {req.revision || 'REV.00'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{req.customerName}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-700">{req.department}</td>
                  <td className="py-2.5 px-4 text-slate-600">{req.saleName}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{req.deliveryDate}</td>
                  <td className="py-2.5 px-4">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[10px] font-semibold">
                      {req.currentStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setPdfModalRequest(req)}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="ดู PDF"
                      >
                        <Eye size={14} />
                      </button>
                      <Link
                        to={`/sample/${req.sampleNo}`}
                        className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Modal */}
      {pdfModalRequest && (
        <SamplePDFModal
          request={pdfModalRequest}
          onClose={() => setPdfModalRequest(null)}
        />
      )}
    </div>
  );
}
