import React, { useState } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestStatus, SampleRequest } from '../types';
import { 
  Truck, Navigation, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Phone, User, Calendar, Camera, Upload, 
  FileCheck2, ShieldCheck, ChevronRight, Eye, Edit3, X, 
  Send, AlertCircle, RefreshCw, Layers, Search
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function DeliveryOperationsPage() {
  const { requests, advanceDeliveryPipeline, reportIssue, resolveIssue } = useRequests();
  const { user } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'ACTIVE_DELIVERY' | 'ISSUES' | 'COMPLETED' | 'ALL'>(
    location.pathname === '/logistic/issue' ? 'ISSUES' : 'ACTIVE_DELIVERY'
  );
  React.useEffect(() => {
    if (location.pathname === '/logistic/issue') setActiveTab('ISSUES');
  }, [location.pathname]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pipeline status update modal
  const [activeActionRequest, setActiveActionRequest] = useState<SampleRequest | null>(null);
  const [targetNextStatus, setTargetNextStatus] = useState<RequestStatus | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [podPhotoUrl, setPodPhotoUrl] = useState('');
  const [deliveryRemark, setDeliveryRemark] = useState('');
  
  // PDF & Issue modals
  const [pdfModalRequest, setPdfModalRequest] = useState<SampleRequest | null>(null);
  const [issueModalRequest, setIssueModalRequest] = useState<SampleRequest | null>(null);
  const [issueType, setIssueType] = useState('RECIPIENT_UNAVAILABLE');
  const [issueDesc, setIssueDesc] = useState('');

  const openStatusAction = (req: SampleRequest, nextStatus: RequestStatus) => {
    setActiveActionRequest(req);
    setTargetNextStatus(nextStatus);
    setReceiverName(req.contactName || '');
    setPodPhotoUrl(req.logisticTask?.podUrl || '');
    setDeliveryRemark('');
  };

  const handleConfirmPipelineAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionRequest || !targetNextStatus) return;

    advanceDeliveryPipeline(activeActionRequest.sampleNo, targetNextStatus, {
      podUrl: podPhotoUrl || (targetNextStatus === RequestStatus.DELIVERED ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80' : undefined),
      receiverName: receiverName || activeActionRequest.contactName,
      remark: deliveryRemark
    });

    setActiveActionRequest(null);
    setTargetNextStatus(null);
  };

  const handleReportIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModalRequest || !issueDesc.trim()) return;

    reportIssue(issueModalRequest.sampleNo, {
      department: 'LOGISTIC',
      issueType,
      description: issueDesc,
      reportedBy: user?.name || 'Logistic / Driver'
    });

    setIssueModalRequest(null);
    setIssueDesc('');
  };

  // Delivery-relevant requests (Ready to Deliver onwards)
  const deliveryStages = [
    RequestStatus.READY_TO_DELIVER,
    RequestStatus.PICKED_UP,
    RequestStatus.OUT_FOR_DELIVERY,
    RequestStatus.ARRIVED,
    RequestStatus.DELIVERED,
    RequestStatus.CUSTOMER_RECEIVED,
    RequestStatus.COMPLETED
  ];

  const deliveryRequests = requests.filter(r => deliveryStages.includes(r.currentStatus));
  const deliveryIssueRequests = requests.filter(req => (req.issues || []).some(issue =>
    issue.status === 'OPEN' && (issue.department === 'LOGISTIC' || /DELIVERY|DELAY|CUSTOMER_REJECT|FAILED/i.test(issue.issueType))
  ));
  const visibleRequests = activeTab === 'ISSUES' ? deliveryIssueRequests : deliveryRequests;

  const filteredList = visibleRequests.filter(req => {
    const isCompleted = req.currentStatus === RequestStatus.COMPLETED;

    if (activeTab === 'ACTIVE_DELIVERY' && isCompleted) return false;
    if (activeTab === 'COMPLETED' && !isCompleted) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        req.sampleNo.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        (req.logisticTask?.vehicleNo || '').toLowerCase().includes(q) ||
        (req.logisticTask?.driverName || '').toLowerCase().includes(q) ||
        req.currentStatus.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const countActive = deliveryRequests.filter(r => r.currentStatus !== RequestStatus.COMPLETED).length;
  const countCompleted = deliveryRequests.filter(r => r.currentStatus === RequestStatus.COMPLETED).length;
  const countIssues = deliveryIssueRequests.length;

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Operations</Link>
            <span>/</span>
            <span className="text-slate-800">Delivery Operations (PART 74)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Navigation size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Delivery Pipeline & Field Operations
              </h1>
              <p className="text-[12px] text-slate-500">
                ติดตามสถานะการจัดส่ง (Ready → Picked Up → Out for Delivery → Arrived → Delivered → Completed)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded text-[11px] font-mono flex items-center gap-2 text-emerald-900">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Delivered + No Issues =</span>
            <span className="font-bold">COMPLETED</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ACTIVE_DELIVERY')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ACTIVE_DELIVERY'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck size={15} />
            <span>Active Deliveries (กำลังจัดส่ง)</span>
            <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countActive}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ISSUES')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ISSUES'
                ? 'border-rose-600 text-rose-700 bg-rose-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={15} />
            <span>Delivery Delay & Issue</span>
            <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded-full font-bold">{countIssues}</span>
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
            <span>Delivered & Completed (ส่งมอบสำเร็จ)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countCompleted}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'ALL'
                ? 'border-slate-800 text-slate-900 bg-slate-100'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>All Shipments ({deliveryRequests.length})</span>
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="ค้นหา Sample No, ลูกค้า, ทะเบียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded py-1.5 pl-9 pr-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Delivery Cards / Table */}
      <div className="grid grid-cols-1 gap-4">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
            <Truck size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">ไม่มีรายการจัดส่งในสถานะนี้</p>
          </div>
        ) : (
          filteredList.map(req => {
            const openIssues = (req.issues || []).filter(i => i.status === 'OPEN');
            const hasIssue = openIssues.length > 0;

            return (
              <div 
                key={req.sampleNo} 
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[14px]">
                      {req.department}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to={`/sample/${req.sampleNo}`} className="font-mono font-bold text-[15px] text-blue-600 hover:underline">
                          {req.sampleNo}
                        </Link>
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                          {req.revision || 'REV.00'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          req.currentStatus === RequestStatus.COMPLETED
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.currentStatus === RequestStatus.DELIVERED
                            ? 'bg-blue-100 text-blue-800'
                            : req.currentStatus === RequestStatus.ARRIVED
                            ? 'bg-indigo-100 text-indigo-800'
                            : req.currentStatus === RequestStatus.OUT_FOR_DELIVERY
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {req.currentStatus}
                        </span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 mt-0.5">{req.customerName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Step Actions (PART 74) */}
                    {req.currentStatus === RequestStatus.READY_TO_DELIVER && (
                      <button
                        onClick={() => openStatusAction(req, RequestStatus.PICKED_UP)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Truck size={14} /> 1. Picked Up (รับของขึ้นรถ)
                      </button>
                    )}

                    {req.currentStatus === RequestStatus.PICKED_UP && (
                      <button
                        onClick={() => openStatusAction(req, RequestStatus.OUT_FOR_DELIVERY)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Navigation size={14} /> 2. Out for Delivery (กำลังนำส่ง)
                      </button>
                    )}

                    {req.currentStatus === RequestStatus.OUT_FOR_DELIVERY && (
                      <button
                        onClick={() => openStatusAction(req, RequestStatus.ARRIVED)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <MapPin size={14} /> 3. Arrived (ถึงปลายทาง)
                      </button>
                    )}

                    {req.currentStatus === RequestStatus.ARRIVED && (
                      <button
                        onClick={() => openStatusAction(req, RequestStatus.DELIVERED)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <FileCheck2 size={14} /> 4. Delivered (ส่งมอบสำเร็จ & บันทึก POD)
                      </button>
                    )}

                    {req.currentStatus === RequestStatus.DELIVERED && (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" /> ส่งมอบแล้ว (Delivered)
                      </span>
                    )}

                    {req.currentStatus === RequestStatus.COMPLETED && (
                      <span className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-emerald-700" /> Completed (เสร็จสิ้นสมบูรณ์)
                      </span>
                    )}

                    <button
                      onClick={() => setPdfModalRequest(req)}
                      className="p-1.5 border border-slate-200 rounded text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                      title="ดูใบขอตัวอย่าง PDF"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      onClick={() => setIssueModalRequest(req)}
                      className="p-1.5 border border-slate-200 rounded text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                      title="แจ้งเหตุขัดข้องการจัดส่ง"
                    >
                      <AlertTriangle size={15} />
                    </button>
                  </div>
                </div>

                {/* Pipeline Progress Bar (Part 74) */}
                <div className="py-3">
                  <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
                    <div className={`p-1.5 rounded ${req.currentStatus !== RequestStatus.DRAFT ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                      1. Ready to Deliver
                    </div>
                    <div className={`p-1.5 rounded ${[RequestStatus.PICKED_UP, RequestStatus.OUT_FOR_DELIVERY, RequestStatus.ARRIVED, RequestStatus.DELIVERED, RequestStatus.COMPLETED].includes(req.currentStatus) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                      2. Picked Up
                    </div>
                    <div className={`p-1.5 rounded ${[RequestStatus.OUT_FOR_DELIVERY, RequestStatus.ARRIVED, RequestStatus.DELIVERED, RequestStatus.COMPLETED].includes(req.currentStatus) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                      3. Out for Delivery
                    </div>
                    <div className={`p-1.5 rounded ${[RequestStatus.ARRIVED, RequestStatus.DELIVERED, RequestStatus.COMPLETED].includes(req.currentStatus) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                      4. Arrived
                    </div>
                    <div className={`p-1.5 rounded ${[RequestStatus.DELIVERED, RequestStatus.COMPLETED].includes(req.currentStatus) ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                      5. Delivered
                    </div>
                  </div>
                </div>

                {/* Logistics & Timestamps (Part 74 Fields) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded text-[11px] border border-slate-100 mt-1">
                  <div>
                    <span className="text-slate-500 block">ยานพาหนะ & คนขับ:</span>
                    <span className="font-bold text-slate-800 font-mono block">
                      {req.logisticTask?.vehicleNo || '1ฒผ-8899'} ({req.logisticTask?.driverName || 'สมชาย ขับดี'})
                    </span>
                    <span className="text-slate-500 font-mono">{req.logisticTask?.driverPhone || '081-445-6677'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">ETA / หน้างาน:</span>
                    <span className="font-bold text-blue-700 block font-mono">
                      ETA: {req.logisticTask?.eta || '11:00'}
                    </span>
                    <span className="text-slate-600">
                      Pickup: {req.logisticTask?.actualPickup || '08:30'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">ปลายทาง & อุณหภูมิ:</span>
                    <span className="font-semibold text-slate-800 block truncate" title={req.deliveryAddress}>
                      {req.deliveryAddress}
                    </span>
                    <span className="text-slate-600 font-medium">Temp: {req.temperature}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">ผู้รับมอบ & หลักฐาน POD:</span>
                    <span className="font-bold text-slate-800 block">
                      {req.contactName || 'คุณวิชัย เจริญกิจ'}
                    </span>
                    {req.logisticTask?.podUrl ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={12} /> มีภาพถ่าย POD
                      </span>
                    ) : (
                      <span className="text-slate-400">ยังไม่มีเอกสาร POD</span>
                    )}
                  </div>
                </div>

                {/* Open Issues if any */}
                {hasIssue && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded p-2.5 text-[11px] text-rose-900 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={14} />
                      <div>
                        <span className="font-bold">ปัญหาติดขัดที่กำลังรอดำเนินการ: </span>
                        <span>{openIssues[0].description} ({openIssues[0].issueType})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => resolveIssue(req.sampleNo, openIssues[0].id, 'แก้ไขเรียบร้อย')}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded font-bold text-[10px] shrink-0"
                    >
                      ปลดล็อกปัญหา
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Advance Status Modal */}
      {activeActionRequest && targetNextStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmPipelineAdvance} className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="text-emerald-400" size={18} />
                <h3 className="font-bold text-[14px]">
                  อัปเดตสถานะการจัดส่ง → {targetNextStatus}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveActionRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-[12px]">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <div className="font-bold text-slate-800 text-[13px]">{activeActionRequest.customerName}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">{activeActionRequest.sampleNo}</div>
              </div>

              {targetNextStatus === RequestStatus.DELIVERED && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อผู้รับมอบตัวอย่าง (Received By) *
                    </label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="เช่น คุณวิชัย เจริญกิจ (หัวหน้าฝ่ายจัดซื้อ)"
                      className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      รูปภาพหลักฐานการส่งมอบ (POD / Proof of Delivery Photo)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <Camera className="mx-auto text-slate-400 mb-1" size={24} />
                      <span className="text-[11px] text-slate-600 font-semibold block">
                        ถ่ายภาพหรืออัปโหลดรูปใบเซ็นรับของ (POD)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ระบบจะแนบหลักฐานเข้ากับใบคำขออัตโนมัติ
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (Remark)
                </label>
                <input
                  type="text"
                  value={deliveryRemark}
                  onChange={(e) => setDeliveryRemark(e.target.value)}
                  placeholder="เช่น ส่งมอบตรงเวลา อุณหภูมิสินค้า -18.4°C สมบูรณ์"
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {targetNextStatus === RequestStatus.DELIVERED && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-[11px] text-emerald-900">
                  <span className="font-bold block">Auto-Completion:</span>
                  <span>เมื่อบันทึกสถานะเป็น Delivered และไม่มี Open Issue ระบบจะปรับสถานะเป็น <strong>COMPLETED (เสร็จสมบูรณ์)</strong> โดยอัตโนมัติ</span>
                </div>
              )}
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveActionRequest(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-medium text-slate-700 hover:bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[12px] font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> ยืนยันปรับสถานะเป็น {targetNextStatus}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report Issue Modal */}
      {issueModalRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReportIssue} className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="bg-rose-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-[14px]">แจ้งเหตุขัดข้องการจัดส่ง — {issueModalRequest.sampleNo}</h3>
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
                <label className="block font-bold text-slate-700 mb-1">สาเหตุความขัดข้อง (Issue Type)</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="RECIPIENT_UNAVAILABLE">ผู้รับไม่อยู่ / ติดต่อไม่ได้</option>
                  <option value="TRAFFIC_DELAY">การจราจรติดขัดรุนแรง / ส่งไม่ทันตามเวลาที่นัด</option>
                  <option value="TEMPERATURE_WARNING">อุณหภูมิตู้แช่เริ่มเบี่ยงเบนจากเกณฑ์</option>
                  <option value="WRONG_ADDRESS">ที่อยู่ปลายทางไม่ตรงกับเอกสาร</option>
                  <option value="CUSTOMER_REFUSED">ลูกค้าปฏิเสธการรับสินค้า</option>
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดและแนวทางแก้ไข *</label>
                <textarea
                  rows={4}
                  required
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="ระบุรายละเอียดเหตุการณ์ และสิ่งที่ประสานงานเบื้องต้น..."
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
                <Send size={13} /> ส่งรายงานเหตุขัดข้อง
              </button>
            </div>
          </form>
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
