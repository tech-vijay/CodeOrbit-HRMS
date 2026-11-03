import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface SalaryStructure {
  id: string;
  organizationId: string;
  employeeId: string;
  ctc: string | number;
  basicSalary: string | number;
  hra: string | number;
  specialAllowance: string | number;
  conveyance: string | number;
  medicalAllowance: string | number;
  pfEmployer: string | number;
  pfEmployee: string | number;
  professionalTax: string | number;
  tds: string | number;
  effectiveFrom: string;
  isActive: boolean;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    joiningDate?: string;
  };
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  monthDays: number;
  payableDays: string | number;
  lopDays: string | number;
  basicSalary: string | number;
  hra: string | number;
  specialAllowance: string | number;
  conveyance: string | number;
  medicalAllowance: string | number;
  grossSalary: string | number;
  pfDeduction: string | number;
  professionalTax: string | number;
  tdsDeduction: string | number;
  lopDeduction: string | number;
  totalDeductions: string | number;
  netSalary: string | number;
  isPaid: boolean;
  paymentMode?: string;
  paymentRef?: string;
  paidAt?: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department?: { name: string };
    designation?: { title: string };
  };
  payrollRun?: {
    id: string;
    month: number;
    year: number;
    status: string;
    disbursedAt?: string;
  };
}

export interface PayrollRun {
  id: string;
  organizationId: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  totalGross: string | number;
  totalDeductions: string | number;
  totalNet: string | number;
  employeeCount: number;
  approvedById?: string;
  approvedAt?: string;
  processedAt?: string;
  disbursedAt?: string;
  notes?: string;
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  payrollItems?: PayrollItem[];
}

export interface PayrollSummary {
  latestRun: PayrollRun | null;
  totalEmployeesWithSalary: number;
  ytdDisbursedNet: string | number;
  ytdGross: string | number;
  ytdDeductions: string | number;
  recentHistory: PayrollRun[];
}

interface PayrollState {
  runs: PayrollRun[];
  currentRun: PayrollRun | null;
  payslips: PayrollItem[];
  currentPayslip: PayrollItem | null;
  selectedStructure: SalaryStructure | null;
  previewStructure: any | null;
  summary: PayrollSummary | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const initialState: PayrollState = {
  runs: [],
  currentRun: null,
  payslips: [],
  currentPayslip: null,
  selectedStructure: null,
  previewStructure: null,
  summary: null,
  loading: false,
  actionLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

export const fetchPayrollSummary = createAsyncThunk(
  'payroll/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/payroll/summary');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll summary');
    }
  }
);

export const fetchPayrollRuns = createAsyncThunk(
  'payroll/fetchRuns',
  async (params: { year?: number; status?: string; page?: number; limit?: number } | void, { rejectWithValue }) => {
    try {
      const res = await api.get('/payroll/runs', { params: params || {} });
      return { runs: res.data.data, pagination: res.data.pagination };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll runs');
    }
  }
);

export const fetchPayrollRunById = createAsyncThunk(
  'payroll/fetchRunById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/payroll/runs/${id}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll run details');
    }
  }
);

export const processPayrollRun = createAsyncThunk(
  'payroll/processRun',
  async (payload: { month: number; year: number; notes?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/payroll/runs', payload);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to execute payroll computation');
    }
  }
);

export const updatePayrollStatus = createAsyncThunk(
  'payroll/updateStatus',
  async ({ id, status, notes }: { id: string; status: 'APPROVED' | 'CANCELLED'; notes?: string }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/payroll/runs/${id}/status`, { status, notes });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update payroll status');
    }
  }
);

export const disbursePayroll = createAsyncThunk(
  'payroll/disburse',
  async ({ id, paymentMode, paymentRef }: { id: string; paymentMode: string; paymentRef?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/payroll/runs/${id}/disburse`, { paymentMode, paymentRef });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to disburse payroll');
    }
  }
);

export const previewStatutoryStructure = createAsyncThunk(
  'payroll/previewStructure',
  async ({ ctc, employeeId }: { ctc: number; employeeId: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/payroll/preview-structure', { ctc, employeeId });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to preview salary breakdown');
    }
  }
);

export const saveSalaryStructure = createAsyncThunk(
  'payroll/saveStructure',
  async (payload: any, { rejectWithValue }) => {
    try {
      const res = await api.post('/payroll/salary-structures', payload);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to configure salary structure');
    }
  }
);

export const fetchSalaryStructure = createAsyncThunk(
  'payroll/fetchStructure',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/payroll/salary-structures/${employeeId}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch employee salary structure');
    }
  }
);

export const fetchPayslips = createAsyncThunk(
  'payroll/fetchPayslips',
  async (params: { employeeId?: string; month?: number; year?: number; page?: number; limit?: number } | void, { rejectWithValue }) => {
    try {
      const res = await api.get('/payroll/payslips', { params: params || {} });
      return { payslips: res.data.data, pagination: res.data.pagination };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payslips');
    }
  }
);

export const fetchPayslipById = createAsyncThunk(
  'payroll/fetchPayslipById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/payroll/payslips/${id}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch payslip details');
    }
  }
);

const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    clearCurrentRun: (state) => {
      state.currentRun = null;
    },
    clearCurrentPayslip: (state) => {
      state.currentPayslip = null;
    },
    clearPreview: (state) => {
      state.previewStructure = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summary
      .addCase(fetchPayrollSummary.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPayrollSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchPayrollSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Runs
      .addCase(fetchPayrollRuns.fulfilled, (state, action) => {
        state.runs = action.payload.runs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayrollRunById.fulfilled, (state, action) => {
        state.currentRun = action.payload;
      })
      .addCase(processPayrollRun.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(processPayrollRun.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.currentRun = action.payload;
        state.runs = [action.payload, ...state.runs.filter((r) => r.id !== action.payload.id)];
      })
      .addCase(processPayrollRun.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updatePayrollStatus.fulfilled, (state, action) => {
        if (state.currentRun && state.currentRun.id === action.payload.id) {
          state.currentRun.status = action.payload.status;
          state.currentRun.approvedBy = action.payload.approvedBy;
        }
        state.runs = state.runs.map((r) => (r.id === action.payload.id ? { ...r, ...action.payload } : r));
      })
      .addCase(disbursePayroll.fulfilled, (state, action) => {
        if (state.currentRun && state.currentRun.id === action.payload.id) {
          state.currentRun.status = 'PAID';
          state.currentRun.disbursedAt = action.payload.disbursedAt;
        }
        state.runs = state.runs.map((r) => (r.id === action.payload.id ? { ...r, ...action.payload } : r));
      })
      // Salary Structures
      .addCase(previewStatutoryStructure.fulfilled, (state, action) => {
        state.previewStructure = action.payload;
      })
      .addCase(saveSalaryStructure.fulfilled, (state, action) => {
        state.selectedStructure = action.payload;
      })
      .addCase(fetchSalaryStructure.fulfilled, (state, action) => {
        state.selectedStructure = action.payload;
      })
      // Payslips
      .addCase(fetchPayslips.fulfilled, (state, action) => {
        state.payslips = action.payload.payslips;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayslipById.fulfilled, (state, action) => {
        state.currentPayslip = action.payload;
      });
  },
});

export const { clearCurrentRun, clearCurrentPayslip, clearPreview } = payrollSlice.actions;
export default payrollSlice.reducer;
