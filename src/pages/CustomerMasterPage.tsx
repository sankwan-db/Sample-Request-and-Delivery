import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Edit2, CheckCircle2, AlertCircle, 
  Search, Filter, Download, Eye, SlidersHorizontal, 
  ChevronLeft, ChevronRight, X, Sparkles, Building, Phone, User,
  ArrowUpDown, Loader2
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';
import { getCustomers, upsertCustomer } from '../services/sheetService';

interface CustomerMaster {
  id: string;
  code: string;
  nameTH: string;
  nameEN: string;
  segment: string;
  contactName: string;
  contactPhone: string;
  creditTerm: string;
  defaultRoute: string;
  active: boolean;
}

const INITIAL_CUSTOMERS: CustomerMaster[] = [
  { id: 'C-01', code: 'CUST-CPF-01', nameTH: 'บริษัท เจริญโภคภัณฑ์อาหาร จำกัด (มหาชน)', nameEN: 'Charoen Pokphand Foods PLC', segment: 'Meat & Poultry', contactName: 'คุณสมชาย ยอดรัก', contactPhone: '081-234-5678', creditTerm: '30 Days', defaultRoute: 'ROUTE-BKK-01', active: true },
  { id: 'C-02', code: 'CUST-BTG-02', nameTH: 'บริษัท เบทาโกร จำกัด (มหาชน)', nameEN: 'Betagro PLC', segment: 'Food Retail', contactName: 'คุณวิภา วงศ์เทวา', contactPhone: '082-987-6543', creditTerm: '45 Days', defaultRoute: 'ROUTE-BKK-02', active: true },
  { id: 'C-03', code: 'CUST-TU-03', nameTH: 'บริษัท ไทยยูเนี่ยน กรุ๊ป จำกัด (มหาชน)', nameEN: 'Thai Union Group PLC', segment: 'Seafood Export', contactName: 'คุณประพันธ์ รักษ์ไทย', contactPhone: '083-444-5555', creditTerm: '60 Days', defaultRoute: 'ROUTE-EAST-01', active: true },
  { id: 'C-04', code: 'CUST-LTS-04', nameTH: 'เอก-ชัย ดีสทริบิวชั่น ซิสเทม จำกัด (โลตัส)', nameEN: 'Ek-Chai Distribution System Co., Ltd.', segment: 'Hypermarket Retail', contactName: 'คุณสุนิสา ใจงาม', contactPhone: '084-222-3333', creditTerm: '30 Days', defaultRoute: 'ROUTE-NORTH-01', active: true },
  { id: 'C-05', code: 'CUST-MKR-05', nameTH: 'บริษัท ซีพี แอ็กซ์ตร้า จำกัด (มหาชน) - แม็คโคร', nameEN: 'CP Axtra PLC - Makro', segment: 'Wholesale Retail', contactName: 'คุณกิตติศักดิ์ ศรีสุข', contactPhone: '085-777-8888', creditTerm: '30 Days', defaultRoute: 'ROUTE-BKK-03', active: true },
];

export function CustomerMasterPage() {
  const { logAuditEntry, customers: ctxCustomers, refreshSequences } = useRequests();
  const [isLoading, setIsLoading] = useState(false);

  const customers = useMemo(() => {
    if (ctxCustomers && ctxCustomers.length > 0) {
      return ctxCustomers.map((c: any) => ({
        id: c.Customer_Code || `C-${Math.random()}`,
        code: c.Customer_Code || '',
        nameTH: c.Customer_Name || '',
        nameEN: c.Customer_Name_EN || '',
        segment: c.Customer_Group || '',
        contactName: c.Contact_Name || '',
        contactPhone: c.Contact_Phone || '',
        creditTerm: c.Credit_Term || '30 Days',
        defaultRoute: c.Default_Route || '',
        active: c.Active === 'TRUE' || c.Active === true
      }));
    }
    return INITIAL_CUSTOMERS;
  }, [ctxCustomers]);
  
  // UI states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<CustomerMaster | null>(null);
  const [quickViewCust, setQuickViewCust] = useState<CustomerMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof CustomerMaster>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Columns Hiding
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [nameTH, setNameTH] = useState('');
  const [nameEN, setNameEN] = useState('');
  const [segment, setSegment] = useState('Meat & Poultry');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creditTerm, setCreditTerm] = useState('30 Days');
  const [defaultRoute, setDefaultRoute] = useState('ROUTE-BKK-01');
  const [active, setActive] = useState(true);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingCust(null);
    setCode(`CUST-NEW-${Date.now().toString().slice(-4)}`);
    setNameTH('');
    setNameEN('');
    setSegment('Meat & Poultry');
    setContactName('');
    setContactPhone('');
    setCreditTerm('30 Days');
    setDefaultRoute('ROUTE-BKK-01');
    setActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (cust: CustomerMaster) => {
    setEditingCust(cust);
    setCode(cust.code);
    setNameTH(cust.nameTH);
    setNameEN(cust.nameEN);
    setSegment(cust.segment);
    setContactName(cust.contactName);
    setContactPhone(cust.contactPhone);
    setCreditTerm(cust.creditTerm);
    setDefaultRoute(cust.defaultRoute);
    setActive(cust.active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameTH || !contactName || !contactPhone) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลรหัสลูกค้า, ชื่อภาษาไทย, ผู้ประสานงาน และเบอร์โทรศัพท์ ให้ครบถ้วน' });
      return;
    }

    const isCreate = !editingCust;
    const newCust: CustomerMaster = {
      id: editingCust?.id || code.trim().toUpperCase(),
      code: code.trim().toUpperCase(),
      nameTH: nameTH.trim(),
      nameEN: nameEN.trim(),
      segment,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      creditTerm,
      defaultRoute,
      active
    };

    try {
      // 1. Sync to Google Sheets
      await upsertCustomer({
        Customer_Code: newCust.code,
        Customer_Name: newCust.nameTH,
        Customer_Group: newCust.segment,
        Contact_Name: newCust.contactName,
        Contact_Phone: newCust.contactPhone,
        Default_Route: newCust.defaultRoute,
        Active: newCust.active ? 'TRUE' : 'FALSE'
      });

      // 2. Update global state
      await refreshSequences();

      // 3. Audit Log
      await logAuditEntry(
        isCreate ? 'CREATE' : 'MASTER_CHANGE',
        newCust.code,
        'CUSTOMER_MASTER',
        `${isCreate ? 'Created' : 'Updated'} Customer ${newCust.code} (${newCust.nameTH})`
      );

      setMessage({
        type: 'success',
        text: `บันทึกข้อมูลลูกค้า ${newCust.code} สำเร็จและอัปเดตลง Google Sheets แล้ว`
      });
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการบันทึก: ${err.message}` });
    }
  };

  const handleSort = (field: keyof CustomerMaster) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sorting, Filters, Searching
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    if (segmentFilter !== 'ALL') {
      list = list.filter(c => c.segment === segmentFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.code.toLowerCase().includes(q) ||
        c.nameTH.toLowerCase().includes(q) ||
        c.nameEN.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.toLowerCase().includes(q)
      );
    }

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
  }, [customers, searchTerm, segmentFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedCustomers, currentPage]);

  const uniqueSegments = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.segment)));
  }, [customers]);

  const exportCSV = () => {
    const headers = ['Code', 'Customer Name TH', 'Customer Name EN', 'Segment', 'Contact Person', 'Phone', 'Credit Term', 'Default Route', 'Active'];
    const rows = processedCustomers.map(c => [
      c.code,
      c.nameTH,
      c.nameEN,
      c.segment,
      c.contactName,
      c.contactPhone,
      c.creditTerm,
      c.defaultRoute,
      c.active ? 'Active' : 'Inactive'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Customer_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
              <Users size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Customer Master
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ทะเบียนรายชื่อลูกค้า พันธมิตรทางธุรกิจ และข้อมูลการติดต่อเพื่อใช้งานเชื่อมโยงในใบส่งตัวอย่างสินค้า
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshSequences}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            รีเฟรชจาก Sheets
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={15} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>

      {isLoading && customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 text-center">กำลังดึงข้อมูล Master Data จาก Google Sheets...</p>
        </div>
      ) : (
        <>
          {message && (
        <div className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold">&times;</button>
        </div>
      )}

      {/* Control Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาลูกค้า, รหัส, ผู้ติดต่อ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-500" />
            <select
              value={segmentFilter}
              onChange={(e) => { setSegmentFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs bg-transparent border-none focus:ring-0 text-slate-600 font-medium focus:outline-none"
            >
              <option value="ALL">กลุ่มอุตสาหกรรมทั้งหมด</option>
              {uniqueSegments.map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal size={13} />
            คอลัมน์
          </button>
          {showColumnDropdown && (
            <div className="absolute right-10 mt-12 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-20 space-y-1">
              {['segment', 'contact', 'credit', 'route', 'status'].map(col => (
                <label key={col} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-50 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col)}
                    onChange={() => setHiddenColumns(
                      hiddenColumns.includes(col) ? hiddenColumns.filter(c => c !== col) : [...hiddenColumns, col]
                    )}
                    className="rounded text-blue-600"
                  />
                  <span>{col === 'segment' ? 'ประเภทธุรกิจ' : col === 'contact' ? 'ผู้ประสานงาน' : col === 'credit' ? 'เครดิต' : col === 'route' ? 'เส้นทางจัดส่ง' : 'สถานะ'}</span>
                </label>
              ))}
            </div>
          )}

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            ส่งออก CSV
          </button>
        </div>
      </div>

      {/* Customer Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th onClick={() => handleSort('code')} className="py-3 px-4 cursor-pointer hover:bg-slate-100">
                  รหัสลูกค้า <ArrowUpDown size={11} className="inline ml-1" />
                </th>
                <th className="py-3 px-4">ชื่อบริษัท / ลูกค้า (ไทย-อังกฤษ)</th>
                {!hiddenColumns.includes('segment') && <th className="py-3 px-4">กลุ่มประเภท</th>}
                {!hiddenColumns.includes('contact') && <th className="py-3 px-4">ผู้ประสานงาน</th>}
                {!hiddenColumns.includes('credit') && <th className="py-3 px-4">เครดิตเทอม</th>}
                {!hiddenColumns.includes('route') && <th className="py-3 px-4">เส้นทางประจำ</th>}
                {!hiddenColumns.includes('status') && <th className="py-3 px-4 text-center">สถานะ</th>}
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedCustomers.map(cust => (
                <tr key={cust.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3 px-4 font-bold font-mono text-slate-800">{cust.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{cust.nameTH}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cust.nameEN}</div>
                  </td>
                  {!hiddenColumns.includes('segment') && <td className="py-3 px-4 text-slate-600">{cust.segment}</td>}
                  {!hiddenColumns.includes('contact') && (
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium">{cust.contactName}</div>
                      <div className="text-[10px] text-slate-400">{cust.contactPhone}</div>
                    </td>
                  )}
                  {!hiddenColumns.includes('credit') && <td className="py-3 px-4 font-mono text-slate-500">{cust.creditTerm}</td>}
                  {!hiddenColumns.includes('route') && (
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">
                        {cust.defaultRoute}
                      </span>
                    </td>
                  )}
                  {!hiddenColumns.includes('status') && (
                    <td className="py-3 px-4 text-center">
                      {cust.active ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ใช้งาน</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ปิดใช้งาน</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setQuickViewCust(cust)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleOpenEdit(cust)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>แสดงผล {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedCustomers.length)} จากทั้งหมด {processedCustomers.length} รายการ</div>
            <div className="flex items-center gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="p-1 border border-slate-200 rounded hover:bg-white hover:text-slate-800 disabled:opacity-50"><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-2 py-0.5 rounded border font-medium ${currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-white hover:text-slate-800 bg-white'}`}>{i + 1}</button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="p-1 border border-slate-200 rounded hover:bg-white hover:text-slate-800 disabled:opacity-50"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Building size={16} className="text-blue-600" />
                {editingCust ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มทะเบียนลูกค้าใหม่'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสลูกค้า (Customer Code) *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อลูกค้าภาษาไทย (TH Company Name) *</label>
                <input
                  type="text"
                  value={nameTH}
                  onChange={(e) => setNameTH(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อลูกค้าภาษาอังกฤษ (EN Company Name)</label>
                <input
                  type="text"
                  value={nameEN}
                  onChange={(e) => setNameEN(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทกลุ่ม (Segment)</label>
                  <select
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Food Retail">Food Retail</option>
                    <option value="Seafood Export">Seafood Export</option>
                    <option value="Hypermarket Retail">Hypermarket Retail</option>
                    <option value="Wholesale Retail">Wholesale Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เครดิตเทอม</label>
                  <select
                    value={creditTerm}
                    onChange={(e) => setCreditTerm(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="Cash/Advance">Cash/Advance</option>
                    <option value="30 Days">30 Days</option>
                    <option value="45 Days">45 Days</option>
                    <option value="60 Days">60 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ติดต่อหลัก *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เส้นทางวิ่งรถประจำ (Default Transport Route)</label>
                <select
                  value={defaultRoute}
                  onChange={(e) => setDefaultRoute(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="ROUTE-BKK-01">ROUTE-BKK-01 (กรุงเทพฯ ฝั่งตะวันออก)</option>
                  <option value="ROUTE-BKK-02">ROUTE-BKK-02 (กรุงเทพฯ ฝั่งตะวันตก)</option>
                  <option value="ROUTE-BKK-03">ROUTE-BKK-03 (กรุงเทพฯ ปริมณฑลใต้)</option>
                  <option value="ROUTE-EAST-01">ROUTE-EAST-01 (ภาคตะวันออก - ชลบุรี)</option>
                  <option value="ROUTE-NORTH-01">ROUTE-NORTH-01 (ภาคเหนือ - นครสวรรค์)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  id="activeCust"
                />
                <label htmlFor="activeCust" className="font-semibold text-slate-700 select-none">เปิดใช้งานลูกค้าในระบบ</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewCust && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 text-xs">ข้อมูลลูกค้าอ้างอิงอย่างย่อ</span>
              <button onClick={() => setQuickViewCust(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wide">รหัสลูกค้า</span>
                <span className="font-bold font-mono text-slate-800 text-sm">{quickViewCust.code}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase tracking-wide">ชื่อไทย</span>
                <span className="font-semibold text-slate-800">{quickViewCust.nameTH}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">English Name</span>
                <span className="font-medium text-slate-700 font-mono text-[11px]">{quickViewCust.nameEN || '-'}</span>
              </div>
              <hr className="border-slate-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-400">ประเภทกลุ่มอุตสาหกรรม</span>
                  <span className="font-medium text-slate-800">{quickViewCust.segment}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">เครดิตเทอม</span>
                  <span className="font-medium text-slate-800">{quickViewCust.creditTerm}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">ผู้ติดต่อประสานงาน</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <User size={13} className="text-slate-400" />
                  {quickViewCust.contactName}
                </span>
                <span className="font-mono text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                  <Phone size={13} className="text-slate-400" />
                  {quickViewCust.contactPhone}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">เส้นทางรถจัดส่งประจำ</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] rounded inline-block mt-0.5">
                  {quickViewCust.defaultRoute}
                </span>
              </div>
            </div>
            <button onClick={() => setQuickViewCust(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors">ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
