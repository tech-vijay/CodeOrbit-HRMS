import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchOrgProfile, updateOrgProfile } from '../../store/slices/orgSlice';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
  Edit3,
  Save,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasAdminPermission } from '../../utils/permissions';

export const OrganizationPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, isLoading } = useSelector((state: RootState) => state.org);
  const { activeOrganization, user } = useSelector((state: RootState) => state.auth);
  const activeRole = activeOrganization?.role.name || activeOrganization?.role.slug || user?.role;
  const canUpdateOrganization = hasAdminPermission(activeRole, activeOrganization?.role.permissions, 'org:update', user?.isSuperAdmin);

  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    logoUrl: '',
    website: '',
    email: '',
    phone: '',
    taxId: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
  });

  useEffect(() => {
    dispatch(fetchOrgProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        legalName: profile.legalName || '',
        logoUrl: profile.logoUrl || '',
        website: profile.website || '',
        email: profile.email || '',
        phone: profile.phone || '',
        taxId: profile.taxId || '',
        currency: profile.currency || 'INR',
        timezone: profile.timezone || 'Asia/Kolkata',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || 'India',
        postalCode: profile.postalCode || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const result = await dispatch(updateOrgProfile(formData));
      if (updateOrgProfile.fulfilled.match(result)) {
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(result.payload as string);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update organization profile');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Organization Profile & Settings
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Tenant Isolated
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Manage your legal entity records, localization preferences, and organizational boundary settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canUpdateOrganization && (
            isEditing ? (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Edit3 className="w-4 h-4" />
                Edit Settings
              </button>
            )
          )}
        </div>
      </div>

      {/* Success / Error Alerts */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Organization settings updated successfully. Audit trail logged.</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm font-medium"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#E52328]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Legal Entity</p>
            <p className="text-base font-extrabold text-slate-900 truncate max-w-[160px]">
              {profile?.name || activeOrganization?.name || 'Loading...'}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Employees</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile?._count?.employees ?? 0}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departments</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {profile?._count?.departments ?? 0}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">SaaS Isolation</p>
            <p className="text-sm font-extrabold text-emerald-700">Strict Multi-Tenant</p>
          </div>
        </div>
      </div>

      {/* Main Settings Form / View */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">General Information</h2>
              <p className="text-xs text-slate-500">Corporate identifiers and publicly displayed organization details.</p>
            </div>
            {profile?.logoUrl && (
              <img
                src={profile.logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-lg border border-slate-200 p-1"
              />
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Organization Display Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Legal Registered Entity Name
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="e.g. Acme Technologies Pvt Ltd"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tenant Slug (Permanent)
              </label>
              <input
                type="text"
                disabled
                value={profile?.slug || activeOrganization?.slug || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Brand Logo URL
              </label>
              <input
                type="url"
                disabled={!isEditing}
                placeholder="https://example.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Corporate Website
              </label>
              <div className="relative">
                <input
                  type="url"
                  disabled={!isEditing}
                  placeholder="https://codeorbit.io"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
                />
                {formData.website && (
                  <a
                    href={formData.website}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Official HR / Operations Email
              </label>
              <input
                type="email"
                disabled={!isEditing}
                placeholder="hr@codeorbit.io"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contact Phone
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Corporate Tax ID / GSTIN / PAN
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="27AAAAA0000A1Z5"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>
          </div>
        </div>

        {/* Regional & Localization */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 font-display">Regional & Localization</h2>
            <p className="text-xs text-slate-500">Payroll currency, timezone formatting, and address details.</p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Base Payroll Currency
              </label>
              <select
                disabled={!isEditing}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="SGD">SGD (S$) - Singapore Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Default Timezone
              </label>
              <select
                disabled={!isEditing}
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST / EDT)</option>
                <option value="Europe/London">Europe/London (GMT / BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Headquarters Address
              </label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="Cyber Gateway, Tower 3, Hitec City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">City</label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="Hyderabad"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">State / Province</label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="Telangana"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Country</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 disabled:bg-slate-50/60 disabled:text-slate-600 focus:bg-white focus:outline-none focus:border-[#E52328]"
              />
            </div>
          </div>

          {isEditing && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Organization Profile'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
