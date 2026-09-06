import React, { useState } from 'react';
import { useRequests } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Save, Upload, CheckCircle2, FileText, 
  Sparkles, RefreshCw, Eye, ShieldCheck, Mail, Phone, 
  MapPin, Hash, Globe, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router';

export function CompanySettingsPage() {
  const { companySettings, updateCompanySettings } = useRequests();
  const { user } = useAuth();

  const [form, setForm] = useState({
    companyNameTh: companySettings.companyNameTh,
    companyNameEn: companySettings.companyNameEn,
    companyLogoUrl: companySettings.companyLogoUrl,
    address: companySettings.address,
    taxId: companySettings.taxId,
    phone: companySettings.phone,
    email: companySettings.email,
    docHeaderTitleTh: companySettings.docHeaderTitleTh,
    docHeaderTitleEn: companySettings.docHeaderTitleEn,
    docFooterNote: companySettings.docFooterNote
  });

  const [isSaved, setIsSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState(companySettings.companyLogoUrl);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setForm(prev => ({ ...prev, companyLogoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompanySettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <nav className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-2 mb-1">
            <Link to="/" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800">Company & Document Settings (PART 80)</span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                Company Information & Official Document Template
              </h1>
              <p className="text-[12px] text-slate-500">
                กำหนดข้อมูลองค์กร, โลโก้, หัวเอกสาร, และหมายเหตุส่วนท้ายสำหรับการสร้าง Official Sample Request PDF
              </p>
            </div>
          </div>
        </div>

        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <h2 className="text-[14px] font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              ข้อมูลองค์กร (Company Profile)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ชื่อบริษัท (ภาษาไทย) *
                </label>
                <input
                  type="text"
                  required
                  value={form.companyNameTh}
                  onChange={(e) => setForm({ ...form, companyNameTh: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  ชื่อบริษัท (ภาษาอังกฤษ) *
                </label>
                <input
                  type="text"
                  required
                  value={form.companyNameEn}
                  onChange={(e) => setForm({ ...form, companyNameEn: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Logo Upload / URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                โลโก้บริษัท (Company Logo)
              </label>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded p-3">
                <div className="w-16 h-16 bg-white border border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded text-[11px] font-bold text-slate-700 shadow-sm transition-colors flex items-center gap-1">
                      <Upload size={13} /> อัปโหลดไฟล์รูปภาพ (PNG/JPG)
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={() => { setLogoPreview(''); setForm({ ...form, companyLogoUrl: '' }); }}
                        className="text-rose-600 text-[11px] font-medium hover:underline"
                      >
                        ล้างรูปภาพ
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="หรือใส่ URL รูปภาพโลโก้ เช่น https://..."
                    value={form.companyLogoUrl}
                    onChange={(e) => {
                      setForm({ ...form, companyLogoUrl: e.target.value });
                      setLogoPreview(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address, Tax ID, Phone, Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                ที่อยู่สำนักงานใหญ่ (Head Office Address) *
              </label>
              <textarea
                rows={2}
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID)
                </label>
                <input
                  type="text"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  เบอร์โทรศัพท์ (Phone)
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Document Header & Footer Templates */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h2 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                หัวข้อและหมายเหตุเอกสารทางการ (Document Template)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ชื่อหัวเอกสารภาษาไทย (Header Title TH)
                  </label>
                  <input
                    type="text"
                    value={form.docHeaderTitleTh}
                    onChange={(e) => setForm({ ...form, docHeaderTitleTh: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    ชื่อหัวเอกสารภาษาอังกฤษ (Header Title EN)
                  </label>
                  <input
                    type="text"
                    value={form.docHeaderTitleEn}
                    onChange={(e) => setForm({ ...form, docHeaderTitleEn: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] font-bold font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  หมายเหตุส่วนท้ายเอกสาร (Footer Note)
                </label>
                <input
                  type="text"
                  value={form.docFooterNote}
                  onChange={(e) => setForm({ ...form, docFooterNote: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-[12px] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded text-[13px] font-bold transition-all shadow flex items-center gap-2"
              >
                <Save size={15} /> บันทึกการตั้งค่าองค์กรและเอกสาร (Save Settings)
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live A4 PDF Header Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-600" />
                Live PDF Header Preview (จำลองหัวกระดาษ A4)
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                A4 Scale Preview
              </span>
            </div>

            {/* Document Header Rendering */}
            <div className="bg-slate-50 border border-slate-300 rounded-md p-4 space-y-3 font-sans shadow-xs">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      className="w-12 h-12 object-contain rounded p-1 border border-slate-300 bg-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-900 text-white rounded flex flex-col items-center justify-center p-1">
                      <Building2 size={18} className="text-blue-400" />
                      <span className="text-[7px] font-black">LOGO</span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[13px] font-bold text-slate-900 leading-tight">
                      {form.companyNameTh || 'บริษัท แซมเปิล โฟลว์ เอนเตอร์ไพรส์ ฟู้ดส์ จำกัด'}
                    </h3>
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide font-sans">
                      {form.companyNameEn || 'SAMPLE FLOW ENTERPRISE FOOD COMPANY LIMITED'}
                    </h4>
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-tight">
                      {form.address} | โทร: {form.phone} | เลขผู้เสียภาษี: {form.taxId}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[13px] font-bold text-slate-900 leading-tight">
                    {form.docHeaderTitleTh || 'คำขอตัวอย่าง'}
                  </div>
                  <div className="text-[10px] font-black text-blue-900 uppercase">
                    {form.docHeaderTitleEn || 'SAMPLE REQUEST'}
                  </div>
                  <div className="bg-slate-100 border border-slate-300 rounded px-2 py-0.5 inline-block text-right mt-1">
                    <span className="text-[7px] text-slate-500 font-bold uppercase block">SAMPLE NO.</span>
                    <span className="text-[10px] font-mono font-black text-slate-900">SR-RM001-2026 REV.00</span>
                  </div>
                </div>
              </div>

              {/* Sample Product Row Mock */}
              <div className="text-[9px] text-slate-600 bg-white p-2 border border-slate-200 rounded">
                <div className="flex justify-between font-bold text-slate-700 pb-1 border-b border-slate-100">
                  <span>ตัวอย่างตารางสินค้า (Product Lines)</span>
                  <span>10.00 KG | ฿1,800.00</span>
                </div>
                <div className="pt-1 text-slate-500 text-[8px]">
                  1. SKU-RM-001 | Australian Wagyu Beef Ribeye MB4/5 | 10 KG
                </div>
              </div>

              {/* Document Footer Note */}
              <div className="pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 italic">
                {form.docFooterNote || 'เอกสารทางการสำหรับฝ่ายขายและปฏิบัติการจัดส่งสินค้าตัวอย่าง'}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-[12px] text-indigo-950 space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-indigo-900">
              <ShieldCheck size={16} /> การนำข้อมูลไปใช้ในระบบ (System Application)
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-indigo-800">
              <li>โลโก้และชื่อบริษัทจะถูกนำไปฝังในหัวเอกสาร <strong>Official Sample Request PDF</strong> อัตโนมัติ</li>
              <li>ข้อมูลที่อยู่และเลขประจำตัวผู้เสียภาษีจะปรากฏในรายงานทางการและเอกสารส่งมอบ (POD)</li>
              <li>การแก้ไขจะส่งผลกับเอกสารทุกฉบับที่ถูกเปิดดูหรือพิมพ์ออกมาใหม่ทันที</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
