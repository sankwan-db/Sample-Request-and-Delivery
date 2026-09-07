import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { RequestProvider } from './contexts/RequestContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateSample } from './pages/CreateSample';
import { RequestDetail } from './pages/RequestDetail';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { SetupWizard } from './pages/SetupWizard';
import { RDDepartmentMasterPage } from './pages/RDDepartmentMasterPage';
import { DocumentRunningSetup } from './pages/DocumentRunningSetup';
import { AuditLogPage } from './pages/AuditLogPage';
import { LogisticPrecheckPage } from './pages/LogisticPrecheckPage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { ControlTowerPage } from './pages/ControlTowerPage';
import { CoSaleQueuePage } from './pages/CoSaleQueuePage';
import { LogisticAssignmentPage } from './pages/LogisticAssignmentPage';
import { DeliveryOperationsPage } from './pages/DeliveryOperationsPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { CustomerMasterPage } from './pages/CustomerMasterPage';
import { ProductMasterPage } from './pages/ProductMasterPage';
import { EmailSettingsPage } from './pages/EmailSettingsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { MasterSettingsPage } from './pages/MasterSettingsPage';
import { IssueCenterPage } from './pages/IssueCenterPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <RequestProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="/dashboard/overview" element={<Dashboard />} />
                <Route path="/dashboard/control-tower" element={<ControlTowerPage />} />
                <Route path="/control-tower" element={<ControlTowerPage />} />
                
                {/* Operations */}
                <Route path="/create" element={<CreateSample />} />
                <Route path="/sample/new" element={<CreateSample />} />
                <Route path="/sample/:id" element={<RequestDetail />} />
                <Route path="/sample/my-requests" element={<Dashboard />} />
                <Route path="/sample/all" element={<ControlTowerPage />} />
                
                {/* Department Work Queues */}
                <Route path="/approval" element={<ApprovalQueuePage />} />
                <Route path="/approval/pending" element={<ApprovalQueuePage />} />
                <Route path="/approval/history" element={<ApprovalQueuePage />} />

                {/* RD Preparation */}
                <Route path="/rd/queue" element={<Dashboard />} />
                <Route path="/rd/pending" element={<Dashboard />} />
                <Route path="/rd/in-progress" element={<Dashboard />} />
                <Route path="/rd/ready" element={<Dashboard />} />
                <Route path="/rd/issue" element={<Dashboard />} />

                {/* Co-Sale (Part 72) */}
                <Route path="/co-sale" element={<CoSaleQueuePage />} />
                <Route path="/cosale/waiting" element={<CoSaleQueuePage />} />
                <Route path="/cosale/waiting-so" element={<CoSaleQueuePage />} />
                <Route path="/cosale/in-progress" element={<CoSaleQueuePage />} />
                <Route path="/cosale/completed" element={<CoSaleQueuePage />} />
                <Route path="/cosale/issue" element={<CoSaleQueuePage />} />

                {/* Logistic & Delivery (Parts 60, 73, 74) */}
                <Route path="/logistic" element={<LogisticAssignmentPage />} />
                <Route path="/logistic/check" element={<LogisticPrecheckPage />} />
                <Route path="/logistic/assign" element={<LogisticAssignmentPage />} />
                <Route path="/logistic/manage" element={<LogisticAssignmentPage />} />
                <Route path="/logistic/delivery" element={<DeliveryOperationsPage />} />
                <Route path="/logistic/tracking" element={<DeliveryOperationsPage />} />
                <Route path="/logistic/pod" element={<DeliveryOperationsPage />} />
                <Route path="/logistic/issue" element={<DeliveryOperationsPage />} />
                <Route path="/delivery" element={<DeliveryOperationsPage />} />
                
                {/* Performance & SLA Reports (Parts 78, 79) */}
                <Route path="/reports/lead-time" element={<PerformanceAnalytics />} />
                <Route path="/reports/performance" element={<PerformanceAnalytics />} />
                <Route path="/reports/sla" element={<PerformanceAnalytics />} />
                <Route path="/reports/delivery" element={<PerformanceAnalytics />} />
                <Route path="/reports/waiting-time" element={<PerformanceAnalytics />} />
                <Route path="/admin/sla" element={<PerformanceAnalytics />} />
                <Route path="/admin/kpi" element={<PerformanceAnalytics />} />
                <Route path="/performance" element={<PerformanceAnalytics />} />

                {/* Master Data Routes */}
                <Route path="/master/customer" element={<CustomerMasterPage />} />
                <Route path="/master/product" element={<ProductMasterPage />} />
                <Route path="/master/route" element={<MasterSettingsPage />} />
                <Route path="/master/sla" element={<MasterSettingsPage />} />
                <Route path="/master/approval-matrix" element={<MasterSettingsPage />} />

                {/* Email & Notification Monitoring Routes */}
                <Route path="/monitoring/issues" element={<IssueCenterPage />} />
                <Route path="/issues" element={<IssueCenterPage />} />
                <Route path="/monitoring/email-recipients" element={<EmailSettingsPage />} />
                <Route path="/monitoring/email-template" element={<EmailSettingsPage />} />
                <Route path="/monitoring/notification-rules" element={<EmailSettingsPage />} />
                <Route path="/monitoring/email-log" element={<EmailSettingsPage />} />

                {/* Admin & Setup Routes (Part 80) */}
                <Route path="/admin/company-settings" element={<CompanySettingsPage />} />
                <Route path="/admin/setup-wizard" element={<SetupWizard />} />
                <Route path="/admin/rd-departments" element={<RDDepartmentMasterPage />} />
                <Route path="/admin/running-no" element={<DocumentRunningSetup />} />
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/roles" element={<UserManagementPage />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </RequestProvider>
    </AuthProvider>
  );
}
