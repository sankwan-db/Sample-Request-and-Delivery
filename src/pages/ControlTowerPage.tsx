import React, { useState, useMemo } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestStatus, SampleRequest, calculateSLATier } from '../types';
import { 
  Compass, Search, Filter, AlertTriangle, CheckCircle2, 
  Clock, ArrowRight, Eye, ShieldCheck, Layers, RefreshCw, 
  ChevronRight, ExternalLink, Calendar, User, Truck, 
  FileSpreadsheet, Package, CheckSquare, X
} from 'lucide-react';
import { Link } from 'react-router';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function ControlTowerPage() {
  const { requests, evaluateGate, refreshSequences } = useRequests();
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSla, setSelectedSla] = useState('ALL');
  const [pdfModalRequest, setPdfModalRequest] = useState<SampleRequest | null>(null);
  const [activeDrawerReq, setActiveDrawerReq] = useState<SampleRequest | null>(null);

  // Filter logic
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (selectedDept !== 'ALL' && req.department !== selectedDept) return false;
      if (selectedPriority !== 'ALL' && req.priority !== selectedPriority) return false;
      if (selectedStatus !== 'ALL' && req.currentStatus !== selectedStatus) return false;

      // SLA calculation (Part 79)
      const isCompleted = req.currentStatus === RequestStatus.COMPLETED;
      const slaResult = calculateSLATier(req.createdTimestamp, req.deliveryDate, isCompleted);
      if (selectedSla !== 'ALL' && slaResult.tier !== selectedSla) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          req.sampleNo.toLowerCase().includes(q) ||
          req.customerName.toLowerCase().includes(q) ||
          req.saleName.toLowerCase().includes(q) ||
          (req.coSaleTask?.soNumber || '').toLowerCase().includes(q) ||
          (req.logisticTask?.driverName || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [requests, selectedDept, selectedPriority, selectedStatus, selectedSla, searchTerm]);

  // Priority color
  const getPriorityBadge = (priority: string) => {
    if (priority === 'URGENT') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (priority === 'HIGH') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Calculate overall progress percentage
  const calculateProgress = (req: SampleRequest): number => {
    if (req.currentStatus === RequestStatus.COMPLETED) return 100;
    if (req.currentStatus === RequestStatus.DELIVERED || req.currentStatus === RequestStatus.CUSTOMER_RECEIVED) return 90;
    if (req.currentStatus === RequestStatus.ARRIVED) return 80;
    if (req.currentStatus === RequestStatus.OUT_FOR_DELIVERY) return 70;
    if (req.currentStatus === RequestStatus.PICKED_UP) return 60;
    if (req.currentStatus === RequestStatus.READY_TO_DELIVER) return 50;

    let pts = 10;
    if (req.currentStatus === RequestStatus.WAITING_APPROVAL) pts = 20;
    if (![RequestStatus.DRAFT, RequestStatus.LOGISTIC_PRE_CHECK, RequestStatus.WAITING_APPROVAL, RequestStatus.REJECTED].includes(req.currentStatus)) {
      pts = 25;
      if (req.rdStatus === 'COMPLETED') pts += 10;
      if (req.coSaleStatus === 'COMPLETED') pts += 8;
      if (req.logisticStatus === 'COMPLETED') pts += 7;
    }
    return pts;
  };

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <span className="text-slate-800">Operational Control Tower (PART 77)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Compass size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Enterprise Sample Request Control Tower
              </h1>
              <p className="text-[12px] text-slate-500">
                มุมมองภาพรวมแบบ Real-Time ติดตามสถานะงานคู่ขนาน (RD, SO, Logistic), Progress, SLA, และการแจ้งเตือนปัญหา (Issue)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            รีเฟรชข้อมูล
          </button>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-[11px] flex items-center gap-3">
            <span className="text-slate-500">Total Filtered:</span>
            <span className="font-bold text-indigo-700 text-[13px]">{filteredRequests.length} Requests</span>
          </div>
        </div>
      </div>

      {/* Filter Bar (Part 77) */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-[12px]">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="ค้นหา Sample No, ลูกค้า, Sale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded py-1.5 pl-9 pr-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-2.5 text-[12px] font-medium"
          >
            <option value="ALL">ทุกแผนก (RD Dept)</option>
            <option value="RM">Raw Meat (RM)</option>
            <option value="RTC">Ready to Cook (RTC)</option>
            <option value="FURTHER">Further Processing</option>
            <option value="SEASONING">Seasoning / Sauce</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-2.5 text-[12px] font-medium"
          >
            <option value="ALL">ทุก Priority</option>
            <option value="URGENT">🔴 URGENT</option>
            <option value="HIGH">🟡 HIGH</option>
            <option value="NORMAL">⚪ NORMAL</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-2.5 text-[12px] font-medium"
          >
            <option value="ALL">ทุกสถานะ (Status)</option>
            <option value="WAITING_APPROVAL">WAITING_APPROVAL</option>
            <option value="APPROVED">APPROVED (Parallel Queue)</option>
            <option value="READY_TO_DELIVER">READY_TO_DELIVER</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            value={selectedSla}
            onChange={(e) => setSelectedSla(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-2.5 text-[12px] font-medium"
          >
            <option value="ALL">ทุกเกณฑ์ SLA</option>
            <option value="NORMAL">🟢 Normal (&lt;80%)</option>
            <option value="AT_RISK">🟡 At Risk (≥80%)</option>
            <option value="OVERDUE">🔴 Overdue (&gt;100%)</option>
            <option value="ESCALATION">🟣 Escalation (&gt;150%)</option>
          </select>
        </div>

        {(searchTerm || selectedDept !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL' || selectedSla !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDept('ALL');
              setSelectedPriority('ALL');
              setSelectedStatus('ALL');
              setSelectedSla('ALL');
            }}
            className="text-slate-500 hover:text-slate-800 text-[11px] underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Control Tower Table (PART 77 Specification) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-900 text-white uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Sample No</th>
                <th className="py-3 px-3">Rev</th>
                <th className="py-3 px-3">RD Dept</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Sale</th>
                <th className="py-3 px-3">Delivery</th>
                <th className="py-3 px-3">Current Process</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-2 text-center">RD</th>
                <th className="py-3 px-2 text-center">SO</th>
                <th className="py-3 px-2 text-center">Logistic</th>
                <th className="py-3 px-3">Progress</th>
                <th className="py-3 px-3">SLA</th>
                <th className="py-3 px-2 text-center">Issue</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    <Compass size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">ไม่พบข้อมูลตามเงื่อนไข</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isCompleted = req.currentStatus === RequestStatus.COMPLETED;
                  const slaResult = calculateSLATier(req.createdTimestamp, req.deliveryDate, isCompleted);
                  const progress = calculateProgress(req);
                  const openIssues = (req.issues || []).filter(i => i.status === 'OPEN');
                  const gate = evaluateGate(req.sampleNo);

                  return (
                    <tr 
                      key={req.sampleNo} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setActiveDrawerReq(req)}
                    >
                      {/* Priority */}
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded font-bold border text-[9px] ${getPriorityBadge(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>

                      {/* Sample No */}
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 hover:underline">
                        <Link to={`/sample/${req.sampleNo}`} onClick={(e) => e.stopPropagation()}>
                          {req.sampleNo}
                        </Link>
                      </td>

                      {/* Revision */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                        {req.revision || 'REV.00'}
                      </td>

                      {/* RD Dept */}
                      <td className="py-2.5 px-3 font-bold text-slate-700">
                        {req.department}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[150px] truncate" title={req.customerName}>
                        {req.customerName}
                      </td>

                      {/* Sale */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {req.saleName.split(' ')[0]}
                      </td>

                      {/* Delivery */}
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {req.deliveryDate}
                      </td>

                      {/* Current Process */}
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold block truncate max-w-[120px]">
                          {req.currentStatus}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[110px]" title={req.currentOwner}>
                        {req.currentOwner}
                      </td>

                      {/* Parallel RD Status */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          req.rdStatus === 'COMPLETED' ? 'bg-emerald-500' : req.rdStatus === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'
                        }`} title={`RD: ${req.rdStatus}`} />
                      </td>

                      {/* Parallel SO Status */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          req.coSaleStatus === 'COMPLETED' ? 'bg-emerald-500' : req.coSaleStatus === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'
                        }`} title={`SO: ${req.coSaleStatus}`} />
                      </td>

                      {/* Parallel Logistic Status */}
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          req.logisticStatus === 'COMPLETED' ? 'bg-emerald-500' : req.logisticStatus === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'
                        }`} title={`Logistic: ${req.logisticStatus}`} />
                      </td>

                      {/* Progress */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-700">{progress}%</span>
                        </div>
                      </td>

                      {/* SLA Tier */}
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          slaResult.tier === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : slaResult.tier === 'AT_RISK'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : slaResult.tier === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {slaResult.tier}
                        </span>
                      </td>

                      {/* Issues */}
                      <td className="py-2.5 px-2 text-center">
                        {openIssues.length > 0 ? (
                          <span className="bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                            {openIssues.length}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPdfModalRequest(req)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="ดูใบขอตัวอย่าง (PDF)"
                          >
                            <Eye size={13} />
                          </button>
                          <Link
                            to={`/sample/${req.sampleNo}`}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="เปิดหน้ารายละเอียด"
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Drawer / Detail Inspector */}
      {activeDrawerReq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-slideInRight">
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    SAMPLE INSPECTOR
                  </span>
                  <h3 className="text-[16px] font-mono font-bold text-slate-900">
                    {activeDrawerReq.sampleNo} <span className="text-blue-600">{activeDrawerReq.revision}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDrawerReq(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status & Gate */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[12px] space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานะปัจจุบัน:</span>
                  <span className="font-bold text-slate-800">{activeDrawerReq.currentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้รับผิดชอบ (Owner):</span>
                  <span className="font-medium text-slate-700">{activeDrawerReq.currentOwner}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Ready to Deliver Gate:</span>
                  <span className="font-bold text-emerald-700">
                    {evaluateGate(activeDrawerReq.sampleNo).isReady ? '✅ ผ่านเกณฑ์ครบถ้วน' : '⏳ รอเงื่อนไขงานคู่ขนาน'}
                  </span>
                </div>
              </div>

              {/* Parallel 3 Pillars Status */}
              <div className="space-y-2 text-[12px]">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Parallel Execution Pillars (เสาหลักงานคู่ขนาน)
                </h4>

                <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded flex justify-between items-center">
                  <div>
                    <span className="font-bold text-blue-900 block">1. RD Task (เตรียมตัวอย่าง):</span>
                    <span className="text-[11px] text-blue-700">{activeDrawerReq.rdTasks?.[0]?.lot || 'รอตัด Lot'}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-blue-800 border border-blue-200">
                    {activeDrawerReq.rdStatus}
                  </span>
                </div>

                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-900 block">2. Co-Sale Task (ออก Sales Order):</span>
                    <span className="text-[11px] text-amber-700">{activeDrawerReq.coSaleTask?.soNumber || 'รอออก SO'}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-amber-800 border border-amber-200">
                    {activeDrawerReq.coSaleStatus}
                  </span>
                </div>

                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-900 block">3. Logistic Task (มอบหมายรถ & คนขับ):</span>
                    <span className="text-[11px] text-emerald-700">{activeDrawerReq.logisticTask?.vehicleNo || 'รอมอบหมายรถ'}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                    {activeDrawerReq.logisticStatus}
                  </span>
                </div>
              </div>

              {/* Products preview */}
              <div className="border border-slate-200 rounded p-3 text-[11px]">
                <span className="font-bold text-slate-700 block mb-1">รายการสินค้า ({activeDrawerReq.lines.length} SKUs):</span>
                <ul className="divide-y divide-slate-100">
                  {activeDrawerReq.lines.map((l, i) => (
                    <li key={i} className="py-1 flex justify-between">
                      <span className="truncate max-w-[200px]">{l.productName}</span>
                      <span className="font-mono font-bold">{l.requestQty} {l.uom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setPdfModalRequest(activeDrawerReq)}
                className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
              >
                <Eye size={14} /> PDF
              </button>

              <Link
                to={`/sample/${activeDrawerReq.sampleNo}`}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-bold flex items-center gap-1 shadow-sm"
              >
                เปิดหน้ารายละเอียดเต็ม <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

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
