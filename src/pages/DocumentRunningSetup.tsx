import React, { useState } from 'react';
import { 
  Hash, Save, RefreshCw, AlertCircle, CheckCircle2, 
  ArrowRight, ShieldAlert, History, Plus, FileText, FastForward 
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { buildSampleNumber } from '../lib/runningNumberService';

export function DocumentRunningSetup() {
  const { user } = useAuth();
  const { 
    rdDepartments, runningNumbers, auditLogs, 
    setupRunningNumber, skipRunningNumber, refreshSequences 
  } = useRequests();

  const [selectedDeptCode, setSelectedDeptCode] = useState(
    rdDepartments[0]?.RD_Department_Code || 'RM'
  );
  const [year, setYear] = useState<number>(2026);
  const [option, setOption] = useState<'LAST_USED' | 'STARTING_NO'>('LAST_USED');
  const [numberValue, setNumberValue] = useState<number>(562);
  const [digitLength, setDigitLength] = useState<number>(3);
  const [initSource, setInitSource] = useState<string>('Manual Migration');
  const [remark, setRemark] = useState<string>('Migrated from manual book');
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Skip Ahead State Modal
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipRecord, setSkipRecord] = useState<any>(null);
  const [skipTargetNo, setSkipTargetNo] = useState<number>(600);
  const [skipReason, setSkipReason] = useState<string>('');

  const currentDept = rdDepartments.find(
    d => d.RD_Department_Code.toUpperCase() === selectedDeptCode.toUpperCase()
  );
  const prefix = currentDept?.Sample_No_Prefix || selectedDeptCode;

  // Calculate preview
  const calculatedNext = option === 'LAST_USED' ? Number(numberValue) + 1 : Number(numberValue);
  const previewSampleNo = buildSampleNumber(prefix, calculatedNext, year, digitLength);

  // Handle department change in form
  const handleDeptSelect = (code: string) => {
    setSelectedDeptCode(code);
    const existing = runningNumbers.find(
      r => r.RD_Department_Code.toUpperCase() === code.toUpperCase() && r.Year === year
    );
    if (existing) {
      setNumberValue(existing.Last_Used_No);
      setDigitLength(existing.Digit_Length || 3);
      setInitSource(existing.Initialization_Source || 'Manual Migration');
      setRemark(existing.Initialization_Remark || '');
    } else {
      setNumberValue(0);
      setDigitLength(3);
      setInitSource('New Sequence');
      setRemark('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await setupRunningNumber({
        rdDepartmentCode: selectedDeptCode,
        prefix,
        year,
        option,
        numberValue: Number(numberValue),
        digitLength: Number(digitLength),
        initializationSource: initSource,
        remark,
        userEmail: user?.email || 'admin@company.com',
        userName: user?.name || 'Administrator',
        role: user?.role || 'ADMIN'
      });

      setMessage({
        type: 'success',
        text: `บันทึกการตั้งค่า Running Number สำหรับแผนก ${selectedDeptCode} สำเร็จแล้ว (Next No: ${calculatedNext})`
      });
      refreshSequences();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSkipModal = (record: any) => {
    setSkipRecord(record);
    setSkipTargetNo(record.Next_No + 10);
    setSkipReason('');
    setSkipModalOpen(true);
  };

  const handleConfirmSkip = async () => {
    if (!skipReason || skipReason.trim().length < 5) {
      setMessage({
        type: 'error',
        text: 'กรุณาระบุเหตุผลในการข้ามเลขเอกสารอย่างน้อย 5 ตัวอักษร'
      });
      return;
    }

    try {
      await skipRunningNumber({
        rdDepartmentCode: skipRecord.RD_Department_Code,
        year: skipRecord.Year,
        newNextNo: Number(skipTargetNo),
        reason: skipReason,
        userEmail: user?.email || 'admin@company.com',
        userName: user?.name || 'Administrator',
        role: user?.role || 'ADMIN'
      });

      setMessage({
        type: 'success',
        text: `ข้ามเลขเอกสาร ${skipRecord.RD_Department_Code} ไปยัง ${skipTargetNo} สำเร็จและบันทึก Audit Log แล้ว`
      });
      setSkipModalOpen(false);
      refreshSequences();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'ไม่สามารถข้ามเลขเอกสารได้'
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Hash size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Document Running Number Setup
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดค่าเลขรันเอกสารเริ่มต้น / โอนย้ายจากสมุดคุมมือสำหรับแต่ละหน่วยงาน RD (Server-Side Concurrency Protected)
          </p>
        </div>

        <button
          onClick={refreshSequences}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw size={14} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Setup Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              ตั้งค่าลำดับเลขเอกสาร (SRI Sequence Setup)
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Year {year}
          </span>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Department Select (Dynamic from RD_DEPARTMENT_MASTER) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                หน่วยงาน RD (RD Department Master) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDeptCode}
                onChange={(e) => handleDeptSelect(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {rdDepartments.map((dept) => (
                  <option key={dept.RD_Department_Code} value={dept.RD_Department_Code}>
                    {dept.RD_Department_Code} — {dept.RD_Department_Name_TH} (Prefix: {dept.Sample_No_Prefix})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Prefix: <strong className="text-slate-800">{prefix}</strong> | Supervisor: {currentDept?.Supervisor_Name || '-'}
              </p>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ปี พ.ศ./ค.ศ. (Document Year) <span className="text-rose-500">*</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2026}>2026 (ปีปัจจุบัน)</option>
                <option value={2027}>2027 (ปีถัดไป)</option>
                <option value={2025}>2025 (ย้อนหลัง)</option>
              </select>
            </div>

            {/* Digit Length */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                จำนวนหลักตัวเลข (Digit Length)
              </label>
              <select
                value={digitLength}
                onChange={(e) => setDigitLength(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={3}>3 หลัก (001 - 999 ขยายอัตโนมัติหากเกิน)</option>
                <option value={4}>4 หลัก (0001 - 9999)</option>
                <option value={5}>5 หลัก (00001 - 99999)</option>
              </select>
            </div>
          </div>

          {/* Option A vs Option B */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              เลือกวิธีการกำหนดลำดับเลขเริ่มต้น (Migration / Initial Method)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`p-3.5 border rounded-lg cursor-pointer flex items-start gap-3 transition-colors ${
                  option === 'LAST_USED'
                    ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="option"
                  value="LAST_USED"
                  checked={option === 'LAST_USED'}
                  onChange={() => setOption('LAST_USED')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Option A: กำหนดจากเลขที่ใช้งานล่าสุด (Last Used Number)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    เช่น เลขสุดท้ายในสมุดคุมคือ 562 → ระบบจะออกเลขถัดไปคือ <strong>563</strong>
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 border rounded-lg cursor-pointer flex items-start gap-3 transition-colors ${
                  option === 'STARTING_NO'
                    ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="option"
                  value="STARTING_NO"
                  checked={option === 'STARTING_NO'}
                  onChange={() => setOption('STARTING_NO')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Option B: กำหนดจากเลขเริ่มต้นของระบบ (Starting Number)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    เช่น ต้องการเริ่มระบบใหม่ที่ 001 หรือ 563 โดยตรง
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {option === 'LAST_USED' ? 'เลขที่ใช้งานล่าสุด (Last Used No)' : 'เลขเริ่มต้นของระบบ (Starting No)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={numberValue}
                  onChange={(e) => setNumberValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono font-semibold"
                  placeholder="เช่น 562 หรือ 1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แหล่งที่มา (Initialization Source)
                </label>
                <input
                  type="text"
                  value={initSource}
                  onChange={(e) => setInitSource(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="เช่น Manual Migration, New Sequence"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุการบันทึก (Remark)
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="เช่น เอกสารใบสุดท้ายในสมุดคือ SRI-RM562-2026"
                />
              </div>
            </div>
          </div>

          {/* Real-time Preview Banner (Part 10) */}
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                ตัวอย่างเลขคำขอตัวอย่างถัดไปที่จะถูกสร้าง (Real-time Preview)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-black font-mono tracking-tight text-blue-900 bg-white px-3 py-1 rounded border border-blue-200 shadow-2xs">
                  {previewSampleNo}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  REV.00
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 sm:text-right">
              <div>Next Sequence No: <strong>{calculatedNext}</strong></div>
              <div>Prefix: <strong>{prefix}</strong> | Format: SRI-{prefix}XXX-{year}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs transition-colors"
            >
              <Save size={16} />
              {isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการตั้งค่า Running Number'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Sequences Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 text-slate-500">
              <FileText size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              ตารางสถานะลำดับเลขที่เอกสารปัจจุบัน (DOCUMENT_RUNNING_NO)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            ทั้งหมด {runningNumbers.length} ลำดับ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">แผนก RD</th>
                <th className="py-3 px-3">Prefix</th>
                <th className="py-3 px-3">ปี</th>
                <th className="py-3 px-3 text-right">Last Used</th>
                <th className="py-3 px-3 text-right">Next Number</th>
                <th className="py-3 px-4">ตัวอย่างเลขถัดไป</th>
                <th className="py-3 px-3">สถานะตั้งค่า</th>
                <th className="py-3 px-3">แหล่งที่มา</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runningNumbers.map((rec) => {
                const samplePreview = buildSampleNumber(
                  rec.RD_Department_Prefix,
                  rec.Next_No,
                  rec.Year,
                  rec.Digit_Length || 3
                );
                return (
                  <tr key={rec.Running_ID} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {rec.RD_Department_Code}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {rec.RD_Department_Prefix}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {rec.Year}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                      {rec.Last_Used_No}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {rec.Next_No}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {samplePreview}
                    </td>
                    <td className="py-3 px-3">
                      {rec.Initialized ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 size={12} /> พร้อมใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle size={12} /> ยังไม่ตั้งค่า
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {rec.Initialization_Source || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeptSelect(rec.RD_Department_Code)}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleOpenSkipModal(rec)}
                          className="px-2.5 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                          title="ข้ามเลขเอกสาร (Skip Sequence)"
                        >
                          <FastForward size={12} /> ข้ามเลข
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Notice & Rules (Part 11 & 12) */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 text-xs text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
          <ShieldAlert size={16} />
          กฎความปลอดภัยระบบ Running Number (Running Number Safety Enforcements):
        </div>
        <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
          <li>
            <strong>Server-side Generation:</strong> ระบบไม่อนุญาตให้ออกเลขคำขอที่ Client ฝั่งผู้ใช้เด็ดขาด เพื่อป้องกันเลขซ้ำจากการกดพร้อมกัน (Concurrency Safe with Lock).
          </li>
          <li>
            <strong>Edit Safety:</strong> เมื่อมีเอกสารในระบบถูกออกไปแล้ว ระบบจะไม่อนุญาตให้ลด Last Used Number หรือตั้งค่า Next Number ย้อนหลัง.
          </li>
          <li>
            <strong>Skip Ahead Audit:</strong> กรณีต้องการข้ามเลขเอกสาร (เช่น จองช่วงเลขให้สมุดกระดาษ) ต้องระบุเหตุผลและจะถูกบันทึกลงใน Audit Log อย่างเคร่งครัด.
          </li>
          <li>
            <strong>Uninitialized Gate:</strong> หากแผนกใดปีใดยังไม่ได้ตั้งค่าเลขเริ่มต้น ระบบจะไม่อนุญาตให้ออกคำขอตัวอย่างจนกว่า Admin จะกำหนดค่าเสร็จสิ้น.
          </li>
        </ul>
      </div>

      {/* Skip Number Modal */}
      {skipModalOpen && skipRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <FastForward size={18} />
                ข้ามลำดับเลขเอกสาร (Skip Running Number)
              </div>
              <button
                onClick={() => setSkipModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              กำลังข้ามเลขสำหรับแผนก <strong>{skipRecord.RD_Department_Code}</strong> ปี {skipRecord.Year} 
              (Next No ปัจจุบัน: <strong>{skipRecord.Next_No}</strong>)
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                กำหนด Next Number ใหม่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={skipRecord.Next_No + 1}
                value={skipTargetNo}
                onChange={(e) => setSkipTargetNo(parseInt(e.target.value, 10) || skipRecord.Next_No + 1)}
                className="w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-lg font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                เลขช่วง {skipRecord.Next_No} ถึง {skipTargetNo - 1} จะถูกสำรองและทำเครื่องหมายว่า "ข้าม"
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เหตุผลในการข้ามเลขเอกสาร (จำเป็นต้องระบุ) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="ระบุเหตุผลอย่างชัดเจน เช่น สำรองช่วงเลขสำหรับงานด่วนออฟไลน์..."
                rows={3}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSkipModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
              >
                ยืนยันการข้ามเลขเอกสาร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
