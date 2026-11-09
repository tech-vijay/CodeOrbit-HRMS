import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { MarketingPage } from '../pages/marketing/MarketingPage';
import { CareersPage } from '../pages/marketing/CareersPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterOrgPage } from '../pages/auth/RegisterOrgPage';
import { AcceptInvitationPage } from '../pages/auth/AcceptInvitationPage';
import { OverviewPage } from '../pages/dashboard/OverviewPage';
import { EmployeesPage } from '../pages/dashboard/EmployeesPage';
import { EmployeeDetailPage } from '../pages/dashboard/EmployeeDetailPage';
import { AttendancePage } from '../pages/dashboard/AttendancePage';
import { LeavePage } from '../pages/dashboard/LeavePage';
import { PayrollPage } from '../pages/dashboard/PayrollPage';
import { RecruitmentPage } from '../pages/dashboard/RecruitmentPage';
import { PerformancePage } from '../pages/dashboard/PerformancePage';
import { ExpensesPage } from '../pages/dashboard/ExpensesPage';
import { OrganizationPage } from '../pages/dashboard/OrganizationPage';
import { DepartmentsPage } from '../pages/dashboard/DepartmentsPage';
import { AuditPage } from '../pages/dashboard/AuditPage';
import { hasAnyPermission } from '../utils/permissions';

// Protected Route Guard ensuring user is authenticated
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated && !localStorage.getItem('access_token')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PermissionRoute: React.FC<{
  permissions: string[];
  children: React.ReactElement;
}> = ({ permissions, children }) => {
  const { activeOrganization, isLoading, error } = useSelector((state: RootState) => state.auth);

  if (!activeOrganization) {
    if (isLoading || !error) {
      return <div role="status" className="p-8 text-center text-slate-500">Checking access...</div>;
    }
    return <Navigate to="/login" replace />;
  }

  return hasAnyPermission(activeOrganization.role.permissions, permissions)
    ? children
    : <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Marketing Website */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<MarketingPage />} />
      </Route>

      {/* Authentication */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-org" element={<RegisterOrgPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

      {/* Public Careers Portal */}
      <Route path="/careers/:slug" element={<CareersPage />} />
      <Route path="/careers" element={<CareersPage />} />

      {/* Authenticated Multi-Tenant HRMS Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="attendance" element={<PermissionRoute permissions={['attendance:read', 'attendance:checkin']}><AttendancePage /></PermissionRoute>} />
        <Route path="leave" element={<PermissionRoute permissions={['leave:read', 'leave:apply']}><LeavePage /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute permissions={['expense:read', 'expense:apply']}><ExpensesPage /></PermissionRoute>} />
        <Route path="payroll" element={<PermissionRoute permissions={['payroll:read', 'payroll:process']}><PayrollPage /></PermissionRoute>} />
        <Route path="recruitment" element={<PermissionRoute permissions={['recruitment:read']}><RecruitmentPage /></PermissionRoute>} />
        <Route path="performance" element={<PermissionRoute permissions={['performance:read', 'performance:manage_goals', 'performance:review']}><PerformancePage /></PermissionRoute>} />
        <Route path="employees" element={<PermissionRoute permissions={['employee:read']}><EmployeesPage /></PermissionRoute>} />
        <Route path="employees/:id" element={<PermissionRoute permissions={['employee:read']}><EmployeeDetailPage /></PermissionRoute>} />
        <Route path="organization" element={<PermissionRoute permissions={['org:read']}><OrganizationPage /></PermissionRoute>} />
        <Route path="departments" element={<PermissionRoute permissions={['org:update']}><DepartmentsPage /></PermissionRoute>} />
        <Route path="staff" element={<PermissionRoute permissions={['employee:read']}><EmployeesPage /></PermissionRoute>} />
        <Route path="audit" element={<PermissionRoute permissions={['audit:read']}><AuditPage /></PermissionRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
