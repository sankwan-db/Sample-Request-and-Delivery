import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Plus, Edit2, CheckCircle2, AlertCircle, 
  Search, Filter, Download, Eye, SlidersHorizontal, 
  ChevronLeft, ChevronRight, X, Sparkles, Tag, ShoppingBag, ThermometerSnowflake,
  ArrowUpDown, Loader2
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';
import { getProducts, upsertProduct } from '../services/sheetService';

interface ProductMaster {
  id: string;
  code: string;
  nameTH: string;
  nameEN: string;
  category: string;
  tempRequirement: string;
  uom: string;
  shelfLife: string;
  standardPrice: number;
  active: boolean;
}

const INITIAL_PRODUCTS: ProductMaster[] = [
  { id: 'P-01', code: 'PROD-CKN-01', nameTH: 'อกไก่สดแช่เย็น เกรดเอ', nameEN: 'Chilled Chicken Breast Grade A', category: 'Raw Material', tempRequirement: 'Chilled (<4°C)', uom: 'KG', shelfLife: '7 Days', standardPrice: 85, active: true },
  { id: 'P-02', code: 'PROD-PORK-02', nameTH: 'สันนอกหมูหั่นชิ้น แช่แข็ง', nameEN: 'Frozen Pork Loin Sliced', category: 'Raw Material', tempRequirement: 'Frozen (<-18°C)', uom: 'KG', shelfLife: '12 Months', standardPrice: 160, active: true },
  { id: 'P-03', code: 'PROD-RTC-03', nameTH: 'เกี๊ยวซ่าหมูลุยไฟ พร้อมปรุง', nameEN: 'Ready-To-Cook Pork Gyoza', category: 'Ready-To-Cook', tempRequirement: 'Frozen (<-18°C)', uom: 'PACK', shelfLife: '6 Months', standardPrice: 45, active: true },
  { id: 'P-04', code: 'PROD-RTE-04', nameTH: 'ข้าวกล้องผัดอกไก่สมุนไพร พรีเมียม', nameEN: 'Ready-To-Eat Herb Chicken with Brown Rice', category: 'Ready-To-Eat', tempRequirement: 'Chilled (<4°C)', uom: 'BOX', shelfLife: '5 Days', standardPrice: 59, active: true },
  { id: 'P-05', code: 'PROD-SAU-05', nameTH: 'ไส้กรอกไก่รมควันหนังกรอบ', nameEN: 'Crispy Smoked Chicken Sausage', category: 'Further Processed', tempRequirement: 'Chilled (<4°C)', uom: 'KG', shelfLife: '45 Days', standardPrice: 110, active: true },
];

export function ProductMasterPage() {
  const { logAuditEntry, products: ctxProducts, refreshSequences } = useRequests();
  const [isLoading, setIsLoading] = useState(false);

  const products = useMemo(() => {
    if (ctxProducts && ctxProducts.length > 0) {
      return ctxProducts.map((p: any) => ({
        id: p.Item_Code || `P-${Math.random()}`,
        code: p.Item_Code || '',
        nameTH: p.Product_Name || '',
        nameEN: p.Product_Name_EN || '',
        category: p.Category || '',
        tempRequirement: p.Temperature || '',
        uom: p.UOM || '',
        shelfLife: p.Shelf_Life || '',
        standardPrice: Number(p.Standard_Price) || 0,
        active: p.Active === 'TRUE' || p.Active === true
      }));
    }
    return INITIAL_PRODUCTS;
  }, [ctxProducts]);

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<ProductMaster | null>(null);
  const [quickViewProd, setQuickViewProd] = useState<ProductMaster | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [sortField, setSortField] = useState<keyof ProductMaster>('code');
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
  const [category, setCategory] = useState('Raw Material');
  const [tempRequirement, setTempRequirement] = useState('Chilled (<4°C)');
  const [uom, setUom] = useState('KG');
  const [shelfLife, setShelfLife] = useState('7 Days');
  const [standardPrice, setStandardPrice] = useState<number>(100);
  const [active, setActive] = useState(true);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenAdd = () => {
    setEditingProd(null);
    setCode(`PROD-NEW-${Date.now().toString().slice(-4)}`);
    setNameTH('');
    setNameEN('');
    setCategory('Raw Material');
    setTempRequirement('Chilled (<4°C)');
    setUom('KG');
    setShelfLife('7 Days');
    setStandardPrice(100);
    setActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: ProductMaster) => {
    setEditingProd(prod);
    setCode(prod.code);
    setNameTH(prod.nameTH);
    setNameEN(prod.nameEN);
    setCategory(prod.category);
    setTempRequirement(prod.tempRequirement);
    setUom(prod.uom);
    setShelfLife(prod.shelfLife);
    setStandardPrice(prod.standardPrice);
    setActive(prod.active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameTH || !uom) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลรหัสสินค้า, ชื่อภาษาไทย, และหน่วยนับ ให้ครบถ้วน' });
      return;
    }

    const isCreate = !editingProd;
    const newProd: ProductMaster = {
      id: editingProd?.id || code.trim().toUpperCase(),
      code: code.trim().toUpperCase(),
      nameTH: nameTH.trim(),
      nameEN: nameEN.trim(),
      category,
      tempRequirement,
      uom,
      shelfLife,
      standardPrice,
      active
    };

    try {
      // 1. Sync to Google Sheets
      await upsertProduct({
        Item_Code: newProd.code,
        Product_Name: newProd.nameTH,
        Category: newProd.category,
        Temperature: newProd.tempRequirement,
        UOM: newProd.uom,
        Shelf_Life: newProd.shelfLife,
        Standard_Price: newProd.standardPrice,
        Active: newProd.active ? 'TRUE' : 'FALSE'
      });

      // 2. Update global state
      await refreshSequences();

      // 3. Audit Log
      await logAuditEntry(
        isCreate ? 'CREATE' : 'MASTER_CHANGE',
        newProd.code,
        'PRODUCT_MASTER',
        `${isCreate ? 'Created' : 'Updated'} Product ${newProd.code} (${newProd.nameTH})`
      );

      setMessage({
        type: 'success',
        text: `บันทึกข้อมูลสินค้า ${newProd.code} สำเร็จและอัปเดตลง Google Sheets แล้ว`
      });
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setMessage({ type: 'error', text: `เกิดข้อผิดพลาดในการบันทึก: ${err.message}` });
    }
  };

  const handleSort = (field: keyof ProductMaster) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sorting, Filters, Searching
  const processedProducts = useMemo(() => {
    let list = [...products];

    if (catFilter !== 'ALL') {
      list = list.filter(p => p.category === catFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.code.toLowerCase().includes(q) ||
        p.nameTH.toLowerCase().includes(q) ||
        p.nameEN.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
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
  }, [products, searchTerm, catFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [processedProducts, currentPage]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  const exportCSV = () => {
    const headers = ['Code', 'Product Name TH', 'Product Name EN', 'Category', 'Temperature', 'UOM', 'Shelf Life', 'Price', 'Active'];
    const rows = processedProducts.map(p => [
      p.code,
      p.nameTH,
      p.nameEN,
      p.category,
      p.tempRequirement,
      p.uom,
      p.shelfLife,
      p.standardPrice,
      p.active ? 'Active' : 'Inactive'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Master_${new Date().toISOString().split('T')[0]}.csv`);
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
              <Package size={20} />
            </span>
            <h1 className="text-xl font-bold text-slate-800">
              Product Master (ทะเบียนตัวอย่างสินค้า)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ทะเบียนผลิตภัณฑ์กลุ่มตัวอย่าง CPF รวมไปถึงกลุ่มสินค้าแปรรูป สินค้าสด และอาหารปรุงสุก สำหรับจัดทำใบอ้างอิงส่งตัวอย่าง
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
            เพิ่มรายการสินค้าใหม่
          </button>
        </div>
      </div>

      {isLoading && products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 text-center">กำลังดึงข้อมูล Product Master จาก Google Sheets...</p>
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
            placeholder="ค้นหาชื่อสินค้า, รหัสสินค้า, หรือหมวดหมู่..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-500" />
            <select
              value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs bg-transparent border-none focus:ring-0 text-slate-600 font-medium focus:outline-none"
            >
              <option value="ALL">ทุกกลุ่มผลิตภัณฑ์</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
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
              {['temp', 'shelfLife', 'price', 'status'].map(col => (
                <label key={col} className="flex items-center gap-2 px-3 py-1 hover:bg-slate-50 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col)}
                    onChange={() => setHiddenColumns(
                      hiddenColumns.includes(col) ? hiddenColumns.filter(c => c !== col) : [...hiddenColumns, col]
                    )}
                    className="rounded text-blue-600"
                  />
                  <span>{col === 'temp' ? 'อุณหภูมิควบคุม' : col === 'shelfLife' ? 'อายุสินค้า' : col === 'price' ? 'ราคา' : 'สถานะ'}</span>
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

      {/* Product Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th onClick={() => handleSort('code')} className="py-3 px-4 cursor-pointer hover:bg-slate-100">
                  รหัสสินค้า <ArrowUpDown size={11} className="inline ml-1" />
                </th>
                <th className="py-3 px-4">ชื่อสินค้าตัวอย่าง (TH / EN)</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                {!hiddenColumns.includes('temp') && <th className="py-3 px-4">ควบคุมอุณหภูมิ</th>}
                <th className="py-3 px-4">หน่วย</th>
                {!hiddenColumns.includes('shelfLife') && <th className="py-3 px-4">อายุสินค้า (Shelf Life)</th>}
                {!hiddenColumns.includes('price') && <th className="py-3 px-4 text-right">ราคามาตรฐาน (บาท)</th>}
                {!hiddenColumns.includes('status') && <th className="py-3 px-4 text-center">สถานะ</th>}
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedProducts.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3 px-4 font-bold font-mono text-slate-800">{prod.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{prod.nameTH}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.nameEN}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                      {prod.category}
                    </span>
                  </td>
                  {!hiddenColumns.includes('temp') && (
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        prod.tempRequirement.includes('Frozen') 
                          ? 'bg-cyan-50 text-cyan-700 border-cyan-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <ThermometerSnowflake size={11} />
                        {prod.tempRequirement}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{prod.uom}</td>
                  {!hiddenColumns.includes('shelfLife') && <td className="py-3 px-4 text-slate-500 font-semibold">{prod.shelfLife}</td>}
                  {!hiddenColumns.includes('price') && (
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {prod.standardPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {!hiddenColumns.includes('status') && (
                    <td className="py-3 px-4 text-center">
                      {prod.active ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ใช้งาน</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ปิดใช้งาน</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setQuickViewProd(prod)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleOpenEdit(prod)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>แสดงผล {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, processedProducts.length)} จากทั้งหมด {processedProducts.length} รายการ</div>
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

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Package size={16} className="text-blue-600" />
                {editingProd ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มทะเบียนผลิตภัณฑ์ตัวอย่างใหม่'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสสินค้า (Product SKU Code) *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อสินค้าภาษาไทย *</label>
                <input
                  type="text"
                  value={nameTH}
                  onChange={(e) => setNameTH(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                <input
                  type="text"
                  value={nameEN}
                  onChange={(e) => setNameEN(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">กลุ่มประเภทสินค้า</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Ready-To-Cook">Ready-To-Cook</option>
                    <option value="Ready-To-Eat">Ready-To-Eat</option>
                    <option value="Further Processed">Further Processed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เงื่อนไขอุณหภูมิคลังจัดส่ง</label>
                  <select
                    value={tempRequirement}
                    onChange={(e) => setTempRequirement(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="Ambient (Normal)">Ambient (Normal)</option>
                    <option value="Chilled (<4°C)">Chilled (&lt;4°C)</option>
                    <option value="Frozen (<-18°C)">Frozen (&lt;-18°C)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ (UOM)</label>
                  <input
                    type="text"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
                    placeholder="เช่น KG, PACK"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อายุ (Shelf Life)</label>
                  <input
                    type="text"
                    value={shelfLife}
                    onChange={(e) => setShelfLife(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                    placeholder="เช่น 7 Days, 6 Months"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคาอ้างอิง (บาท)</label>
                  <input
                    type="number"
                    value={standardPrice}
                    onChange={(e) => setStandardPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  id="activeProd"
                />
                <label htmlFor="activeProd" className="font-semibold text-slate-700 select-none">เปิดใช้งานรายการนี้ในระบบ</label>
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
      {quickViewProd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                <ShoppingBag size={14} className="text-blue-600" />
                รายละเอียดผลิตภัณฑ์ย่อ
              </span>
              <button onClick={() => setQuickViewProd(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">รหัสสินค้า</span>
                <span className="font-bold font-mono text-slate-800 text-sm">{quickViewProd.code}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">ชื่อภาษาไทย</span>
                <span className="font-semibold text-slate-800">{quickViewProd.nameTH}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">English Name</span>
                <span className="font-medium text-slate-700 font-mono">{quickViewProd.nameEN || '-'}</span>
              </div>
              <hr className="border-slate-100" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-400">หมวดหมู่กลุ่ม</span>
                  <span className="font-semibold text-blue-700">{quickViewProd.category}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">เงื่อนไขอุณหภูมิ</span>
                  <span className="font-semibold text-emerald-700">{quickViewProd.tempRequirement}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block text-[10px] text-slate-400">หน่วยนับ</span>
                  <span className="font-bold font-mono text-slate-800">{quickViewProd.uom}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">อายุจัดเก็บ</span>
                  <span className="font-bold text-slate-800">{quickViewProd.shelfLife}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">ราคามาตรฐาน</span>
                  <span className="font-bold font-mono text-slate-800">{quickViewProd.standardPrice} บาท</span>
                </div>
              </div>
            </div>
            <button onClick={() => setQuickViewProd(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg">ปิดรายละเอียด</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
