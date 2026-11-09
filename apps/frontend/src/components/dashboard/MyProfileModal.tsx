import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { X, Save, KeyRound, UserRound } from 'lucide-react';

interface MyProfile {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone?: string | null;
  panNumber?: string | null;
  uan?: string | null;
  bankAccountHolderName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  joiningDate: string;
  status: string;
  role: string;
  department?: { name: string } | null;
  designation?: { title: string } | null;
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }>;
}

interface MyProfileModalProps {
  onClose: () => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({ onClose }) => {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: '',
    panNumber: '',
    uan: '',
    bankAccountHolderName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    let active = true;
    api.get('/employees/me')
      .then((response) => {
        if (!active) return;
        const data = response.data.data as MyProfile;
        setProfile(data);
        setForm({
          phone: data.phone || '',
          panNumber: data.panNumber || '',
          uan: data.uan || '',
          bankAccountHolderName: data.bankAccountHolderName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankIfsc: data.bankIfsc || '',
          emergencyContactName: data.emergencyContacts?.[0]?.name || '',
          emergencyContactRelationship: data.emergencyContacts?.[0]?.relationship || '',
          emergencyContactPhone: data.emergencyContacts?.[0]?.phone || '',
        });
      })
      .catch((requestError: { response?: { data?: { message?: string } }; message?: string }) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load your profile.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const response = await api.patch('/employees/me', {
        phone: form.phone.trim() || null,
        panNumber: form.panNumber.trim().toUpperCase() || null,
        uan: form.uan.trim() || null,
        bankAccountHolderName: form.bankAccountHolderName.trim() || null,
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        bankIfsc: form.bankIfsc.trim().toUpperCase() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || null,
        emergencyContactPhone: form.emergencyContactPhone.trim() || null,
      });
      setProfile(response.data.data as MyProfile);
      setSuccess('Your personal details were updated.');
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setSuccess('Your password has been changed.');
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to change your password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-profile-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
      >
        <header className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-rose-50 text-[#E52328] flex items-center justify-center">
              <UserRound className="w-5 h-5" />
            </span>
            <div>
              <h2 id="my-profile-title" className="text-lg font-bold text-slate-900">My Profile & Security</h2>
              <p className="text-xs text-slate-500">Personal, statutory and account details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close profile">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading your profile...</p>
          ) : !profile ? (
            <p role="alert" className="py-8 text-center text-sm text-rose-700">{error || 'Your employee profile is unavailable.'}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Info label="Employee ID" value={profile.employeeCode} />
                <Info label="Role" value={profile.role} />
                <Info label="Department" value={profile.department?.name || 'Not assigned'} />
                <Info label="Joining Date" value={new Date(profile.joiningDate).toLocaleDateString()} />
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <h3 className="font-semibold text-sm text-slate-900">Personal & Statutory Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone Number">
                    <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="PAN">
                    <input value={form.panNumber} onChange={(event) => setForm({ ...form, panNumber: event.target.value.toUpperCase() })} maxLength={10} placeholder="ABCDE1234F" className={inputClass} />
                  </Field>
                  <Field label="UAN">
                    <input inputMode="numeric" value={form.uan} onChange={(event) => setForm({ ...form, uan: event.target.value })} maxLength={12} className={inputClass} />
                  </Field>
                  <Field label="Bank Account Holder">
                    <input value={form.bankAccountHolderName} onChange={(event) => setForm({ ...form, bankAccountHolderName: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Bank Account Number">
                    <input value={form.bankAccountNumber} onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })} autoComplete="off" className={inputClass} />
                  </Field>
                  <Field label="IFSC">
                    <input value={form.bankIfsc} onChange={(event) => setForm({ ...form, bankIfsc: event.target.value.toUpperCase() })} maxLength={11} placeholder="ABCD0123456" className={inputClass} />
                  </Field>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-sm text-slate-900 mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Name">
                      <input value={form.emergencyContactName} onChange={(event) => setForm({ ...form, emergencyContactName: event.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Relationship">
                      <input value={form.emergencyContactRelationship} onChange={(event) => setForm({ ...form, emergencyContactRelationship: event.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" value={form.emergencyContactPhone} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} className={inputClass} />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E52328] text-white text-xs font-semibold disabled:opacity-50">
                    <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>

              <form onSubmit={handleChangePassword} className="mt-6 pt-5 border-t border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-sm text-slate-900">Change Password</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Current Password">
                    <input type="password" autoComplete="current-password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} className={inputClass} />
                  </Field>
                  <Field label="New Password">
                    <input type="password" autoComplete="new-password" minLength={8} required value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} className={inputClass} />
                  </Field>
                </div>
                <p className="text-[11px] text-slate-500">Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.</p>
                <div className="flex justify-end">
                  <button disabled={isChangingPassword} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold disabled:opacity-50">
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </>
          )}

          {(error || success) && (
            <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {error || success}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

const inputClass = 'mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-[#E52328]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-xs font-medium text-slate-700">
    {label}
    {children}
  </label>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    <p className="mt-1 text-xs font-semibold text-slate-900 truncate">{value}</p>
  </div>
);
