import React, { useState, useMemo } from 'react';
import { 
  Building2, Plus, Edit2, CheckCircle2, AlertCircle, 
  Mail, User, Tag, ArrowUpDown, Search, Filter, 
  Download, Eye, EyeOff, SlidersHorizontal, ChevronLeft, 
  ChevronRight, X, Sparkles, LogIn, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { RDDepartmentMaster } from '../types';

export function RDDepartmentMasterPage() {
  const { user } = useAuth();
  const { rdDepartments, saveRDDepartment, refreshSequences, requests, logAuditEntry } = useRequests();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSequences();
      setMessage({ type: 'success', text: 'รีเฟรชข้อมูลแผนก RD จาก Sheets สำเร็จ!' });
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Dialog and UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<RDDepartmentMaster | null>(null);
  const [quickViewDept, setQuickViewDept] = useState<RDDepartmentMaster | null>(null);
  
  // Prefix Warning override states
  const [showPrefixWarning, setShowPrefixWarning] = useState(false);
  const [warningAck, setWarningAck] = useState(false);

  // Search & Filter & Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortField, setSortField] = useState<keyof RDDepartmentMaster>('Sort_Order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Column Hiding States
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [nameTH, setNameTH] = useState('');
  const [nameEN, setNameEN] = useState('');
  const [prefix, setPrefix] = useState('');
  const [defaultEmail, setDefaultEmail] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorEmail, setSupervisorEmail] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(1);

  // Notifications
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if a department has already had samples in the system
  const departmentHasSamples = (deptCode: string) => {
    return requests.some(
      r => r.department?.toUpperCase() === deptCode.toUpperCase() || 
           r.departmentPrefix?.toUpperCase() === deptCode.toUpperCase()
    );
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setCode('');
    setNameTH('');
    setNameEN('');
    setPrefix('');
    setDefaultEmail('');
    setSupervisorName('');
    setSupervisorEmail('');
    setActive(true);
    setSortOrder(rdDepartments.length + 1);
    setShowPrefixWarning(false);
    setWarningAck(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: RDDepartmentMaster) => {
    setEditingDept(dept);
    setCode(dept.RD_Department_Code);
    setNameTH(dept.RD_Department_Name_TH);
    setNameEN(dept.RD_Department_Name_EN);
    setPrefix(dept.Sample_No_Prefix);
    setDefaultEmail(dept.Default_Email);
    setSupervisorName(dept.Supervisor_Name);
    setSupervisorEmail(dept.Supervisor_Email);
    setActive(dept.Active);
    setSortOrder(dept.Sort_Order);
    setShowPrefixWarning(false);
    setWarningAck(false);
    setModalOpen(true);
  };

  const handleSort = (field: keyof RDDepartmentMaster) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // 1. Filter, Search, Sort compute
  const processedDepartments = useMemo(() => {
    let list = [...rdDepartments];

    // Status Filter
    if (statusFilter === 'ACTIVE') {
      list = list.filter(d => d.Active);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter(d => !d.Active);
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(d => 
        d.RD_Department_Code.toLowerCase().includes(q) ||
        d.Sample_No_Prefix.toLowerCase().includes(q) ||
        d.RD_Department_Name_TH.toLowerCase().includes(q) ||
        (d.RD_Department_Name_EN || '').toLowerCase().includes(q) ||
        (d.Supervisor_Name || '').toLowerCase().includes(q) ||
        (d.Default_Email || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [rdDepartments, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination compute
  const totalPages = Math.ceil(processedDepartments.length / itemsPerPage);
  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedDepartments.slice(startIndex, startIndex + itemsPerPage);
  }, [processedDepartments, currentPage]);

  const toggleColumn = (columnName: string) => {
    if (hiddenColumns.includes(columnName)) {
      setHiddenColumns(hiddenColumns.filter(c => c !== columnName));
    } else {
      setHiddenColumns([...hiddenColumns, columnName]);
    }
  };

  const exportCSV = () => {
    const headers = ['Code', 'Sample Prefix', 'Name TH', 'Name EN', 'Supervisor', 'Email', 'Active', 'Sort Order'];
    const rows = processedDepartments.map(d => [
      d.RD_Department_Code,
      d.Sample_No_Prefix,
      d.RD_Department_Name_TH,
      d.RD_Department_Name_EN || '',
      d.Supervisor_Name || '',
      d.Default_Email || '',
      d.Active ? 'Active' : 'Inactive',
      d.Sort_Order
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RD_Department_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage({ type: 'success', text: 'ส่งออกข้อมูลไฟล์ CSV สำเร็จ!' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameTH || !prefix) {
      setMessage({ type: 'error', text: 'กรุณากรอกรหัสแผนก, ชื่อภาษาไทย, และ Sample No Prefix ให้ครบถ้วน' });
      return;
    }

    // Part 81 check: Warning on historic Prefix modifications
    if (editingDept && prefix.toUpperCase().trim() !== editingDept.Sample_No_Prefix.toUpperCase().trim()) {
      const hasSamples = departmentHasSamples(editingDept.RD_Department_Code);
      if (hasSamples && !warningAck) {
        setShowPrefixWarning(true);
        return; // Halt save and show warning
      }
    }

    try {
      const finalCode = code.toUpperCase().trim();
      const finalPrefix = prefix.toUpperCase().trim();
      const isCreate = !editingDept;

      await saveRDDepartment({
        RD_Department_ID: editingDept?.RD_Department_ID,
        RD_Department_Code: finalCode,
        RD_Department_Name_TH: nameTH.trim(),
        RD_Department_Name_EN: nameEN.trim(),
        Sample_No_Prefix: finalPrefix,
        Default_Email: defaultEmail.trim(),
        Supervisor_Name: supervisorName.trim(),
        Supervisor_Email: supervisorEmail.trim(),
        Active: active,
        Sort_Order: Number(sortOrder)
      });

      // Audit Logging for Part 82
      await logAuditEntry(
        isCreate ? 'CREATE' : 'MASTER_CHANGE',
        finalCode,
        'RD_DEPARTMENT_MASTER',
        isCreate 
          ? `Created RD Department ${finalCode} with Prefix ${finalPrefix}`
          : `Updated RD Department ${finalCode}. Prefix ${editingDept?.Sample_No_Prefix} -> ${finalPrefix}`
      );

      setMessage({ 
        type: 'success', 
        text: `บันทึกข้อมูลแผนก RD (${finalCode}) สำเร็จเรียบร้อยแล้ว` 
      });
      setModalOpen(false);
      setShowPrefixWarning(false);
      setWarningAck(false);
      refreshSequences();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  };

  const handleWarningConfirmOverride = () => {
    setWarningAck(true);
    setShowPrefixWarning(false);
    // Submit again with warning ack = true
    setTimeout(() => {
      const form = document.getElementById('deptForm') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleWarningConvertToNew = () => {
    // Change to add mode so we don't overwrite existing historical prefix
    setEditingDept(null);
    setCode(code + '_NEW');
    setPrefix(prefix);
    setShowPrefixWarning(false);
    setWarningAck(false);
    setMessage({
      type: 'success',
      text: 'เปลี่ยนโหมดเป็น "สร้างแผนกใหม่" (Effective New Configuration) เพื่อป้องกันข้อมูลเอกสารประวัติเสียหายสำเร็จ'
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Building2 size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              RD Department Master
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            จัดการหน่วยงานวิจัยพัฒนาผลิตภัณฑ์ (RD) และกำหนดตัวย่อ (Prefix) สำหรับใช้ออกเลขคำขอตัวอย่าง (Sample No.)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            รีเฟรชข้อมูล
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
          >
            <Plus size={15} />
            เพิ่มแผนก RD ใหม่
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-2 shadow-xs transition-all animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
            &times;
          </button>
        </div>
      )}

      {/* Control Box: Search, Filter, Hide Columns, Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาแผนก, Prefix, ชื่อไทย-อังกฤษ, หัวหน้างาน, อีเมล..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 text-slate-700"
          />
        </div>

        {/* Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="text-xs bg-transparent border-none focus:ring-0 text-slate-600 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสถานะ (All)</option>
              <option value="ACTIVE">เฉพาะเปิดใช้งาน (Active)</option>
              <option value="INACTIVE">เฉพาะปิดใช้งาน (Inactive)</option>
            </select>
          </div>

          {/* Column Hiding Config */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <SlidersHorizontal size={13} />
              คอลัมน์
            </button>
            {showColumnDropdown && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-20 space-y-1.5">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">แสดง/ซ่อนคอลัมน์</div>
                <hr className="border-slate-100" />
                {[
                  { id: 'prefix', label: 'Prefix ตัวย่อ' },
                  { id: 'supervisor', label: 'หัวหน้างาน' },
                  { id: 'email', label: 'อีเมลแผนก' },
                  { id: 'status', label: 'สถานะ' },
                  { id: 'sortOrder', label: 'ลำดับแสดงผล' }
                ].map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-50 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <Download size={13} />
            ส่งออก CSV
          </button>
        </div>
      </div>

      {/* Main Grid: Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                {!hiddenColumns.includes('sortOrder') && (
                  <th onClick={() => handleSort('Sort_Order')} className="py-3 px-4 w-16 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-center gap-1">
                      ลำดับ <ArrowUpDown size={11} />
                    </div>
                  </th>
                )}
                <th onClick={() => handleSort('RD_Department_Code')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    รหัสแผนก <ArrowUpDown size={11} />
                  </div>
                </th>
                {!hiddenColumns.includes('prefix') && (
                  <th onClick={() => handleSort('Sample_No_Prefix')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      Prefix เลขตัวอย่าง <ArrowUpDown size={11} />
                    </div>
                  </th>
                )}
                <th className="py-3 px-4">ชื่อแผนกวิจัยพัฒนา (TH / EN)</th>
                {!hiddenColumns.includes('supervisor') && <th className="py-3 px-4">Supervisor (หัวหน้างาน)</th>}
                {!hiddenColumns.includes('email') && <th className="py-3 px-4">Email แผนก</th>}
                {!hiddenColumns.includes('status') && <th className="py-3 px-4 text-center">สถานะ</th>}
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedDepartments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">ไม่พบข้อมูลแผนก RD</p>
                    <p className="text-xs text-slate-400 mt-1">กรุณาลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                  </td>
                </tr>
              ) : (
                paginatedDepartments.map((dept, idx) => {
                  const hasSamples = departmentHasSamples(dept.RD_Department_Code);
                  return (
                    <tr key={dept.RD_Department_Code} className="hover:bg-slate-50/40 transition-colors">
                      {!hiddenColumns.includes('sortOrder') && (
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {dept.Sort_Order}
                        </td>
                      )}
                      <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                        {dept.RD_Department_Code}
                      </td>
                      {!hiddenColumns.includes('prefix') && (
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">
                            {dept.Sample_No_Prefix}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{dept.RD_Department_Name_TH}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{dept.RD_Department_Name_EN || '-'}</div>
                      </td>
                      {!hiddenColumns.includes('supervisor') && (
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{dept.Supervisor_Name || '-'}</div>
                          <div className="text-[11px] text-slate-400">{dept.Supervisor_Email || '-'}</div>
                        </td>
                      )}
                      {!hiddenColumns.includes('email') && (
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {dept.Default_Email || '-'}
                        </td>
                      )}
                      {!hiddenColumns.includes('status') && (
                        <td className="py-3 px-4 text-center">
                          {dept.Active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                              ใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              ปิดใช้งาน
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setQuickViewDept(dept)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Quick View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(dept)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 size={14} />
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>
              แสดงผล {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedDepartments.length)} จากทั้งหมด {processedDepartments.length} รายการ
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1 border border-slate-200 rounded hover:bg-white hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-2.5 py-1 rounded border font-medium ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 hover:bg-white hover:text-slate-800 bg-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1 border border-slate-200 rounded hover:bg-white hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note of Effective New Configuration */}
      <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-900 space-y-1">
        <div className="font-bold text-amber-800 flex items-center gap-1.5">
          <Tag size={14} className="text-amber-600" />
          หลักการ Effective New Configuration (Part 81):
        </div>
        <p>
          หากหน่วยงาน RD นั้นๆ เคยมีประวัติออกคำขอตัวอย่าง (Sample Request) ในระบบไปแล้ว <strong>ห้ามเปลี่ยนค่า Prefix โดยตรง</strong> เนื่องจากจะส่งผลให้ประวัติเลขสารบัญเอกสารในอดีตคลาดเคลื่อน แนะนำให้ปิดใช้งานแผนกเดิม (Disable Active) และกดเพิ่มแผนกใหม่แทน เพื่อรักษารูปแบบเลขรหัสเอกสารเก่าอย่างถูกต้องสมบูรณ์
        </p>
      </div>

      {/* QUICK VIEW DRAWER/MODAL */}
      {quickViewDept && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-end z-50 animate-fadeIn">
          <div className="bg-white h-full max-w-md w-full p-6 shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-blue-700 rounded">
                    <Building2 size={16} />
                  </span>
                  <span className="font-bold text-slate-800 text-sm">ข้อมูลแผนก RD (Quick View)</span>
                </div>
                <button onClick={() => setQuickViewDept(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block font-semibold">รหัสแผนก</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">{quickViewDept.RD_Department_Code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Prefix ตัวอย่าง</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-xs border border-blue-200 inline-block mt-0.5">
                      {quickViewDept.Sample_No_Prefix}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">ชื่อภาษาไทย</span>
                    <span className="font-semibold text-slate-800 text-xs">{quickViewDept.RD_Department_Name_TH}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">ชื่อภาษาอังกฤษ</span>
                    <span className="text-slate-800 font-medium text-xs">{quickViewDept.RD_Department_Name_EN || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">ผู้รับผิดชอบหลัก (Supervisor)</span>
                    <span className="text-slate-800 font-semibold text-xs flex items-center gap-1.5 mt-0.5">
                      <User size={13} className="text-slate-400" />
                      {quickViewDept.Supervisor_Name || '-'}
                    </span>
                    {quickViewDept.Supervisor_Email && (
                      <span className="text-[11px] text-slate-500 font-mono block pl-5 mt-0.5">{quickViewDept.Supervisor_Email}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">อีเมลประจำแผนก (Default Email)</span>
                    <span className="text-blue-600 font-mono text-xs flex items-center gap-1.5 mt-0.5">
                      <Mail size={13} className="text-slate-400" />
                      {quickViewDept.Default_Email || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-slate-400 block font-semibold">ลำดับจัดเรียง</span>
                      <span className="text-slate-800 font-bold font-mono">{quickViewDept.Sort_Order}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">สถานะปัจจุบัน</span>
                      {quickViewDept.Active ? (
                        <span className="text-emerald-700 font-bold">เปิดใช้งานหลัก</span>
                      ) : (
                        <span className="text-slate-500 font-bold">ปิดการใช้งาน</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setQuickViewDept(null); handleOpenEdit(quickViewDept); }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Edit2 size={13} />
              แก้ไขข้อมูลแผนก
            </button>
          </div>
        </div>
      )}

      {/* FORM MODAL ADD / EDIT */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Building2 size={16} className="text-blue-600" />
                {editingDept ? 'แก้ไขข้อมูลแผนกวิจัยและพัฒนา' : 'เพิ่มหน่วยงาน RD ใหม่'}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Prefix Change warning Box for Part 81 */}
            {showPrefixWarning ? (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-3 animate-pulse">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-rose-800 uppercase">ตรวจพบประวัติเอกสารเดิมในระบบ (Critical Warning)</h4>
                    <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                      แผนก <strong>{editingDept?.RD_Department_Code}</strong> มีการออกคำขอตัวอย่าง (Sample Request) ในสารบบแล้ว การแก้ไข Prefix จาก <strong>"{editingDept?.Sample_No_Prefix}"</strong> เป็น <strong>"{prefix}"</strong> จะส่งผลดังนี้:
                    </p>
                    <ul className="list-disc list-inside text-[10px] text-rose-600 mt-1 space-y-0.5 pl-1.5">
                      <li>ทำให้รหัสอ้างอิงของเอกสารใหม่ไม่สอดคล้องกับเอกสารเดิม</li>
                      <li>ทำให้การนับจำนวนเอกสารสะสมและการทำเลขสรุปรายงานเกิดความซ้ำซ้อน</li>
                    </ul>
                    <p className="text-[11px] font-semibold text-rose-800 mt-2">
                      ตามนโยบายแนะนำให้ทำการ "สร้าง Effective New Configuration" (สร้างแผนก RD ใหม่ตัวย่อใหม่) แทนการดัดแปลงข้อมูลประวัติศาสตร์เอกสาร
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-rose-200">
                  <button
                    type="button"
                    onClick={handleWarningConvertToNew}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded"
                  >
                    เปลี่ยนเป็นสร้างแผนกใหม่แทน
                  </button>
                  <button
                    type="button"
                    onClick={handleWarningConfirmOverride}
                    className="px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-[10px] rounded"
                  >
                    ยืนยันเปลี่ยน Prefix (Override)
                  </button>
                </div>
              </div>
            ) : null}

            <form id="deptForm" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    รหัสแผนก (RD Department Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="เช่น RM, RTC, FURTHER"
                    className="w-full h-9 px-3 text-xs uppercase bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                    required
                    disabled={Boolean(editingDept)}
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">ตัวย่อหน่วยงาน คีย์แก้ไขไม่ได้</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sample No Prefix <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    placeholder="เช่น RM, RTC, FUR"
                    className="w-full h-9 px-3 text-xs uppercase bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500/20 text-blue-700"
                    required
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">อักษรนำหน้าเลขที่ตัวอย่าง</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชื่อภาษาไทย (RD Department Name TH) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameTH}
                  onChange={(e) => setNameTH(e.target.value)}
                  placeholder="เช่น เนื้อสัตว์สดและแปรรูปเบื้องต้น"
                  className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชื่อภาษาอังกฤษ (RD Department Name EN)
                </label>
                <input
                  type="text"
                  value={nameEN}
                  onChange={(e) => setNameEN(e.target.value)}
                  placeholder="เช่น Raw Material Department"
                  className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ชื่อหัวหน้างาน (Supervisor Name)
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล หัวหน้างาน"
                    className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email หัวหน้างาน (Supervisor Email)
                  </label>
                  <input
                    type="email"
                    value={supervisorEmail}
                    onChange={(e) => setSupervisorEmail(e.target.value)}
                    placeholder="supervisor.name@company.com"
                    className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email ประจำแผนก (Default Email)
                  </label>
                  <input
                    type="email"
                    value={defaultEmail}
                    onChange={(e) => setDefaultEmail(e.target.value)}
                    placeholder="rd-dept@company.com"
                    className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ลำดับการจัดเรียง (Sort Order)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">เปิดใช้งานแผนกวิจัยนี้ในระบบ (Active Status)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
