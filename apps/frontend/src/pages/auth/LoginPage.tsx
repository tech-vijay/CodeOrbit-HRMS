import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api } from '../../services/api';
import { setAuthSession } from '../../store/slices/authSlice';
import {
  Layers,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#E52328]/20">
      {/* Wipronix Crimson Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[320px] bg-[#E52328]/10 blur-[140px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E52328] via-[#fb2c36] to-[#AB1428] p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#E52328] group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-display">CodeOrbit <span className="text-xs px-2 py-0.5 rounded-full bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25 font-semibold">HRMS</span></span>
        </Link>
        <h2 className="mt-6 text-2xl font-extrabold text-slate-900 font-display">Sign In to Your Workspace</h2>
        <p className="mt-2 text-xs text-slate-500">
          Enter your organization credentials to access the portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328] transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-[#E52328] hover:text-[#AB1428]">
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328] transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Organization Slug (Optional)</span>
                <span className="text-[10px] text-slate-400">Direct Tenant Routing</span>
              </label>
              <input
                type="text"
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase())}
                placeholder="e.g. codeorbit-demo"
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-wipronix-primary w-full py-3 px-4 text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E52328]" /> One-Click Seed Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@codeorbit.demo', 'codeorbit-demo')}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors group"
              >
                <p className="font-semibold text-slate-900 group-hover:text-[#E52328] transition-colors">Company Admin</p>
                <p className="text-[10px] text-[#E52328] font-mono">admin@codeorbit.demo</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('riya.patel@codeorbit.demo', 'codeorbit-demo')}
                className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors group"
              >
                <p className="font-semibold text-slate-900 group-hover:text-[#00bb7f] transition-colors">Employee</p>
                <p className="text-[10px] text-[#00bb7f] font-mono">riya.patel@codeorbit.demo</p>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need a workspace for your company?{' '}
          <Link to="/register-org" className="font-semibold text-[#E52328] hover:text-[#AB1428]">
            Register Organization
          </Link>
        </p>
      </div>
    </div>
  );
};
