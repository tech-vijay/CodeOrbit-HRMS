import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export type ExpenseCategory =
  | 'TRAVEL'
  | 'MEALS'
  | 'EQUIPMENT'
  | 'INTERNET'
  | 'TRAINING'
  | 'CLIENT_ENTERTAINMENT'
  | 'OTHER';

export type ExpenseStatus =
  | 'PENDING'
  | 'APPROVED_BY_MANAGER'
  | 'APPROVED_BY_FINANCE'
  | 'REIMBURSED'
  | 'REJECTED';

export interface ExpenseClaim {
  id: string;
  organizationId: string;
  employeeId: string;
  approverId?: string | null;
  payrollItemId?: string | null;
  title: string;
  description?: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  receiptUrl?: string | null;
  receiptName?: string | null;
  status: ExpenseStatus;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  reimbursedAt?: string | null;
  createdAt: string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department?: { id: string; name: string } | null;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    workEmail: string;
  } | null;
}

export interface ExpenseSummary {
  totalClaimed: number;
  pendingApprovalAmount: number;
  pendingApprovalCount: number;
  approvedForPayoutAmount: number;
  approvedForPayoutCount: number;
  reimbursedAmount: number;
  reimbursedCount: number;
  totalClaims: number;
}

export interface SubmitExpensePayload {
  employeeId?: string;
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  expenseDate: string;
  receiptUrl?: string | null;
  receiptName?: string | null;
}

export interface ReviewExpensePayload {
  claimId: string;
  action: 'APPROVE_MANAGER' | 'APPROVE_FINANCE' | 'REJECT';
  rejectionReason?: string;
}

interface ExpenseState {
  claims: ExpenseClaim[];
  summary: ExpenseSummary | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  claims: [],
  summary: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
};

export const fetchExpenseSummary = createAsyncThunk(
  'expenses/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/expenses/summary');
      return response.data.data as ExpenseSummary;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expense summary');
    }
  }
);

export const fetchExpenseClaims = createAsyncThunk<
  ExpenseClaim[],
  { employeeId?: string; status?: string; category?: string } | void
>(
  'expenses/fetchClaims',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await api.get('/expenses', { params: filters || undefined });
      return response.data.data as ExpenseClaim[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch expense claims');
    }
  }
);

export const submitExpenseClaim = createAsyncThunk(
  'expenses/submitClaim',
  async (payload: SubmitExpensePayload, { rejectWithValue }) => {
    try {
      const response = await api.post('/expenses', payload);
      return response.data.data as ExpenseClaim;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit expense claim');
    }
  }
);

export const reviewExpenseClaim = createAsyncThunk(
  'expenses/reviewClaim',
  async (payload: ReviewExpensePayload, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/expenses/${payload.claimId}/review`, {
        action: payload.action,
        rejectionReason: payload.rejectionReason,
      });
      return response.data.data as ExpenseClaim;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to review expense claim');
    }
  }
);

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearExpenseError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summary
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })

      // Fetch Claims
      .addCase(fetchExpenseClaims.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenseClaims.fulfilled, (state, action) => {
        state.isLoading = false;
        state.claims = action.payload;
      })
      .addCase(fetchExpenseClaims.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Submit Claim
      .addCase(submitExpenseClaim.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
      })
      .addCase(submitExpenseClaim.fulfilled, (state, action) => {
        state.isActionLoading = false;
        state.claims.unshift(action.payload);
        if (state.summary) {
          state.summary.totalClaimed += Number(action.payload.amount);
          state.summary.totalClaims += 1;
          state.summary.pendingApprovalAmount += Number(action.payload.amount);
          state.summary.pendingApprovalCount += 1;
        }
      })
      .addCase(submitExpenseClaim.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
      })

      // Review Claim
      .addCase(reviewExpenseClaim.pending, (state) => {
        state.isActionLoading = true;
        state.error = null;
      })
      .addCase(reviewExpenseClaim.fulfilled, (state, action) => {
        state.isActionLoading = false;
        const index = state.claims.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.claims[index] = {
            ...state.claims[index],
            ...action.payload,
          };
        }
      })
      .addCase(reviewExpenseClaim.rejected, (state, action) => {
        state.isActionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearExpenseError } = expenseSlice.actions;
export default expenseSlice.reducer;
