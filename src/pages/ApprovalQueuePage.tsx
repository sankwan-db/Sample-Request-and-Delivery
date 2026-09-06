import React, { useState } from 'react';
import { 
  CheckSquare, CheckCircle2, XCircle, AlertTriangle, Clock, 
  Search, Filter, ArrowRight, Check, Eye, Mail, FileText, 
  FileCheck, ShieldAlert, Thermometer, Weight, Building2, 
  Phone, User, Layers, Calendar, DollarSign, ExternalLink,
  History, Download, FileSpreadsheet, Lock, RefreshCw, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { SampleRequest, RequestStatus } from '../types';

export function ApprovalQueuePage() {
  const { requests, approveRequest, rejectRequest, requestRevision, refreshSequences } = useRequests();
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [filterTab, setFilterTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [selectedSample, setSelectedSample] = useState<SampleRequest | null>(null);

  // Action Modals State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionSections, setRevisionSections] = useState('Product Quantities & Specifications');
  const [revisionRemark, setRevisionRemark] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<{ type: string; sampleNo: string; message: string } | null>(null);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (filterTab === 'PENDING') {
      return req.currentStatus === RequestStatus.WAITING_APPROVAL || req.currentStatus === RequestStatus.LOGISTIC_PRE_CHECK;
    }
    if (filterTab === 'APPROVED') {
      return req.currentStatus === RequestStatus.PROCESSING || req.currentStatus === RequestStatus.COMPLETED || req.isLocked;
    }
    return true;
  }).filter(req => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      req.sampleNo.toLowerCase().includes(q) ||
      req.customerName.toLowerCase().includes(q) ||
      req.saleName.toLowerCase().includes(q) ||
      (req.department && req.department.toLowerCase().includes(q))
    );
  });

  // Metric counts
  const pendingApprovals = requests.filter(r => r.currentStatus === RequestStatus.WAITING_APPROVAL).length;
  const approvedTotal = requests.filter(r => r.isLocked || r.currentStatus === RequestStatus.PROCESSING || r.currentStatus === RequestStatus.COMPLETED).length;
  const revisionCount = requests.filter(r => r.currentStatus === RequestStatus.REVISION_REQUIRED).length;
  const totalValuePending = requests
    .filter(r => r.currentStatus === RequestStatus.WAITING_APPROVAL)
    .reduce((sum, req) => sum + req.lines.reduce((s, l) => s + (l.lineValue || ((l.weight || l.requestQty || 0) * (l.unitPrice || 0))), 0), 0);

  // Historical sample data for customer
  const getCustomerHistory = (customerCode: string, currentSampleNo: string) => {
    return requests.filter(r => r.customerCode === customerCode && r.sampleNo !== currentSampleNo);
  };

  // 🟢 PART 62 APPROVAL ACTION
  const handleApprove = async () => {
    if (!selectedSample) return;
    setIsProcessing(true);
    try {
      await approveRequest(
        selectedSample.sampleNo,
        user?.name || 'Sale Manager',
        user?.email || 'salemanager@company.com'
      );

      setActionSuccess({
        type: 'APPROVED',
        sampleNo: selectedSample.sampleNo,
        message: 'อนุมัติคำขอสำเร็จ! ระบบได้ล็อค Snapshot, สร้าง Official PDF, บันทึกลง Drive, ลงทะเบียน Document Register, แตกงานให้ RD/Co-Sale/Logistic และส่ง Auto Email เรียบร้อยแล้ว'
      });
      setSelectedSample(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔴 REJECT ACTION
  const handleReject = async () => {
    if (!selectedSample) return;
    if (!rejectReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธคำขอ');
      return;
    }

    setIsProcessing(true);
    try {
      await rejectRequest(
        selectedSample.sampleNo,
        rejectReason.trim(),
        user?.name || 'Sale Manager',
        user?.email || 'salemanager@company.com'
      );

      setActionSuccess({
        type: 'REJECTED',
        sampleNo: selectedSample.sampleNo,
        message: 'ปฏิเสธคำขอตัวอย่างและส่งแจ้งเตือนทางอีเมลให้พนักงานขายแล้ว'
      });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedSample(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการปฏิเสธ: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🟡 REQUEST REVISION ACTION
  const handleRequestRevision = async () => {
    if (!selectedSample) return;
    if (!revisionRemark.trim()) {
      alert('กรุณาระบุรายละเอียดข้อคิดเห็นที่ต้องการให้แก้ไข');
      return;
    }

    setIsProcessing(true);
    try {
      await requestRevision(
        selectedSample.sampleNo,
        revisionSections,
        revisionRemark.trim(),
        user?.name || 'Sale Manager',
        user?.email || 'salemanager@company.com'
      );

      setActionSuccess({
        type: 'REVISION',
        sampleNo: selectedSample.sampleNo,
        message: `ส่งคำขอแก้ไข (Revision) ให้พนักงานขายแล้ว พร้อมปรับ Revision และส่งอีเมลแจ้งเตือน`
      });
      setShowRevisionModal(false);
      setRevisionRemark('');
      setSelectedSample(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการร้องขอแก้ไข: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full text-[var(--color-text-primary)]">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 shrink-0">
        <div>
          <nav className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-[var(--color-primary-blue)] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="hover:text-[var(--color-primary-blue)] transition-colors">Approval</span>
            <span>/</span>
            <span className="text-[var(--color-text-primary)]">Manager Approval Queue</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight flex items-center gap-2">
              <CheckSquare className="text-emerald-700" size={22} />
              Sample Approval Queue (PART 61 & 62)
            </h1>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
              <Lock size={11} /> 11-Step Auto-Dispatch Workflow
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            รีเฟรชข้อมูล
          </button>
          <Link
            to="/logistic/check"
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>ไปที่ Logistic Pre-Check</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-md flex items-start justify-between text-emerald-950 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <div className="font-bold font-mono text-sm text-emerald-900">{actionSuccess.sampleNo}</div>
              <p className="mt-0.5 leading-relaxed">{actionSuccess.message}</p>
            </div>
          </div>
          <button 
            onClick={() => setActionSuccess(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded bg-emerald-100 shrink-0 ml-3"
          >
            ปิด
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">รออนุมัติ (Pending)</span>
            <span className="text-2xl font-mono font-bold text-amber-600">{pendingApprovals}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">คำขอที่ผ่าน Pre-check แล้ว</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">มูลค่ารออนุมัติ (Value)</span>
            <span className="text-2xl font-mono font-bold text-blue-900">฿{totalValuePending.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">รวมทุกรายการที่รอการอนุมัติ</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">อนุมัติแล้ว (Approved)</span>
            <span className="text-2xl font-mono font-bold text-emerald-600">{approvedTotal}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">กำลังเตรียมและส่งมอบ</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">รอการแก้ไข (Revision)</span>
            <span className="text-2xl font-mono font-bold text-indigo-600">{revisionCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">ส่งกลับให้ Sale ปรับปรุง</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <History size={18} />
          </div>
        </div>
      </div>

      {/* Main Queue Table Card */}
      <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm flex flex-col">
        {/* Filter & Search Bar */}
        <div className="p-3 border-b border-[var(--color-border-light)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-bold text-slate-800 text-[13px] mr-2">รายการคำขอรอพิจารณา</span>
            <div className="flex rounded-sm border border-slate-200 overflow-hidden text-[11px]">
              <button 
                onClick={() => setFilterTab('PENDING')}
                className={`px-3 py-1 font-bold border-r border-slate-200 transition-colors ${
                  filterTab === 'PENDING' ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                รออนุมัติ ({pendingApprovals})
              </button>
              <button 
                onClick={() => setFilterTab('APPROVED')}
                className={`px-3 py-1 font-bold border-r border-slate-200 transition-colors ${
                  filterTab === 'APPROVED' ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                อนุมัติแล้ว ({approvedTotal})
              </button>
              <button 
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1 font-bold transition-colors ${
                  filterTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({requests.length})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ลูกค้า, Sale, แผนก RD..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-sm py-1 pl-8 pr-3 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Sample No / Rev</th>
                <th className="py-2.5 px-3">RD Dept & Purpose</th>
                <th className="py-2.5 px-3">Customer & Channel</th>
                <th className="py-2.5 px-3">Sale Owner</th>
                <th className="py-2.5 px-3">Delivery Date</th>
                <th className="py-2.5 px-3">Logistic Check</th>
                <th className="py-2.5 px-3">Total (฿ / KG)</th>
                <th className="py-2.5 px-3 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const totalKg = req.lines.reduce((s, l) => s + (l.weight || l.requestQty || 0), 0);
                  const totalVal = req.lines.reduce((s, l) => s + (l.lineValue || ((l.weight || l.requestQty || 0) * (l.unitPrice || 0))), 0);
                  const isApproved = req.isLocked || req.currentStatus === RequestStatus.PROCESSING || req.currentStatus === RequestStatus.COMPLETED;
                  const feas = req.logisticTask?.feasibility || 'PENDING';

                  return (
                    <tr key={req.sampleNo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 align-top">
                        <div className="font-mono font-bold text-blue-900 flex items-center gap-1.5">
                          {req.sampleNo}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-semibold border border-indigo-200">
                            {req.revision || 'REV.00'}
                          </span>
                          {req.isLocked && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold border border-emerald-200 flex items-center gap-0.5">
                              <Lock size={9} /> LOCKED
                            </span>
                          )}
                          {req.priority === 'URGENT' && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">URGENT</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top max-w-[180px]">
                        <div className="font-bold text-slate-800">
                          {req.department || 'RD Division'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={req.samplePurpose || req.sampleType}>
                          {req.samplePurpose || req.sampleType}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top max-w-[200px]">
                        <div className="font-bold text-slate-900 truncate" title={req.customerName}>
                          {req.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {req.customerGroup || req.salesChannel || req.customerCode}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-800">
                          {req.saleName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {req.createdTimestamp ? req.createdTimestamp.split(' ')[0] : '-'}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Calendar size={11} className="text-blue-600" />
                          {req.deliveryDate}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {req.deliveryTimeFrom} - {req.deliveryTimeTo}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        {feas === 'Available' || feas === 'FEASIBLE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 size={11} /> Feasible
                          </span>
                        ) : feas === 'Available with Change' || feas === 'ALTERNATIVE_PROPOSED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
                            <AlertTriangle size={11} /> With Change
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {req.route}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="font-mono font-bold text-slate-900">
                          ฿{totalVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {totalKg.toFixed(2)} KG ({req.lines.length} รายการ)
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSample(req)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CheckSquare size={12} />
                            <span>พิจารณาอนุมัติ</span>
                          </button>
                          <Link
                            to={`/sample/${req.sampleNo}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] p-1.5 rounded-sm transition-colors"
                            title="ดูรายละเอียดคำขอเต็ม"
                          >
                            <Eye size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    ไม่พบคำขอในคิวอนุมัติ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Modal: PART 61 APPROVAL DETAIL (READ-ONLY) & PART 62 APPROVAL ACTIONS */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-md max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <CheckSquare size={13} />
                  PART 61 — APPROVAL DETAIL REVIEW (READ-ONLY)
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {selectedSample.sampleNo}
                  </h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold border border-indigo-200">
                    {selectedSample.revision || 'REV.00'}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold border border-slate-200">
                    {selectedSample.department || 'RD Department'}
                  </span>
                  {selectedSample.isLocked && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                      <Lock size={10} /> APPROVED & LOCKED SNAPSHOT
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedSample(null)} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4 text-xs">
              {/* Row 1: Key Metadata Grid (Customer, Sale, Purpose, Delivery) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Customer */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer (ลูกค้า)</span>
                  <div className="font-bold text-slate-900 truncate" title={selectedSample.customerName}>
                    {selectedSample.customerName}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {selectedSample.customerCode} • {selectedSample.customerGroup || 'General'}
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                    ผู้ติดต่อ: {selectedSample.contactName || '-'} ({selectedSample.contactPhone || '-'})
                  </div>
                </div>

                {/* 2. Sale */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Sale Owner (ผู้ขอ)</span>
                  <div className="font-bold text-slate-900">{selectedSample.saleName}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{selectedSample.saleEmail}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    วันที่สร้าง: {selectedSample.createdTimestamp || '-'}
                  </div>
                </div>

                {/* 3. Purpose */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Purpose & Type (วัตถุประสงค์)</span>
                  <div className="font-bold text-slate-900">{selectedSample.sampleType}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5 truncate" title={selectedSample.samplePurpose}>
                    {selectedSample.samplePurpose || '-'}
                  </div>
                  <div className="text-[10px] font-bold text-red-600 mt-0.5">
                    Priority: {selectedSample.priority || 'NORMAL'}
                  </div>
                </div>

                {/* 4. Delivery */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivery (กำหนดส่งมอบ)</span>
                  <div className="font-bold text-blue-900 flex items-center gap-1">
                    <Calendar size={12} />
                    {selectedSample.deliveryDate}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {selectedSample.deliveryTimeFrom} - {selectedSample.deliveryTimeTo} น.
                  </div>
                  <div className="text-red-600 font-semibold text-[10px] mt-0.5 flex items-center gap-1">
                    <Thermometer size={10} />
                    {selectedSample.temperature}
                  </div>
                </div>
              </div>

              {/* Logistic Check Results Banner */}
              <div className="bg-blue-50/60 border border-blue-200 p-3 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                    ผลการตรวจสอบโลจิสติกส์:
                  </span>
                  {selectedSample.logisticTask?.feasibility === 'Available' || selectedSample.logisticTask?.feasibility === 'FEASIBLE' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Available (พร้อมจัดส่งตามเงื่อนไขปกติ)
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-300 flex items-center gap-1">
                      <AlertTriangle size={11} /> Available with Change
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600">
                  สายส่ง: <span className="font-bold text-slate-900">{selectedSample.route}</span> | ผู้ตรวจ: <span className="font-semibold text-slate-900">{selectedSample.logisticTask?.precheckBy || 'Logistic Specialist'}</span>
                </div>
              </div>

              {/* Products Table (PART 55 & 61) */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between items-center">
                  <span>รายการสินค้าตัวอย่าง (Product Lines)</span>
                  <span className="font-mono text-slate-600">{selectedSample.lines.length} Items</span>
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold">
                      <th className="py-2 px-2.5">No.</th>
                      <th className="py-2 px-2.5">Item Code</th>
                      <th className="py-2 px-2.5">Product Name</th>
                      <th className="py-2 px-2.5">Type / Fz-Ch</th>
                      <th className="py-2 px-2.5 text-right">KG/Bag</th>
                      <th className="py-2 px-2.5 text-right">Bag Qty</th>
                      <th className="py-2 px-2.5 text-right">Quantity (KG)</th>
                      <th className="py-2 px-2.5 text-right">บาท/กก.</th>
                      <th className="py-2 px-2.5 text-right">ยอดเงิน (฿)</th>
                      <th className="py-2 px-2.5">Stock Deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedSample.lines.map((line, idx) => {
                      const qtyKg = line.quantityKg || (line.kgPerBag && line.bagQty ? line.kgPerBag * line.bagQty : line.requestQty || 0);
                      const unitPrice = line.unitPrice || 0;
                      const lineVal = line.lineValue || (qtyKg * unitPrice);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2.5 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-blue-950">{line.itemCode}</td>
                          <td className="py-2 px-2.5 font-sans font-medium text-slate-900">{line.productName}</td>
                          <td className="py-2 px-2.5 text-slate-600">{line.productType || 'Standard'} / {line.storageType || 'Frozen'}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{line.kgPerBag ? line.kgPerBag.toFixed(2) : '-'}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">{line.bagQty || '-'}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-900">{qtyKg.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right text-slate-700">฿{unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-blue-900">฿{lineVal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-2.5 text-[10px] text-slate-600 font-sans">{line.stockDeduction || 'Free Sample'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculations & Totals (PART 55 & 61) */}
              {(() => {
                const totalItems = selectedSample.lines.length;
                const totalWeight = selectedSample.lines.reduce((s, l) => s + (l.quantityKg || (l.kgPerBag && l.bagQty ? l.kgPerBag * l.bagQty : l.requestQty || 0)), 0);
                const subtotal = selectedSample.lines.reduce((s, l) => s + (l.lineValue || ((l.quantityKg || l.requestQty || 0) * (l.unitPrice || 0))), 0);
                const vat = subtotal * 0.07;
                const grandTotal = subtotal + vat;

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex gap-6 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Items</span>
                        <span className="font-mono font-bold text-slate-800">{totalItems} รายการ</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Weight</span>
                        <span className="font-mono font-bold text-slate-800">{totalWeight.toFixed(2)} KG</span>
                      </div>
                    </div>

                    <div className="flex gap-5 text-xs text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Subtotal</span>
                        <span className="font-mono text-slate-700">฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">VAT (7%)</span>
                        <span className="font-mono text-slate-700">฿{vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="bg-white px-3 py-1 rounded border border-slate-200">
                        <span className="text-[10px] font-bold text-blue-900 uppercase block">Grand Total</span>
                        <span className="font-mono font-bold text-sm text-blue-900">฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Document Requirements (PART 56 & 61) */}
              <div className="border border-slate-200 rounded p-3 bg-white">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileCheck size={13} className="text-blue-600" />
                  เอกสารประกอบที่จำเป็น (Required Documents)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`p-2 rounded border flex items-center gap-1.5 ${selectedSample.documentsRequired?.coa ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <CheckCircle2 size={13} className={selectedSample.documentsRequired?.coa ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>COA (Cert of Analysis)</span>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-1.5 ${selectedSample.documentsRequired?.specSheet ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <CheckCircle2 size={13} className={selectedSample.documentsRequired?.specSheet ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Spec Sheet / Halal</span>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-1.5 ${selectedSample.documentsRequired?.taxInvoice ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <CheckCircle2 size={13} className={selectedSample.documentsRequired?.taxInvoice ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Tax Invoice / ใบส่งของ</span>
                  </div>
                  <div className={`p-2 rounded border flex items-center gap-1.5 ${selectedSample.documentsRequired?.deliveryNote ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <CheckCircle2 size={13} className={selectedSample.documentsRequired?.deliveryNote ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Sample Delivery Slip</span>
                  </div>
                </div>
              </div>

              {/* Previous Sample History (PART 61) */}
              {(() => {
                const history = getCustomerHistory(selectedSample.customerCode, selectedSample.sampleNo);
                return (
                  <div className="border border-slate-200 rounded p-3 bg-white">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <History size={13} className="text-indigo-600" />
                      ประวัติการขอตัวอย่างของลูกค้ารายนี้ในอดีต (Previous Sample History)
                    </div>
                    {history.length > 0 ? (
                      <div className="space-y-1.5">
                        {history.map((hist) => (
                          <div key={hist.sampleNo} className="bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-900">{hist.sampleNo}</span>
                              <span className="text-slate-500">({hist.deliveryDate})</span>
                              <span className="text-slate-700 font-medium truncate max-w-[200px]">{hist.samplePurpose || hist.sampleType}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-600">{hist.lines.length} รายการ</span>
                              <span className="font-bold text-slate-900">
                                ฿{hist.lines.reduce((s, l) => s + (l.lineValue || ((l.weight || l.requestQty || 0) * (l.unitPrice || 0))), 0).toLocaleString('th-TH')}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${hist.currentStatus === RequestStatus.COMPLETED ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                {hist.currentStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">ลูกค้ารายนี้ยังไม่มีประวัติการขอตัวอย่างก่อนหน้า (คำขอแรก)</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom Actions (PART 61 & 62 Action Buttons: Reject, Request Revision, Approve) */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Sale Manager Gate:</span> อนุมัติเพื่อแตกงานอัตโนมัติ 3 ฝ่าย (RD, Co-Sale, Logistic) พร้อมสร้าง PDF
              </div>

              <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                {/* 1. Reject Button */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  <span>Reject (ไม่อนุมัติ)</span>
                </button>

                {/* 2. Request Revision Button */}
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <History size={14} />
                  <span>Request Revision (ขอแก้ไข)</span>
                </button>

                {/* 3. Approve Button (PART 62 Pipeline) */}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>กำลังดำเนินการ...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Approve (อนุมัติคำขอ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedSample && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-red-900 flex items-center gap-2 mb-2">
              <XCircle size={18} className="text-red-600" />
              ปฏิเสธคำขอตัวอย่าง (Reject Sample Request)
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              ระบุเหตุผลในการปฏิเสธคำขอ <span className="font-mono font-bold text-slate-800">{selectedSample.sampleNo}</span> ระบบจะส่งแจ้งเตือนให้พนักงานขาย
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ระบุเหตุผลที่ปฏิเสธ เช่น สินค้ายังไม่พร้อมเปิดตัว, นโยบายงดส่งตัวอย่างสำหรับลูกค้ารายนี้..."
              rows={3}
              className="w-full border border-slate-300 rounded p-2 text-xs mb-4 focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevisionModal && selectedSample && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2 mb-2">
              <History size={18} className="text-indigo-600" />
              ขอให้แก้ไขคำขอ (Request Revision)
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              ส่งกลับให้พนักงานขายแก้ไขคำขอ <span className="font-mono font-bold text-slate-800">{selectedSample.sampleNo}</span> (ปรับ Revision อัตโนมัติ)
            </p>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ส่วนที่ต้องแก้ไข (Target Section)</label>
                <select
                  value={revisionSections}
                  onChange={(e) => setRevisionSections(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs"
                >
                  <option value="Product Quantities & Specifications">จำนวนสินค้าและสเปกสินค้า</option>
                  <option value="Delivery Schedule & Location">กำหนดวันเวลาและสถานที่จัดส่ง</option>
                  <option value="Customer & Contact Details">ข้อมูลลูกค้าและผู้ติดต่อ</option>
                  <option value="Documents & Attachment Requirements">เอกสารประกอบและใบรับรอง</option>
                  <option value="All Sections">ทบทวนข้อมูลทุกส่วนใหม่ทั้งหมด</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ข้อคิดเห็นและคำแนะนำ (Remarks) *</label>
                <textarea
                  value={revisionRemark}
                  onChange={(e) => setRevisionRemark(e.target.value)}
                  placeholder="ระบุสิ่งที่ต้องการให้ปรับปรุง เช่น ขอให้ลดปริมาณตัวอย่างจาก 5 KG เป็น 2 KG..."
                  rows={3}
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                ส่งกลับเพื่อแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
