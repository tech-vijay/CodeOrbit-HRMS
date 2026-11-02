import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const MarketingPage: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-[#F8FAFC]">
      {/* Background Wipronix Crimson Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-tr from-[#E52328]/15 via-[#fb2c36]/10 to-transparent blur-[160px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-5xl mx-auto font-display"
        >
          Scale Your Workforce with <br />
          <span className="bg-gradient-to-r from-slate-900 via-[#E52328] to-[#AB1428] bg-clip-text text-transparent">
            Bulletproof Tenant Isolation
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed"
        >
          CodeOrbit HRMS provides organizations with an autonomous, high-security HR platform managing the entire employee lifecycle — from recruitment and biometric attendance to automated payroll and audit compliance.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/register-org"
            className="btn-wipronix-primary w-full sm:w-auto px-8 py-4 text-base font-semibold text-white shadow-glow-lg flex items-center justify-center gap-2 group"
          >
            Register Your Organization
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#E52328]/50 shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            Explore Live Dashboard
          </Link>
        </motion.div>

        {/* Feature Badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" /> Shared DB with Strict Row Isolation
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" /> Argon2id Password Hashing
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" /> Token Reuse Detection
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" /> Immutable Audit Trail
          </span>
        </div>

        {/* Dashboard Preview Glass Frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 p-2 rounded-2xl bg-white shadow-2xl relative border border-slate-200 hover:border-[#E52328]/35 transition-colors"
        >
          <div className="rounded-xl bg-slate-50 p-6 border border-slate-200 text-left">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-[#00bb7f]"></div>
                </div>
                <span className="text-xs font-mono text-slate-500">codeorbit-hrms.saas/app/overview</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20 font-medium">
                Tenant Verified: CodeOrbit Technologies (codeorbit-demo)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Total Workforce</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-display">1,248</p>
                <span className="text-[11px] text-[#00bb7f] font-medium">+14% this month</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Attendance Rate</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-display">98.4%</p>
                <span className="text-[11px] text-[#3080ff] font-medium">1,228 checked in today</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Pending Approvals</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-display">12</p>
                <span className="text-[11px] text-[#f99c00] font-medium">Leaves & Expenses</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Tenant Security</span>
                <p className="text-2xl font-bold text-[#00bb7f] mt-1 font-display">Isolated</p>
                <span className="text-[11px] text-slate-500 font-medium">0 Cross-Tenant Breaches</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Architecture Highlights */}
      <section id="solutions" className="py-20 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-[#E52328] uppercase tracking-widest mb-3">Enterprise Security</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              Engineered as a Commercial Multi-Tenant Engine
            </h3>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Every query, service, and API endpoint strictly binds to the authenticated server-side membership. A company can never read or tamper with another organization's records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#E52328]/10 border border-[#E52328]/25 flex items-center justify-center text-[#E52328] mb-6">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2 font-display">Scoped PostgreSQL Storage</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Organizations operate on isolated records with strict multi-tenant constraints, composite keys, and indexing to ensure near-zero query latency.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#AB1428]/10 border border-[#AB1428]/25 flex items-center justify-center text-[#AB1428] mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2 font-display">Granular Role-Based Access</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Super Admin, Company Admin, HR Manager, Department Manager, and Employee roles with backend permission validation on every route.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#00bb7f]/10 border border-[#00bb7f]/20 flex items-center justify-center text-[#00bb7f] mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2 font-display">Automated Token Rotation</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                OWASP-compliant Argon2id password hashing, HTTP-only secure refresh cookies, and automatic token family reuse revocation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 relative bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 sm:p-14 text-center border border-red-200 bg-gradient-to-r from-red-50/80 via-white to-red-50/80 shadow-lg relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#E52328]/10 rounded-full blur-[100px] pointer-events-none" />
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
              Ready to Upgrade Your Organization to CodeOrbit?
            </h3>
            <p className="mt-4 text-slate-600 text-base max-w-2xl mx-auto">
              Join forward-thinking companies running their HR lifecycle with confidence, privacy, and speed.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/register-org"
                className="btn-wipronix-primary px-8 py-4 text-base font-semibold text-white shadow-glow-sm flex items-center gap-2"
              >
                Provision Your Company Workspace <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
