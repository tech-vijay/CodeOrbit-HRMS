import React, { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Lenis from 'lenis';
import { ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export const MarketingLayout: React.FC = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col selection:bg-brand-500/20 selection:text-brand-700">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="CodeOrbit HRMS"
              className="h-11 w-auto object-contain"
            />
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#E52328] transition-colors">Platform</a>
            <a href="#solutions" className="hover:text-[#E52328] transition-colors">Multi-Tenancy</a>
            <a href="#architecture" className="hover:text-[#E52328] transition-colors">Security & RBAC</a>
            <a href="#pricing" className="hover:text-[#E52328] transition-colors">Pricing</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register-org"
              className="btn-wipronix-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="CodeOrbit HRMS"
                className="h-9 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Commercial-grade, multi-tenant enterprise Human Resource Management System engineered for maximum security, auditability, and workforce velocity.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20">
                <ShieldCheck className="w-3.5 h-3.5" /> SOC2 Type II Certified
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25">
                <Cpu className="w-3.5 h-3.5" /> Multi-Tenant RLS
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 font-display">Core Modules</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><a href="#features" className="hover:text-[#E52328] transition-colors">Employee Lifecycle Management</a></li>
              <li><a href="#features" className="hover:text-[#E52328] transition-colors">Biometric & Web Attendance</a></li>
              <li><a href="#features" className="hover:text-[#E52328] transition-colors">Leave Accruals & Approvals</a></li>
              <li><a href="#features" className="hover:text-[#E52328] transition-colors">Configurable Indian Payroll</a></li>
              <li><a href="#features" className="hover:text-[#E52328] transition-colors">Recruitment & Onboarding</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 font-display">Architecture</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li><a href="#architecture" className="hover:text-[#E52328] transition-colors">Strict Tenant Isolation</a></li>
              <li><a href="#architecture" className="hover:text-[#E52328] transition-colors">Granular RBAC Engine</a></li>
              <li><a href="#architecture" className="hover:text-[#E52328] transition-colors">Argon2id Password Security</a></li>
              <li><a href="#architecture" className="hover:text-[#E52328] transition-colors">Token Reuse Detection</a></li>
              <li><a href="#architecture" className="hover:text-[#E52328] transition-colors">Immutable Audit Trails</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 font-display">Enterprise Inquiries</h4>
            <p className="text-sm text-slate-600 mb-3">Designed for enterprises scaling from 50 to 50,000+ employees.</p>
            <Link
              to="/register-org"
              className="inline-flex items-center gap-2 text-sm text-[#E52328] hover:text-[#AB1428] font-semibold"
            >
              Provision Dedicated Tenant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CodeOrbit HRMS. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-slate-700">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700">Terms of Service</a>
            <a href="#" className="hover:text-slate-700">Security Whitepaper</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
