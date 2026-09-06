import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { 
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, 
  Truck, Check, X, ShieldAlert, Sparkles, FileText, 
  Send, ChevronRight, UserCheck, PackageCheck, 
  AlertCircle, ShieldCheck, Mail, Printer, Edit3, 
  Building2, Calendar, Phone, MapPin, ExternalLink, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../contexts/RequestContext';
import { RequestStatus, TaskStatus } from '../types';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    requests, 
    logisticPrecheck, 
    approveRequest, 
    rejectRequest, 
    requestRevision,
    completeRdTask,
    completeCoSaleTask,
    completeLogisticAssignment,
    advanceDeliveryPipeline,
    rdDepartments,
    changeDepartmentOnDraft
  } = useRequests();

  // Find request by ID or Sample No
  const request = requests.find(r => r.id === id || r.sampleNo === id) || requests[0];
  const role = user?.role || 'ADMIN';

  // Modals & form state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionSections, setRevisionSections] = useState('รายการสินค้าและปริมาณ');
  const [revisionRemark, setRevisionRemark] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Department change on Draft state
  const [showChangeDeptModal, setShowChangeDeptModal] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState(request.department || 'RM');
  const [changeDeptReason, setChangeDeptReason] = useState('ขอเปลี่ยนแผนก RD ผู้รับผิดชอบ');
  const [isChangingDept, setIsChangingDept] = useState(false);

  // Department completion forms state
  const [rdLot, setRdLot] = useState('LOT-20260905-01');
  const [rdExpDate, setRdExpDate] = useState('2026-09-15');
  const [rdActualQty, setRdActualQty] = useState(request.totalQty || 5);
  const [rdRemark, setRdRemark] = useState('เตรียมสินค้าและตรวจสอบอุณหภูมิเรียบร้อย');

  const [soNumber, setSoNumber] = useState('SO-2026-09452');
  const [soDate, setSoDate] = useState(new Date().toISOString().split('T')[0]);

  const [vehicleType, setVehicleType] = useState('4-Wheel Cold Truck (0-4°C)');
  const [vehicleNo, setVehicleNo] = useState('1ฒผ-8899 กทม.');
  const [driverName, setDriverName] = useState('สมชาย ขับดี');
  const [driverPhone, setDriverPhone] = useState('089-123-4567');

  const isApproved = [
    RequestStatus.APPROVED,
    RequestStatus.PROCESSING,
    RequestStatus.READY_TO_DELIVER,
    RequestStatus.PICKED_UP,
    RequestStatus.OUT_FOR_DELIVERY,
    RequestStatus.ARRIVED,
    RequestStatus.DELIVERED,
    RequestStatus.CUSTOMER_RECEIVED,
    RequestStatus.COMPLETED
  ].includes(request.currentStatus);

  const isReadyToDeliver = request.rdStatus === 'COMPLETED' && 
                           request.coSaleStatus === 'COMPLETED' && 
                           request.logisticStatus === 'COMPLETED';

  // Handlers
  const handlePrecheckPass = () => {
    logisticPrecheck(request.sampleNo, {
      feasibility: 'FEASIBLE',
      route: request.route,
      remark: 'ผ่านการตรวจสอบความพร้อมด้านโลจิสติกส์ เส้นทางและอุณหภูมิเหมาะสม'
    });
  };

  const handleApprove = () => {
    approveRequest(request.sampleNo, user?.name || 'Sale Manager', user?.email || 'manager@company.com');
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return alert('กรุณาระบุเหตุผลในการปฏิเสธ');
    rejectRequest(request.sampleNo, rejectReason);
    setShowRejectModal(false);
  };

  const handleChangeDeptConfirm = async () => {
    if (newDeptCode === request.department) {
      alert('กรุณาเลือกแผนก RD ที่แตกต่างจากเดิม');
      return;
    }
    if (!changeDeptReason.trim()) {
      alert('กรุณาระบุเหตุผลในการเปลี่ยนแผนก');
      return;
    }
    setIsChangingDept(true);
    try {
      const res = await changeDepartmentOnDraft(request.sampleNo, newDeptCode, changeDeptReason);
      if (res.success && res.newSampleNo) {
        setShowChangeDeptModal(false);
        navigate(`/sample/${res.newSampleNo}`);
      } else {
        alert('ไม่สามารถเปลี่ยนแผนกได้: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsChangingDept(false);
    }
  };

  const handleRevisionSubmit = () => {
    if (!revisionRemark.trim()) return alert('กรุณาระบุข้อคิดเห็นในการแก้ไข');
    requestRevision(request.sampleNo, revisionSections, revisionRemark);
    setShowRevisionModal(false);
  };

  const handleRdComplete = () => {
    completeRdTask(request.sampleNo, {
      lot: rdLot,
      expiryDate: rdExpDate,
      actualQty: Number(rdActualQty),
      remark: rdRemark
    });
  };

  const handleCoSaleComplete = () => {
    if (!soNumber.trim()) return alert('กรุณาระบุเลขที่ Sales Order');
    completeCoSaleTask(request.sampleNo, {
      soNumber,
      soDate,
      erpStatus: 'RELEASED'
    });
  };

  const handleLogisticComplete = () => {
    if (!vehicleNo.trim() || !driverName.trim()) return alert('กรุณาระบุทะเบียนรถและชื่อคนขับ');
    completeLogisticAssignment(request.sampleNo, {
      vehicleType,
      vehicleNo,
      driverName,
      driverPhone
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1300px] mx-auto w-full text-[var(--color-text-primary)]">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 shrink-0">
        <div>
          <nav className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-[var(--color-primary-blue)] transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="hover:text-[var(--color-primary-blue)] transition-colors">Sample Requests</span>
            <span>/</span>
            <span className="text-[var(--color-text-primary)] font-mono">{request.sampleNo}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-mono font-bold text-[var(--color-text-primary)] leading-tight flex items-center gap-2">
              {request.sampleNo}
              <span className="text-[12px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold">
                {request.revision || 'REV.00'}
              </span>
              {request.isLocked && (
                <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                  <Lock size={11} /> Locked Snapshot
                </span>
              )}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${
              request.currentStatus === RequestStatus.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' :
              request.currentStatus === RequestStatus.READY_TO_DELIVER ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100' :
              request.currentStatus === RequestStatus.PROCESSING ? 'bg-blue-50 text-blue-700 border-blue-200' :
              request.currentStatus === RequestStatus.WAITING_APPROVAL ? 'bg-amber-50 text-amber-700 border-amber-200' :
              request.currentStatus === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {request.currentStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* If DRAFT, allow changing RD Department with Void & Sequence allocation */}
          {request.currentStatus === RequestStatus.DRAFT && (
            <button 
              onClick={() => setShowChangeDeptModal(true)}
              className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-sm text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Building2 size={14} className="text-amber-700" />
              เปลี่ยนแผนก RD (Void เลขเดิม & ดึงเลขใหม่)
            </button>
          )}

          {/* Action to view / print official generated PDF */}
          <button 
            onClick={() => setShowPdfModal(true)}
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-primary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} className="text-blue-600" /> 
            เอกสาร PDF (Sample Order)
          </button>

          {/* Action to view email history */}
          <button 
            onClick={() => setShowEmailHistory(!showEmailHistory)}
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-primary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Mail size={14} className="text-purple-600" />
            Auto-Email Log ({request.emailLogs?.length || 0})
          </button>

          <Link 
            to="/" 
            className="bg-white border border-[var(--color-border-light)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded-sm text-xs font-semibold hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={13} /> ย้อนกลับ
          </Link>
        </div>
      </div>

      {/* System-Driven Workflow Progress Banner */}
      <div className="bg-white border border-[var(--color-border-light)] rounded-sm p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-blue-600" />
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-900">
              System-Driven Workflow Pipeline (กระบวนการขับเคลื่อนด้วยระบบอัตโนมัติ)
            </h3>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            ผู้รับผิดชอบปัจจุบัน: <span className="font-bold text-slate-800">{request.currentOwner}</span>
          </div>
        </div>

        {/* Linear Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-[10px]">
          <PipelineNode 
            step="1" title="Sale & Validate" sub="กรอก & ตรวจสอบ" 
            status="DONE" 
          />
          <PipelineNode 
            step="2" title="Logistic Pre-check" sub="ตรวจสายรถ/เวลา" 
            status={request.logisticTask?.precheckStatus === 'PASS' ? 'DONE' : 'ACTIVE'} 
          />
          <PipelineNode 
            step="3" title="Manager Approve" sub="อนุมัติ & แตก Task" 
            status={isApproved ? 'DONE' : request.currentStatus === RequestStatus.WAITING_APPROVAL ? 'ACTIVE' : 'WAITING'} 
          />
          <PipelineNode 
            step="4" title="Parallel Execution" sub="RD / Co-Sale / Logistic" 
            status={isReadyToDeliver ? 'DONE' : isApproved ? 'ACTIVE' : 'WAITING'} 
          />
          <PipelineNode 
            step="5" title="Delivery Gate" sub="พร้อมจัดส่ง" 
            status={['READY TO DELIVER', 'PICKED UP', 'OUT FOR DELIVERY', 'ARRIVED', 'DELIVERED', 'CUSTOMER RECEIVED', 'COMPLETED'].includes(request.currentStatus) ? 'DONE' : isReadyToDeliver ? 'ACTIVE' : 'WAITING'} 
          />
          <PipelineNode 
            step="6" title="POD & Close" sub="ส่งมอบ & ปิดงาน" 
            status={request.currentStatus === RequestStatus.COMPLETED ? 'DONE' : ['PICKED UP', 'OUT FOR DELIVERY', 'ARRIVED', 'DELIVERED', 'CUSTOMER RECEIVED'].includes(request.currentStatus) ? 'ACTIVE' : 'WAITING'} 
          />
        </div>
      </div>

      {/* Auto Email Log Drawer if toggled */}
      {showEmailHistory && (
        <div className="bg-slate-900 text-white rounded-sm p-4 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h4 className="text-[12px] font-bold text-white flex items-center gap-2">
              <Mail size={14} className="text-blue-400" />
              ประวัติ Auto Email ที่ระบบส่งออก (Logged in SHEET 13: EMAIL_LOG)
            </h4>
            <button onClick={() => setShowEmailHistory(false)} className="text-slate-400 hover:text-white text-xs">ปิด</button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            {request.emailLogs && request.emailLogs.length > 0 ? (
              request.emailLogs.map((eml, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 text-[10px] mb-1">
                    <span className="font-mono text-blue-400 font-semibold">{eml.templateCode}</span>
                    <span>{eml.sendDate} {eml.sendTime} น.</span>
                  </div>
                  <div className="font-bold text-slate-100">{eml.subject}</div>
                  <div className="text-slate-400 mt-1">ถึง: {eml.toEmail}</div>
                  {eml.body && <div className="text-slate-300 mt-1 bg-slate-900/50 p-2 rounded text-[10px]">{eml.body}</div>}
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-[11px] italic">ยังไม่มีประวัติการส่งอีเมลสำหรับคำขอนี้</p>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Workflow Steps & Execution Gate */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* STEP 1: SALE INPUT & VALIDATION */}
          <WorkflowCard 
            stepNumber="1"
            title="Sale Single-Entry & System Validation"
            subtitle="บันทึกข้อมูลครั้งเดียว และระบบตรวจสอบความถูกต้องอัตโนมัติ"
            status="PASSED"
          >
            <div className="text-[12px] space-y-2 text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">ผู้สร้างคำขอ (Sale Owner)</span>
                  <span className="font-semibold text-slate-900">{request.saleName}</span> ({request.saleEmail})
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">เวลาสร้างคำขอ</span>
                  <span className="font-medium">{request.createdDate} เวลา {request.createdTime} น.</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">หน่วยงานย่อย RD</span>
                  <span className="font-bold text-blue-900">{request.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">สถานะการตรวจสอบโดยระบบ</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> ผ่านการตรวจสอบความสมบูรณ์ (Passed)
                  </span>
                </div>
              </div>
            </div>
          </WorkflowCard>

          {/* STEP 2: LOGISTIC PRE-CHECK */}
          <WorkflowCard 
            stepNumber="2"
            title="Logistic Pre-check (ตรวจสอบความเป็นไปได้ในการจัดส่ง)"
            subtitle="ตรวจสอบเส้นทาง วัน เวลา และอุณหภูมิควบคุม"
            status={request.logisticTask?.precheckStatus === 'PASS' ? 'PASSED' : 'PENDING'}
          >
            <div className="text-[12px] space-y-3">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">เส้นทาง (Route)</span>
                  <span className="font-bold text-slate-900">{request.route}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">กำหนดส่ง</span>
                  <span className="font-bold text-slate-900">{request.deliveryDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">ช่วงเวลา</span>
                  <span className="font-medium text-slate-800">{request.deliveryTimeFrom} - {request.deliveryTimeTo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">อุณหภูมิควบคุม</span>
                  <span className="font-bold text-red-600">{request.temperature}</span>
                </div>
              </div>

              {request.logisticTask?.precheckStatus === 'PASS' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">ผ่านการ Pre-check แล้ว: </span>
                    {request.logisticTask.precheckRemark || 'เส้นทางและอุณหภูมิอยู่ในรอบเดินรถปกติ'}
                    <span className="text-emerald-700 ml-1">({request.logisticTask.precheckBy} - {request.logisticTask.precheckTime})</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900 mb-2">
                    <span className="font-bold">รอฝ่ายโลจิสติกส์ตรวจสอบ: </span>
                    ระบบส่งเรื่องไปยังคิว Logistic Pre-check แล้ว
                  </div>
                  {(role === 'LOGISTIC' || role === 'ADMIN') && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handlePrecheckPass}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Check size={13} /> ยืนยันความพร้อมจัดส่ง (Confirm Feasibility)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </WorkflowCard>

          {/* STEP 3: SALE MANAGER APPROVAL */}
          <WorkflowCard 
            stepNumber="3"
            title="Sale Manager Approval (การพิจารณาอนุมัติ)"
            subtitle="ระบบสร้างเอกสาร PDF ส่ง Auto Email และแตก Task อัตโนมัติทันทีที่อนุมัติ"
            status={isApproved ? 'PASSED' : request.currentStatus === RequestStatus.REJECTED ? 'REJECTED' : 'PENDING'}
          >
            <div className="text-[12px] space-y-3">
              {isApproved ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-[11px] text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    อนุมัติเรียบร้อยแล้ว โดย {request.approvals?.[0]?.approverName || 'Sale Manager'} ({request.approvals?.[0]?.approvalDate})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 text-[10px]">
                    <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <Check size={12} className="text-emerald-600" /> ระบบ Generate PDF แล้ว
                    </div>
                    <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <Check size={12} className="text-emerald-600" /> ส่ง Auto Email สำเร็จ
                    </div>
                    <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <Check size={12} className="text-emerald-600" /> แตก Task ให้ 3 ฝ่ายแล้ว
                    </div>
                  </div>
                </div>
              ) : request.currentStatus === RequestStatus.REJECTED ? (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-[11px] text-red-900">
                  <span className="font-bold block mb-1">คำขอถูกปฏิเสธ (Rejected)</span>
                  <p>{request.approvals?.[0]?.rejectReason || 'ไม่อนุมัติเนื่องจากข้อมูลไม่สอดคล้องกับนโยบาย'}</p>
                </div>
              ) : request.currentStatus === RequestStatus.WAITING_APPROVAL ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900">
                    <Clock size={13} className="inline mr-1 text-amber-700" />
                    รอ Sale Manager พิจารณาอนุมัติคำขอ (SLA: 120 นาที)
                  </div>
                  
                  {(role === 'SALE_MANAGER' || role === 'ADMIN') && (
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        onClick={handleApprove}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Check size={13} /> อนุมัติคำขอ (Approve)
                      </button>
                      <button 
                        onClick={() => setShowRevisionModal(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Edit3 size={13} /> ขอให้แก้ไข (Revise)
                      </button>
                      <button 
                        onClick={() => setShowRejectModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <X size={13} /> ปฏิเสธ (Reject)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px] italic">
                  ขั้นตอนอนุมัติจะเริ่มต้นเมื่อ Logistic ทำการ Pre-check ผ่านแล้ว
                </p>
              )}
            </div>
          </WorkflowCard>

          {/* STEP 4: PARALLEL TASK EXECUTION (RD, CO-SALE, LOGISTIC) */}
          <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">4</span>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">
                    Parallel Department Tasks (ระบบแตก Task ดำเนินการขนานกัน)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  แต่ละฝ่ายดำเนินการงานย่อยของตนเองอย่างอิสระ พร้อมระบบติดตาม SLA
                </p>
              </div>

              <div className="text-[11px] font-bold">
                {isReadyToDeliver ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={13} /> All Tasks Done
                  </span>
                ) : (
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Tasks in Progress
                  </span>
                )}
              </div>
            </div>

            {/* 3 Department Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Task 1: RD Preparation */}
              <div className={`border rounded p-3 flex flex-col justify-between transition-all ${
                request.rdStatus === 'COMPLETED' ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                      RD Preparation
                    </span>
                    {request.rdStatus === 'COMPLETED' ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={12} /> พร้อมแล้ว
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Clock size={11} /> กำลังเตรียม
                      </span>
                    )}
                  </div>
                  <h4 className="text-[12px] font-bold text-slate-900 mb-1">
                    เตรียมตัวอย่างและระบุ Lot
                  </h4>
                  <p className="text-[10px] text-slate-600 mb-3">
                    ผู้รับผิดชอบ: {request.rdTasks?.[0]?.assignedTo || 'RD Specialist'}
                  </p>

                  {request.rdStatus === 'COMPLETED' ? (
                    <div className="bg-white p-2 rounded border border-emerald-200 text-[10px] space-y-1">
                      <div><span className="text-slate-500">Lot No: </span><span className="font-mono font-bold text-blue-900">{request.lines[0]?.lot || rdLot}</span></div>
                      <div><span className="text-slate-500">หมดอายุ: </span><span className="font-medium">{request.lines[0]?.expiryDate || rdExpDate}</span></div>
                      <div><span className="text-slate-500">จำนวน: </span><span className="font-bold">{request.totalQty} หน่วย</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">Lot No. ผลิต</label>
                        <input 
                          type="text" 
                          value={rdLot} 
                          onChange={e => setRdLot(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">วันหมดอายุ (Exp Date)</label>
                        <input 
                          type="date" 
                          value={rdExpDate} 
                          onChange={e => setRdExpDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {request.rdStatus !== 'COMPLETED' && (role === 'RD' || role === 'ADMIN') && isApproved && (
                  <button 
                    onClick={handleRdComplete}
                    className="mt-3 w-full bg-purple-700 hover:bg-purple-800 text-white text-[11px] py-1.5 rounded font-bold transition-colors shadow-xs"
                  >
                    ยืนยัน RD เตรียมเสร็จ
                  </button>
                )}
              </div>

              {/* Task 2: Co-Sale SO Creation */}
              <div className={`border rounded p-3 flex flex-col justify-between transition-all ${
                request.coSaleStatus === 'COMPLETED' ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                      Co-Sale ERP
                    </span>
                    {request.coSaleStatus === 'COMPLETED' ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={12} /> SO เรียบร้อย
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Clock size={11} /> รอเปิด SO
                      </span>
                    )}
                  </div>
                  <h4 className="text-[12px] font-bold text-slate-900 mb-1">
                    เปิด Sales Order ใน ERP
                  </h4>
                  <p className="text-[10px] text-slate-600 mb-3">
                    ผู้รับผิดชอบ: {request.coSaleTask?.assignedTo || 'Co-Sale Specialist'}
                  </p>

                  {request.coSaleStatus === 'COMPLETED' ? (
                    <div className="bg-white p-2 rounded border border-emerald-200 text-[10px] space-y-1">
                      <div><span className="text-slate-500">SO No: </span><span className="font-mono font-bold text-blue-900">{request.coSaleTask?.soNumber || soNumber}</span></div>
                      <div><span className="text-slate-500">วันที่ SO: </span><span className="font-medium">{request.coSaleTask?.soDate || soDate}</span></div>
                      <div><span className="text-slate-500">สถานะ ERP: </span><span className="font-bold text-emerald-700">RELEASED</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">เลขที่ Sales Order (SO)</label>
                        <input 
                          type="text" 
                          value={soNumber} 
                          onChange={e => setSoNumber(e.target.value)}
                          placeholder="SO-2026-XXXXX"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">วันที่ทำรายการ</label>
                        <input 
                          type="date" 
                          value={soDate} 
                          onChange={e => setSoDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {request.coSaleStatus !== 'COMPLETED' && (role === 'CO_SALE' || role === 'ADMIN') && isApproved && (
                  <button 
                    onClick={handleCoSaleComplete}
                    className="mt-3 w-full bg-blue-700 hover:bg-blue-800 text-white text-[11px] py-1.5 rounded font-bold transition-colors shadow-xs"
                  >
                    ยืนยันเปิด SO แล้ว
                  </button>
                )}
              </div>

              {/* Task 3: Logistic Vehicle Assignment */}
              <div className={`border rounded p-3 flex flex-col justify-between transition-all ${
                request.logisticStatus === 'COMPLETED' ? 'bg-emerald-50/40 border-emerald-300' : 'bg-white border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      Logistic Vehicle
                    </span>
                    {request.logisticStatus === 'COMPLETED' ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={12} /> ยืนยันรถแล้ว
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                        <Clock size={11} /> รอจัดสรรรถ
                      </span>
                    )}
                  </div>
                  <h4 className="text-[12px] font-bold text-slate-900 mb-1">
                    จัดสรรยานพาหนะและคนขับ
                  </h4>
                  <p className="text-[10px] text-slate-600 mb-3">
                    ผู้รับผิดชอบ: Logistic Dispatcher
                  </p>

                  {request.logisticStatus === 'COMPLETED' ? (
                    <div className="bg-white p-2 rounded border border-emerald-200 text-[10px] space-y-1">
                      <div><span className="text-slate-500">ทะเบียน: </span><span className="font-bold text-slate-900">{request.logisticTask?.vehicleNo || vehicleNo}</span></div>
                      <div><span className="text-slate-500">คนขับ: </span><span className="font-medium">{request.logisticTask?.driverName || driverName} ({request.logisticTask?.driverPhone || driverPhone})</span></div>
                      <div><span className="text-slate-500">ประเภท: </span><span className="font-semibold text-teal-800">{request.logisticTask?.vehicleType || vehicleType}</span></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">ทะเบียนรถ (Vehicle No.)</label>
                        <input 
                          type="text" 
                          value={vehicleNo} 
                          onChange={e => setVehicleNo(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block">ชื่อคนขับ (Driver)</label>
                        <input 
                          type="text" 
                          value={driverName} 
                          onChange={e => setDriverName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {request.logisticStatus !== 'COMPLETED' && (role === 'LOGISTIC' || role === 'ADMIN') && isApproved && (
                  <button 
                    onClick={handleLogisticComplete}
                    className="mt-3 w-full bg-teal-700 hover:bg-teal-800 text-white text-[11px] py-1.5 rounded font-bold transition-colors shadow-xs"
                  >
                    ยืนยันจัดสรรรถและคนขับ
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* STEP 5: READY TO DELIVER GATE */}
          <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">5</span>
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">
                  Ready to Deliver Gate (ประตูกลั่นกรองคุณภาพก่อนส่ง)
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isReadyToDeliver ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isReadyToDeliver ? 'PASSED (ผ่านเกณฑ์)' : 'BLOCKING (รอดำเนินการ)'}
              </span>
            </div>

            {/* Checklist of 3 requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] mb-3">
              <div className={`p-2.5 rounded border flex items-center gap-2 ${
                request.rdStatus === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {request.rdStatus === 'COMPLETED' ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-slate-400" />}
                <span className="font-semibold">RD เตรียมสินค้าเสร็จ</span>
              </div>

              <div className={`p-2.5 rounded border flex items-center gap-2 ${
                request.coSaleStatus === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {request.coSaleStatus === 'COMPLETED' ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-slate-400" />}
                <span className="font-semibold">Co-Sale ออก SO ใน ERP</span>
              </div>

              <div className={`p-2.5 rounded border flex items-center gap-2 ${
                request.logisticStatus === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                {request.logisticStatus === 'COMPLETED' ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-slate-400" />}
                <span className="font-semibold">Logistic จัดสรรรถ/คนขับ</span>
              </div>
            </div>

            {isReadyToDeliver ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-[12px] text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  ผ่านเกณฑ์คุณภาพครบทั้ง 3 ฝ่าย พร้อมปล่อยรถส่งมอบตัวอย่างให้ลูกค้า!
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-[11px] text-amber-900 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>ระบบจะล็อคขั้นตอนการส่ง จนกว่าทั้ง RD, Co-Sale และ Logistic จะยืนยันความพร้อมครบถ้วน</span>
              </div>
            )}
          </div>

          {/* STEP 6: DELIVERY EXECUTION PIPELINE */}
          {isReadyToDeliver && (
            <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center">6</span>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900">
                    Delivery Execution Pipeline (ส่งมอบตัวอย่าง & ปิดงาน)
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {request.currentStatus}
                </span>
              </div>

              {/* Status progression bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] mb-4">
                {[
                  { key: RequestStatus.PICKED_UP, label: 'PICKED UP (รับของ)' },
                  { key: RequestStatus.OUT_FOR_DELIVERY, label: 'OUT FOR DELIVERY' },
                  { key: RequestStatus.ARRIVED, label: 'ARRIVED (ถึงที่หมาย)' },
                  { key: RequestStatus.DELIVERED, label: 'DELIVERED (ส่งมอบ)' },
                  { key: RequestStatus.COMPLETED, label: 'COMPLETED (ปิดงาน)' }
                ].map((st, i) => {
                  const statusOrder = [
                    RequestStatus.READY_TO_DELIVER,
                    RequestStatus.PICKED_UP,
                    RequestStatus.OUT_FOR_DELIVERY,
                    RequestStatus.ARRIVED,
                    RequestStatus.DELIVERED,
                    RequestStatus.CUSTOMER_RECEIVED,
                    RequestStatus.COMPLETED
                  ];
                  const currentIndex = statusOrder.indexOf(request.currentStatus);
                  const stepIndex = statusOrder.indexOf(st.key);
                  const isDone = currentIndex >= stepIndex;
                  const isCurrent = request.currentStatus === st.key;

                  return (
                    <div 
                      key={st.key}
                      className={`p-2 rounded border text-center font-bold ${
                        isCurrent ? 'bg-blue-600 text-white border-blue-700 shadow-xs' :
                        isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {st.label}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Driver / Logistic to advance */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                {request.currentStatus === RequestStatus.READY_TO_DELIVER && (
                  <button 
                    onClick={() => advanceDeliveryPipeline(request.sampleNo, RequestStatus.PICKED_UP)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Truck size={14} /> คนขับรับสินค้าขึ้นรถ (Pick Up)
                  </button>
                )}

                {request.currentStatus === RequestStatus.PICKED_UP && (
                  <button 
                    onClick={() => advanceDeliveryPipeline(request.sampleNo, RequestStatus.OUT_FOR_DELIVERY)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Truck size={14} /> ออกเดินทางจัดส่ง (Out for Delivery)
                  </button>
                )}

                {request.currentStatus === RequestStatus.OUT_FOR_DELIVERY && (
                  <button 
                    onClick={() => advanceDeliveryPipeline(request.sampleNo, RequestStatus.ARRIVED)}
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <MapPin size={14} /> ถึงสถานที่ลูกค้า (Arrived)
                  </button>
                )}

                {request.currentStatus === RequestStatus.ARRIVED && (
                  <button 
                    onClick={() => advanceDeliveryPipeline(request.sampleNo, RequestStatus.DELIVERED, { receiverName: request.contactName })}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 size={14} /> ส่งมอบและบันทึก POD (Delivered)
                  </button>
                )}

                {(request.currentStatus === RequestStatus.DELIVERED || request.currentStatus === RequestStatus.CUSTOMER_RECEIVED) && (
                  <button 
                    onClick={() => advanceDeliveryPipeline(request.sampleNo, RequestStatus.COMPLETED)}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2 rounded text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} /> ปิดงานและสรุปผลสำเร็จ (Close Request)
                  </button>
                )}

                {request.currentStatus === RequestStatus.COMPLETED && (
                  <div className="text-emerald-800 font-bold text-[12px] flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    คำขอนี้ปิดงานเรียบร้อยแล้ว ข้อมูลถูกบันทึกลงในระบบและส่งต่อวิเคราะห์ Performance
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Customer Info, Delivery Summary, Items & SLA Card */}
        <div className="flex flex-col gap-4">
          
          {/* SLA Status Card */}
          <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ระบบติดตาม SLA (Live SLA Tracking)
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                ON TIME
              </span>
            </div>
            <div className="space-y-3 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>เป้าหมายเวลา Lead Time:</span>
                  <span className="font-bold text-slate-900">24 ชั่วโมง</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[45%]"></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">ใช้เวลาไปแล้ว: 8 ชม. 20 นาที (อยู่ในเกณฑ์ปกติ)</span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span>Logistic Pre-check:</span>
                  <span className="font-bold text-emerald-700">ผ่านใน 45 นาที (SLA 60m)</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager Approval:</span>
                  <span className="font-bold text-emerald-700">ผ่านใน 40 นาที (SLA 120m)</span>
                </div>
                <div className="flex justify-between">
                  <span>RD Preparation:</span>
                  <span className="font-bold text-blue-700">
                    {request.rdStatus === 'COMPLETED' ? 'เสร็จใน 195 นาที (SLA 240m)' : 'กำลังดำเนินการ'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Route Details */}
          <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
              ข้อมูลลูกค้าและการจัดส่ง
            </h3>
            <div className="space-y-3 text-[12px]">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">ชื่อลูกค้า</span>
                <span className="font-bold text-slate-900">{request.customerName}</span>
                <div className="text-[11px] text-slate-500">{request.customerCode}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">ผู้ติดต่อ</span>
                <span className="font-medium text-slate-800">{request.contactName}</span>
                <div className="text-[11px] text-slate-600">{request.contactPhone}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">สายรถและอุณหภูมิ</span>
                <span className="font-bold text-slate-900 block">{request.route}</span>
                <span className="text-red-700 font-semibold text-[11px]">{request.temperature}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">สถานที่จัดส่ง</span>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {request.deliveryAddress}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">เอกสารแนบที่ขอ</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {request.requiredDocuments.map(doc => (
                    <span key={doc} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                รายการสินค้าตัวอย่าง ({request.lines.length})
              </h3>
              <span className="text-[10px] font-bold text-blue-900">
                รวม {request.totalQty} หน่วย
              </span>
            </div>

            <div className="space-y-2.5">
              {request.lines.map((line, idx) => (
                <div key={line.id || idx} className="border border-slate-200 rounded p-2.5 bg-slate-50/60 text-[11px]">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 leading-tight">{line.productName}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-blue-900 shrink-0 ml-2">
                      {line.requestQty} {line.uom}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>SKU: {line.itemCode}</span>
                    <span>เก็บ: {line.storageType}</span>
                  </div>
                  {line.remark && (
                    <div className="mt-1 text-[10px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-200">
                      "{line.remark}"
                    </div>
                  )}
                  {line.lot && (
                    <div className="mt-1.5 text-[10px] font-mono text-purple-900 font-bold flex items-center justify-between">
                      <span>Lot: {line.lot}</span>
                      <span>Exp: {line.expiryDate}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* PDF Modal */}
      {showPdfModal && (
        <SamplePDFModal 
          request={request} 
          onClose={() => setShowPdfModal(false)} 
        />
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md p-6 max-w-md w-full shadow-xl">
            <h3 className="text-[14px] font-bold text-slate-900 mb-2">ขอให้แก้ไขคำขอ (Request Revision)</h3>
            <p className="text-[11px] text-slate-600 mb-4">
              ระบบจะปรับสถานะเป็น REVISION REQUIRED และสร้าง Revision ใหม่ให้อัตโนมัติ (เช่น REV.01, REV.02)
            </p>
            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ส่วนที่ต้องการให้แก้ไข</label>
                <select 
                  value={revisionSections} 
                  onChange={e => setRevisionSections(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option>รายการสินค้าและปริมาณ</option>
                  <option>วันเวลาและสถานที่จัดส่ง</option>
                  <option>เงื่อนไขการควบคุมอุณหภูมิ</option>
                  <option>เอกสารประกอบ</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ข้อคิดเห็น / คำอธิบายเพิ่มเติม *</label>
                <textarea 
                  rows={3} 
                  value={revisionRemark} 
                  onChange={e => setRevisionRemark(e.target.value)}
                  placeholder="ระบุสิ่งที่ต้องการให้ Sale ปรับปรุงแก้ไข..."
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleRevisionSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded"
              >
                ส่งกลับให้แก้ไข (Revise)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md p-6 max-w-md w-full shadow-xl">
            <h3 className="text-[14px] font-bold text-red-700 mb-2">ปฏิเสธคำขอ (Reject Request)</h3>
            <p className="text-[11px] text-slate-600 mb-4">
              กรุณาระบุเหตุผลในการปฏิเสธ ระบบจะแจ้งเตือน Sale และปิดคำขอนี้
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">เหตุผลในการปฏิเสธ *</label>
              <textarea 
                rows={3} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ไม่เข้าเกณฑ์นโยบายการแจกตัวอย่าง หรือสินค้าไม่มีสต็อกในระยะยาว..."
                className="w-full border border-slate-300 rounded p-2 text-[12px]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change RD Department on Draft Modal (Void old, allocate new) */}
      {showChangeDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md p-6 max-w-lg w-full shadow-2xl border border-amber-200">
            <div className="flex items-center gap-2 mb-3 text-amber-700">
              <Building2 size={20} />
              <h3 className="text-[15px] font-bold text-slate-900">
                เปลี่ยนหน่วยงานย่อย RD (กรณีเอกสารสถานะ DRAFT)
              </h3>
            </div>

            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-[12px] text-amber-900 mb-4 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-950">
                <AlertCircle size={14} className="text-amber-600" />
                เงื่อนไขและผลกระทบของระบบ:
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-900">
                <li>หมายเลขเดิม <span className="font-mono font-bold">{request.sampleNo}</span> จะถูก <strong>VOID</strong> ยกเลิกทันที</li>
                <li>ระบบจะบันทึกประวัติลงใน <strong>Voided Number History & Audit Log</strong></li>
                <li>ระบบจะดึง Running Number ลำดับถัดไปของแผนกใหม่จากเซิร์ฟเวอร์ให้อัตโนมัติ</li>
              </ul>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  แผนก RD เดิม
                </label>
                <div className="font-mono font-bold text-slate-800 bg-slate-100 p-2 rounded border border-slate-200">
                  {request.department} ({request.sampleNo})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  เลือกแผนก RD ใหม่ *
                </label>
                <select
                  value={newDeptCode}
                  onChange={e => setNewDeptCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-[13px] font-semibold"
                >
                  {rdDepartments.filter(d => d.Active).map(dept => (
                    <option key={dept.RD_Department_Code} value={dept.RD_Department_Code}>
                      {dept.RD_Department_Code} (Prefix: {dept.Sample_No_Prefix}) — {dept.RD_Department_Name_TH}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  เหตุผลในการเปลี่ยนแผนก *
                </label>
                <textarea
                  rows={2}
                  value={changeDeptReason}
                  onChange={e => setChangeDeptReason(e.target.value)}
                  placeholder="เช่น ผู้ขอเลือกหน่วยงานผิดตอนร่างคำขอ..."
                  className="w-full border border-slate-300 rounded p-2 text-[12px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                type="button"
                onClick={() => setShowChangeDeptModal(false)}
                disabled={isChangingDept}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button 
                type="button"
                onClick={handleChangeDeptConfirm}
                disabled={isChangingDept}
                className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isChangingDept ? 'กำลังเปลี่ยนแผนกและออกเลขใหม่...' : 'ยืนยันเปลี่ยนแผนก & VOID เลขเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function PipelineNode({ step, title, sub, status }: { step: string; title: string; sub: string; status: 'DONE' | 'ACTIVE' | 'WAITING' }) {
  return (
    <div className={`p-2 rounded border flex flex-col items-center justify-center ${
      status === 'DONE' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
      status === 'ACTIVE' ? 'bg-blue-600 border-blue-700 text-white shadow-xs' :
      'bg-slate-50 border-slate-200 text-slate-400'
    }`}>
      <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center mb-1 ${
        status === 'DONE' ? 'bg-emerald-600 text-white' :
        status === 'ACTIVE' ? 'bg-white text-blue-900 font-black' :
        'bg-slate-200 text-slate-500'
      }`}>
        {step}
      </span>
      <span className="font-bold truncate w-full text-[10px]">{title}</span>
      <span className={`text-[9px] truncate w-full ${status === 'ACTIVE' ? 'text-blue-100' : 'text-slate-500'}`}>{sub}</span>
    </div>
  );
}

function WorkflowCard({ stepNumber, title, subtitle, status, children }: any) {
  const isPassed = status === 'PASSED';
  const isRejected = status === 'REJECTED';

  return (
    <div className="bg-white rounded-sm border border-[var(--color-border-light)] shadow-sm p-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
            isPassed ? 'bg-emerald-600' : isRejected ? 'bg-red-600' : 'bg-blue-900'
          }`}>
            {stepNumber}
          </span>
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div>
          {isPassed ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Check size={11} /> PASSED
            </span>
          ) : isRejected ? (
            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <X size={11} /> REJECTED
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Clock size={11} /> PENDING
            </span>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
