import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MarketingLayout } from '../layouts/MarketingLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { MarketingPage } from '../pages/marketing/MarketingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterOrgPage } from '../pages/auth/RegisterOrgPage';
import { OverviewPage } from '../pages/dashboard/OverviewPage';
import { EmployeesPage } from '../pages/dashboard/EmployeesPage';
import { EmployeeDetailPage } from '../pages/dashboard/EmployeeDetailPage';
import { AttendancePage } from '../pages/dashboard/AttendancePage';
import { LeavePage } from '../pages/dashboard/LeavePage';

// Protected Route Guard ensuring user is authenticated
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated && !localStorage.getItem('access_token')) {
    return <Navigate to="/login" replace />;
  }

  return children;
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
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="organization" element={<OverviewPage />} />
        <Route path="departments" element={<OverviewPage />} />
        <Route path="staff" element={<EmployeesPage />} />
        <Route path="audit" element={<OverviewPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
