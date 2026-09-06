import React, { useState } from 'react';
import { 
  Truck, CheckCircle2, AlertTriangle, XCircle, Clock, 
  MapPin, Calendar, Search, Filter, ArrowRight, Check,
  Sparkles, Eye, Mail, ShieldAlert, Thermometer, Weight,
  Building2, Phone, User, HelpCircle, Layers, ArrowLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { SampleRequest, RequestStatus } from '../types';
import { DEPOT_LIST } from '../lib/masterData';

export function LogisticPrecheckPage() {
  const { requests, logisticPrecheck } = useRequests();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFeasibility, setFilterFeasibility] = useState<string>('ALL');
  const [selectedSample, setSelectedSample] = useState<SampleRequest | null>(null);

  // Precheck Form State
  const [feasibility, setFeasibility] = useState<'Available' | 'Available with Change' | 'Not Available'>('Available');
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTimeFrom, setProposedTimeFrom] = useState('');
  const [proposedTimeTo, setProposedTimeTo] = useState('');
  const [proposedRoute, setProposedRoute] = useState('');
  const [proposedDepot, setProposedDepot] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{ sampleNo: string; message: string } | null>(null);

  // Requests that require logistic pre-check or in pre-check status
  const precheckRequests = requests.filter(req => {
    if (filterFeasibility === 'PENDING') {
      return req.currentStatus === RequestStatus.LOGISTIC_PRE_CHECK || !req.logisticTask?.precheckStatus || req.logisticTask.precheckStatus === 'PENDING';
    }
    if (filterFeasibility === 'CHECKED') {
      return req.logisticTask?.precheckStatus === 'PASS' || req.logisticTask?.precheckStatus === 'PROPOSE_CHANGE';
    }
    return true;
  });

  const filteredRequests = precheckRequests.filter(req => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      req.sampleNo.toLowerCase().includes(q) ||
      req.customerName.toLowerCase().includes(q) ||
      req.route.toLowerCase().includes(q) ||
      req.province.toLowerCase().includes(q) ||
      req.saleName.toLowerCase().includes(q)
    );
  });

  // Metrics
  const pendingCount = requests.filter(r => r.currentStatus === RequestStatus.LOGISTIC_PRE_CHECK || !r.logisticTask?.precheckStatus || r.logisticTask.precheckStatus === 'PENDING').length;
  const availableCount = requests.filter(r => r.logisticTask?.feasibility === 'Available' || r.logisticTask?.feasibility === 'FEASIBLE').length;
  const changeCount = requests.filter(r => r.logisticTask?.feasibility === 'Available with Change' || r.logisticTask?.feasibility === 'ALTERNATIVE_PROPOSED').length;
  const urgentCount = requests.filter(r => r.priority === 'URGENT' || r.priority === 'HIGH').length;

  const handleOpenPrecheck = (req: SampleRequest) => {
    setSelectedSample(req);
    // Initialize form defaults from request
    const existingFeas = req.logisticTask?.feasibility;
    if (existingFeas === 'Available with Change' || existingFeas === 'ALTERNATIVE_PROPOSED') {
      setFeasibility('Available with Change');
    } else if (existingFeas === 'Not Available' || existingFeas === 'NOT_FEASIBLE') {
      setFeasibility('Not Available');
    } else {
      setFeasibility('Available');
    }

    setProposedDate(req.logisticTask?.proposedDate || req.deliveryDate || '');
    setProposedTimeFrom(req.logisticTask?.proposedTimeFrom || req.deliveryTimeFrom || '09:00');
    setProposedTimeTo(req.logisticTask?.proposedTimeTo || req.deliveryTimeTo || '12:00');
    setProposedRoute(req.logisticTask?.proposedRoute || req.route || '');
    setProposedDepot(req.logisticTask?.proposedDepot || req.depot || 'DC บางนา (Main Central Cold Storage)');
    setRemark(req.logisticTask?.precheckRemark || '');
  };

  const handleConfirmPrecheck = async () => {
    if (!selectedSample) return;

    if (feasibility !== 'Not Available') {
      if (!proposedDepot) {
        alert('กรุณาเลือกคลังต้นทาง (Select Depot)');
        return;
      }
      if (!proposedRoute.trim()) {
        alert('กรุณาระบุสายการเดินรถ / โซน (Route)');
        return;
      }
    }

    if (feasibility === 'Available with Change' && !remark.trim()) {
      alert('กรุณาระบุรายละเอียดข้อเสนอแนะในการปรับเปลี่ยน (Remark)');
      return;
    }

    if (feasibility === 'Not Available' && !remark.trim()) {
      alert('กรุณาระบุเหตุผลที่ไม่สามารถจัดส่งได้ (Remark)');
      return;
    }

    setIsSubmitting(true);
    try {
      await logisticPrecheck(selectedSample.sampleNo, {
        feasibility,
        route: proposedRoute || selectedSample.route,
        proposedDate: feasibility !== 'Available' ? proposedDate : undefined,
        proposedTimeFrom: feasibility !== 'Available' ? proposedTimeFrom : undefined,
        proposedTimeTo: feasibility !== 'Available' ? proposedTimeTo : undefined,
        proposedRoute: proposedRoute || undefined,
        proposedDepot: proposedDepot || undefined,
        remark: remark.trim() || (feasibility === 'Available' ? `คลังต้นทาง: ${proposedDepot}, สายรถ: ${proposedRoute}` : remark),
        checkerName: user?.name || 'Logistic Specialist',
        checkerEmail: user?.email || 'logistic@company.com'
      });

      setSuccessNotice({
        sampleNo: selectedSample.sampleNo,
        message: `บันทึกผลการตรวจสอบเป็น "${feasibility}" และส่งอีเมลแจ้ง Sale Manager เพื่อพิจารณาอนุมัติเรียบร้อยแล้ว`
      });

      setSelectedSample(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
            <span className="hover:text-[var(--color-primary-blue)] transition-colors">Logistics</span>
            <span>/</span>
            <span className="text-[var(--color-text-primary)]">Logistic Pre-Check Queue</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold text-[var(--color-text-primary)] leading-tight flex items-center gap-2">
              <Truck className="text-blue-600" size={22} />
              Logistic Pre-Check (PART 60)
            </h1>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> Feasibility Gate
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/approval/pending"
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>ไปที่คิวรออนุมัติ (Approval Queue)</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-md flex items-center justify-between text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold font-mono">{successNotice.sampleNo}: </span>
              <span>{successNotice.message}</span>
            </div>
          </div>
          <button 
            onClick={() => setSuccessNotice(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded bg-emerald-100"
          >
            ปิด
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">รอ Pre-Check</span>
            <span className="text-2xl font-mono font-bold text-amber-600">{pendingCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">คำขอต้องตรวจสายรถ</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Available (พร้อมส่ง)</span>
            <span className="text-2xl font-mono font-bold text-emerald-600">{availableCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">สายรถและอุณหภูมิพร้อม</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">With Change (เสนอปรับ)</span>
            <span className="text-2xl font-mono font-bold text-blue-600">{changeCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">มีเงื่อนไขปรับวัน/รอบ</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Urgent Priority</span>
            <span className="text-2xl font-mono font-bold text-red-600">{urgentCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">คำขอด่วนพิเศษ SLA 60 นาที</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* Main Queue Table Card */}
      <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm flex flex-col">
        {/* Table Filter Controls */}
        <div className="p-3 border-b border-[var(--color-border-light)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-bold text-slate-800 text-[13px] mr-2">คิวตรวจสอบโลจิสติกส์</span>
            <div className="flex rounded-sm border border-slate-200 overflow-hidden text-[11px]">
              <button 
                onClick={() => setFilterFeasibility('ALL')}
                className={`px-3 py-1 font-bold border-r border-slate-200 transition-colors ${
                  filterFeasibility === 'ALL' ? 'bg-blue-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({requests.length})
              </button>
              <button 
                onClick={() => setFilterFeasibility('PENDING')}
                className={`px-3 py-1 font-bold border-r border-slate-200 transition-colors ${
                  filterFeasibility === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                รอตรวจ ({pendingCount})
              </button>
              <button 
                onClick={() => setFilterFeasibility('CHECKED')}
                className={`px-3 py-1 font-bold transition-colors ${
                  filterFeasibility === 'CHECKED' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                ตรวจแล้ว ({availableCount + changeCount})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ลูกค้า, เส้นทาง, จังหวัด..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-sm py-1 pl-8 pr-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Sample No / Rev</th>
                <th className="py-2.5 px-3">Customer & Channel</th>
                <th className="py-2.5 px-3">Address & Destination</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Route / Depot</th>
                <th className="py-2.5 px-3">Temp & Weight</th>
                <th className="py-2.5 px-3">Feasibility Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const totalKg = req.lines.reduce((s, l) => s + (l.weight || l.requestQty || 0), 0);
                  const isChecked = req.logisticTask?.precheckStatus === 'PASS' || req.logisticTask?.precheckStatus === 'PROPOSE_CHANGE';
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
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                            {req.department || 'RD'}
                          </span>
                          {req.priority === 'URGENT' && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">URGENT</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top max-w-[200px]">
                        <div className="font-bold text-slate-900 truncate" title={req.customerName}>
                          {req.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User size={11} className="text-slate-400" />
                          <span>{req.contactName || 'คุณลูกค้า'}</span>
                          {req.contactPhone && <span className="text-[10px]">({req.contactPhone})</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top max-w-[220px]">
                        <div className="text-slate-800 text-[11px] line-clamp-2" title={req.deliveryAddress}>
                          <MapPin size={11} className="inline mr-1 text-slate-400" />
                          {req.deliveryAddress || `${req.district || ''} ${req.province || ''}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {req.district && `${req.district}, `}{req.province}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <Calendar size={11} className="text-blue-600" />
                          {req.deliveryDate}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                          <Clock size={11} className="text-slate-400" />
                          {req.deliveryTimeFrom} - {req.deliveryTimeTo}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-blue-950">
                          {req.route}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {req.depot || 'DC บางนา'}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                          <Thermometer size={12} />
                          {req.temperature}
                        </div>
                        <div className="text-[11px] font-mono text-slate-700 flex items-center gap-1 mt-0.5">
                          <Weight size={11} className="text-slate-400" />
                          {totalKg.toFixed(2)} KG ({req.lines.length} รายการ)
                        </div>
                      </td>

                      <td className="py-3 px-3 align-top">
                        {feas === 'Available' || feas === 'FEASIBLE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 size={12} /> Available
                          </span>
                        ) : feas === 'Available with Change' || feas === 'ALTERNATIVE_PROPOSED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
                            <AlertTriangle size={12} /> With Change
                          </span>
                        ) : feas === 'Not Available' || feas === 'NOT_FEASIBLE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-red-50 text-red-700 border border-red-300">
                            <XCircle size={12} /> Not Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse">
                            <Clock size={12} /> Pending Check
                          </span>
                        )}
                        {req.logisticTask?.precheckBy && (
                          <div className="text-[9px] text-slate-400 mt-1">
                            โดย {req.logisticTask.precheckBy}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPrecheck(req)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <Truck size={12} />
                            <span>ตรวจสายรถ</span>
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
                    ไม่พบคำขอที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Modal: PART 60 LOGISTIC PRE-CHECK DETAIL */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-md max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                  <Truck size={12} />
                  PART 60 — LOGISTIC PRE-CHECK DETAIL & FEASIBILITY CONFIRMATION
                </div>
                <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <span className="font-mono">{selectedSample.sampleNo}</span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                    {selectedSample.revision || 'REV.00'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ลูกค้า: <span className="font-semibold text-slate-800">{selectedSample.customerName}</span> ({selectedSample.customerCode})
                </p>
              </div>
              <button 
                onClick={() => setSelectedSample(null)} 
                className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Read-Only Requested Details (7 Fields: Customer, Address, Date, Time, Route, Temperature, Weight) */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-5 space-y-3 text-xs">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <Layers size={13} className="text-blue-600" />
                ข้อมูลความต้องการจัดส่ง (Requested Delivery Parameters)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Customer */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Customer (ลูกค้า)</span>
                  <div className="font-bold text-slate-900">{selectedSample.customerName}</div>
                  <div className="text-slate-500 text-[11px]">ผู้ติดต่อ: {selectedSample.contactName} ({selectedSample.contactPhone})</div>
                </div>

                {/* 2. Address */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">2. Address (สถานที่จัดส่ง)</span>
                  <div className="font-medium text-slate-800 line-clamp-2">{selectedSample.deliveryAddress}</div>
                  <div className="text-slate-500 text-[11px]">{selectedSample.district} {selectedSample.province}</div>
                </div>

                {/* 3. Date */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Delivery Date (วันที่ต้องการส่ง)</span>
                  <div className="font-bold text-blue-900 flex items-center gap-1">
                    <Calendar size={13} />
                    {selectedSample.deliveryDate}
                  </div>
                </div>

                {/* 4. Time */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">4. Delivery Time (ช่วงเวลารับสินค้า)</span>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <Clock size={13} />
                    {selectedSample.deliveryTimeFrom} - {selectedSample.deliveryTimeTo} น.
                  </div>
                </div>

                {/* 5. Route */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">5. Route (สายส่งสินค้า / Depot)</span>
                  <div className="font-bold text-slate-900">{selectedSample.route}</div>
                  <div className="text-slate-500 text-[11px]">คลังต้นทาง: {selectedSample.depot || 'DC บางนา'}</div>
                </div>

                {/* 6. Temperature */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">6. Temperature (อุณหภูมิควบคุม)</span>
                  <div className="font-bold text-red-600 flex items-center gap-1">
                    <Thermometer size={13} />
                    {selectedSample.temperature}
                  </div>
                </div>

                {/* 7. Weight */}
                <div className="sm:col-span-2 bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">7. Total Weight & Items (น้ำหนักรวมและจำนวนรายการ)</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {selectedSample.lines.reduce((s, l) => s + (l.weight || l.requestQty || 0), 0).toFixed(2)} KG
                    </span>
                    <span className="text-slate-500 ml-2">({selectedSample.lines.length} รายการสินค้า)</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Sale: <span className="font-semibold text-slate-800">{selectedSample.saleName}</span></div>
                    <div>ความสำคัญ: <span className="font-bold text-red-600">{selectedSample.priority}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feasibility Selector (PART 60) */}
            <div className="space-y-4 mb-5">
              <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                ผลการตรวจสอบความเป็นไปได้ในการจัดส่ง (Feasibility Assessment) *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Available */}
                <button
                  type="button"
                  onClick={() => setFeasibility('Available')}
                  className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between ${
                    feasibility === 'Available'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 size={15} /> Available
                    </span>
                    {feasibility === 'Available' && <Check size={14} className="text-emerald-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    จัดส่งได้ตามเงื่อนไข วัน เวลา เส้นทาง และอุณหภูมิปกติ
                  </p>
                </button>

                {/* 2. Available with Change */}
                <button
                  type="button"
                  onClick={() => setFeasibility('Available with Change')}
                  className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between ${
                    feasibility === 'Available with Change'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 text-blue-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1 text-blue-700">
                      <AlertTriangle size={15} /> Available with Change
                    </span>
                    {feasibility === 'Available with Change' && <Check size={14} className="text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    จัดส่งได้ แต่มีข้อเสนอแนะปรับเปลี่ยนวัน/เวลา/สายรถ
                  </p>
                </button>

                {/* 3. Not Available */}
                <button
                  type="button"
                  onClick={() => setFeasibility('Not Available')}
                  className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between ${
                    feasibility === 'Not Available'
                      ? 'bg-red-50 border-red-500 ring-2 ring-red-200 text-red-950'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1 text-red-700">
                      <XCircle size={15} /> Not Available
                    </span>
                    {feasibility === 'Not Available' && <Check size={14} className="text-red-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    ไม่สามารถจัดส่งได้เนื่องจากข้อจำกัดด้านรถ/เวลา/พื้นที่
                  </p>
                </button>
              </div>

              {/* Section to specify Depot and Route (Always visible when Available or Available with Change) */}
              {(feasibility === 'Available' || feasibility === 'Available with Change') && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-3 animate-fade-in text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-600" />
                    ข้อมูลการจัดส่งที่ฝ่ายโลจิสติกส์จัดสรร (Assigned Depot & Route) *
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">คลังสินค้าต้นทาง (Depot) *</label>
                      <select 
                        value={proposedDepot}
                        onChange={(e) => setProposedDepot(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- เลือกคลังต้นทาง (Select Depot) --</option>
                        {DEPOT_LIST.map(d => (
                          <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">สายการเดินรถ / โซน (Route) *</label>
                      <input 
                        type="text"
                        value={proposedRoute}
                        onChange={(e) => setProposedRoute(e.target.value)}
                        placeholder="ระบุสายรถ เช่น ROUTE-NORTH-01 หรือ ZONE-A"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Proposed Changes inputs when "Available with Change" is selected */}
              {feasibility === 'Available with Change' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-md p-3.5 space-y-3 animate-fade-in text-xs">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-blue-600" />
                    ระบุข้อเสนอแนะในการปรับเปลี่ยนเงื่อนไข (Proposed Alternative Schedule)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">วันที่เสนอปรับเปลี่ยน</label>
                      <input 
                        type="date"
                        value={proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">เวลาตั้งแต่</label>
                      <input 
                        type="time"
                        value={proposedTimeFrom}
                        onChange={(e) => setProposedTimeFrom(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">ถึงเวลา</label>
                      <input 
                        type="time"
                        value={proposedTimeTo}
                        onChange={(e) => setProposedTimeTo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks textarea */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  หมายเหตุและคำแนะนำจากฝ่ายโลจิสติกส์ (Logistics Remarks) {feasibility !== 'Available' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder={
                    feasibility === 'Available'
                      ? 'หมายเหตุเพิ่มเติม (ถ้ามี) เช่น ต้องจัดส่งด้วยรถห้องเย็นอุณหภูมิ 0-4°C เท่านั้น'
                      : feasibility === 'Available with Change'
                      ? 'ระบุเหตุผลที่ต้องเปลี่ยนวัน/เวลา เช่น วันที่ขอรถเต็ม ขอเลื่อนเป็นวันถัดไปรอบเช้า'
                      : 'ระบุสาเหตุที่ไม่สามารถจัดส่งได้ เช่น อยู่นอกพื้นที่บริการจัดส่ง หรือไม่มีรถควบคุมอุณหภูมิตามที่ขอ'
                  }
                  rows={2}
                  className="w-full border border-slate-300 rounded-sm p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <div className="text-[11px] text-slate-500">
                เมื่อกดยืนยัน: <span className="font-bold text-blue-900">Status ➔ WAITING_APPROVAL</span> และส่ง Auto Email หา Sale Manager
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSample(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrecheck}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>กำลังบันทึก...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>ยืนยันผล Pre-Check (Confirm)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
