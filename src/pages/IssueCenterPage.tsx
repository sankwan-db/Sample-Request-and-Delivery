import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useRequests } from '../contexts/RequestContext';
import { RequestIssue, SampleRequest } from '../types';

type StatusFilter = 'ALL' | RequestIssue['status'];
type DepartmentFilter = 'ALL' | RequestIssue['department'];
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type IssueView = {
  issue: RequestIssue;
  request: SampleRequest;
  severity: Severity;
  financialImpact: boolean;
};

const departmentLabel: Record<RequestIssue['department'], string> = {
  SALE: 'Sales',
  RD: 'RD',
  CO_SALE: 'Co-Sale',
  LOGISTIC: 'Logistic / Delivery',
  OTHER: 'อื่น ๆ',
};

const statusLabel: Record<RequestIssue['status'], string> = {
  OPEN: 'กำลังดำเนินการ',
  RESOLVED: 'แก้ไขแล้ว',
};

function inferSeverity(issue: RequestIssue): Severity {
  const value = `${issue.issueType} ${issue.description}`.toUpperCase();
  if (/REJECT|FAILED|CREDIT|PAYMENT|DAMAGE|LOST/.test(value)) return 'CRITICAL';
  if (/DELAY|LATE|NOT_AVAILABLE|CANNOT|HOLD/.test(value)) return 'HIGH';
  if (issue.department === 'LOGISTIC' || issue.department === 'CO_SALE') return 'MEDIUM';
  return 'LOW';
}

function hasFinancialImpact(issue: RequestIssue) {
  return /CREDIT|PAYMENT|PRICE|INVOICE|SO_|CUSTOMER_REJECT/i.test(`${issue.issueType} ${issue.description}`);
}

function severityClass(severity: Severity) {
  if (severity === 'CRITICAL') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'HIGH') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (severity === 'MEDIUM') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function IssueCenterPage() {
  const navigate = useNavigate();
  const { requests, isLoading, refreshSequences, resolveIssue, routeIssueToSales } = useRequests();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [department, setDepartment] = useState<DepartmentFilter>('ALL');
  const [selected, setSelected] = useState<IssueView | null>(null);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const issues = useMemo<IssueView[]>(() => requests.flatMap(request =>
    (request.issues || []).map(issue => ({
      issue,
      request,
      severity: inferSeverity(issue),
      financialImpact: hasFinancialImpact(issue),
    })),
  ).sort((a, b) => (b.issue.reportedAt || '').localeCompare(a.issue.reportedAt || '')), [requests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return issues.filter(row => {
      const searchable = [
        row.issue.id,
        row.request.sampleNo,
        row.request.customerName,
        row.request.coSaleTask?.soNumber,
        row.issue.issueType,
        row.issue.description,
      ].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (status === 'ALL' || row.issue.status === status)
        && (department === 'ALL' || row.issue.department === department);
    });
  }, [department, issues, search, status]);

  const openIssues = issues.filter(row => row.issue.status === 'OPEN');
  const criticalIssues = openIssues.filter(row => row.severity === 'CRITICAL');
  const waitingSales = openIssues.filter(row => row.request.currentOwner.includes('Sale'));
  const financialIssues = openIssues.filter(row => row.financialImpact);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshSequences();
    } finally {
      setRefreshing(false);
    }
  };

  const routeToSales = async (row: IssueView) => {
    setSaving(true);
    try {
      await routeIssueToSales(row.request.sampleNo, row.issue.id);
      setSelected(current => current ? {
        ...current,
        request: {
          ...current.request,
          currentOwner: row.issue.department === 'LOGISTIC' ? 'Sale + Co-Sale' : 'Sale',
        },
      } : null);
    } finally {
      setSaving(false);
    }
  };

  const submitResolution = async () => {
    if (!selected || !resolution.trim()) return;
    setSaving(true);
    try {
      await resolveIssue(selected.request.sampleNo, selected.issue.id, resolution.trim());
      setSelected(null);
      setResolution('');
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: 'ปัญหาที่ยังเปิด', value: openIssues.length, note: 'ทุกส่วนงาน', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'ระดับวิกฤต', value: criticalIssues.length, note: 'ต้องเร่งดำเนินการ', icon: Clock3, color: 'text-orange-600 bg-orange-50' },
    { label: 'รอ Sales / Co-Sale', value: waitingSales.length, note: 'ส่งกลับแล้ว', icon: UserRound, color: 'text-blue-600 bg-blue-50' },
    { label: 'กระทบการเงิน', value: financialIssues.length, note: 'SO / Invoice / Credit', icon: CircleDollarSign, color: 'text-violet-600 bg-violet-50' },
    { label: 'แก้ไขแล้ว', value: issues.length - openIssues.length, note: 'ปิดรายการสำเร็จ', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Monitoring / Issue Center</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">ศูนย์ควบคุมปัญหาและข้อยกเว้น</h1>
          <p className="mt-1 text-sm text-slate-500">ติดตามปัญหาจาก Sales, RD, Co-Sale และ Logistic จนปิดรายการ</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          อัปเดตข้อมูล
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(({ label, value, note, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
              </div>
              <span className={`rounded-lg p-2 ${color}`}><Icon size={18} /></span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">{note}</div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <label className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ค้นหา Issue No., Sample No., ลูกค้า, SO หรือรายละเอียด..."
                className="w-full rounded-md border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <select
              value={department}
              onChange={event => setDepartment(event.target.value as DepartmentFilter)}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">ทุกส่วนงาน</option>
              {Object.entries(departmentLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as StatusFilter)}
              className="rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="OPEN">กำลังดำเนินการ</option>
              <option value="RESOLVED">แก้ไขแล้ว</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Issue No.</th>
                <th className="px-4 py-3">Sample No.</th>
                <th className="px-4 py-3">ลูกค้า</th>
                <th className="px-4 py-3">แหล่งที่มา</th>
                <th className="px-4 py-3">ปัญหา</th>
                <th className="px-4 py-3">ระดับ</th>
                <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                <th className="px-4 py-3">วันที่แจ้ง</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row => (
                <tr key={`${row.request.sampleNo}-${row.issue.id}`} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4 text-sm font-bold text-slate-800">{row.issue.id}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-blue-700">{row.request.sampleNo}</div>
                    <div className="mt-1 text-xs text-slate-400">{row.request.revision}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{row.request.customerName}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{departmentLabel[row.issue.department]}</td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-slate-700">{row.issue.issueType.replaceAll('_', ' ')}</div>
                    <div className="mt-1 max-w-[280px] truncate text-xs text-slate-400">{row.issue.description}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${severityClass(row.severity)}`}>{row.severity}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{row.request.currentOwner || '—'}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(row.issue.reportedAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${row.issue.status === 'RESOLVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                      {statusLabel[row.issue.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => { setSelected(row); setResolution(''); }} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Eye size={14} /> รายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">ไม่พบรายการปัญหาตามเงื่อนไขที่เลือก</td></tr>
              )}
              {isLoading && (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">แสดง {filtered.length} จากทั้งหมด {issues.length} รายการ</div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Issue Detail</div>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{selected.issue.id}</h2>
                <div className="mt-1 text-sm font-semibold text-blue-700">{selected.request.sampleNo} {selected.request.revision}</div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-md p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-400">ลูกค้า</div><div className="mt-1 font-semibold text-slate-800">{selected.request.customerName}</div></div>
                <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-400">ส่วนงานที่แจ้ง</div><div className="mt-1 font-semibold text-slate-800">{departmentLabel[selected.issue.department]}</div></div>
                <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-400">ผู้รับผิดชอบปัจจุบัน</div><div className="mt-1 font-semibold text-slate-800">{selected.request.currentOwner || '—'}</div></div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">รายละเอียดปัญหา</div>
                <div className="mt-2 font-semibold text-slate-800">{selected.issue.issueType.replaceAll('_', ' ')}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selected.issue.description}</p>
                <div className="mt-3 text-xs text-slate-400">แจ้งโดย {selected.issue.reportedBy} • {formatDateTime(selected.issue.reportedAt)}</div>
              </div>

              {selected.financialImpact && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
                  รายการนี้อาจกระทบ SO / Invoice / Credit Note จึงต้องประสาน Sales และ Co-Sale ร่วมกัน
                </div>
              )}

              {selected.issue.status === 'RESOLVED' ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 size={17} /> แก้ไขเรียบร้อยแล้ว</div>
                  <p className="mt-2 text-sm text-emerald-700">{selected.issue.resolutionRemark || 'ไม่มีหมายเหตุ'}</p>
                  <div className="mt-2 text-xs text-emerald-600">{selected.issue.resolvedBy || 'Authorized Staff'} • {formatDateTime(selected.issue.resolvedAt)}</div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-slate-700">ผลการแก้ไข <span className="text-red-500">*</span></label>
                  <textarea
                    value={resolution}
                    onChange={event => setResolution(event.target.value)}
                    rows={3}
                    placeholder="ระบุสิ่งที่ดำเนินการและผลลัพธ์ก่อนปิด Issue"
                    className="mt-2 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white p-4">
              <button onClick={() => navigate(`/sample/${encodeURIComponent(selected.request.id)}`)} className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">เปิดคำขอ</button>
              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => setSelected(null)} className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">ปิด</button>
                {selected.issue.status === 'OPEN' && (
                  <>
                    <button disabled={saving} onClick={() => routeToSales(selected)} className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-60"><RotateCcw size={16} /> ส่งกลับ Sales / Co-Sale</button>
                    <button disabled={saving || !resolution.trim()} onClick={submitResolution} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 size={16} /> ปิด Issue</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
