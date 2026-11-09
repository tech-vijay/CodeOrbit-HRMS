import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  organizationId: string;
  employeeId: string;
  cycleId?: string | null;
  title: string;
  description?: string | null;
  category: 'INDIVIDUAL' | 'DEPARTMENT' | 'COMPANY' | 'DEVELOPMENT';
  weightage: number;
  progress: number;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
  dueDate?: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
  cycle?: {
    id: string;
    title: string;
  } | null;
  keyResults: KeyResult[];
}

export interface PerformanceCycle {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  reviewType: 'QUARTERLY' | 'ANNUAL' | 'MID_YEAR' | 'PROBATION';
  status: 'DRAFT' | 'ACTIVE' | 'EVALUATION' | 'CALIBRATION' | 'COMPLETED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  selfReviewDeadline?: string | null;
  managerReviewDeadline?: string | null;
  _count?: {
    reviews: number;
    goals: number;
  };
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  organizationId: string;
  cycleId: string;
  employeeId: string;
  reviewerId?: string | null;
  status: 'PENDING_SELF' | 'PENDING_MANAGER' | 'PENDING_HR' | 'COMPLETED';
  selfRating?: number | null;
  selfFeedback?: string | null;
  managerRating?: number | null;
  managerFeedback?: string | null;
  finalRating?: number | null;
  promotionRecommended: boolean;
  salaryHikePercentage?: number | null;
  pipRequired: boolean;
  pipNotes?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department?: { id: string; name: string } | null;
    designation?: { id: string; title: string } | null;
  };
  reviewer?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail: string;
  } | null;
  cycle: {
    id: string;
    title: string;
    reviewType: string;
    status: string;
  };
}

export interface PerformanceSummary {
  activeCycle?: PerformanceCycle | null;
  totalEmployees: number;
  totalGoals: number;
  completedGoals: number;
  avgGoalProgress: number;
  avgRating: number;
  reviewStats: {
    pendingSelf: number;
    pendingManager: number;
    pendingHr: number;
    completed: number;
    promotions: number;
    pipRequired: number;
  };
}

interface PerformanceState {
  summary: PerformanceSummary | null;
  cycles: PerformanceCycle[];
  goals: Goal[];
  reviews: PerformanceReview[];
  selectedReview: (PerformanceReview & { goals: Goal[] }) | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
}

const initialState: PerformanceState = {
  summary: null,
  cycles: [],
  goals: [],
  reviews: [],
  selectedReview: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
};

// -------------------------------------------------------------
// ASYNC THUNKS
// -------------------------------------------------------------

export const fetchPerformanceSummary = createAsyncThunk(
  'performance/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/performance/summary');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const fetchCycles = createAsyncThunk(
  'performance/fetchCycles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/performance/cycles');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch cycles');
    }
  }
);

export const createCycle = createAsyncThunk(
  'performance/createCycle',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/performance/cycles', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create cycle');
    }
  }
);

export const updateCycleStatus = createAsyncThunk(
  'performance/updateCycleStatus',
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/performance/cycles/${id}/status`, { status });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update cycle status');
    }
  }
);

export const fetchGoals = createAsyncThunk(
  'performance/fetchGoals',
  async (filters: { employeeId?: string; cycleId?: string; status?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get('/performance/goals', { params: filters });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch goals');
    }
  }
);

export const createGoal = createAsyncThunk(
  'performance/createGoal',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/performance/goals', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create goal');
    }
  }
);

export const updateGoalProgress = createAsyncThunk(
  'performance/updateGoalProgress',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/performance/goals/${id}/progress`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update goal progress');
    }
  }
);

export const fetchReviews = createAsyncThunk(
  'performance/fetchReviews',
  async (filters: { cycleId?: string; status?: string; employeeId?: string } | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get('/performance/reviews', { params: filters });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'performance/fetchReviewById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/performance/reviews/${id}`);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load review details');
    }
  }
);

export const submitSelfReview = createAsyncThunk(
  'performance/submitSelfReview',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/performance/reviews/${id}/self`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit self review');
    }
  }
);

export const submitManagerReview = createAsyncThunk(
  'performance/submitManagerReview',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/performance/reviews/${id}/manager`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit manager review');
    }
  }
);

export const calibrateReview = createAsyncThunk(
  'performance/calibrateReview',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/performance/reviews/${id}/calibrate`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to finalize calibration');
    }
  }
);

export const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    clearSelectedReview: (state) => {
      state.selectedReview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summary
      .addCase(fetchPerformanceSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      // Cycles
      .addCase(fetchCycles.fulfilled, (state, action) => {
        state.cycles = action.payload;
      })
      .addCase(createCycle.fulfilled, (state, action) => {
        state.cycles.unshift(action.payload);
      })
      // Goals
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.goals = action.payload;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.unshift(action.payload);
      })
      .addCase(updateGoalProgress.fulfilled, (state, action) => {
        const index = state.goals.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = { ...state.goals[index], ...action.payload };
        }
      })
      // Reviews
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.reviews = action.payload;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.selectedReview = action.payload;
      })
      .addCase(submitSelfReview.fulfilled, (state, action) => {
        const index = state.reviews.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reviews[index] = { ...state.reviews[index], ...action.payload };
        }
        if (state.selectedReview?.id === action.payload.id) {
          state.selectedReview = { ...state.selectedReview, ...action.payload };
        }
      })
      .addCase(submitManagerReview.fulfilled, (state, action) => {
        const index = state.reviews.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reviews[index] = { ...state.reviews[index], ...action.payload };
        }
        if (state.selectedReview?.id === action.payload.id) {
          state.selectedReview = { ...state.selectedReview, ...action.payload };
        }
      })
      .addCase(calibrateReview.fulfilled, (state, action) => {
        const index = state.reviews.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reviews[index] = { ...state.reviews[index], ...action.payload };
        }
        if (state.selectedReview?.id === action.payload.id) {
          state.selectedReview = { ...state.selectedReview, ...action.payload };
        }
      });
  },
});

export const { clearSelectedReview } = performanceSlice.actions;
export default performanceSlice.reducer;
