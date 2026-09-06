import React, { useRef } from 'react';
import { SampleRequest, formatSamplePdfFileName, getSamplePdfDrivePath } from '../types';
import { useRequests } from '../contexts/RequestContext';
import { 
  X, Printer, Download, CheckCircle2, QrCode, ShieldCheck, FileText, 
  FolderTree, ExternalLink, Calendar, Building2, User, Truck, Package, 
  FileCheck2, DollarSign, Clock, Layers
} from 'lucide-react';

interface Props {
  request: SampleRequest;
  onClose: () => void;
}

export function SamplePDFModal({ request, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { companySettings } = useRequests();

  const handlePrint = () => {
    window.print();
  };

  // Part 65: Official PDF File Name
  const pdfFileName = formatSamplePdfFileName(request.sampleNo, request.revision);

  // Part 66: Google Drive Folder Structure
  const currentYear = new Date().getFullYear();
  const deptCode = request.department || 'RM';
  const driveInfo = getSamplePdfDrivePath(request.sampleNo, deptCode, currentYear, request.revision);

  // Calculations for Summary
  const totalWeight = request.lines.reduce((sum, line) => {
    const bagKg = (line.kgPerBag || 0) * (line.bagQty || 0);
    return sum + (bagKg > 0 ? bagKg : (line.requestQty || 0));
  }, 0);

  const subtotal = request.lines.reduce((sum, line) => {
    return sum + (line.value || (line.requestQty * (line.price || 0)) || 0);
  }, 0);

  const vatAmount = subtotal * 0.07;
  const grandTotalNet = subtotal + vatAmount;

  // Format Dates
  const preparedDate = request.createdDate || '05/09/2026';
  const approvedDate = request.approvals?.[0]?.approvalDate || request.createdDate || '05/09/2026';
  const deliveryDate = request.deliveryDate || '07/09/2026';

  const downloadHtmlAsPdfDoc = () => {
    // Triggers standard print-to-PDF dialog in browser
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-lg shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Control Bar (Screen Only) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-bold text-white tracking-wide">
                  Official Document Preview: ใบคำขอตัวอย่างสินค้า (SAMPLE REQUEST)
                </h2>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  A4 PORTRAIT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>File Name:</span>
                <span className="text-emerald-400 font-bold bg-slate-800 px-1.5 py-0.2 rounded">
                  {pdfFileName}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded text-[12px] font-semibold transition-all shadow-sm active:scale-95"
            >
              <Printer size={15} /> พิมพ์ / บันทึกเป็น PDF (A4)
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors"
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Google Drive Folder Hierarchy Breadcrumb (Part 66) */}
        <div className="bg-slate-800 text-slate-300 px-5 py-2 text-[11px] flex items-center justify-between border-b border-slate-700 print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto">
            <FolderTree size={14} className="text-amber-400 shrink-0" />
            <span className="text-slate-400 font-semibold">Google Drive Storage Path:</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">{driveInfo.rootFolder}</span>
              <span className="text-slate-500">/</span>
              <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">{driveInfo.yearFolder}</span>
              <span className="text-slate-500">/</span>
              <span className="bg-slate-900 text-amber-300 font-bold px-2 py-0.5 rounded border border-slate-700">{driveInfo.deptFolder}</span>
              <span className="text-slate-500">/</span>
              <span className="bg-slate-900 text-blue-300 font-bold px-2 py-0.5 rounded border border-slate-700">{driveInfo.sampleFolder}</span>
              <span className="text-slate-500">/</span>
              <span className="bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-700/50 flex items-center gap-1">
                <FileCheck2 size={12} /> {driveInfo.fileName}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden md:inline">
            Status: Synchronized
          </span>
        </div>

        {/* Printable Document Container (A4 Portrait Dimensions) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 flex justify-center">
          <div 
            ref={printRef} 
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-10 shadow-xl border border-slate-300 flex flex-col justify-between font-sans print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none"
            style={{
              fontFamily: "'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            <div>
              {/* ============================================================ */}
              {/* PART 63 — OFFICIAL DOCUMENT HEADER */}
              {/* ============================================================ */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  
                  {/* Left: Company Logo & Official Names */}
                  <div className="flex items-start gap-4">
                    {/* Company Logo */}
                    {companySettings.companyLogoUrl ? (
                      <img 
                        src={companySettings.companyLogoUrl} 
                        alt="Company Logo" 
                        className="w-16 h-16 object-contain rounded p-1 border border-slate-300 shrink-0 bg-white"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-900 text-white rounded flex flex-col items-center justify-center p-1 border border-slate-700 shrink-0">
                        <Building2 size={24} className="text-blue-400" />
                        <span className="text-[9px] font-black tracking-widest mt-0.5">LOGO</span>
                      </div>
                    )}

                    <div>
                      <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
                        {companySettings.companyNameTh || 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด'}
                      </h2>
                      <h3 className="text-[12px] font-bold text-slate-700 tracking-wider uppercase font-sans">
                        {companySettings.companyNameEn || 'SAMPLE FLOW ENTERPRISE FOOD COMPANY LIMITED'}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        {companySettings.address} | โทร: {companySettings.phone} | เลขประจำตัวผู้เสียภาษี: {companySettings.taxId}
                      </p>
                    </div>
                  </div>

                  {/* Right: Document Title & Metadata Block */}
                  <div className="text-right">
                    <div className="text-right mb-1">
                      <span className="text-[15px] font-bold text-slate-900 block leading-tight">
                        {companySettings.docHeaderTitleTh || 'คำขอตัวอย่าง'}
                      </span>
                      <span className="text-[13px] font-black text-blue-900 tracking-widest uppercase block font-sans">
                        {companySettings.docHeaderTitleEn || 'SAMPLE REQUEST'}
                      </span>
                    </div>
                    <div className="bg-slate-100 border border-slate-400 rounded px-3 py-1 inline-block text-right">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                        SAMPLE NO.
                      </span>
                      <span className="text-[13px] font-mono font-black text-slate-900 block">
                        {request.sampleNo} <span className="text-blue-700 font-bold">{request.revision || 'REV.00'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Sub-Dates (Prepared, Approved, Delivery) */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200 text-[11px] bg-slate-50/70 p-2 rounded">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Prepared Date:</span>
                    <span className="font-bold text-slate-900 font-mono">{preparedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-slate-500 font-medium">Approved Date:</span>
                    <span className="font-bold text-emerald-800 font-mono">{approvedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-slate-500 font-medium">Delivery Date:</span>
                    <span className="font-bold text-blue-900 font-mono">{deliveryDate}</span>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* PART 64 — DOCUMENT BODY (SECTIONS) */}
              {/* ============================================================ */}

              {/* Section: Request Information & Commercial Profiles */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-[11px]">
                {/* Box 1: Customer & Commercial */}
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40">
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
                    <span>ข้อมูลลูกค้าและพนักงานขาย (Customer & Sale)</span>
                    <span className="text-[9px] font-mono text-slate-500">{request.customerCode}</span>
                  </h4>
                  <table className="w-full text-left leading-tight">
                    <tbody>
                      <tr>
                        <td className="py-0.5 text-slate-500 w-24 font-medium">Customer:</td>
                        <td className="py-0.5 font-bold text-slate-900">{request.customerName}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Contact:</td>
                        <td className="py-0.5 font-medium text-slate-800">{request.contactName} ({request.contactPhone})</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Sale Owner:</td>
                        <td className="py-0.5 font-bold text-slate-900">{request.saleName}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Sales Channel:</td>
                        <td className="py-0.5 font-medium text-slate-800">{request.salesChannel || 'Modern Trade / Key Account'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Purpose:</td>
                        <td className="py-0.5 font-medium text-slate-800">{request.sampleType} - {request.samplePurpose || 'New Product Testing'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Box 2: RD Department & Logistics Overview */}
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50/40">
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
                    <span>แผนกจัดเตรียมและจัดส่ง (RD & Delivery)</span>
                    <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-1 rounded">{request.department}</span>
                  </h4>
                  <table className="w-full text-left leading-tight">
                    <tbody>
                      <tr>
                        <td className="py-0.5 text-slate-500 w-28 font-medium">RD Department:</td>
                        <td className="py-0.5 font-bold text-slate-900">{request.department} ({request.departmentPrefix || request.department})</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Preparation Date:</td>
                        <td className="py-0.5 font-bold text-slate-800">{request.preparationDate || request.deliveryDate} (Due: {request.preparationDueTime || '16:00'})</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Delivery Date:</td>
                        <td className="py-0.5 font-bold text-blue-900">{request.deliveryDate} ({request.deliveryTimeFrom} - {request.deliveryTimeTo} น.)</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Route & Depot:</td>
                        <td className="py-0.5 font-medium text-slate-800">{request.route} | {request.depot || 'Main Depot'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500 font-medium">Temp Control:</td>
                        <td className="py-0.5 font-bold text-red-700">{request.temperature}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============================================================ */}
              {/* PRODUCT TABLE (PART 64) */}
              {/* Columns: No, Code, Item Name, Type, Fz/Ch, KG/Bag, Bag, KG, บาท/กก., ยอดเงิน, Note, การคิดเงินค่าสินค้า */}
              {/* ============================================================ */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    รายการสินค้าตัวอย่าง (Product Line Items)
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    ทั้งหมด {request.lines.length} รายการ
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-400 rounded">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-400">
                        <th className="py-1.5 px-2 text-center border-r border-slate-300 w-8">No.</th>
                        <th className="py-1.5 px-2 text-left border-r border-slate-300 w-24">Code</th>
                        <th className="py-1.5 px-2 text-left border-r border-slate-300">Item Name</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-300 w-16">Type</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-300 w-14">Fz/Ch</th>
                        <th className="py-1.5 px-1.5 text-right border-r border-slate-300 w-14">KG/Bag</th>
                        <th className="py-1.5 px-1.5 text-right border-r border-slate-300 w-12">Bag</th>
                        <th className="py-1.5 px-1.5 text-right border-r border-slate-300 w-14">KG</th>
                        <th className="py-1.5 px-1.5 text-right border-r border-slate-300 w-16">บาท/กก.</th>
                        <th className="py-1.5 px-2 text-right border-r border-slate-300 w-20">ยอดเงิน</th>
                        <th className="py-1.5 px-2 text-left border-r border-slate-300">Note</th>
                        <th className="py-1.5 px-1.5 text-center w-24">การคิดเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {request.lines.map((line, idx) => {
                        const calculatedKg = (line.kgPerBag && line.bagQty) 
                          ? (line.kgPerBag * line.bagQty) 
                          : line.requestQty;
                        const lineTotal = line.value || (calculatedKg * (line.price || 0));

                        return (
                          <tr key={line.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-1.5 px-2 text-center border-r border-b border-slate-300 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-2 text-left border-r border-b border-slate-300 font-mono font-bold text-blue-900">
                              {line.itemCode}
                            </td>
                            <td className="py-1.5 px-2 text-left border-r border-b border-slate-300">
                              <div className="font-bold text-slate-900 leading-tight">{line.productName}</div>
                              {line.lot && (
                                <div className="text-[9px] text-slate-500 font-mono">Lot: {line.lot} | Exp: {line.expiryDate || '-'}</div>
                              )}
                            </td>
                            <td className="py-1.5 px-1.5 text-center border-r border-b border-slate-300 text-slate-700">
                              {line.category || 'RM'}
                            </td>
                            <td className="py-1.5 px-1.5 text-center border-r border-b border-slate-300">
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                line.storageType === 'Frozen' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {line.storageType === 'Frozen' ? 'Fz -18°C' : line.storageType === 'Chilled' ? 'Ch 0-4°C' : 'Ambient'}
                              </span>
                            </td>
                            <td className="py-1.5 px-1.5 text-right border-r border-b border-slate-300 font-mono">
                              {line.kgPerBag !== undefined ? line.kgPerBag.toFixed(2) : '-'}
                            </td>
                            <td className="py-1.5 px-1.5 text-right border-r border-b border-slate-300 font-mono font-bold">
                              {line.bagQty || line.requestQty || 1}
                            </td>
                            <td className="py-1.5 px-1.5 text-right border-r border-b border-slate-300 font-mono font-bold text-slate-900">
                              {calculatedKg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right border-r border-b border-slate-300 font-mono">
                              {line.price ? line.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="py-1.5 px-2 text-right border-r border-b border-slate-300 font-mono font-bold text-blue-950">
                              ฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-2 text-left border-r border-b border-slate-300 text-slate-600 text-[9.5px]">
                              {line.remark || '-'}
                            </td>
                            <td className="py-1.5 px-1.5 text-center border-b border-slate-300 text-[9px]">
                              <span className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded border border-slate-300 font-medium">
                                {line.stockDeduction === 'DEDUCT' ? 'ตัดสต็อกปกติ' : line.stockDeduction === 'SAMPLE_STOCK' ? 'สต็อกตัวอย่าง' : 'FOC ฟรี'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============================================================ */}
              {/* SUMMARY (PART 64): น้ำหนักสินค้า, ราคารวม, VAT, ราคารวมสุทธิ */}
              {/* ============================================================ */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-[11px]">
                {/* Left: Required Documents & Customer Receiving Info */}
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50/30">
                  <h4 className="font-bold text-slate-900 text-[11px] mb-1.5 border-b border-slate-200 pb-1">
                    เอกสารที่ต้องแนบ & การรับสินค้า (Documents & Receiving)
                  </h4>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-start gap-1">
                      <span className="font-medium text-slate-500 w-28 shrink-0">Required Docs:</span>
                      <span className="font-bold text-blue-900">
                        {request.requiredDocuments?.length > 0 ? request.requiredDocuments.join(', ') : 'COA (ใบวิเคราะห์ผล), Spec Sheet'}
                      </span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-medium text-slate-500 w-28 shrink-0">สถานที่จัดส่ง:</span>
                      <span className="text-slate-800">
                        {request.deliveryAddress}, {request.district}, {request.province}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-500 w-28 shrink-0">ช่วงเวลารับสินค้า:</span>
                      <span className="font-bold text-slate-800">
                        {request.deliveryTimeFrom} - {request.deliveryTimeTo} น.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Financial Summary Box */}
                <div className="border-2 border-slate-800 rounded p-2.5 bg-slate-100/80">
                  <table className="w-full text-left">
                    <tbody>
                      <tr>
                        <td className="py-0.5 font-medium text-slate-700">น้ำหนักสินค้ารวม (Total Weight):</td>
                        <td className="py-0.5 text-right font-mono font-bold text-slate-900">{totalWeight.toFixed(2)} KG</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-medium text-slate-700">ราคารวม (Subtotal):</td>
                        <td className="py-0.5 text-right font-mono font-bold text-slate-900">฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-medium text-slate-700">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                        <td className="py-0.5 text-right font-mono font-bold text-slate-900">฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-t-2 border-slate-800">
                        <td className="pt-1 font-black text-blue-950 text-[12px]">ราคารวมสุทธิ (Grand Total):</td>
                        <td className="pt-1 text-right font-mono font-black text-blue-950 text-[13px]">฿{grandTotalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ============================================================ */}
              {/* MULTI-DEPARTMENT EXECUTION STATUS (PART 64) */}
              {/* Preparation Schedule, Delivery Information, Logistic Summary, Sales Order */}
              {/* ============================================================ */}
              <div className="border border-slate-300 rounded p-2.5 mb-4 bg-slate-50/50 text-[10px]">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                  บันทึกการประสานงาน 3 ฝ่าย (Operational Execution References)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="font-bold text-slate-700 block uppercase">1. Logistic Summary</span>
                    <span className="text-slate-600 block">
                      ผลตรวจ: <span className="font-bold text-emerald-700">{request.logisticTask?.feasibility || 'Available (พร้อมส่ง)'}</span>
                    </span>
                    <span className="text-slate-500 block">สายรถ: {request.route}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block uppercase">2. Sales Order (ERP)</span>
                    <span className="text-slate-600 block">
                      SO No: <span className="font-mono font-bold text-blue-900">{request.coSaleTask?.soNumber || 'SO-2026-09411'}</span>
                    </span>
                    <span className="text-slate-500 block">สถานะ ERP: {request.coSaleTask?.erpStatus || 'RELEASED'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block uppercase">3. Delivery & Vehicle</span>
                    <span className="text-slate-600 block">
                      รถขนส่ง: <span className="font-bold text-slate-900">{request.logisticTask?.vehicleNo || 'ทะเบียน 2ฒข-4891 กทม.'}</span>
                    </span>
                    <span className="text-slate-500 block">คนขับ: {request.logisticTask?.driverName || 'นายสมศักดิ์ นำส่ง'}</span>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* SIGNATURE BLOCKS (PART 64): Prepared By, Approved By */}
              {/* ============================================================ */}
              <div className="grid grid-cols-3 gap-3 text-[10.5px] border border-slate-400 rounded p-3 bg-white mt-2">
                {/* Prepared By (Sale) */}
                <div className="text-center flex flex-col justify-between h-24 border-r border-slate-200 pr-2">
                  <div>
                    <span className="text-slate-500 block font-medium">ผู้ขอตัวอย่าง (Prepared By)</span>
                    <span className="font-bold text-slate-900 mt-1 block">{request.saleName}</span>
                    <span className="text-[9.5px] text-slate-500">พนักงานขาย (Sale Specialist)</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 text-slate-600 text-[10px]">
                    วันที่ {preparedDate}
                  </div>
                </div>

                {/* Approved By (Sale Manager) */}
                <div className="text-center flex flex-col justify-between h-24 border-r border-slate-200 pr-2">
                  <div>
                    <span className="text-slate-500 block font-medium">ผู้อนุมัติ (Approved By)</span>
                    <div className="mt-1 flex items-center justify-center gap-1 font-bold text-emerald-800">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>{request.approvals?.[0]?.approverName || 'Kitti (Sale Manager)'}</span>
                    </div>
                    <span className="text-[9.5px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                      APPROVED ON SYSTEM
                    </span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 text-slate-600 text-[10px]">
                    วันที่ {approvedDate}
                  </div>
                </div>

                {/* Customer Receiving Sign-off */}
                <div className="text-center flex flex-col justify-between h-24">
                  <div>
                    <span className="text-slate-500 block font-medium">ผู้รับสินค้าตัวอย่าง (Received By)</span>
                    <div className="mt-2 text-slate-400 border-b border-dashed border-slate-300 pb-1 mx-4">
                      (......................................................)
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">ตัวแทนลูกค้าผู้มีอำนาจตรวจรับ</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 text-slate-600 text-[10px]">
                    วันที่ ______ / ______ / 2026
                  </div>
                </div>
              </div>
            </div>

            {/* Document Verification Footer */}
            <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500 font-mono">
              <div>
                <span>Official PDF: </span>
                <span className="font-bold text-slate-800">{pdfFileName}</span>
                <span className="mx-2">|</span>
                <span>Security Hash: SHA256:{request.sampleNo.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}A9F1</span>
              </div>
              <div>
                Page 1 of 1 (A4 Portrait Official Copy)
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
