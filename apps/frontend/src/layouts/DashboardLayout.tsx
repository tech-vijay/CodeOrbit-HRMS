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
  Layers,
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
    { label: 'Employees & Staff', path: '/dashboard/employees', icon: Users },
    { label: 'Organization Profile', path: '/dashboard/organization', icon: Building2 },
    { label: 'Departments & Roles', path: '/dashboard/departments', icon: Briefcase },
    { label: 'Audit Activity', path: '/dashboard/audit', icon: ShieldAlert },
  ];

  const futureModules = [
    { label: 'Attendance (Phase 3)', path: '/dashboard/attendance', icon: Clock },
    { label: 'Leave Requests (Phase 4)', path: '/dashboard/leave', icon: CalendarCheck },
    { label: 'Payroll Engine (Phase 5)', path: '/dashboard/payroll', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-orbit-dark text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-slate-800/80 bg-[#080c14]/90 backdrop-blur-xl shrink-0 h-screen sticky top-0 z-40">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-orbit-dark rounded-xl flex items-center justify-center">
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">CodeOrbit <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">HRMS</span></span>
          </Link>
        </div>

        {/* Tenant Selector Card */}
        <div className="p-4 border-b border-slate-800/60 relative">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Active Tenant</span>
            <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Isolated
            </span>
          </div>

          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="w-full glass-card p-3 rounded-xl flex items-center justify-between text-left hover:border-indigo-500/40 transition-colors group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300 shrink-0">
                {activeOrganization?.name ? activeOrganization.name[0].toUpperCase() : 'O'}
              </div>
              <div className="truncate">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {activeOrganization?.name || 'Loading organization...'}
                </p>
                <p className="text-xs text-indigo-400 font-medium truncate">
                  Role: {activeOrganization?.role.name || 'Member'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
          </button>

          {/* Tenant Switcher Dropdown */}
          <AnimatePresence>
            {isOrgDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-4 right-4 mt-2 glass-panel p-2 rounded-xl shadow-2xl z-50 border border-slate-700"
              >
                <div className="text-xs font-medium text-slate-400 px-3 py-1.5 border-b border-slate-800 mb-1">
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
                            ? 'bg-indigo-600/20 text-white font-medium border border-indigo-500/30'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{m.organizationName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 mt-1 border-t border-slate-800">
                  <Link
                    to="/register-org"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
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
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600/20 via-indigo-600/20 to-cyan-500/10 text-white border border-indigo-500/30 shadow-glow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
        <div className="p-4 border-t border-slate-800/80 bg-[#060910]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400 shrink-0">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user ? `${user.firstName} ${user.lastName}` : 'Authenticated User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 px-6 glass-panel border-b border-slate-800/80 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium hidden sm:inline-flex items-center gap-1">
                <Shield className="w-3 h-3" /> Tenant: {activeOrganization?.slug || 'loading'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend API: Online
            </div>

            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400"></span>
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
