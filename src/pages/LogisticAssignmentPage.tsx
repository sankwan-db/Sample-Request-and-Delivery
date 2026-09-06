import React, { useState } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestStatus, SampleRequest } from '../types';
import { 
  Truck, Search, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Phone, User, Calendar, ShieldCheck, 
  CheckSquare, Eye, Edit3, X, Save, Navigation, Package
} from 'lucide-react';
import { Link } from 'react-router';
import { SamplePDFModal } from '../components/SamplePDFModal';

export function LogisticAssignmentPage() {
  const { requests, completeLogisticAssignment, updateLogisticTask, evaluateGate } = useRequests();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'CONFIRMED' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ALL');

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<SampleRequest | null>(null);
  const [pdfModalRequest, setPdfModalRequest] = useState<SampleRequest | null>(null);

  // Form Fields (Part 73)
  const [vehicleType, setVehicleType] = useState('4-Wheel Cold Truck (-18°C)');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [route, setRoute] = useState('');
  const [pickupTime, setPickupTime] = useState('08:30');
  const [etaTime, setEtaTime] = useState('11:00');
  const [remark, setRemark] = useState('');

  const openAssignModal = (req: SampleRequest) => {
    setSelectedRequest(req);
    setVehicleType(req.logisticTask?.vehicleType || (req.temperature.includes('Freeze') || req.temperature.includes('Chilled') ? '4-Wheel Temperature Controlled Truck' : '4-Wheel Ambient Van'));
    setVehicleNo(req.logisticTask?.vehicleNo || '1ฒผ-8899');
    setDriverName(req.logisticTask?.driverName || 'นายสมชาย ขับดี');
    setDriverPhone(req.logisticTask?.driverPhone || '081-445-6677');
    setRoute(req.logisticTask?.route || req.route);
    setPickupTime(req.logisticTask?.pickupTime || '08:30');
    setEtaTime(req.logisticTask?.eta || '11:00');
    setRemark(req.logisticTask?.deliveryRemark || '');
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!vehicleNo.trim() || !driverName.trim() || !driverPhone.trim()) {
      alert('กรุณากรอกข้อมูล ทะเบียนรถ, ชื่อพนักงานขับรถ, และเบอร์โทรศัพท์');
      return;
    }

    // Part 73: เมื่อ Vehicle Confirmed -> เรียก completeLogisticAssignment -> checkReadyToDeliverGate()
    completeLogisticAssignment(selectedRequest.sampleNo, {
      vehicleType,
      vehicleNo,
      driverName,
      driverPhone
    });

    // Also persist route, pickup, and eta
    updateLogisticTask(selectedRequest.sampleNo, {
      route,
      pickupTime,
      eta: etaTime,
      deliveryRemark: remark
    });

    setSelectedRequest(null);
  };

  // Filter requests that are past approval
  const approvedRequests = requests.filter(r => 
    ![RequestStatus.DRAFT, RequestStatus.LOGISTIC_PRE_CHECK, RequestStatus.WAITING_APPROVAL, RequestStatus.REJECTED].includes(r.currentStatus)
  );

  const filteredList = approvedRequests.filter(req => {
    const isAssigned = Boolean(req.logisticTask?.vehicleNo?.trim() && req.logisticTask?.driverName?.trim());

    if (activeTab === 'PENDING' && isAssigned) return false;
    if (activeTab === 'CONFIRMED' && !isAssigned) return false;

    if (selectedRoute !== 'ALL' && req.route !== selectedRoute) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        req.sampleNo.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        req.deliveryAddress.toLowerCase().includes(q) ||
        (req.logisticTask?.vehicleNo || '').toLowerCase().includes(q) ||
        (req.logisticTask?.driverName || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const countPending = approvedRequests.filter(r => !(r.logisticTask?.vehicleNo?.trim() && r.logisticTask?.driverName?.trim())).length;
  const countConfirmed = approvedRequests.filter(r => Boolean(r.logisticTask?.vehicleNo?.trim() && r.logisticTask?.driverName?.trim())).length;

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Operations</Link>
            <span>/</span>
            <span className="text-slate-800">Logistic Final Assignment (PART 73)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Logistic Vehicle & Driver Assignment
              </h1>
              <p className="text-[12px] text-slate-500">
                มอบหมายรถขนส่ง, พนักงานขับรถ, กำหนดเส้นทาง (Route), และเวลา Pickup / ETA
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-[11px] font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-slate-600">Gate Condition:</span>
            <span className="font-bold text-slate-800">Vehicle Confirmed</span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'PENDING'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock size={15} />
            <span>Pending Assignment (รอมอบหมายรถ)</span>
            <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countPending}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CONFIRMED')}
            className={`px-4 py-2 rounded-t-md text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'CONFIRMED'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Assigned & Confirmed (มอบหมายแล้ว)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
              {countConfirmed}
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
            <span>All Approved ({approvedRequests.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="ค้นหา ทะเบียน, คนขับ, ลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded py-1.5 pl-9 pr-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-white border border-slate-200 rounded py-1.5 px-3 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
          >
            <option value="ALL">ทุกสายส่ง (All Routes)</option>
            <option value="BKK-CENTRAL (Zone A)">BKK-CENTRAL (Zone A)</option>
            <option value="BKK-SOUTH (Zone B)">BKK-SOUTH (Zone B)</option>
            <option value="UPCOUNTRY-NORTH">UPCOUNTRY-NORTH</option>
            <option value="UPCOUNTRY-EAST">UPCOUNTRY-EAST</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Sample No</th>
                <th className="py-3 px-4">Customer & Destination</th>
                <th className="py-3 px-4">Delivery Window</th>
                <th className="py-3 px-4">Route & Temp</th>
                <th className="py-3 px-4">Assigned Vehicle</th>
                <th className="py-3 px-4">Driver & Contact</th>
                <th className="py-3 px-4">Gate Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Truck size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">ไม่มีรายการในคิว</p>
                  </td>
                </tr>
              ) : (
                filteredList.map(req => {
                  const isAssigned = Boolean(req.logisticTask?.vehicleNo?.trim() && req.logisticTask?.driverName?.trim());
                  const gate = evaluateGate(req.sampleNo);

                  return (
                    <tr key={req.sampleNo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <Link to={`/sample/${req.sampleNo}`} className="font-bold text-blue-600 hover:underline">
                          {req.sampleNo}
                        </Link>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {req.lines.length} SKUs ({req.lines.reduce((s, l) => s + (l.requestQty || 0), 0)} KG)
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{req.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                          <MapPin size={11} className="shrink-0 text-slate-400" />
                          <span>{req.deliveryAddress}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{req.deliveryDate}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {req.deliveryTimeFrom} - {req.deliveryTimeTo}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{req.route}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          req.temperature.includes('Freeze') 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : req.temperature.includes('Chilled') 
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {req.temperature}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {isAssigned ? (
                          <div>
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 block w-fit">
                              {req.logisticTask?.vehicleNo}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">
                              {req.logisticTask?.vehicleType}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-medium flex items-center gap-1 w-fit">
                            <Clock size={11} /> รอมอบหมายรถ
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isAssigned ? (
                          <div>
                            <div className="font-bold text-slate-800">{req.logisticTask?.driverName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone size={11} className="text-slate-400" />
                              <span>{req.logisticTask?.driverPhone}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${gate.criteria.vehicleConfirmed ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                          <span className="text-[11px] font-semibold text-slate-700">
                            {gate.criteria.vehicleConfirmed ? 'Vehicle Ready' : 'Vehicle Pending'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Gate: {gate.isReady ? '✅ Ready' : '⏳ Waiting'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openAssignModal(req)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Truck size={12} />
                            <span>{isAssigned ? 'แก้ไขรถ' : 'มอบหมาย'}</span>
                          </button>

                          <button
                            onClick={() => setPdfModalRequest(req)}
                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded border border-slate-200"
                            title="ดูเอกสารใบขอตัวอย่าง"
                          >
                            <Eye size={14} />
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

      {/* Assignment Modal (PART 73) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmAssignment} className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="text-blue-400" size={18} />
                <h3 className="font-bold text-[14px]">
                  มอบหมายยานพาหนะและพนักงานขับรถ — {selectedRequest.sampleNo}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-[12px]">
              {/* Delivery Destination Card */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-500 block text-[11px]">ลูกค้าปลายทาง:</span>
                    <span className="font-bold text-slate-800 text-[13px]">{selectedRequest.customerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">ควบคุมอุณหภูมิ:</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                      {selectedRequest.temperature}
                    </span>
                  </div>
                </div>

                <div className="text-slate-600 text-[11px] pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">ที่อยู่จัดส่ง:</span> {selectedRequest.deliveryAddress}, {selectedRequest.district}, {selectedRequest.province}
                </div>
              </div>

              {/* Form Fields: Vehicle Type, Vehicle No, Driver, Phone, Route, Pickup, ETA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vehicle Type (ประเภทยานพาหนะ) *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="4-Wheel Temperature Controlled Truck">รถกระบะ 4 ล้อ ตู้ทึบควบคุมอุณหภูมิ (-18°C / +4°C)</option>
                    <option value="6-Wheel Cold Truck">รถบรรทุก 6 ล้อ ห้องเย็น (-18°C)</option>
                    <option value="4-Wheel Ambient Van">รถตู้ทึบ 4 ล้อ อุณหภูมิห้อง (Ambient)</option>
                    <option value="Motorcycle Box">รถจักรยานยนต์ส่งด่วน (เฉพาะงานด่วนพิเศษ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vehicle No (ทะเบียนรถ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="เช่น 1ฒผ-8899 กทม."
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Driver (ชื่อพนักงานขับรถ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="เช่น นายสมชาย ขับดี"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Driver Phone (เบอร์โทรศัพท์คนขับ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="เช่น 081-445-6677"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Route (สายส่ง)
                  </label>
                  <input
                    type="text"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pickup Time (เวลารับของ)
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ETA (เวลาถึงประมาณการ)
                  </label>
                  <input
                    type="time"
                    value={etaTime}
                    onChange={(e) => setEtaTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  หมายเหตุเพิ่มเติมสำหรับคนขับ
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="เช่น ต้องแลกบัตรอาคารชั้น 1, ให้โทรหาผู้รับก่อนถึง 15 นาที"
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Gate Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckSquare className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <span className="font-bold block">Vehicle Confirmation & Ready to Deliver Gate:</span>
                  <span>เมื่อกด <strong>"ยืนยันมอบหมายรถ (Confirm Vehicle)"</strong> ระบบจะเรียกใช้ฟังก์ชัน <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">checkReadyToDeliverGate()</code> ทันที หากแผนก RD และ Co-Sale พร้อมแล้ว คำขอจะพร้อมจัดส่งทันที</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-[12px] font-medium text-slate-700 hover:bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> ยืนยันมอบหมายรถ (Confirm Vehicle)
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
