import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../contexts/RequestContext';
import { Role, RequestStatus } from '../types';
import { 
  Search, Bell, Mail, LogOut, Menu, X, 
  LayoutDashboard, FileText, CheckSquare, 
  Truck, Users, Activity, ChevronDown, ChevronRight,
  RefreshCw, Database, Settings, Mail as MailIcon,
  AlertTriangle, BarChart3, Package, FileSpreadsheet
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [dbConfigured, setDbConfigured] = React.useState<boolean | null>(null);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const { requests, refreshSequences } = useRequests();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSequences();
    } finally {
      // Small delay to make it feel responsive
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const notificationsList: any[] = [];

  React.useEffect(() => {
    fetch('/api/database/status')
      .then(res => res.json())
      .then(data => {
        setDbConfigured(data.configured === true);
      })
      .catch(() => {
        setDbConfigured(false);
      });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--color-workspace-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      {/* Topbar */}
      <header className="h-[60px] bg-white border-b border-[var(--color-border-light)] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-blue)] transition-colors"
          >
            <Menu size={18} />
          </button>
          <div className="relative w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={14} />
              <input 
                type="text" 
                placeholder="ค้นหา Sample No., ลูกค้า, SO, สินค้า..." 
                className="w-full bg-[var(--color-workspace-bg)] border border-[var(--color-border-light)] rounded-sm py-1.5 pl-9 pr-4 text-[13px] focus:ring-1 focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] focus:outline-none transition-shadow placeholder-[var(--color-text-secondary)]"
              />
            </div>
            <button 
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-blue)] p-1.5 border border-transparent hover:border-[var(--color-border-light)] rounded-sm transition-colors bg-white disabled:opacity-50"
              title="รีเฟรชข้อมูลจาก Sheets"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-[var(--color-text-secondary)] text-[11px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> ONLINE
          </div>
          <div className="w-px h-4 bg-[var(--color-border-light)] hidden sm:block"></div>
          <div className="relative">
            <button 
              onClick={() => {
                setBellOpen(!bellOpen);
                setUnreadCount(0); // clear count on click
              }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-blue)] transition-colors relative p-1.5 rounded-sm hover:bg-[var(--color-workspace-bg)]"
              title="การแจ้งเตือน"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-[var(--color-border-light)] py-1 z-50">
                <div className="px-4 py-2 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest border-b border-[var(--color-border-light)] mb-1 flex justify-between items-center bg-slate-50">
                  <span>การแจ้งเตือนระบบ ({notificationsList.length})</span>
                  <button 
                    onClick={() => setBellOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ปิด
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border-light)]">
                  {notificationsList.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setBellOpen(false);
                        navigate(item.path);
                      }}
                      className={`px-4 py-2.5 text-left text-[12px] cursor-pointer hover:bg-slate-50 transition-colors ${item.unread ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className={`font-bold ${item.unread ? 'text-blue-800' : 'text-slate-800'}`}>{item.title}</p>
                        {item.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1"></span>}
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-normal">{item.desc}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-blue)] transition-colors">
            <MailIcon size={16} />
          </button>
          <div className="w-px h-4 bg-[var(--color-border-light)] hidden sm:block"></div>
          <ProfileDropdownTop />
        </div>
      </header>

      {/* Main Body Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`${sidebarOpen ? 'w-[230px]' : 'w-[64px]'} 
          bg-[var(--color-sidebar-bg)] text-slate-300 transition-all duration-300 ease-in-out flex flex-col fixed inset-y-[60px] z-40 lg:relative shrink-0`}
        >
          {/* Logo Section inside Sidebar */}
          <div className="h-[60px] flex items-center px-4 border-b border-slate-700/50 shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[var(--color-primary-blue)] rounded-sm flex items-center justify-center font-bold text-white text-[13px] shrink-0">SF</div>
                <div className="overflow-hidden">
                  <h1 className="text-white font-bold text-[14px] leading-none truncate tracking-wide">SAMPLE FLOW</h1>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Sample Management</p>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-center font-bold text-white text-[13px]">SF</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
            <SidebarNav isOpen={sidebarOpen} />
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-workspace-bg)]">
          {dbConfigured === false && location.pathname !== '/admin/setup-wizard' && (
            <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center font-bold text-white shrink-0">
                  <Database size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">เริ่มต้นตั้งค่าระบบ (First Run Database Setup)</div>
                  <div className="text-xs text-blue-100">ระบบยังไม่พบ Database Configuration: คลิกเพื่อสร้าง Google Sheets Database V1 พร้อมชีตและเลขรันเอกสารอัตโนมัติ</div>
                </div>
              </div>
              <Link
                to="/admin/setup-wizard"
                className="px-4 py-2 bg-white text-blue-900 rounded font-bold text-xs hover:bg-blue-50 transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <span>เข้าสู่ Setup Wizard</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const { requests } = useRequests();
  const role = user?.role || 'SALE';
  
  const pendingApprovalsCount = requests.filter(r => r.currentStatus === RequestStatus.WAITING_APPROVAL).length;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Dashboard': true,
    'Sample Request': true,
  });

  const toggleSection = (name: string) => {
    if (!isOpen) return;
    setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const navGroups = [
    {
      title: 'NAVIGATION',
      items: [
        { 
          name: 'Dashboard', icon: <LayoutDashboard size={15} />, roles: ['SALE', 'SALE_MANAGER', 'ADMIN', 'RD', 'CO_SALE', 'LOGISTIC'],
          subItems: [
            { name: 'ภาพรวม', path: '/' },
            { name: 'Control Tower', path: '/control-tower' },
          ]
        }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          name: 'Sample Request', icon: <FileText size={15} />, roles: ['SALE', 'ADMIN', 'SALE_MANAGER'],
          subItems: [
            { name: 'สร้างคำขอ', path: '/sample/new' },
            { name: 'คำขอของฉัน', path: '/sample/my-requests' },
            { name: 'คำขอทั้งหมด', path: '/sample/all' },
          ]
        },
        {
          name: 'Approval', icon: <CheckSquare size={15} />, roles: ['SALE_MANAGER', 'ADMIN'],
          badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
          subItems: [
            { name: 'รออนุมัติ', path: '/approval' },
            { name: 'ประวัติ', path: '/approval/history' },
          ]
        },
        {
          name: 'RD Preparation', icon: <Activity size={15} />, roles: ['RD', 'ADMIN'],
          subItems: [
            { name: 'รอรับงาน', path: '/rd/queue' },
            { name: 'กำลังเตรียม', path: '/rd/in-progress' },
            { name: 'พร้อมแล้ว', path: '/rd/ready' },
            { name: 'Issue', path: '/rd/issue' },
          ]
        },
        {
          name: 'Co Sale', icon: <FileSpreadsheet size={15} />, roles: ['CO_SALE', 'ADMIN'],
          subItems: [
            { name: 'Waiting SO', path: '/cosale/waiting' },
            { name: 'In Progress', path: '/cosale/in-progress' },
            { name: 'SO Completed', path: '/cosale/completed' },
            { name: 'Issue', path: '/cosale/issue' },
          ]
        },
        {
          name: 'Logistic', icon: <Truck size={15} />, roles: ['LOGISTIC', 'ADMIN'],
          subItems: [
            { name: 'Logistic Check', path: '/logistic/check' },
            { name: 'จัดรถ', path: '/logistic/assign' },
            { name: 'Delivery', path: '/logistic/delivery' },
            { name: 'Delivery Issue', path: '/logistic/issue' },
          ]
        }
      ]
    },
    {
      title: 'MONITORING',
      items: [
        { name: 'Issues', icon: <AlertTriangle size={15} />, path: '/monitoring/issues', roles: ['ADMIN', 'SALE_MANAGER', 'SALE', 'RD', 'CO_SALE', 'LOGISTIC', 'MANAGEMENT'] },
        {
          name: 'Email & Notification', icon: <MailIcon size={15} />, roles: ['ADMIN'],
          subItems: [
            { name: 'ผู้รับ Email', path: '/monitoring/email-recipients' },
            { name: 'Email Template', path: '/monitoring/email-template' },
            { name: 'Notification Rules', path: '/monitoring/notification-rules' },
            { name: 'Email Log', path: '/monitoring/email-log' },
          ]
        },
        {
          name: 'Reports', icon: <BarChart3 size={15} />, roles: ['ADMIN', 'SALE_MANAGER'],
          subItems: [
            { name: 'KPI Dashboard', path: '/admin/kpi' },
            { name: 'Lead Time', path: '/reports/lead-time' },
            { name: 'Waiting Time', path: '/reports/waiting-time' },
            { name: 'SLA', path: '/admin/sla' },
            { name: 'Delivery Performance', path: '/reports/delivery' },
          ]
        }
      ]
    },
    {
      title: 'MASTER DATA',
      items: [
        {
          name: 'Master Data', icon: <Database size={15} />, roles: ['ADMIN'],
          subItems: [
            { name: 'Customer', path: '/master/customer' },
            { name: 'Product', path: '/master/product' },
            { name: 'Delivery Route', path: '/master/route' },
            { name: 'SLA Master', path: '/master/sla' },
            { name: 'Approval Matrix', path: '/master/approval-matrix' },
          ]
        }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        {
          name: 'User & Access Control', icon: <Users size={15} />, roles: ['ADMIN'],
          subItems: [
            { name: 'User Management', path: '/admin/users' },
            { name: 'Role & Permission', path: '/admin/roles' },
          ]
        },
        {
          name: 'System Settings', icon: <Settings size={15} />, roles: ['ADMIN'],
          subItems: [
            { name: 'Company & Document Settings', path: '/admin/company-settings' },
            { name: 'ตั้งค่าระบบ (Setup Wizard)', path: '/admin/setup-wizard' },
            { name: 'RD Department Master', path: '/admin/rd-departments' },
            { name: 'Running Number Setup', path: '/admin/running-no' },
            { name: 'Audit Log & History', path: '/admin/audit-log' },
          ]
        }
      ]
    }
  ];

  // Create a mapping from subItemName (in Layout.tsx) to allowedMenus options (in UserManagementPage.tsx)
  const isSubItemAllowed = (subItemName: string, allowedMenus: string[]): boolean => {
    if (!allowedMenus || allowedMenus.length === 0) return true;
    if (allowedMenus.includes('*')) return true;
    
    const mapping: Record<string, string[]> = {
      // Dashboard subitems
      'ภาพรวม': ['Dashboard & Overview'],
      'Control Tower': ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)'],

      // Sample Request subitems
      'สร้างคำขอ': ['สร้างคำขอ (Create Sample Request)'],
      'คำขอของฉัน': ['Dashboard & Overview', 'สร้างคำขอ (Create Sample Request)'],
      'คำขอทั้งหมด': ['รายการคำขอทั้งหมด (All Requests)'],

      // Approval subitems
      'รออนุมัติ': ['อนุมัติ / ปฏิเสธ (Approve / Reject)', 'Dashboard & Overview'],
      'ประวัติ': ['อนุมัติ / ปฏิเสธ (Approve / Reject)', 'รายการคำขอทั้งหมด (All Requests)'],

      // RD Preparation subitems
      'รอรับงาน': ['ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)'],
      'กำลังเตรียม': ['ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)'],
      'พร้อมแล้ว': ['ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)'],
      'Issue': ['ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)'],

      // Co Sale subitems
      'Waiting SO': ['จับคู่ข้อมูลการขาย (Sales Match / SO)'],
      'In Progress': ['จับคู่ข้อมูลการขาย (Sales Match / SO)'],
      'SO Completed': ['จับคู่ข้อมูลการขาย (Sales Match / SO)'],

      // Logistic subitems
      'Logistic Check': ['จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)'],
      'จัดรถ': ['จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)'],
      'Delivery': ['จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)'],
      'Delivery Issue': ['จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)'],

      // Email & Notification subitems (Admin only)
      'ผู้รับ Email': ['Sequence Setup & Running No', 'User & Access Control', 'การตั้งค่า (Settings)'],
      'Email Template': ['Sequence Setup & Running No', 'User & Access Control', 'การตั้งค่า (Settings)'],
      'Notification Rules': ['Sequence Setup & Running No', 'User & Access Control', 'การตั้งค่า (Settings)'],
      'Email Log': ['Sequence Setup & Running No', 'User & Access Control', 'การตั้งค่า (Settings)'],

      // Reports subitems
      'KPI Dashboard': ['Dashboard & Overview'],
      'Lead Time': ['Dashboard & Overview'],
      'Waiting Time': ['Dashboard & Overview'],
      'SLA': ['Dashboard & Overview'],
      'Delivery Performance': ['Dashboard & Overview'],

      // Master Data subitems
      'Customer': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],
      'Product': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],
      'Delivery Route': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],
      'SLA Master': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],
      'Approval Matrix': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],

      // System subitems
      'Company & Document Settings': ['Sequence Setup & Running No', 'User & Access Control'],
      'ตั้งค่าระบบ (Setup Wizard)': ['Sequence Setup & Running No', 'User & Access Control'],
      'RD Department Master': ['Sequence Setup & Running No', 'User & Access Control'],
      'Running Number Setup': ['Sequence Setup & Running No', 'User & Access Control'],
      'Audit Log & History': ['Sequence Setup & Running No', 'User & Access Control'],
      'User Management': ['User & Access Control'],
      'Role & Permission': ['User & Access Control'],
    };

    const allowedForSub = mapping[subItemName];
    if (!allowedForSub) return true;
    return allowedForSub.some(menu => allowedMenus.includes(menu));
  };

  const isItemAllowed = (itemName: string, allowedMenus: string[]): boolean => {
    if (!allowedMenus || allowedMenus.length === 0) return true;
    if (allowedMenus.includes('*')) return true;
    
    const mapping: Record<string, string[]> = {
      'Dashboard': ['Dashboard & Overview'],
      'Sample Request': ['สร้างคำขอ (Create Sample Request)', 'รายการคำขอทั้งหมด (All Requests)'],
      'Approval': ['อนุมัติ / ปฏิเสธ (Approve / Reject)'],
      'RD Preparation': ['ตรวจสอบและวิเคราะห์ (R&D Prep)', 'ออกใบจัดเตรียมสูตร (RD Master)'],
      'Co Sale': ['จับคู่ข้อมูลการขาย (Sales Match / SO)'],
      'Logistic': ['จัดเตรียมขนส่ง (Logistic Dispatch)', 'จัดเส้นทางขนส่ง (Vehicle Setup)'],
      'Issues': ['Dashboard & Overview', 'รายการคำขอทั้งหมด (All Requests)'],
      'Email & Notification': ['Sequence Setup & Running No', 'User & Access Control'],
      'Reports': ['Dashboard & Overview'],
      'Master Data': ['การตั้งค่า (Settings)', 'Sequence Setup & Running No', 'User & Access Control'],
      'User & Access Control': ['User & Access Control'],
      'System Settings': ['Sequence Setup & Running No', 'User & Access Control'],
    };

    const allowedForItem = mapping[itemName];
    if (!allowedForItem) return true;
    return allowedForItem.some(menu => allowedMenus.includes(menu));
  };

  const filteredGroups = navGroups.map(group => {
    // 1. Filter items by Role first
    const itemsWithRole = group.items.filter(item => item.roles.includes(role));
    
    // 2. If allowedMenus is defined, filter items and subItems by allowedMenus
    const filteredItems = itemsWithRole.map(item => {
      if (user?.allowedMenus && user.allowedMenus.length > 0) {
        // If it's a top-level item with sub-items, filter sub-items
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter(sub => isSubItemAllowed(sub.name, user.allowedMenus || []));
          if (filteredSubItems.length === 0) return null;
          return { ...item, subItems: filteredSubItems };
        } else {
          // If it's a standalone path item, check if its name is in allowedMenus
          if (!isItemAllowed(item.name, user.allowedMenus)) return null;
        }
      }
      return item;
    }).filter(Boolean);
    
    return {
      ...group,
      items: filteredItems as any[]
    };
  }).filter(group => group.items.length > 0);

  return (
    <nav className="px-3 space-y-6">
      {filteredGroups.map((group, idx) => (
        <div key={idx}>
          {isOpen && (
            <h3 className="mb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {group.title}
            </h3>
          )}
          <ul className="space-y-0.5">
            {group.items.map((menuItem, itemIdx) => {
              const item = menuItem as any;
              const isExpanded = expandedSections[item.name];
              const isSubActive = item.subItems?.some((sub: any) => location.pathname === sub.path || (sub.path !== '/' && location.pathname.startsWith(sub.path)));
              const isActive = item.path ? (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) : isSubActive;
              
              return (
                <li key={itemIdx} className="flex flex-col">
                  {item.subItems ? (
                    <button 
                      onClick={() => toggleSection(item.name)}
                      className={`flex items-center justify-between py-2 px-3 text-[13px] rounded-sm transition-colors group ${
                        (isActive && !isOpen) 
                          ? 'bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[var(--color-primary-blue)] text-white' 
                          : 'border-l-[3px] border-transparent text-slate-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white'
                      }`}
                      title={!isOpen ? item.name : undefined}
                    >
                      <div className={`flex items-center gap-3 ${!isOpen && 'mx-auto'}`}>
                        <span className={isActive ? 'text-[var(--color-primary-blue)]' : 'text-slate-500 group-hover:text-slate-300'}>
                          {item.icon}
                        </span>
                        {isOpen && <span className={`font-semibold ${isActive ? 'text-white' : ''}`}>{item.name}</span>}
                      </div>
                      {isOpen && (
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className="bg-[var(--color-primary-blue)] text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold">
                              {item.badge}
                            </span>
                          )}
                          {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link 
                      to={item.path || '/'}
                      className={`flex items-center justify-between py-2 px-3 text-[13px] rounded-sm transition-colors group ${
                        isActive 
                          ? 'bg-[rgba(255,255,255,0.05)] border-l-[3px] border-[var(--color-primary-blue)] text-white' 
                          : 'border-l-[3px] border-transparent text-slate-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white'
                      }`}
                      title={!isOpen ? item.name : undefined}
                    >
                      <div className={`flex items-center gap-3 ${!isOpen && 'mx-auto'}`}>
                        <span className={isActive ? 'text-[var(--color-primary-blue)]' : 'text-slate-500 group-hover:text-slate-300'}>
                          {item.icon}
                        </span>
                        {isOpen && <span className={`font-semibold ${isActive ? 'text-white' : ''}`}>{item.name}</span>}
                      </div>
                    </Link>
                  )}

                  {/* Submenu rendering */}
                  {isOpen && item.subItems && isExpanded && (
                    <ul className="mt-1 mb-1 space-y-0.5">
                      {item.subItems.map((subItem, subIdx) => {
                        const isSubItemActive = location.pathname === subItem.path;
                        return (
                          <li key={subIdx}>
                            <Link
                              to={subItem.path}
                              className={`flex items-center pl-10 pr-3 py-1.5 text-[12px] rounded-sm transition-colors ${
                                isSubItemActive
                                  ? 'text-[var(--color-primary-blue)] font-bold'
                                  : 'text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ProfileDropdownTop() {
  const { user, logout, changeRole } = useAuth();
  const [open, setOpen] = React.useState(false);

  const roleColors: Record<Role, string> = {
    SALE: 'text-blue-500',
    SALE_MANAGER: 'text-purple-500',
    RD: 'text-green-500',
    CO_SALE: 'text-amber-500',
    LOGISTIC: 'text-cyan-500',
    ADMIN: 'text-red-500',
    MANAGEMENT: 'text-indigo-500'
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-blue)] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {user?.name?.substring(0, 2).toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block">
          <p className="text-[var(--color-text-primary)] text-[12px] font-bold leading-tight">{user?.name || 'User'}</p>
          <p className={`text-[10px] uppercase font-bold tracking-widest ${user?.role ? roleColors[user.role] : 'text-[var(--color-text-secondary)]'}`}>
            {user?.role || 'Guest'}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-sm shadow-md border border-[var(--color-border-light)] py-1 z-50">
          <div className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest border-b border-[var(--color-border-light)] mb-1">
            Menu
          </div>
          
          <button onClick={() => setOpen(false)} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-workspace-bg)] transition-colors">
            โปรไฟล์
          </button>
          <button onClick={() => setOpen(false)} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-workspace-bg)] transition-colors">
            การตั้งค่า
          </button>
          
          <div className="h-px bg-[var(--color-border-light)] my-1"></div>
          
          <div className="px-3 py-2 text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest border-b border-[var(--color-border-light)] mb-1">
            Switch Role (Debug)
          </div>
          {(['SALE', 'SALE_MANAGER', 'RD', 'CO_SALE', 'LOGISTIC', 'ADMIN'] as Role[]).map(role => (
            <button 
              key={role}
              onClick={() => { changeRole(role); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 hover:bg-[var(--color-workspace-bg)] transition-colors ${user?.role === role ? 'font-bold text-[var(--color-primary-blue)] bg-[#F3F7FB]' : 'text-[var(--color-text-primary)]'}`}
            >
              {role}
            </button>
          ))}
          
          <div className="h-px bg-[var(--color-border-light)] my-1"></div>
          <button 
            onClick={logout}
            className="w-full text-left px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}
