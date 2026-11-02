import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  daysAllowed: number;
  isPaid: boolean;
  requiresAttachment: boolean;
  carryForwardMaxDays: number;
  color: string;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  year: number;
  leaveType: LeaveType;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  carryForwardDays: number;
  availableDays: number;
}

export interface LeaveRequestItem {
  id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF' | null;
  reason: string;
  attachmentUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedAt: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  managerRemarks?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  leaveType: LeaveType;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { id: string; name: string } | null;
    designation?: { id: string; title: string } | null;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  description?: string | null;
  isMandatory: boolean;
  year: number;
}

export interface LeaveSummary {
  pendingCount: number;
  todayOnLeaveCount: number;
  upcomingApprovedCount: number;
  activeLeaveTypesCount: number;
}

interface LeaveState {
  types: LeaveType[];
  balances: LeaveBalance[];
  requests: LeaveRequestItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  holidays: CompanyHoliday[];
  summary: LeaveSummary | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: LeaveState = {
  types: [],
  balances: [],
  requests: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  holidays: [],
  summary: null,
  loading: false,
  actionLoading: false,
  error: null,
};

// Async Thunks
export const fetchLeaveTypes = createAsyncThunk(
  'leave/fetchLeaveTypes',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/leaves/types');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave types');
    }
  }
);

export const createLeaveType = createAsyncThunk(
  'leave/createLeaveType',
  async (
    payload: {
      name: string;
      code: string;
      description?: string;
      daysAllowed: number;
      isPaid?: boolean;
      requiresAttachment?: boolean;
      carryForwardMaxDays?: number;
      color?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.post('/leaves/types', payload);
      dispatch(fetchLeaveTypes());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create leave type');
    }
  }
);

export const fetchLeaveBalances = createAsyncThunk(
  'leave/fetchLeaveBalances',
  async (
    params: { employeeId?: string; year?: number } | void = {},
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams();
      if (params?.employeeId) query.append('employeeId', params.employeeId);
      if (params?.year) query.append('year', String(params.year));

      const res = await api.get(`/leaves/balances?${query.toString()}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch balances');
    }
  }
);

export const applyLeave = createAsyncThunk(
  'leave/applyLeave',
  async (
    payload: {
      employeeId?: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      isHalfDay?: boolean;
      halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF';
      reason: string;
      attachmentUrl?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.post('/leaves/apply', payload);
      dispatch(fetchLeaveBalances());
      dispatch(fetchLeaveRequests());
      dispatch(fetchLeaveSummary());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to apply for leave');
    }
  }
);

export const fetchLeaveRequests = createAsyncThunk(
  'leave/fetchLeaveRequests',
  async (
    params: {
      status?: string;
      employeeId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } | void = {},
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.employeeId) query.append('employeeId', params.employeeId);
      if (params?.departmentId) query.append('departmentId', params.departmentId);
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await api.get(`/leaves/requests?${query.toString()}`);
      return {
        items: res.data.data,
        pagination: res.data.meta,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave requests');
    }
  }
);

export const reviewLeaveRequest = createAsyncThunk(
  'leave/reviewLeaveRequest',
  async (
    payload: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      managerRemarks?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.patch(`/leaves/requests/${payload.id}/review`, {
        status: payload.status,
        managerRemarks: payload.managerRemarks,
      });
      dispatch(fetchLeaveRequests());
      dispatch(fetchLeaveBalances());
      dispatch(fetchLeaveSummary());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to review leave request');
    }
  }
);

export const cancelLeaveRequest = createAsyncThunk(
  'leave/cancelLeaveRequest',
  async (
    payload: { id: string; cancellationReason?: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.patch(`/leaves/requests/${payload.id}/cancel`, {
        cancellationReason: payload.cancellationReason,
      });
      dispatch(fetchLeaveRequests());
      dispatch(fetchLeaveBalances());
      dispatch(fetchLeaveSummary());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to cancel leave request');
    }
  }
);

export const fetchHolidays = createAsyncThunk(
  'leave/fetchHolidays',
  async (year: number | void, { rejectWithValue }) => {
    try {
      const query = year ? `?year=${year}` : '';
      const res = await api.get(`/leaves/holidays${query}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch holidays');
    }
  }
);

export const createHoliday = createAsyncThunk(
  'leave/createHoliday',
  async (
    payload: {
      name: string;
      date: string;
      description?: string;
      isMandatory?: boolean;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.post('/leaves/holidays', payload);
      dispatch(fetchHolidays());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create holiday');
    }
  }
);

export const fetchLeaveSummary = createAsyncThunk(
  'leave/fetchLeaveSummary',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/leaves/summary');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Types
    builder.addCase(fetchLeaveTypes.fulfilled, (state, action) => {
      state.types = action.payload || [];
    });

    // Balances
    builder.addCase(fetchLeaveBalances.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchLeaveBalances.fulfilled, (state, action) => {
      state.loading = false;
      state.balances = action.payload || [];
    });
    builder.addCase(fetchLeaveBalances.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Apply
    builder.addCase(applyLeave.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(applyLeave.fulfilled, (state) => {
      state.actionLoading = false;
    });
    builder.addCase(applyLeave.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    });

    // Requests
    builder.addCase(fetchLeaveRequests.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchLeaveRequests.fulfilled, (state, action) => {
      state.loading = false;
      state.requests = action.payload.items || [];
      if (action.payload.pagination) {
        state.pagination = action.payload.pagination;
      }
    });
    builder.addCase(fetchLeaveRequests.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Holidays
    builder.addCase(fetchHolidays.fulfilled, (state, action) => {
      state.holidays = action.payload || [];
    });

    // Summary
    builder.addCase(fetchLeaveSummary.fulfilled, (state, action) => {
      state.summary = action.payload;
    });
  },
});

export const { clearError } = leaveSlice.actions;
export default leaveSlice.reducer;
