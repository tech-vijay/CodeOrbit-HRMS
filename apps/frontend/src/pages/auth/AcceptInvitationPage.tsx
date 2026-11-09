import React, { useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { api } from '../../services/api';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const returnTo = `${location.pathname}${location.search}`;
  const signInUrl = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('This invitation link is missing its security token.');
      return;
    }
    if (!isAuthenticated && password !== confirmation) {
      setErrorMessage('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/accept-invitation', {
        token,
        password: password || undefined,
      });
      setAccepted(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Unable to accept this invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <Link to="/" className="block text-center text-[#E52328] font-bold text-xl font-display">
          CodeOrbit HRMS
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900 text-center font-display">
          Accept your invitation
        </h1>
        <p className="mt-2 mb-6 text-sm text-slate-500 text-center">
          {isAuthenticated
            ? 'Confirm that you want to join this organization.'
            : 'Create a password to activate your invited account.'}
        </p>

        {accepted ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
            <p className="text-sm text-slate-700">
              Invitation accepted. You can now sign in to your organization.
            </p>
            <Link to="/login" className="inline-flex px-4 py-2 rounded-xl bg-[#E52328] text-white text-sm font-semibold">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                {errorMessage.includes('Sign in with the invited account') && (
                  <Link to={signInUrl} className="mt-2 inline-block font-semibold underline">
                    Sign in to accept this invitation
                  </Link>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <>
                <label className="block text-sm font-semibold text-slate-700">
                  New password
                  <span className="relative block mt-1.5">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#E52328]"
                    />
                  </span>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full py-3 rounded-xl bg-[#E52328] hover:bg-[#c41e22] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Accepting invitation...' : 'Accept invitation'}
            </button>
            {!isAuthenticated && (
              <p className="text-xs text-center text-slate-500">
                Already have an account? <Link to={signInUrl} className="text-[#E52328] font-semibold">Sign in first</Link>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
