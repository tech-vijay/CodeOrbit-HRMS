import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchRecruitmentSummary,
  fetchJobPostings,
  createJobPosting,
  updateJobPosting,
  fetchCandidates,
  fetchCandidateById,
  updateCandidateStage,
  scheduleCandidateInterview,
  addCandidateNote,
  createCandidateApplication,
  setSelectedCandidate,
  CandidateStage,
} from '../../store/slices/recruitmentSlice';
import { uploadFile } from '../../services/upload';
import { resolveApiAssetUrl } from '../../services/api';
import {
  Briefcase,
  Users,
  CalendarCheck2,
  Award,
  Plus,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  FileText,
  Send,
  X,
  Link2,
  Upload,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PIPELINE_STAGES: { stage: CandidateStage; label: string; color: string; badgeBg: string; border: string }[] = [
  { stage: 'APPLIED', label: 'Applied', color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  { stage: 'SCREENING', label: 'Screening', color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  { stage: 'INTERVIEW', label: 'Interview', color: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  { stage: 'OFFER_EXTENDED', label: 'Offer Extended', color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
  { stage: 'HIRED', label: 'Hired', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
];

export const RecruitmentPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { summary, jobs, candidates, selectedCandidate, isActionLoading } = useSelector(
    (state: RootState) => state.recruitment
  );
  const { activeOrganization } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'pipeline' | 'jobs'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('ALL');

  // Modals
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isNewCandidateModalOpen, setIsNewCandidateModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // New Job Form
  const [jobForm, setJobForm] = useState({
    title: '',
    location: 'Bengaluru, India',
    workplaceType: 'HYBRID',
    employmentType: 'FULL_TIME',
    experienceYears: '3-5 years',
    minSalary: 1500000,
    maxSalary: 2500000,
    openings: 1,
    status: 'PUBLISHED',
    description: '',
    requirements: '',
    responsibilities: '',
  });

  // New Candidate Form
  const [candidateForm, setCandidateForm] = useState({
    jobPostingId: '',
    fullName: '',
    email: '',
    phone: '',
    resumeUrl: '',
    portfolioUrl: '',
    linkedinUrl: '',
    currentCompany: '',
    currentCtc: 1200000,
    expectedCtc: 1800000,
    noticePeriodDays: 30,
    stage: 'APPLIED',
    notes: '',
  });

  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Interview Form
  const [interviewForm, setInterviewForm] = useState({
    roundName: 'Technical Architecture & System Design',
    roundNumber: 1,
    scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    interviewerName: 'Lead Engineer',
    meetingLink: 'https://meet.google.com/orbit-tech-interview',
  });

  // Notes Form inside Dossier
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    dispatch(fetchRecruitmentSummary());
    dispatch(fetchJobPostings(undefined));
    dispatch(fetchCandidates(undefined));
  }, [dispatch]);

  const handleOpenDossier = async (candidateId: string) => {
    await dispatch(fetchCandidateById(candidateId));
    setIsDossierOpen(true);
  };

  const handleStageChange = async (candidateId: string, stage: CandidateStage) => {
    await dispatch(updateCandidateStage({ id: candidateId, data: { stage } }));
    dispatch(fetchRecruitmentSummary());
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(
      createJobPosting({
        ...jobForm,
        minSalary: Number(jobForm.minSalary),
        maxSalary: Number(jobForm.maxSalary),
        openings: Number(jobForm.openings),
      })
    );
    setIsNewJobModalOpen(false);
    dispatch(fetchJobPostings(undefined));
    dispatch(fetchRecruitmentSummary());
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(
      createCandidateApplication({
        ...candidateForm,
        currentCtc: Number(candidateForm.currentCtc),
        expectedCtc: Number(candidateForm.expectedCtc),
        noticePeriodDays: Number(candidateForm.noticePeriodDays),
      })
    );
    setIsNewCandidateModalOpen(false);
    dispatch(fetchCandidates(undefined));
    dispatch(fetchRecruitmentSummary());
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    await dispatch(
      scheduleCandidateInterview({
        candidateId: selectedCandidate.id,
        data: {
          ...interviewForm,
          scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
        },
      })
    );
    setIsInterviewModalOpen(false);
    dispatch(fetchCandidateById(selectedCandidate.id));
    dispatch(fetchCandidates(undefined));
    dispatch(fetchRecruitmentSummary());
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !noteContent.trim()) return;
    await dispatch(
      addCandidateNote({
        candidateId: selectedCandidate.id,
        data: { content: noteContent.trim(), authorName: 'Hiring Lead' },
      })
    );
    setNoteContent('');
  };

  // Filtered Candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.currentCompany && c.currentCompany.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesJob = selectedJobFilter === 'ALL' || c.jobPostingId === selectedJobFilter;
    return matchesSearch && matchesJob;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E52328]/10 border border-[#E52328]/20 flex items-center justify-center text-[#E52328]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                Recruitment & ATS Hub
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Talent Pipeline, Job Board & Candidate Lifecycle Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeOrganization?.slug && (
            <a
              href={`/api/v1/recruitment/public/careers/${activeOrganization.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              Public Careers Board
            </a>
          )}
          <button
            onClick={() => setIsNewCandidateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Add Candidate
          </button>
          <button
            onClick={() => setIsNewJobModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E52328] hover:bg-[#c91d22] shadow-sm shadow-[#E52328]/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Post Opening
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Openings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {summary?.activeJobsCount ?? jobs.filter((j) => j.status === 'PUBLISHED').length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Live on board</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidates</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {summary?.totalCandidatesCount ?? candidates.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">Across all stages</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interviews Active</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {summary?.interviewsScheduledCount ?? summary?.byStage?.INTERVIEW ?? 0}
            </span>
            <span className="text-xs font-semibold text-amber-600">Technical & Cultural</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hired & Offers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-display">
              {summary?.hiredCount ?? (summary?.byStage?.HIRED || 0)}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Successfully placed</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pipeline'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ATS Pipeline Board
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'jobs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Job Openings ({jobs.length})
          </button>
        </div>

        {/* Search & Job Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
            />
          </div>

          <div className="relative">
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328] text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Job Openings</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'pipeline' ? (
        /* ATS Pipeline Board */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((col) => {
            const stageCandidates = filteredCandidates.filter((c) => c.stage === col.stage);
            return (
              <div
                key={col.stage}
                className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[520px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.stage === 'HIRED' ? 'bg-emerald-500' : col.stage === 'INTERVIEW' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {stageCandidates.length}
                  </span>
                </div>

                {/* Candidate Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {stageCandidates.length === 0 ? (
                    <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] font-semibold text-slate-400 text-center p-4">
                      No candidates in {col.label}
                    </div>
                  ) : (
                    stageCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-[#E52328]/40 hover:shadow-md transition-all group relative cursor-pointer"
                        onClick={() => handleOpenDossier(candidate.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#E52328] transition-colors leading-snug">
                              {candidate.fullName}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                              {candidate.currentCompany || 'Experience not specified'}
                            </p>
                          </div>
                          <button
                            title="View Dossier"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Job Badge */}
                        <div className="mt-2.5">
                          <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-full">
                            {candidate.jobPosting?.title || 'Job Opening'}
                          </span>
                        </div>

                        {/* CTC & Notice Tag */}
                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>Notice: {candidate.noticePeriodDays || 30}d</span>
                          {candidate.expectedCtc && (
                            <span className="font-bold text-slate-700">
                              ₹{(Number(candidate.expectedCtc) / 100000).toFixed(1)}L CTC
                            </span>
                          )}
                        </div>

                        {/* Quick Stage Stepper dropdown */}
                        <div
                          className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={candidate.stage}
                            onChange={(e) => handleStageChange(candidate.id, e.target.value as CandidateStage)}
                            className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:border-slate-300 focus:outline-none"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s.stage} value={s.stage}>
                                → Move to {s.label}
                              </option>
                            ))}
                            <option value="REJECTED">✕ Mark Rejected</option>
                          </select>

                          {candidate.stage === 'INTERVIEW' && (
                            <button
                              onClick={() => {
                                dispatch(setSelectedCandidate(candidate));
                                setIsInterviewModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded hover:bg-purple-100"
                            >
                              + Schedule
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Job Openings Management Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Job Title & Code</th>
                  <th className="py-3 px-4">Workplace & Location</th>
                  <th className="py-3 px-4">Openings</th>
                  <th className="py-3 px-4">Salary Range (INR)</th>
                  <th className="py-3 px-4">Candidates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                      No job postings created yet. Click "Post Opening" to launch your first job opening.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="font-bold text-slate-900">{job.title}</div>
                        <div className="text-[11px] font-mono text-slate-400">/{job.slug}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{job.workplaceType}</div>
                        <div className="text-[11px] text-slate-400">{job.location}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{job.openings} Pos</td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono">
                        {job.minSalary && job.maxSalary
                          ? `₹${(Number(job.minSalary) / 100000).toFixed(1)}L - ₹${(Number(job.maxSalary) / 100000).toFixed(1)}L`
                          : 'Competitive'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#E52328] bg-[#E52328]/10 px-2 py-0.5 rounded-full text-[11px]">
                          {job._count?.candidates ?? 0} applicants
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            job.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : job.status === 'DRAFT'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedJobFilter(job.id);
                              setActiveTab('pipeline');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            View Pipeline
                          </button>
                          {job.status === 'PUBLISHED' ? (
                            <button
                              onClick={() => dispatch(updateJobPosting({ id: job.id, data: { status: 'CLOSED' } }))}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              onClick={() => dispatch(updateJobPosting({ id: job.id, data: { status: 'PUBLISHED' } }))}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Dossier Drawer / Modal */}
      <AnimatePresence>
        {isDossierOpen && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Dossier Header */}
              <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 font-display">
                      {selectedCandidate.fullName}
                    </h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {selectedCandidate.stage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Applied for{' '}
                    <span className="font-bold text-slate-800">
                      {selectedCandidate.jobPosting?.title || 'Open Position'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setIsDossierOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dossier Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Contact & Current Role Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedCandidate.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Phone</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedCandidate.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Current Company</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCandidate.currentCompany || 'Not disclosed'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Notice Period</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCandidate.noticePeriodDays || 30} Days
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Current CTC</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCandidate.currentCtc ? `₹${(Number(selectedCandidate.currentCtc) / 100000).toFixed(1)} LPA` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Expected CTC</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedCandidate.expectedCtc ? `₹${(Number(selectedCandidate.expectedCtc) / 100000).toFixed(1)} LPA` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Candidate Links (Resume, Portfolio, LinkedIn) */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedCandidate.resumeUrl && (
                    <a
                      href={resolveApiAssetUrl(selectedCandidate.resumeUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Resume
                    </a>
                  )}
                  {selectedCandidate.linkedinUrl && (
                    <a
                      href={selectedCandidate.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:bg-slate-200"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      LinkedIn Profile
                    </a>
                  )}
                </div>

                {/* Stage Progression Buttons */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Advance ATS Stage
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {PIPELINE_STAGES.map((s) => (
                      <button
                        key={s.stage}
                        onClick={() => handleStageChange(selectedCandidate.id, s.stage)}
                        className={`py-2 px-2.5 rounded-xl font-bold border text-center transition-all ${
                          selectedCandidate.stage === s.stage
                            ? 'bg-[#E52328] text-white border-[#E52328] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      onClick={() => handleStageChange(selectedCandidate.id, 'REJECTED')}
                      className={`py-2 px-2.5 rounded-xl font-bold border text-center transition-all ${
                        selectedCandidate.stage === 'REJECTED'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Interview Rounds Scheduled */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Interview Rounds ({selectedCandidate.interviewRounds?.length || selectedCandidate.interviews?.length || 0})
                    </h4>
                    <button
                      onClick={() => setIsInterviewModalOpen(true)}
                      className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100"
                    >
                      + Schedule Round
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(selectedCandidate.interviewRounds || selectedCandidate.interviews || []).length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        No interview rounds recorded yet.
                      </p>
                    ) : (
                      (selectedCandidate.interviewRounds || selectedCandidate.interviews || []).map((round, idx) => (
                        <div
                          key={round.id || idx}
                          className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{round.roundName}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                round.isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {round.isCompleted ? 'Completed' : 'Upcoming'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                            <span>Interviewer: {round.interviewerName || 'Assigned Lead'}</span>
                            <span>Date: {new Date(round.scheduledAt).toLocaleDateString()}</span>
                          </div>
                          {round.feedback && (
                            <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                              <span className="font-bold text-slate-900">Feedback: </span>
                              {round.feedback}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Internal Notes & Recruiter Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Recruiter Evaluation Notes
                  </h4>

                  {/* Add Note Input */}
                  <form onSubmit={handleAddNote} className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Add an internal evaluation note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                    <button
                      type="submit"
                      disabled={!noteContent.trim()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#E52328] hover:bg-[#c91d22] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="space-y-2">
                    {(selectedCandidate.notes || []).length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        No recruiter notes added.
                      </p>
                    ) : (
                      selectedCandidate.notes?.map((n) => (
                        <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-bold text-slate-700">{n.authorName}</span>
                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-800">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Opening Modal */}
      <AnimatePresence>
        {isNewJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E52328]/10 text-[#E52328] flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 font-display">Post New Job Opening</h3>
                </div>
                <button
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Backend Engineer"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Workplace Type</label>
                    <select
                      value={jobForm.workplaceType}
                      onChange={(e) => setJobForm({ ...jobForm, workplaceType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    >
                      <option value="HYBRID">Hybrid</option>
                      <option value="ON_SITE">On-Site</option>
                      <option value="REMOTE">Remote</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Min Salary (INR)</label>
                    <input
                      type="number"
                      value={jobForm.minSalary}
                      onChange={(e) => setJobForm({ ...jobForm, minSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Salary (INR)</label>
                    <input
                      type="number"
                      value={jobForm.maxSalary}
                      onChange={(e) => setJobForm({ ...jobForm, maxSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide overview of this position..."
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsNewJobModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-4 py-2 font-bold text-white bg-[#E52328] hover:bg-[#c91d22] rounded-xl shadow-sm"
                  >
                    Publish Opening
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {isNewCandidateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 font-display">Add Candidate to Pipeline</h3>
                </div>
                <button
                  onClick={() => setIsNewCandidateModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCandidate} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Opening *</label>
                  <select
                    required
                    value={candidateForm.jobPostingId}
                    onChange={(e) => setCandidateForm({ ...candidateForm, jobPostingId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  >
                    <option value="">Select a job opening</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.workplaceType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Candidate Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tanya Sharma"
                      value={candidateForm.fullName}
                      onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="tanya@domain.com"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Company</label>
                    <input
                      type="text"
                      placeholder="Tech Global Corp"
                      value={candidateForm.currentCompany}
                      onChange={(e) => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expected CTC (INR)</label>
                    <input
                      type="number"
                      value={candidateForm.expectedCtc}
                      onChange={(e) => setCandidateForm({ ...candidateForm, expectedCtc: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Upload Resume (.pdf, .docx)</label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200">
                        {isUploadingResume ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E52328]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>{isUploadingResume ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          disabled={isUploadingResume}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsUploadingResume(true);
                              try {
                                const uploadRes = await uploadFile(file, 'resumes');
                                setCandidateForm({ ...candidateForm, resumeUrl: uploadRes.fileUrl });
                              } catch (err: any) {
                                alert(err.message || 'Failed to upload resume');
                              } finally {
                                setIsUploadingResume(false);
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Or paste URL..."
                        value={candidateForm.resumeUrl}
                        onChange={(e) => setCandidateForm({ ...candidateForm, resumeUrl: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#E52328]"
                      />
                    </div>
                    {candidateForm.resumeUrl && (
                      <p className="mt-1 text-[11px] text-emerald-600 font-mono truncate">
                        Linked: {candidateForm.resumeUrl}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsNewCandidateModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading || !candidateForm.jobPostingId}
                    className="px-4 py-2 font-bold text-white bg-[#E52328] hover:bg-[#c91d22] rounded-xl shadow-sm disabled:opacity-50"
                  >
                    Add Candidate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Interview Modal */}
      <AnimatePresence>
        {isInterviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CalendarCheck2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 font-display">Schedule Interview Round</h3>
                </div>
                <button
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Round Name *</label>
                  <input
                    type="text"
                    required
                    value={interviewForm.roundName}
                    onChange={(e) => setInterviewForm({ ...interviewForm, roundName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interview Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={interviewForm.scheduledAt}
                    onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Interviewer Name</label>
                  <input
                    type="text"
                    value={interviewForm.interviewerName}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Video Meeting Link</label>
                  <input
                    type="text"
                    value={interviewForm.meetingLink}
                    onChange={(e) => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsInterviewModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-[#E52328] hover:bg-[#c91d22] rounded-xl shadow-sm"
                  >
                    Confirm & Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
