import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchCurrentUser, switchOrganization, logoutUser } from '../store/slices/authSlice';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Clock,
  CalendarCheck,
  CreditCard,
  ShieldAlert,
  ChevronDown,
  LogOut,
  Check,
  Plus,
  Shield,
  Menu,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DashboardLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, activeOrganization, memberships } = useSelector((state: RootState) => state.auth);

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const handleSwitchOrg = async (orgId: string) => {
    setIsOrgDropdownOpen(false);
    await dispatch(switchOrganization(orgId));
    window.location.reload(); // Re-render tenant context freshly
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance & Time', path: '/dashboard/attendance', icon: Clock },
    { label: 'Leave & Time-Off', path: '/dashboard/leave', icon: CalendarCheck },
    { label: 'Payroll & Salary', path: '/dashboard/payroll', icon: CreditCard },
    { label: 'Employees & Staff', path: '/dashboard/employees', icon: Users },
    { label: 'Organization Profile', path: '/dashboard/organization', icon: Building2 },
    { label: 'Departments & Roles', path: '/dashboard/departments', icon: Briefcase },
    { label: 'Audit Activity', path: '/dashboard/audit', icon: ShieldAlert },
  ];

  const futureModules = [
    { label: 'Recruitment & ATS (Phase 6)', path: '/dashboard/recruitment', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-200 bg-white/95 backdrop-blur-xl shrink-0 h-screen sticky top-0 z-40">
        {/* Brand Header */}
        <div className="h-24 px-5 flex items-center justify-center border-b border-slate-200">
          <Link to="/dashboard" className="flex items-center justify-center w-full py-2 group">
            <img
              src="/logo.png"
              alt="CodeOrbit HRMS"
              className="h-14 w-auto object-contain max-w-[240px] transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Tenant Selector Card */}
        <div className="p-4 border-b border-slate-200 relative bg-slate-50/50">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Active Tenant</span>
            <span className="text-[#00bb7f] flex items-center gap-1 text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00bb7f] animate-pulse"></span> Isolated
            </span>
          </div>

          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="w-full bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-left hover:border-[#E52328]/40 hover:bg-slate-50/80 transition-all group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#E52328]/10 border border-[#E52328]/25 flex items-center justify-center font-bold text-sm text-[#E52328] shrink-0 font-display">
                {activeOrganization?.name ? activeOrganization.name[0].toUpperCase() : 'O'}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight font-display">
                  {activeOrganization?.name || 'Loading organization...'}
                </p>
                <p className="text-xs text-[#E52328] font-semibold truncate">
                  Role: {activeOrganization?.role.name || 'Member'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform" />
          </button>

          {/* Tenant Switcher Dropdown */}
          <AnimatePresence>
            {isOrgDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-4 right-4 mt-2 bg-white p-2 rounded-xl shadow-xl z-50 border border-slate-200"
              >
                <div className="text-xs font-semibold text-slate-500 px-3 py-1.5 border-b border-slate-100 mb-1">
                  Switch Organization Context
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {memberships.map((m) => {
                    const isSelected = m.organizationId === activeOrganization?.id;
                    return (
                      <button
                        key={m.organizationId}
                        onClick={() => handleSwitchOrg(m.organizationId)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-red-50 text-[#E52328] font-semibold border border-red-200'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{m.organizationName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#E52328] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 mt-1 border-t border-slate-100">
                  <Link
                    to="/register-org"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#E52328] hover:bg-red-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register Another Company
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">
              Core Architecture
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#E52328]/10 text-[#E52328] border-l-4 border-[#E52328] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#E52328]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">
              Next Implementation Phases
            </p>
            <nav className="space-y-1">
              {futureModules.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 opacity-60 cursor-not-allowed hover:opacity-80"
                    title="Will be fully implemented in upcoming Phase"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#E52328]/10 border border-[#E52328]/25 flex items-center justify-center font-bold text-xs text-[#E52328] shrink-0 font-display">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate font-display">
                  {user ? `${user.firstName} ${user.lastName}` : 'Authenticated User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Top bar */}
        <header className="h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25 font-semibold hidden sm:inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#E52328]" /> Tenant: {activeOrganization?.slug || 'loading'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00bb7f] animate-pulse"></span>
              Backend API: Online
            </div>

            <button className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E52328]"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="p-6 md:p-10 flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
