import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { setAuthSession } from '../../store/slices/authSlice';
import { api } from '../../services/api';
import { Layers, ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        organizationSlug: organizationSlug || undefined,
      });

      const { user, activeOrganization, organizations, accessToken } = response.data.data;

      dispatch(
        setAuthSession({
          user,
          activeOrganization,
          organizations,
          accessToken,
        })
      );

      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoSlug?: string) => {
    setEmail(demoEmail);
    setPassword('CodeOrbit@2026!');
    if (demoSlug) setOrganizationSlug(demoSlug);
  };

  return (
    <div className="min-h-screen bg-orbit-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-brand-500/30">
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/10 blur-[120px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-sm">
            <div className="w-full h-full bg-orbit-dark rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">CodeOrbit <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">HRMS</span></span>
        </Link>
        <h2 className="mt-6 text-2xl font-extrabold text-white">Sign In to Your Workspace</h2>
        <p className="mt-2 text-xs text-slate-400">
          Enter your organization credentials to access the portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl shadow-2xl border border-slate-800">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Organization Slug (Optional)</span>
                <span className="text-[10px] text-slate-400">Direct Tenant Routing</span>
              </label>
              <input
                type="text"
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase())}
                placeholder="e.g. codeorbit-demo"
                className="w-full px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-300 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:opacity-95 shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> One-Click Seed Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@codeorbit.demo', 'codeorbit-demo')}
                className="text-left p-2.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-xs transition-colors"
              >
                <p className="font-semibold text-white">Company Admin</p>
                <p className="text-[10px] text-indigo-400 font-mono">admin@codeorbit.demo</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('riya.patel@codeorbit.demo', 'codeorbit-demo')}
                className="text-left p-2.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-xs transition-colors"
              >
                <p className="font-semibold text-white">Employee</p>
                <p className="text-[10px] text-cyan-400 font-mono">riya.patel@codeorbit.demo</p>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Need a workspace for your company?{' '}
          <Link to="/register-org" className="font-medium text-indigo-400 hover:text-indigo-300">
            Register Organization
          </Link>
        </p>
      </div>
    </div>
  );
};
