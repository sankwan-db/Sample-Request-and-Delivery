import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router';
import { 
  Activity, ShieldCheck, Mail, AlertCircle, 
  Lock, User, UserPlus, ChevronLeft, CheckCircle2 
} from 'lucide-react';

export function Login() {
  const { login, loginWithEmailPassword, isAuthenticated, isLoading, authError } = useAuth();
  
  const [mode, setMode] = useState<'GOOGLE' | 'EMAIL' | 'REGISTER'>('GOOGLE');
  
  // Custom Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState('Commercial Sale');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-workspace-bg)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      setLoginLoading(true);
      setLocalError(null);
      await loginWithEmailPassword(email, password);
    } catch (err: any) {
      setLocalError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regName) return;

    try {
      setRegLoading(true);
      setLocalError(null);
      setRegSuccess(null);

      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          name: regName,
          department: regDept
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ส่งขอสิทธิ์สิทธิ์ล้มเหลว');
      }

      setRegSuccess(data.message || 'ส่งขอสิทธิ์สิทธิ์สำเร็จ กรุณารอการพิจารณาจาก Admin');
      // Clear fields
      setRegName('');
      setRegEmail('');
      setRegPassword('');
    } catch (err: any) {
      setLocalError(err.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-workspace-bg)] flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full rounded-sm shadow-md overflow-hidden flex border border-[var(--color-border-light)]">
        {/* Left Side - Branding */}
        <div className="w-1/2 bg-[var(--color-sidebar-bg)] p-12 text-white flex flex-col justify-between hidden md:flex relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-[28px] font-bold tracking-widest mb-2 text-white">SAMPLE FLOW</h1>
            <p className="text-[var(--color-primary-blue)] font-bold text-[11px] tracking-widest uppercase">Sample Management</p>
            
            <div className="mt-16 space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-white/5 p-2 rounded-sm border border-white/10"><Activity className="text-[var(--color-primary-blue)]" size={20} /></div>
                <div>
                  <h3 className="font-bold text-[13px] tracking-wide text-white">System-Driven Workflow</h3>
                  <p className="text-[var(--color-text-secondary)] text-[12px] mt-1.5 leading-relaxed font-medium">เปลี่ยนจากการประสานงานด้วยคน เป็นระบบอัตโนมัติที่ตรวจสอบสถานะและส่งต่องานได้ทันที</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white/5 p-2 rounded-sm border border-white/10"><ShieldCheck className="text-[var(--color-primary-blue)]" size={20} /></div>
                <div>
                  <h3 className="font-bold text-[13px] tracking-wide text-white">Centralized Data</h3>
                  <p className="text-[var(--color-text-secondary)] text-[12px] mt-1.5 leading-relaxed font-medium">รวบรวมข้อมูลทุกขั้นตอนไว้ในที่เดียว พร้อมตรวจสอบประวัติและ SLA แบบเรียลไทม์</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-widest mt-12">
            &copy; {new Date().getFullYear()} Internal Enterprise System. All rights reserved.
          </div>
        </div>
        
        {/* Right Side - Forms */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            
            {/* 1. GOOGLE MODE */}
            {mode === 'GOOGLE' && (
              <div className="space-y-6">
                <div className="mb-10 text-center md:text-left">
                  <h2 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-2">เข้าสู่ระบบ</h2>
                  <p className="text-[var(--color-text-secondary)] text-[13px] font-medium">ลงชื่อเข้าใช้ด้วยบัญชี Google ของบริษัทเพื่อเข้าสู่ระบบ Sample Flow</p>
                </div>
                
                {(authError || localError) && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3 text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="text-[13px] font-bold">{authError || localError}</span>
                  </div>
                )}
                
                <button
                  onClick={() => login().catch(() => {})}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-[var(--color-border-light)] text-[var(--color-text-primary)] font-bold py-3 px-4 rounded-sm hover:bg-[var(--color-workspace-bg)] transition-colors shadow-sm text-[13px]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                    <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.74 18.23 13.48 18.63 12 18.63C9.14 18.63 6.71 16.7 5.84 14.09H2.17V16.94C3.98 20.53 7.7 23 12 23Z" fill="#34A853"/>
                    <path d="M5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91V7.06H2.17C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.17 16.94L5.84 14.09Z" fill="#FBBC05"/>
                    <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.36 3.86C17.46 2.09 14.97 1 12 1C7.7 1 3.98 3.47 2.17 7.06L5.84 9.91C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative my-8 text-center">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                  <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">หรือ</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => { setMode('EMAIL'); setLocalError(null); }}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-sm text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Mail size={14} />
                    เข้าสู่ระบบด้วย Email & Password
                  </button>

                  <button
                    onClick={() => { setMode('REGISTER'); setLocalError(null); setRegSuccess(null); }}
                    className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-sm text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    แจ้งอีเมลขอสิทธิ์ใช้งานระบบ (Request Access)
                  </button>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                  <Mail size={14} />
                  <span>เฉพาะอีเมลองค์กรเท่านั้น</span>
                </div>
              </div>
            )}

            {/* 2. EMAIL & PASSWORD LOGIN MODE */}
            {mode === 'EMAIL' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <button 
                    onClick={() => setMode('GOOGLE')}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold mb-4"
                  >
                    <ChevronLeft size={14} />
                    กลับไปเข้าสู่ระบบด้วย Google
                  </button>
                  <h2 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-1">Email Login</h2>
                  <p className="text-[var(--color-text-secondary)] text-[12px] font-medium">เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่คุณขอสิทธิ์ไว้</p>
                </div>

                {localError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2.5 text-red-700 text-xs font-bold">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                <form onSubmit={handleCustomLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">อีเมลองค์กร *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="email"
                        placeholder="yourname@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">รหัสผ่าน *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-sm transition-colors text-[13px] disabled:bg-blue-400"
                  >
                    {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                  </button>
                </form>

                <p className="text-center text-slate-500 text-xs">
                  ยังไม่ได้ขอสิทธิ์ใช้งานใช่หรือไม่?{' '}
                  <button 
                    onClick={() => { setMode('REGISTER'); setLocalError(null); setRegSuccess(null); }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    ส่งขอสิทธิ์ลงทะเบียน
                  </button>
                </p>
              </div>
            )}

            {/* 3. REGISTER / ACCESS REQUEST MODE */}
            {mode === 'REGISTER' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <button 
                    onClick={() => setMode('GOOGLE')}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold mb-4"
                  >
                    <ChevronLeft size={14} />
                    กลับไปหน้าล็อกอิน
                  </button>
                  <h2 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-1">ส่งคำขอเข้าใช้งานระบบ</h2>
                  <p className="text-[var(--color-text-secondary)] text-[12px] font-medium">กรอกอีเมลองค์กรพร้อมสร้างรหัสผ่านเพื่อส่งขออนุมัติจาก Admin</p>
                </div>

                {localError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-sm flex items-start gap-2.5 text-red-700 text-xs font-bold animate-fadeIn">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm flex items-start gap-2.5 text-emerald-800 text-xs font-bold animate-fadeIn">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterRequest} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">ชื่อ-นามสกุลจริง *</label>
                    <input
                      type="text"
                      placeholder="สมชาย ใจดี"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">อีเมลองค์กร *</label>
                    <input
                      type="email"
                      placeholder="somchai@company.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-mono font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">รหัสผ่านที่ต้องการสร้าง *</label>
                    <input
                      type="password"
                      placeholder="ตั้งรหัสผ่านสำหรับเข้าสู่ระบบที่นี่"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-blue-500 font-medium"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1.5">แผนก/สังกัดหน่วยงาน</label>
                    <select
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-sm text-slate-800"
                    >
                      <option value="Commercial Sale">Commercial Sale</option>
                      <option value="R&D Raw Meat">R&D Raw Meat</option>
                      <option value="Co-Sale Logistics">Co-Sale Logistics</option>
                      <option value="IT Systems">IT Systems</option>
                      <option value="Logistics Dispatch">Logistics Dispatch</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-sm transition-colors text-[13px] disabled:bg-blue-400"
                  >
                    {regLoading ? 'กำลังส่งคำขอสิทธิ์...' : 'ส่งขออนุมัติสิทธิ์เข้าใช้งาน'}
                  </button>
                </form>

                <p className="text-center text-slate-500 text-xs">
                  มีบัญชีที่อนุมัติแล้ว?{' '}
                  <button 
                    onClick={() => { setMode('EMAIL'); setLocalError(null); }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    เข้าสู่ระบบที่นี่
                  </button>
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--color-border-light)]">
               <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3 text-center">Test Accounts (Debug)</p>
               <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={() => { setEmail('sale@company.com'); setPassword('123456'); setMode('EMAIL'); }} 
                   className="text-[11px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-workspace-bg)] hover:bg-[var(--color-border-light)] py-1.5 rounded-sm"
                 >
                   sale@company.com (123456)
                 </button>
                 <button 
                   onClick={() => { setEmail('manager@company.com'); setPassword('123456'); setMode('EMAIL'); }} 
                   className="text-[11px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-workspace-bg)] hover:bg-[var(--color-border-light)] py-1.5 rounded-sm"
                 >
                   manager@company.com
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
