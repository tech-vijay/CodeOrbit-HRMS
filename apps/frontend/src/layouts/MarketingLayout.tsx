import React, { useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Lenis from 'lenis';
import { ArrowRight, ShieldCheck, Cpu, Layers } from 'lucide-react';

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
    <div className="min-h-screen bg-orbit-dark text-slate-100 flex flex-col selection:bg-brand-500/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
              <div className="w-full h-full bg-orbit-dark rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                CodeOrbit <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">HRMS</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Autonomous HR SaaS</p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#solutions" className="hover:text-white transition-colors">Multi-Tenancy</a>
            <a href="#architecture" className="hover:text-white transition-colors">Security & RBAC</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register-org"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-glow-sm hover:shadow-glow-lg transition-all"
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
      <footer className="border-t border-slate-800 bg-[#060910] text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span className="text-lg font-bold text-white">CodeOrbit HRMS</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Commercial-grade, multi-tenant enterprise Human Resource Management System engineered for maximum security, auditability, and workforce velocity.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> SOC2 Type II Certified
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-3.5 h-3.5" /> Multi-Tenant RLS
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Core Modules</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Employee Lifecycle Management</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Biometric & Web Attendance</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Leave Accruals & Approvals</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Configurable Indian Payroll</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Recruitment & Onboarding</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#architecture" className="hover:text-white transition-colors">Strict Tenant Isolation</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Granular RBAC Engine</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Argon2id Password Security</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Token Reuse Detection</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors">Immutable Audit Trails</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Enterprise Inquiries</h4>
            <p className="text-sm mb-3">Designed for enterprises scaling from 50 to 50,000+ employees.</p>
            <Link
              to="/register-org"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Provision Dedicated Tenant <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CodeOrbit HRMS. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-400">Security Whitepaper</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
