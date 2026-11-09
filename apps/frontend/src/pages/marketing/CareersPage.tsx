import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadFile } from '../../services/upload';

interface PublicJob {
  id: string;
  title: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  location: string;
  workplaceType: 'ON_SITE' | 'HYBRID' | 'REMOTE';
  employmentType: string;
  experienceYears?: string | null;
  currency?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  openings: number;
  createdAt: string;
  department?: {
    id: string;
    name: string;
  } | null;
}

interface PublicCareersData {
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
  };
  openings: PublicJob[];
}

export const CareersPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [data, setData] = useState<PublicCareersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Application form
  const [candidateForm, setCandidateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentCtc: 0,
    expectedCtc: 0,
    noticePeriodDays: 30,
    portfolioUrl: '',
    linkedinUrl: '',
    resumeUrl: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCareers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const orgSlug = slug || 'codeorbit-demo';
        const res = await axios.get(`/api/v1/recruitment/public/careers/${orgSlug}`);
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load career opportunities.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCareers();
  }, [slug]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsSubmitting(true);
    setApplyError(null);

    try {
      let finalResumeUrl = candidateForm.resumeUrl;

      if (resumeFile) {
        setIsUploadingResume(true);
        const uploadRes = await uploadFile(resumeFile, 'resumes', true);
        finalResumeUrl = uploadRes.fileUrl;
        setIsUploadingResume(false);
      }

      if (!finalResumeUrl) {
        throw new Error('Please upload a resume file or provide a valid resume URL');
      }

      const orgSlug = slug || 'codeorbit-demo';
      await axios.post(`/api/v1/recruitment/public/careers/${orgSlug}/apply`, {
        ...candidateForm,
        resumeUrl: finalResumeUrl,
        jobPostingId: selectedJob.id,
        currentCtc: Number(candidateForm.currentCtc) || 0,
        expectedCtc: Number(candidateForm.expectedCtc) || 0,
        noticePeriodDays: Number(candidateForm.noticePeriodDays) || 30,
      });

      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        setIsApplyModalOpen(false);
        setCandidateForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          currentCompany: '',
          currentCtc: 0,
          expectedCtc: 0,
          noticePeriodDays: 30,
          portfolioUrl: '',
          linkedinUrl: '',
          resumeUrl: '',
        });
        setResumeFile(null);
      }, 3000);
    } catch (err: any) {
      setApplyError(err.response?.data?.message || err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
      setIsUploadingResume(false);
    }
  };

  const departments = ['ALL', ...Array.from(new Set(data?.openings.map((j) => j.department?.name).filter(Boolean)))];

  const filteredJobs = data?.openings.filter((job) => {
    if (selectedDepartment === 'ALL') return true;
    return job.department?.name === selectedDepartment;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#E52328] mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Loading open positions...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold font-display text-white">Company Careers Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to locate organization career portal.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white text-xs font-bold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CodeOrbit
          </Link>
        </div>
      </div>
    );
  }

  const { organization } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#E52328] selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-9 w-auto object-contain rounded" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#E52328]/10 border border-[#E52328]/30 flex items-center justify-center font-bold text-sm text-[#E52328] font-display">
                {organization.name[0]}
              </div>
            )}
            <span className="font-bold text-base tracking-tight font-display text-white">
              {organization.name} Careers
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            {organization.website && (
              <a
                href={organization.website}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Company Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all"
            >
              Employee Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 px-6 border-b border-slate-800/60 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#E52328]/15 via-transparent to-transparent pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E52328]/10 border border-[#E52328]/30 text-xs font-bold text-[#E52328]">
            <Sparkles className="w-3.5 h-3.5" />
            We Are Actively Hiring
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight font-display">
            Build the Future with {organization.name}
          </h1>

          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Join a fast-growing, ambitious team engineering autonomous systems. Explore open roles across engineering, product, and leadership.
          </p>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#E52328]" />
              {organization.city ? `${organization.city}, ${organization.country}` : 'Global & Remote'}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#00bb7f]" />
              {data.openings.length} Active Positions
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        {/* Department Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept!)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedDepartment === dept
                  ? 'bg-[#E52328] text-white shadow-glow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {dept === 'ALL' ? 'All Roles' : dept}
            </button>
          ))}
        </div>

        {/* Job Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25">
                    {job.department?.name || 'General'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {job.workplaceType.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white font-display group-hover:text-red-400 transition-colors">
                  {job.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {job.experienceYears || '2+ years exp'}
                  </span>
                  {job.minSalary && job.maxSalary && (
                    <span className="flex items-center gap-1 font-mono text-emerald-400 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.currency} {job.minSalary.toLocaleString()} - {job.maxSalary.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setIsApplyModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Apply Now <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  {job.openings} {job.openings > 1 ? 'openings' : 'opening'}
                </span>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="col-span-full p-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl space-y-2">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-white font-display">No positions currently available</p>
              <p className="text-xs text-slate-400">Check back soon as we frequently open new positions.</p>
            </div>
          )}
        </div>
      </main>

      {/* APPLICATION MODAL */}
      <AnimatePresence>
        {isApplyModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
            >
              <div className="p-6 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#E52328] uppercase tracking-wider block mb-1">
                    Application Form
                  </span>
                  <h3 className="text-xl font-bold text-white font-display">
                    {selectedJob.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedJob.location} • {selectedJob.workplaceType}
                  </p>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {applySuccess ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-white font-display">Application Received!</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you for applying to <strong>{organization.name}</strong>. Our talent acquisition team will review your profile and reach out via email shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="p-6 space-y-5">
                  {applyError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{applyError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateForm.firstName}
                        onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateForm.lastName}
                        onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={candidateForm.email}
                        onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={candidateForm.phone}
                        onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Upload Resume / CV (.pdf, .docx) *
                    </label>
                    <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-center bg-slate-950/60">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setResumeFile(file);
                        }}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                      />
                      {resumeFile && (
                        <p className="mt-2 text-xs text-emerald-400 font-mono">
                          Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(0)} KB)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Current Company
                      </label>
                      <input
                        type="text"
                        placeholder="Current Employer"
                        value={candidateForm.currentCompany}
                        onChange={(e) => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Notice Period (Days)
                      </label>
                      <input
                        type="number"
                        value={candidateForm.noticePeriodDays}
                        onChange={(e) => setCandidateForm({ ...candidateForm, noticePeriodDays: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={candidateForm.linkedinUrl}
                        onChange={(e) => setCandidateForm({ ...candidateForm, linkedinUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Portfolio / GitHub URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/..."
                        value={candidateForm.portfolioUrl}
                        onChange={(e) => setCandidateForm({ ...candidateForm, portfolioUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsApplyModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploadingResume}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-xs font-bold shadow-glow-sm disabled:opacity-50 transition-all"
                    >
                      {(isSubmitting || isUploadingResume) && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
