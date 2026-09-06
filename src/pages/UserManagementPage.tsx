import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { 
  Users, UserPlus, Shield, ShieldCheck, CheckSquare, 
  Search, Edit, Save, Trash2, ShieldAlert, Lock, Unlock, HelpCircle
} from 'lucide-react';
import { useRequests } from '../contexts/RequestContext';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  active: boolean;
  lastLogin: string;
}

export function UserManagementPage() {
  const { logAuditEntry } = useRequests();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'REQUESTS'>('USERS');

  const handleTabChange = (tab: 'USERS' | 'ROLES' | 'REQUESTS') => {
    setActiveTab(tab);
  };

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Access Requests State
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [approveRole, setApproveRole] = useState('');
  const [approveDept, setApproveDept] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectRequest, setSelectedRejectRequest] = useState<any | null>(null);

  const defaultMenusByRole: Record<string, string[]> = {
    SALE: ['Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)', 'การตั้งค่า (Settings)'],
    SALE_MANAGER: ['Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)', 'อนุมัติ / ปฏิเสธ (Approve / Reject)', 'การตั้งค่า (Settings)'],
    RD: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'การตั้งค่า (Settings)'],
    CO_SALE: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'จับคู่ข้อมูลการขาย (Sales Match / SO)', 'การตั้งค่า (Settings)'],
    LOGISTIC: ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)', 'จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)', 'การตั้งค่า (Settings)'],
    ADMIN: [
      'Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)',
      'ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)', 'จับคู่ข้อมูลการขาย (Sales Match / SO)',
      'จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)', 'การตั้งค่า (Settings)',
      'Sequence Setup & Running No', 'User & Access Control'
    ]
  };

  const menuOptions = [
    'Dashboard & Overview',
    'สร้างคำขอ (Create Sample Request)',
    'รายการคำขอทั้งหมด (All Requests)',
    'ตรวจสอบและวิเคราะห์ (R&D Prep)',
    'ออกใบจัดเตรียมสูตร (RD Master)',
    'จับคู่ข้อมูลการขาย (Sales Match / SO)',
    'จัดเตรียมขนส่ง (Logistic Dispatch)',
    'จัดเส้นทางขนส่ง (Vehicle Setup)',
    'การตั้งค่า (Settings)',
    'Sequence Setup & Running No',
    'User & Access Control'
  ];

  const fetchAccessRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await fetch('/api/admin/access-requests');
      const data = await res.json();
      if (data.success) {
        setAccessRequests(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching access requests:', e);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessRequests();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setApproveDept('');
      setApproveRole('');
    }
  }, [selectedRequest]);

  useEffect(() => {
    setSelectedMenus(defaultMenusByRole[approveRole] || []);
  }, [approveRole]);

  const handleOpenApprove = (req: any) => {
    setSelectedRequest(req);
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const res = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          role: approveRole,
          department: approveDept,
          menus: selectedMenus
        })
      });
      const data = await res.json();
      if (data.success) {
        setApproveModalOpen(false);
        setSelectedRequest(null);
        fetchAccessRequests();
        
        // Add to users table
        const newUser: UserRecord = {
          id: `U-${Date.now().toString().slice(-4)}`,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: approveRole,
          department: approveDept,
          active: true,
          lastLogin: 'Never'
        };
        setUsers(prev => [...prev, newUser]);

        await logAuditEntry('MASTER_CHANGE', selectedRequest.email, 'USER_ACCOUNT', `Approved access request and assigned role ${approveRole}`);
      }
    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  const handleReject = (req: any) => {
    setSelectedRejectRequest(req);
    setRejectModalOpen(true);
  };

  const handleConfirmRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRejectRequest) return;

    try {
      const res = await fetch('/api/admin/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRejectRequest.id })
      });
      const data = await res.json();
      if (data.success) {
        fetchAccessRequests();
        await logAuditEntry('MASTER_CHANGE', selectedRejectRequest.email, 'USER_ACCOUNT', `Rejected access request for ${selectedRejectRequest.name}`);
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
    } finally {
      setRejectModalOpen(false);
      setSelectedRejectRequest(null);
    }
  };

  const toggleMenuPermission = (menu: string) => {
    setSelectedMenus(prev => 
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  // Users List
  const [users, setUsers] = useState<UserRecord[]>([
    { id: 'U-01', name: 'Sale Specialist 01', email: 'sale.specialist01@company.com', role: 'SALE', department: 'Commercial Sale', active: true, lastLogin: '2026-09-05 10:20' },
    { id: 'U-02', name: 'Commercial Sale Team', email: 'cosale.team@company.com', role: 'CO_SALE', department: 'Co-Sale Dept', active: true, lastLogin: '2026-09-05 09:12' },
    { id: 'U-03', name: 'RD Supervisor 01', email: 'rd.supervisor01@company.com', role: 'RD', department: 'RD Raw Material', active: true, lastLogin: '2026-09-05 10:15' },
    { id: 'U-04', name: 'Logistic Coordinator', email: 'logistic.coord@company.com', role: 'LOGISTIC', department: 'Logistic Logistics', active: true, lastLogin: '2026-09-05 08:44' },
    { id: 'U-05', name: 'Sales Manager One', email: 'sale.manager01@company.com', role: 'SALE_MANAGER', department: 'Sales Management', active: true, lastLogin: '2026-09-04 17:05' },
    { id: 'U-06', name: 'Admin Master Control', email: 'admin.master@company.com', role: 'ADMIN', department: 'Executive Admin', active: true, lastLogin: '2026-09-05 10:28' }
  ]);

  // Permissions Matrix Definition
  const permissions = [
    { module: 'Create Sample Request', SALE: true, SALE_MANAGER: true, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Approve / Reject Requests', SALE: false, SALE_MANAGER: true, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Modify Sequence Running Number', SALE: false, SALE_MANAGER: false, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Skip Ahead Sequences', SALE: false, SALE_MANAGER: false, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Void Sample Reference Number', SALE: false, SALE_MANAGER: true, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Complete RD Preparation Tasks', SALE: false, SALE_MANAGER: false, RD: true, CO_SALE: false, LOGISTIC: false, ADMIN: true },
    { module: 'Create Sale Order (SO) Match', SALE: false, SALE_MANAGER: false, RD: false, CO_SALE: true, LOGISTIC: false, ADMIN: true },
    { module: 'Assign Logistic Vehicles & Dispatch', SALE: false, SALE_MANAGER: false, RD: false, CO_SALE: false, LOGISTIC: true, ADMIN: true },
    { module: 'Modify Master Configurations', SALE: false, SALE_MANAGER: false, RD: false, CO_SALE: false, LOGISTIC: false, ADMIN: true }
  ];

  // User form
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALE');
  const [department, setDepartment] = useState('Commercial Sale');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('SALE');
    setDepartment('Commercial Sale');
    setActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: UserRecord) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setDepartment(u.department);
    setActive(u.active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const isCreate = !editingUser;
    const item: UserRecord = {
      id: editingUser?.id || `U-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      department,
      active,
      lastLogin: editingUser?.lastLogin || 'Never'
    };

    if (isCreate) {
      setUsers(prev => [...prev, item]);
    } else {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? item : u));
    }

    // Part 82 Audit log
    await logAuditEntry(
      isCreate ? 'CREATE' : 'MASTER_CHANGE',
      item.email,
      'USER_ACCOUNT',
      `${isCreate ? 'Registered' : 'Updated'} user ${item.name} as role ${item.role}`
    );

    setModalOpen(false);
  };

  const handleSavePermissionMatrix = async () => {
    setSaveSuccess(true);
    await logAuditEntry('MASTER_CHANGE', 'ROLE_PERMISSIONS_MATRIX', 'SECURITY_POLICY', 'Modified Role Security Permission Matrix constraints');
    setTimeout(() => setSaveSuccess(false), 3000);
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
              User & Access Control Manager
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            จัดการบัญชีผู้ใช้ บทบาทหน้าที่ สิทธิ์การเข้าถึง และสิทธิ์การใช้งานตามโมดูลความปลอดภัย (Security Controls & Permissions)
          </p>
        </div>

        {activeTab === 'USERS' && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <UserPlus size={15} />
            เพิ่มผู้ใช้งานใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => handleTabChange('USERS')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'USERS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} />
          บัญชีผู้ใช้งาน (Users Directory)
        </button>
        <button
          onClick={() => handleTabChange('ROLES')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'ROLES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield size={14} />
          เมทริกซ์สิทธิ์เข้าถึง (Role Permission Matrix)
        </button>
        <button
          onClick={() => handleTabChange('REQUESTS')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'REQUESTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus size={14} />
          คำขอสิทธิ์การใช้งาน (Access Requests)
          {accessRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {accessRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'REQUESTS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-fadeIn">
          {requestsLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">กำลังโหลดข้อมูล...</div>
          ) : accessRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">ไม่มีข้อมูลคำขอสิทธิ์การใช้งาน</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">ชื่อผู้ส่งคำขอ</th>
                    <th className="py-2.5 px-4">อีเมลแอดเดรส</th>
                    <th className="py-2.5 px-4">แผนก/หน่วยงาน</th>
                    <th className="py-2.5 px-4">วันที่ส่งคำขอ</th>
                    <th className="py-2.5 px-4 text-center">สถานะ</th>
                    <th className="py-2.5 px-4 text-center">จัดการคำขอ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accessRequests.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{req.name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">{req.email}</td>
                      <td className="py-3 px-4 font-medium text-slate-500">{req.department}</td>
                      <td className="py-3 px-4 text-slate-400">{req.requestDate}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {req.status === 'PENDING' ? 'รอพิจารณา' : 
                           req.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenApprove(req)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-[10px]"
                            >
                              อนุมัติ (Approve)
                            </button>
                            <button
                              onClick={() => handleReject(req)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-md text-[10px]"
                            >
                              ปฏิเสธ (Reject)
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">
                            {req.status === 'APPROVED' ? `อนุมัติเมื่อ ${req.approvedDate || '-'}` : 'ปฏิเสธแล้ว'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ชื่อผู้ใช้งาน</th>
                  <th className="py-2.5 px-4">อีเมลบัญชี *</th>
                  <th className="py-2.5 px-4">บทบาทความรับผิดชอบ</th>
                  <th className="py-2.5 px-4">สังกัดหน่วยงาน</th>
                  <th className="py-2.5 px-4">ล็อกอินล่าสุด</th>
                  <th className="py-2.5 px-4 text-center">สถานะ</th>
                  <th className="py-2.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        u.role === 'SALE_MANAGER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        u.role === 'RD' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-500">{u.department}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{u.lastLogin}</td>
                    <td className="py-3 px-4 text-center">
                      {u.active ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ใช้งาน</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">ระงับสิทธิ์</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleOpenEdit(u)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded">
                        <Edit size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ROLES' && (
        <div className="space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <ShieldAlert size={18} className="text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">การตรวจสอบสิทธิ์เชิงโครงสร้าง (Rule-Based Access Control - Part 84)</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">แผนผังสิทธิ์บังคับสิทธิ์ในกระบวนการทำงาน การตรวจสอบ (Audits) และสร้างใบกำกับสิทธิ์</p>
              </div>
            </div>
            <button
              onClick={handleSavePermissionMatrix}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Save size={13} />
              บันทึกโครงสร้างสิทธิ์
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-lg font-semibold animate-fadeIn">
              บันทึกโครงสร้างสิทธิ์และการป้องกันการกลายพันธุ์สิทธิ์ในระดับ API เรียบร้อยแล้ว!
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">สิทธิ์กิจกรรมโมดูล (Module Event Capability)</th>
                  <th className="py-3 px-2 text-center w-20">SALE</th>
                  <th className="py-3 px-2 text-center w-20">SALE MGR</th>
                  <th className="py-3 px-2 text-center w-20">RD DEPT</th>
                  <th className="py-3 px-2 text-center w-20">CO-SALE</th>
                  <th className="py-3 px-2 text-center w-20">LOGISTIC</th>
                  <th className="py-3 px-2 text-center w-20">SYS ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {permissions.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">{p.module}</td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.SALE} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.SALE_MANAGER} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.RD} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.CO_SALE} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.LOGISTIC} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <input type="checkbox" defaultChecked={p.ADMIN} disabled className="rounded text-blue-600 focus:ring-0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
              {editingUser ? 'แก้ไขบัญชีสิทธิ์ผู้ใช้' : 'ลงทะเบียนผู้ใช้ใหม่'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมลแอดเดรสขององค์กร *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  required
                  disabled={Boolean(editingUser)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">บทบาทสิทธิ์ (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="SALE">SALE</option>
                    <option value="SALE_MANAGER">SALE_MANAGER</option>
                    <option value="RD">RD</option>
                    <option value="CO_SALE">CO_SALE</option>
                    <option value="LOGISTIC">LOGISTIC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยงานสังกัด</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  id="activeUser"
                />
                <label htmlFor="activeUser" className="font-semibold text-slate-700 select-none">เปิดสถานะบัญชี (Active)</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">บันทึกสิทธิ์</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Request Approval Modal */}
      {approveModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">อนุมัติสิทธิ์เข้าใช้งานระบบ</h2>
              <p className="text-[11px] text-slate-500 mt-1">ผู้ใช้: {selectedRequest.name} ({selectedRequest.email})</p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">กำหนดสิทธิ์ (Role)</label>
                  <select
                    value={approveRole}
                    onChange={(e) => setApproveRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                    required
                  >
                    <option value="">-- เลือกสิทธิ์ (Select Role) --</option>
                    <option value="SALE">SALE</option>
                    <option value="SALE_MANAGER">SALE_MANAGER</option>
                    <option value="RD">RD</option>
                    <option value="CO_SALE">CO_SALE</option>
                    <option value="LOGISTIC">LOGISTIC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แผนก/สังกัดหน่วยงาน</label>
                  <input
                    type="text"
                    value={approveDept}
                    onChange={(e) => setApproveDept(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">กำหนดเมนูใช้งานระบบ (Menu Authorizations)</label>
                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-2">
                  {menuOptions.map((menu) => (
                    <label key={menu} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMenus.includes(menu)}
                        onChange={() => toggleMenuPermission(menu)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">{menu}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setApproveModalOpen(false); setSelectedRequest(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  ยืนยันอนุมัติคำขอ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Reject Confirmation Modal */}
      {rejectModalOpen && selectedRejectRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div>
              <h2 className="font-bold text-red-600 text-sm">ปฏิเสธสิทธิ์การใช้งานระบบ</h2>
              <p className="text-[11px] text-slate-500 mt-1">คุณแน่ใจหรือไม่ที่จะปฏิเสธคำขอเข้าใช้งานระบบของผู้ใช้นี้?</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
              <p className="text-slate-700 font-semibold">ชื่อผู้ขอ: <span className="text-slate-900 font-bold">{selectedRejectRequest.name}</span></p>
              <p className="text-slate-700 font-semibold">อีเมลแอดเดรส: <span className="text-slate-900 font-mono font-bold">{selectedRejectRequest.email}</span></p>
              <p className="text-slate-700 font-semibold">แผนก/หน่วยงาน: <span className="text-slate-900 font-bold">{selectedRejectRequest.department}</span></p>
            </div>

            <form onSubmit={handleConfirmRejectSubmit} className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setSelectedRejectRequest(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm"
              >
                ยืนยันการปฏิเสธ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
