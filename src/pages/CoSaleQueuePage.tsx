import React, { useState } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestStatus, SampleRequest, TaskStatus } from '../types';
import { 
  FileSpreadsheet, Search, Filter, CheckCircle2, Clock, 
  AlertTriangle, ArrowRight, Eye, Edit3, Save, X, 
  Building2, User, Truck, Package, ShieldCheck, CheckSquare, 
  ExternalLink, Layers, FileCheck, RefreshCw, Send, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function CoSaleQueuePage() {
  const { requests, updateCoSaleTask, completeCoSaleTask, reportIssue, evaluateGate } = useRequests();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'WAITING_SO' | 'IN_PROGRESS' | 'COMPLETED' | 'ISSUE'>('WAITING_SO');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  
  // Modal / Drawer state
  const [editingRequest, setEditingRequest] = useState<SampleRequest | null>(null);
  const [pdfModalRequest, setPdfModalRequest] = useState<SampleRequest | null>(null);
  const [issueModalRequest, setIssueModalRequest] = useState<SampleRequest | null>(null);
  
  // Form fields for editing SO
  const [soNumber, setSoNumber] = useState('');
  const [soDate, setSoDate] = useState('');
  const [erpStatus, setErpStatus] = useState<'NOT_CREATED' | 'DRAFT' | 'RELEASED' | 'HOLD'>('DRAFT');
  const [documentStatus, setDocumentStatus] = useState<'PENDING' | 'READY'>('PENDING');
  const [remark, setRemark] = useState('');
  
  // Issue form
  const [issueType, setIssueType] = useState('PRICE_DISCREPANCY');
  const [issueDesc, setIssueDesc] = useState('');

  const openEditDrawer = (req: SampleRequest) => {
    setEditingRequest(req);
    setSoNumber(req.coSaleTask?.soNumber || `SO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    setSoDate(req.coSaleTask?.soDate || new Date().toISOString().split('T')[0]);
    setErpStatus(req.coSaleTask?.erpStatus || 'DRAFT');
    setDocumentStatus(req.coSaleTask?.documentStatus || 'PENDING');
    setRemark(req.coSaleTask?.issueRemark || '');
  };

  const handleSaveSO = (asCompleted: boolean = false) => {
    if (!editingRequest) return;
    
    if (asCompleted && !soNumber.trim()) {
      alert('กรุณาระบุเลขที่ SO (Sales Order Number)');
      return;
    }

    if (asCompleted) {
      completeCoSaleTask(editingRequest.sampleNo, {
        soNumber,
        soDate: soDate || new Date().toISOString().split('T')[0],
        erpStatus: erpStatus === 'RELEASED' ? 'RELEASED' : 'RELEASED'
      });
    } else {
      updateCoSaleTask(editingRequest.sampleNo, {
        soNumber,
        soDate,
        erpStatus,
        documentStatus,
        taskStatus: asCompleted ? 'COMPLETED' : 'IN_PROGRESS'
      });
    }

    setEditingRequest(null);
  };

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModalRequest || !issueDesc.trim()) return;

    reportIssue(issueModalRequest.sampleNo, {
      department: 'CO_SALE',
      issueType,
      description: issueDesc,
      reportedBy: user?.name || 'Co-Sale Specialist'
    });

    updateCoSaleTask(issueModalRequest.sampleNo, {
      issueType,
      issueRemark: issueDesc,
      erpStatus: 'HOLD'
    });

    setIssueModalRequest(null);
    setIssueDesc('');
  };

  // Filter requests based on queues (Part 72)
  const approvedRequests = requests.filter(r => 
    ![RequestStatus.DRAFT, RequestStatus.LOGISTIC_PRE_CHECK, RequestStatus.WAITING_APPROVAL, RequestStatus.REJECTED].includes(r.currentStatus)
  );

  const filteredList = approvedRequests.filter(req => {
    const hasOpenIssue = (req.issues || []).some(i => i.department === 'CO_SALE' && i.status === 'OPEN');
    const isCompleted = req.coSaleStatus === 'COMPLETED' || req.coSaleTask?.taskStatus === 'COMPLETED';
    const isInProgress = (req.coSaleTask?.soNumber || req.coSaleTask?.erpStatus === 'DRAFT') && !isCompleted;
    const isWaiting = !req.coSaleTask?.soNumber && !isCompleted;

    if (activeTab === 'WAITING_SO') {
      if (isCompleted || hasOpenIssue) return false;
      if (req.coSaleTask?.soNumber && req.coSaleTask?.erpStatus === 'RELEASED') return false;
    } else if (activeTab === 'IN_PROGRESS') {
      if (isCompleted || hasOpenIssue) return false;
      if (!req.coSaleTask?.soNumber && req.coSaleStatus !== 'IN_PROGRESS') return false;
    } else if (activeTab === 'COMPLETED') {
      if (!isCompleted) return false;
    } else if (activeTab === 'ISSUE') {
      if (!hasOpenIssue && req.coSaleTask?.erpStatus !== 'HOLD') return false;
    }

    if (selectedDept !== 'ALL' && req.department !== selectedDept) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        req.sampleNo.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        (req.coSaleTask?.soNumber || '').toLowerCase().includes(q) ||
        req.saleName.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Tab counts
  const countWaiting = approvedRequests.filter(r => !r.coSaleTask?.soNumber && r.coSaleStatus !== 'COMPLETED' && !(r.issues || []).some(i => i.department === 'CO_SALE' && i.status === 'OPEN')).length;
  const countInProgress = approvedRequests.filter(r => r.coSaleTask?.soNumber && r.coSaleStatus !== 'COMPLETED' && !(r.issues || []).some(i => i.department === 'CO_SALE' && i.status === 'OPEN')).length;
  const countCompleted = approvedRequests.filter(r => r.coSaleStatus === 'COMPLETED' || r.coSaleTask?.taskStatus === 'COMPLETED').length;
  const countIssue = approvedRequests.filter(r => (r.issues || []).some(i => i.department === 'CO_SALE' && i.status === 'OPEN') || r.coSaleTask?.erpStatus === 'HOLD').length;

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Operations</Link>
            <span>/</span>
            <span className="text-slate-800">Co-Sale Management (PART 72)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Co-Sale Work Queue & Sales Order Management
              </h1>
              <p className="text-[12px] text-slate-500">
                จัดการสร้าง Sales Order (SO) ในระบบ ERP, จัดการเอกสารประกอบ, และปลดล็อก Gate สำหรับการจัดส่ง
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-[11px] font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-600">Parallel Gate:</span>
            <span className="font-bold text-blue-700">RD + SO + Logistic</span>
          </div>
        </div>
      </div>

      {/* Queue Selection Tabs (PART 72) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('WAITING_SO')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'WAITING_SO'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock size={15} />
            <span>Waiting SO (รอออก SO)</span>
            <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countWaiting}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'IN_PROGRESS'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 size={15} />
            <span>In Progress (กำลังดำเนินการ)</span>
            <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countInProgress}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'COMPLETED'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Completed (ออก SO แล้ว)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countCompleted}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ISSUE')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ISSUE'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={15} />
            <span>Issue (มีปัญหาติดขัด)</span>
            {countIssue > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {countIssue}
              </span>
            )}
          </button>
        </div>

        {/* Search & Dept Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="ค้นหา Sample No, ลูกค้า, SO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded py-1.5 pl-9 pr-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
          >
            <option value="ALL">ทุกแผนก RD</option>
            <option value="RM">Raw Meat (RM)</option>
            <option value="RTC">Ready to Cook (RTC)</option>
            <option value="FURTHER">Further Processing</option>
            <option value="SEASONING">Seasoning / Sauce</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Sample No & Rev</th>
                <th className="py-3 px-4">Customer & Ship-To</th>
                <th className="py-3 px-4">Items & Qty</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">SO Info (ERP)</th>
                <th className="py-3 px-4">Delivery Window</th>
                <th className="py-3 px-4">Gate Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">ไม่มีรายการในคิวนี้</p>
                    <p className="text-[11px]">รายการที่ได้รับการอนุมัติจะปรากฏในคิวนี้โดยอัตโนมัติ</p>
                  </td>
                </tr>
              ) : (
                filteredList.map(req => {
                  const gate = evaluateGate(req.sampleNo);
                  const totalKg = req.lines.reduce((s, l) => s + (l.requestQty || 0), 0);
                  const hasOpenIssue = (req.issues || []).some(i => i.department === 'CO_SALE' && i.status === 'OPEN');
                  
                  return (
                    <tr key={req.sampleNo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <Link 
                          to={`/sample/${req.sampleNo}`} 
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          {req.sampleNo}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded text-[10px]">
                            {req.revision || 'REV.00'}
                          </span>
                          <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                            {req.department}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 leading-tight">{req.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>Ship-To:</span>
                          <span className="font-mono font-semibold text-slate-700">{req.shipToCode || req.customerCode}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{req.lines.length} SKU ({totalKg.toLocaleString()} KG)</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {req.lines[0]?.productName} {req.lines.length > 1 ? `+${req.lines.length - 1} more` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">฿{req.totalValue.toLocaleString()}</div>
                        <span className="text-[10px] text-slate-500">{req.sampleType}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {req.coSaleTask?.soNumber ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {req.coSaleTask.soNumber}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <span>ERP:</span>
                              <span className="font-bold text-slate-700">{req.coSaleTask.erpStatus || 'RELEASED'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium text-[11px] flex items-center gap-1 w-fit">
                            <Clock size={11} /> รอระบุเลข SO
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{req.deliveryDate}</div>
                        <div className="text-[11px] text-slate-500">{req.deliveryTimeFrom} - {req.deliveryTimeTo}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${gate.criteria.soCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {gate.criteria.soCompleted ? 'SO Ready' : 'SO Pending'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Gate: {gate.isReady ? '✅ Ready' : '⏳ Waiting'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditDrawer(req)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                            title="จัดการ SO"
                          >
                            <Edit3 size={12} />
                            <span>{req.coSaleTask?.soNumber ? 'แก้ไข SO' : 'ออก SO'}</span>
                          </button>

                          <button
                            onClick={() => setPdfModalRequest(req)}
                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded border border-slate-200 transition-colors"
                            title="ดูเอกสารใบขอตัวอย่าง (PDF)"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => setIssueModalRequest(req)}
                            className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded border border-slate-200 transition-colors"
                            title="แจ้งปัญหา Co-Sale"
                          >
                            <AlertTriangle size={14} />
                          </button>
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

      {/* Edit / Issue SO Drawer / Modal (PART 72) */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-amber-400" size={18} />
                <h3 className="font-bold text-[14px]">
                  บันทึกข้อมูล Sales Order (SO) — {editingRequest.sampleNo}
                </h3>
              </div>
              <button 
                onClick={() => setEditingRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Request Summary Card (PART 72 Detail) */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[12px] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">ลูกค้า (Customer):</span>
                    <span className="font-bold text-slate-800">{editingRequest.customerName} ({editingRequest.customerCode})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">สถานที่ส่ง (Ship-To):</span>
                    <span className="font-bold text-slate-800">{editingRequest.shipToCode || editingRequest.customerCode}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block">จำนวนรวม (Qty):</span>
                    <span className="font-bold text-slate-800">
                      {editingRequest.lines.reduce((s, l) => s + (l.requestQty || 0), 0)} KG
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">มูลค่ารวม (Total Value):</span>
                    <span className="font-bold text-emerald-700">฿{editingRequest.totalValue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">กำหนดส่ง (Delivery):</span>
                    <span className="font-bold text-slate-800">{editingRequest.deliveryDate} ({editingRequest.deliveryTimeFrom})</span>
                  </div>
                </div>
              </div>

              {/* Items Table in Modal */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2">รหัสสินค้า</th>
                      <th className="p-2">ชื่อสินค้า</th>
                      <th className="p-2 text-right">จำนวน</th>
                      <th className="p-2 text-right">ราคา/หน่วย</th>
                      <th className="p-2 text-right">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editingRequest.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono font-bold text-slate-700">{line.itemCode}</td>
                        <td className="p-2 text-slate-800">{line.productName}</td>
                        <td className="p-2 text-right font-mono font-bold">{line.requestQty} {line.uom}</td>
                        <td className="p-2 text-right font-mono">฿{(line.price || 0).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">฿{(line.value || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Editable Fields (PART 72) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SO Number (เลขที่ Sales Order ใน ERP) *
                  </label>
                  <input
                    type="text"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    placeholder="เช่น SO-2026-09411"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SO Date (วันที่ออกเอกสาร)
                  </label>
                  <input
                    type="date"
                    value={soDate}
                    onChange={(e) => setSoDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ERP Status (สถานะใน ERP)
                  </label>
                  <select
                    value={erpStatus}
                    onChange={(e) => setErpStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="DRAFT">DRAFT (ฉบับร่าง)</option>
                    <option value="RELEASED">RELEASED (อนุมัติเปิด SO เรียบร้อย)</option>
                    <option value="HOLD">HOLD (ติดเงื่อนไข / ระงับชั่วคราว)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Required Documents (เอกสารแนบที่ต้องใช้)
                  </label>
                  <select
                    value={documentStatus}
                    onChange={(e) => setDocumentStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="READY">READY (เตรียมเอกสารครบแล้ว)</option>
                    <option value="PENDING">PENDING (กำลังเตรียมเอกสาร)</option>
                  </select>
                </div>
              </div>

              {/* Ready to Deliver Gate Explanation */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[11px] text-blue-900 flex items-start gap-2">
                <CheckSquare className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold block">Ready to Deliver Gate Validation:</span>
                  <span>เมื่อกด <strong>"บันทึกและปลดล็อกเป็น Completed"</strong> ระบบจะเรียกใช้ฟังก์ชัน <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">checkReadyToDeliverGate()</code> ทันที หากแผนก RD และ Logistic พร้อมแล้ว สถานะจะปรับเป็น <strong>READY TO DELIVER</strong> โดยอัตโนมัติ</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-medium text-slate-700 hover:bg-white"
              >
                ยกเลิก
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveSO(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[12px] font-bold transition-colors"
                >
                  บันทึกแบบร่าง (Save Draft)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSO(true)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[12px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> บันทึกและปลดล็อกเป็น Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {issueModalRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReportIssue} className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="bg-rose-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-[14px]">แจ้งปัญหา Co-Sale — {issueModalRequest.sampleNo}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIssueModalRequest(null)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-[12px]">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ประเภทปัญหา (Issue Type)</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="PRICE_DISCREPANCY">ราคาในใบคำขอไม่ตรงกับ Master Price</option>
                  <option value="STOCK_UNAVAILABLE">สต็อกสินค้าไม่พอสำหรับตัดยอด SO</option>
                  <option value="CUSTOMER_CREDIT_HOLD">ลูกค้ารายนี้ติดสถานะ Credit Hold ใน ERP</option>
                  <option value="SHIPTO_NOT_FOUND">ไม่พบรหัส Ship-To ในฐานข้อมูล ERP</option>
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดปัญหาและข้อเสนอแนะ *</label>
                <textarea
                  rows={4}
                  required
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="ระบุข้อความแจ้งเตือนถึงฝ่ายขายและทีมงานที่เกี่ยวข้อง..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIssueModalRequest(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-medium text-slate-700 hover:bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[12px] font-bold transition-colors flex items-center gap-1"
              >
                <Send size={13} /> ส่งรายงานปัญหา
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official PDF Document Modal */}
      {pdfModalRequest && (
        <SamplePDFModal 
          request={pdfModalRequest} 
          onClose={() => setPdfModalRequest(null)} 
        />
      )}
    </div>
  );
}
