import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface AttendanceBreak {
  id: string;
  attendanceId: string;
  breakType: 'LUNCH' | 'TEA' | 'PERSONAL' | 'MEETING';
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  remarks?: string | null;
}

export interface TodayStatus {
  id?: string;
  date: string;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    departmentId?: string | null;
  };
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isOnBreak: boolean;
  activeBreak?: AttendanceBreak | null;
  checkIn?: string | null;
  checkOut?: string | null;
  productiveMinutes: number;
  overtimeMinutes: number;
  status: string;
  isLate: boolean;
  breaks: AttendanceBreak[];
}

export interface AttendanceSummary {
  date: string;
  totalEmployees: number;
  totalStaff: number;
  present: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onBreakCount: number;
  totalOvertimeHours: string;
  averageProductiveHours: string;
  attendanceRate: number;
  attendancePercentage: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  isLate: boolean;
  isRegularized: boolean;
  totalMinutes?: number | null;
  productiveMinutes: number;
  overtimeMinutes: number;
  ipAddress?: string | null;
  location?: string | null;
  remarks?: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail?: string;
    department?: { id: string; name: string } | null;
    designation?: { id: string; title: string } | null;
  };
  breaks: AttendanceBreak[];
  shift?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface AttendanceRegularization {
  id: string;
  organizationId: string;
  employeeId: string;
  attendanceId?: string | null;
  date: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById?: string | null;
  managerRemarks?: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: { name: string } | null;
  };
  attendance?: AttendanceRecord | null;
}

export interface ShiftPolicy {
  id: string;
  organizationId: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  isDefault: boolean;
  createdAt: string;
}

interface AttendanceState {
  todayStatus: TodayStatus | null;
  summary: AttendanceSummary | null;
  records: AttendanceRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  regularizations: AttendanceRegularization[];
  regularizationMeta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  shifts: ShiftPolicy[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  todayStatus: null,
  summary: null,
  records: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  regularizations: [],
  regularizationMeta: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  shifts: [],
  loading: false,
  actionLoading: false,
  error: null,
};

// Async Thunks
export const fetchTodayStatus = createAsyncThunk(
  'attendance/fetchTodayStatus',
  async (employeeId: string | undefined, { rejectWithValue }) => {
    try {
      const url = employeeId ? `/attendance/today?employeeId=${employeeId}` : '/attendance/today';
      const res = await api.get(url);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch today status');
    }
  }
);

export const clockIn = createAsyncThunk(
  'attendance/clockIn',
  async (payload: { employeeId?: string; location?: string; remarks?: string } = {}, { rejectWithValue, dispatch }) => {
    try {
      const res = await api.post('/attendance/clock-in', payload);
      dispatch(fetchTodayStatus(payload.employeeId));
      dispatch(fetchAttendanceSummary());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Clock-in failed');
    }
  }
);

export const clockOut = createAsyncThunk(
  'attendance/clockOut',
  async (payload: { employeeId?: string; remarks?: string } = {}, { rejectWithValue, dispatch }) => {
    try {
      const res = await api.post('/attendance/clock-out', payload);
      dispatch(fetchTodayStatus(payload.employeeId));
      dispatch(fetchAttendanceSummary());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Clock-out failed');
    }
  }
);

export const startBreak = createAsyncThunk(
  'attendance/startBreak',
  async (payload: { breakType: 'LUNCH' | 'TEA' | 'PERSONAL' | 'MEETING'; remarks?: string; employeeId?: string }, { rejectWithValue, dispatch }) => {
    try {
      const res = await api.post('/attendance/breaks/start', payload);
      dispatch(fetchTodayStatus(payload.employeeId));
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to start break');
    }
  }
);

export const endBreak = createAsyncThunk(
  'attendance/endBreak',
  async (payload: { employeeId?: string; remarks?: string } = {}, { rejectWithValue, dispatch }) => {
    try {
      const res = await api.post('/attendance/breaks/end', payload);
      dispatch(fetchTodayStatus(payload.employeeId));
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to end break');
    }
  }
);

export const fetchAttendanceSummary = createAsyncThunk(
  'attendance/fetchAttendanceSummary',
  async (targetDate: string | void, { rejectWithValue }) => {
    try {
      const url = targetDate ? `/attendance/summary?date=${targetDate}` : '/attendance/summary';
      const res = await api.get(url);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch summary');
    }
  }
);

export const fetchAttendanceRecords = createAsyncThunk(
  'attendance/fetchAttendanceRecords',
  async (
    params: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      departmentId?: string;
      status?: string;
      page?: number;
      limit?: number;
    } | void = {},
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams();
      if (params?.startDate) query.append('startDate', params.startDate);
      if (params?.endDate) query.append('endDate', params.endDate);
      if (params?.employeeId) query.append('employeeId', params.employeeId);
      if (params?.departmentId) query.append('departmentId', params.departmentId);
      if (params?.status) query.append('status', params.status);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await api.get(`/attendance?${query.toString()}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance records');
    }
  }
);

export const fetchRegularizations = createAsyncThunk(
  'attendance/fetchRegularizations',
  async (
    params: { status?: string; employeeId?: string; page?: number; limit?: number } | void = {},
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.employeeId) query.append('employeeId', params.employeeId);
      if (params?.page) query.append('page', String(params.page));
      if (params?.limit) query.append('limit', String(params.limit));

      const res = await api.get(`/attendance/regularizations?${query.toString()}`);
      return {
        items: res.data.data,
        meta: res.data.meta,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch regularizations');
    }
  }
);

export const submitRegularization = createAsyncThunk(
  'attendance/submitRegularization',
  async (
    payload: {
      employeeId?: string;
      attendanceId?: string;
      date: string;
      requestedCheckIn?: string;
      requestedCheckOut?: string;
      reason: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.post('/attendance/regularize', payload);
      dispatch(fetchRegularizations());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit regularization');
    }
  }
);

export const reviewRegularization = createAsyncThunk(
  'attendance/reviewRegularization',
  async (
    payload: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      managerRemarks?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.patch(`/attendance/regularizations/${payload.id}/review`, {
        status: payload.status,
        managerRemarks: payload.managerRemarks,
      });
      dispatch(fetchRegularizations());
      dispatch(fetchAttendanceRecords({ page: 1 }));
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to review regularization');
    }
  }
);

export const fetchShifts = createAsyncThunk(
  'attendance/fetchShifts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/attendance/shifts');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch shifts');
    }
  }
);

export const createShift = createAsyncThunk(
  'attendance/createShift',
  async (
    payload: {
      name: string;
      startTime: string;
      endTime: string;
      graceMinutes?: number;
      isDefault?: boolean;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await api.post('/attendance/shifts', payload);
      dispatch(fetchShifts());
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create shift');
    }
  }
);

export const exportAttendanceCSV = createAsyncThunk(
  'attendance/exportCSV',
  async (params: { startDate?: string; endDate?: string; departmentId?: string } = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.departmentId) query.append('departmentId', params.departmentId);

      const res = await api.get(`/attendance/export?${query.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to export CSV');
    }
  }
);

export const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Today status
    builder.addCase(fetchTodayStatus.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchTodayStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.todayStatus = action.payload;
    });
    builder.addCase(fetchTodayStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Summary
    builder.addCase(fetchAttendanceSummary.fulfilled, (state, action) => {
      state.summary = action.payload;
    });

    // Clock in / out / breaks action loading
    builder.addCase(clockIn.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(clockIn.fulfilled, (state) => {
      state.actionLoading = false;
    });
    builder.addCase(clockIn.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(clockOut.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(clockOut.fulfilled, (state) => {
      state.actionLoading = false;
    });
    builder.addCase(clockOut.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(startBreak.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(startBreak.fulfilled, (state) => {
      state.actionLoading = false;
    });
    builder.addCase(startBreak.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(endBreak.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(endBreak.fulfilled, (state) => {
      state.actionLoading = false;
    });
    builder.addCase(endBreak.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    });

    // Attendance Records
    builder.addCase(fetchAttendanceRecords.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchAttendanceRecords.fulfilled, (state, action) => {
      state.loading = false;
      state.records = action.payload.attendances || [];
      state.pagination = action.payload.pagination || state.pagination;
    });
    builder.addCase(fetchAttendanceRecords.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Regularizations
    builder.addCase(fetchRegularizations.fulfilled, (state, action) => {
      state.regularizations = action.payload.items || [];
      if (action.payload.meta) {
        state.regularizationMeta = action.payload.meta;
      }
    });

    // Shifts
    builder.addCase(fetchShifts.fulfilled, (state, action) => {
      state.shifts = action.payload || [];
    });
  },
});

export const { clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
