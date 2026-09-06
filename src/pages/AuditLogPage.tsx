import React, { useState } from 'react';
import { History, Ban, ShieldCheck, Search, Filter, RefreshCw, FileText } from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';

export function AuditLogPage() {
  const { auditLogs, voidedNumbers, refreshSequences } = useRequests();
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'VOIDED'>('AUDIT');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVoided = voidedNumbers.filter(v =>
    v.sampleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.voidedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <History size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Audit Logs & Voided Documents
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ประวัติการเปลี่ยนแปลงลำดับเลขเอกสาร การข้ามเลข และรายการเลขตัวอย่างที่ถูก VOID (ห้ามนำกลับมาใช้ใหม่)
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

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 border-b border-slate-200 sm:border-0 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 ${
              activeTab === 'AUDIT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck size={15} />
            Audit Log ทั้งหมด ({auditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('VOIDED')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 ${
              activeTab === 'VOIDED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Ban size={15} />
            รายการเลขที่ถูก VOID ({voidedNumbers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา Action, เลขที่, หรือผู้ใช้..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-4">รายละเอียด</th>
                  <th className="py-3 px-3">ผู้ดำเนินการ</th>
                  <th className="py-3 px-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      ไม่พบข้อมูล Audit Log ที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          log.action.includes('VOID')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.action.includes('SKIP')
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : log.action.includes('GENERATE')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {log.targetId}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-md">
                        {log.details}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{log.userName}</div>
                        <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-semibold text-[11px]">
                        {log.role}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Voided Numbers */}
      {activeTab === 'VOIDED' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-rose-50/40 border-b border-rose-100 flex items-center gap-2 text-xs text-rose-800">
            <Ban size={15} className="shrink-0 text-rose-600" />
            <span>
              เลขตัวอย่างในตารางนี้ถือเป็น <strong>VOIDED_SAMPLE_NO</strong> ถูกยกเลิกถาวรและไม่ถูกนำกลับมารันซ้ำตามมาตรฐานตรวจสอบย้อนกลับ (Traceability)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">เลข Sample No ที่ถูก VOID</th>
                  <th className="py-3 px-3">วัน-เวลาที่ยกเลิก</th>
                  <th className="py-3 px-3">แผนกเดิม</th>
                  <th className="py-3 px-3">แผนกใหม่</th>
                  <th className="py-3 px-3">เลขใหม่ที่ได้รับ</th>
                  <th className="py-3 px-4">เหตุผลในการยกเลิก</th>
                  <th className="py-3 px-3">ผู้ยกเลิก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVoided.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      ยังไม่มีรายการเลขเอกสารที่ถูก VOID
                    </td>
                  </tr>
                ) : (
                  filteredVoided.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-rose-700 line-through">
                        {v.sampleNo}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono whitespace-nowrap">
                        {v.voidedDate}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {v.oldDepartment}
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-700">
                        {v.newDepartment}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {v.newSampleNo || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {v.reason}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {v.voidedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
