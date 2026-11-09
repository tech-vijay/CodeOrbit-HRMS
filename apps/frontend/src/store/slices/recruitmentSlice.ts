import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type WorkplaceType = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type CandidateStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER_EXTENDED' | 'HIRED' | 'REJECTED';

export interface JobPosting {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  title: string;
  slug: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: string;
  experienceYears?: string;
  minSalary?: string | number | null;
  maxSalary?: string | number | null;
  openings: number;
  status: JobStatus;
  viewsCount: number;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  _count?: {
    candidates: number;
  };
}

export interface InterviewRound {
  id: string;
  candidateId: string;
  roundName: string;
  roundNumber: number;
  scheduledAt: string;
  interviewerName?: string | null;
  meetingLink?: string | null;
  feedback?: string | null;
  rating?: number | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateNote {
  id: string;
  candidateId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  organizationId: string;
  jobPostingId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  currentCompany?: string | null;
  currentCtc?: string | number | null;
  expectedCtc?: string | number | null;
  noticePeriodDays?: number;
  stage: CandidateStage;
  rating?: number;
  rejectionReason?: string | null;
  hiredAt?: string | null;
  appliedAt: string;
  updatedAt: string;
  jobPosting?: {
    id: string;
    title: string;
    department?: { name: string };
  };
  interviews?: InterviewRound[];
  interviewRounds?: InterviewRound[];
  notes?: CandidateNote[];
}

export interface RecruitmentSummary {
  activeJobsCount: number;
  totalCandidatesCount: number;
  hiredCount: number;
  interviewsScheduledCount: number;
  byStage: {
    APPLIED: number;
    SCREENING: number;
    INTERVIEW: number;
    OFFER_EXTENDED: number;
    HIRED: number;
    REJECTED: number;
  };
}

interface RecruitmentState {
  summary: RecruitmentSummary | null;
  jobs: JobPosting[];
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  selectedJob: JobPosting | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
}

const initialState: RecruitmentState = {
  summary: null,
  jobs: [],
  candidates: [],
  selectedCandidate: null,
  selectedJob: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  isLoading: false,
  isActionLoading: false,
  error: null,
};

// Async Thunks
export const fetchRecruitmentSummary = createAsyncThunk(
  'recruitment/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/recruitment/summary');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch recruitment metrics');
    }
  }
);

export const fetchJobPostings = createAsyncThunk(
  'recruitment/fetchJobs',
  async (params: { status?: string; workplaceType?: string; search?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get('/recruitment/jobs', { params });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch job postings');
    }
  }
);

export const createJobPosting = createAsyncThunk(
  'recruitment/createJob',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/recruitment/jobs', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create job posting');
    }
  }
);

export const updateJobPosting = createAsyncThunk(
  'recruitment/updateJob',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/recruitment/jobs/${id}`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update job posting');
    }
  }
);

export const fetchCandidates = createAsyncThunk(
  'recruitment/fetchCandidates',
  async (params: { jobPostingId?: string; stage?: string; search?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get('/recruitment/candidates', { params });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch candidates');
    }
  }
);

export const fetchCandidateById = createAsyncThunk(
  'recruitment/fetchCandidateById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/recruitment/candidates/${id}`);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch candidate details');
    }
  }
);

export const updateCandidateStage = createAsyncThunk(
  'recruitment/updateStage',
  async ({ id, data }: { id: string; data: { stage: CandidateStage; feedbackNote?: string; rating?: number; rejectionReason?: string } }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/recruitment/candidates/${id}/stage`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update candidate stage');
    }
  }
);

export const scheduleCandidateInterview = createAsyncThunk(
  'recruitment/scheduleInterview',
  async ({ candidateId, data }: { candidateId: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/recruitment/candidates/${candidateId}/interviews`, data);
      return { candidateId, interview: response.data.data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to schedule interview');
    }
  }
);

export const addCandidateNote = createAsyncThunk(
  'recruitment/addNote',
  async ({ candidateId, data }: { candidateId: string; data: { content: string; authorName?: string } }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/recruitment/candidates/${candidateId}/notes`, data);
      return { candidateId, note: response.data.data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add note');
    }
  }
);

export const createCandidateApplication = createAsyncThunk(
  'recruitment/createCandidate',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/recruitment/candidates', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit candidate application');
    }
  }
);

const recruitmentSlice = createSlice({
  name: 'recruitment',
  initialState,
  reducers: {
    setSelectedCandidate: (state, action) => {
      state.selectedCandidate = action.payload;
    },
    setSelectedJob: (state, action) => {
      state.selectedJob = action.payload;
    },
    clearRecruitmentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summary
      .addCase(fetchRecruitmentSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRecruitmentSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchRecruitmentSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Jobs
      .addCase(fetchJobPostings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchJobPostings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs || [];
      })
      .addCase(fetchJobPostings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Job
      .addCase(createJobPosting.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(createJobPosting.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.jobs.unshift(action.payload);
        if (state.summary) state.summary.activeJobsCount += 1;
      })
      .addCase(createJobPosting.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
      })

      // Update Job
      .addCase(updateJobPosting.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((j) => j.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
      })

      // Candidates
      .addCase(fetchCandidates.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.candidates = action.payload.data || [];
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Candidate by ID
      .addCase(fetchCandidateById.fulfilled, (state, action) => {
        state.selectedCandidate = action.payload;
      })

      // Update Stage
      .addCase(updateCandidateStage.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(updateCandidateStage.fulfilled, (state, action) => {
        state.isActionLoading = false;
        const updated = action.payload;
        const index = state.candidates.findIndex((c) => c.id === updated.id);
        if (index !== -1) {
          state.candidates[index] = { ...state.candidates[index], ...updated };
        }
        if (state.selectedCandidate && state.selectedCandidate.id === updated.id) {
          state.selectedCandidate = { ...state.selectedCandidate, ...updated };
        }
      })
      .addCase(updateCandidateStage.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
      })

      // Create Candidate
      .addCase(createCandidateApplication.fulfilled, (state, action) => {
        state.candidates.unshift(action.payload);
        if (state.summary) {
          state.summary.totalCandidatesCount += 1;
          state.summary.byStage.APPLIED += 1;
        }
      })

      // Schedule Interview
      .addCase(scheduleCandidateInterview.fulfilled, (state, action) => {
        const { candidateId, interview } = action.payload;
        const candidate = state.candidates.find((c) => c.id === candidateId);
        if (candidate) {
          candidate.stage = 'INTERVIEW';
          if (!candidate.interviews) candidate.interviews = [];
          candidate.interviews.push(interview);
        }
        if (state.selectedCandidate && state.selectedCandidate.id === candidateId) {
          state.selectedCandidate.stage = 'INTERVIEW';
          if (!state.selectedCandidate.interviews) state.selectedCandidate.interviews = [];
          state.selectedCandidate.interviews.push(interview);
          if (!state.selectedCandidate.interviewRounds) state.selectedCandidate.interviewRounds = [];
          state.selectedCandidate.interviewRounds.push(interview);
        }
        if (state.summary) {
          state.summary.interviewsScheduledCount += 1;
        }
      })

      // Add Note
      .addCase(addCandidateNote.fulfilled, (state, action) => {
        const { candidateId, note } = action.payload;
        if (state.selectedCandidate && state.selectedCandidate.id === candidateId) {
          if (!state.selectedCandidate.notes) state.selectedCandidate.notes = [];
          state.selectedCandidate.notes.unshift(note);
        }
      });
  },
});

export const { setSelectedCandidate, setSelectedJob, clearRecruitmentError } = recruitmentSlice.actions;
export default recruitmentSlice.reducer;
