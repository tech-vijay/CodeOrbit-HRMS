import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { setAuthSession } from '../../store/slices/authSlice';
import { api } from '../../services/api';
import { Layers, ArrowRight, Building2, User, AlertCircle } from 'lucide-react';

export const RegisterOrgPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-slugify organization name
  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setOrgSlug(slug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.post('/auth/register-organization', {
        organizationName: orgName,
        organizationSlug: orgSlug,
        adminFirstName: firstName,
        adminLastName: lastName,
        email,
        password,
        phone: phone || undefined,
      });

      const { user, organization, activeRole, accessToken } = response.data.data;

      dispatch(
        setAuthSession({
          user,
          activeOrganization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            role: {
              id: activeRole.id,
              name: activeRole.name,
              slug: activeRole.slug,
              permissions: ['*'],
            },
          },
          organizations: [
            {
              organizationId: organization.id,
              organizationName: organization.name,
              organizationSlug: organization.slug,
              role: activeRole.name,
            },
          ],
          accessToken,
        })
      );

      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Organization registration failed. Please check parameters.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orbit-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#E52328]/30">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E52328]/15 blur-[140px] pointer-events-none -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E52328] via-[#fb2c36] to-[#AB1428] p-[1.5px] shadow-glow-sm">
            <div className="w-full h-full bg-[#060608] rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#fb2c36] group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-display">CodeOrbit <span className="text-xs px-2 py-0.5 rounded-full bg-[#E52328]/15 text-[#fb2c36] border border-[#E52328]/30 font-semibold">HRMS</span></span>
        </Link>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-white font-display">
          Register Your Organization Workspace
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Provision your secure, isolated multi-tenant environment with full enterprise HR capabilities.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl shadow-2xl border border-slate-800">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Organization Info */}
            <div className="space-y-4 pb-4 border-b border-slate-800/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#fb2c36] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E52328]" /> Company Details
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Legal Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  placeholder="e.g. Acme Technologies Private Limited"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Organization Identifier (URL Slug)</span>
                  <span className="text-[10px] text-[#fb2c36] font-mono">Tenant Isolation Key</span>
                </label>
                <div className="flex items-center rounded-xl bg-slate-900/40 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-300">
                  <span className="text-slate-400">codeorbit.io/tenant/</span>
                  <input
                    type="text"
                    required
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme-tech"
                    className="bg-transparent flex-1 text-[#fb2c36] font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Admin Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#fb2c36] flex items-center gap-2">
                <User className="w-4 h-4 text-[#E52328]" /> Primary Administrator Account
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Aarav"
                    className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Master Password (Min 8 chars, mixed case, number, symbol)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#E52328]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-wipronix-primary w-full mt-6 py-3 px-4 text-sm font-semibold text-white shadow-glow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Provisioning Tenant...' : 'Complete Workspace Setup'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#fb2c36] hover:text-[#E52328]">
            Sign In to Existing Tenant
          </Link>
        </p>
      </div>
    </div>
  );
};
