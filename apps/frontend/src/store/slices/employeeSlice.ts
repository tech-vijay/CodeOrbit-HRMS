import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone?: string;
  joiningDate: string;
  status: string;
  employmentType: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; title: string; code: string } | null;
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string } | null;
  _count?: {
    employeeDocuments: number;
    onboardingTasks: number;
    attendances: number;
  };
}

export interface EmployeeDetail extends EmployeeListItem {
  personalEmail?: string;
  dateOfBirth?: string;
  gender?: string;
  employeeDocuments: Array<{
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    expiryDate?: string;
    isVerified: boolean;
    createdAt: string;
  }>;
  onboardingTasks: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    dueDate?: string;
    completedAt?: string;
  }>;
  lifecycleEvents: Array<{
    id: string;
    eventType: string;
    description: string;
    effectiveDate: string;
    createdAt: string;
  }>;
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
  }>;
}

interface EmployeeState {
  items: EmployeeListItem[];
  currentEmployee: EmployeeDetail | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployeeState = {
  items: [],
  currentEmployee: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  isLoading: false,
  error: null,
};

export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (params: { search?: string; departmentId?: string; status?: string; page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/employees', { params });
      return {
        items: response.data.data,
        meta: response.data.meta,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch employee details');
    }
  }
);

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/employees', data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create employee');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/employees/${id}`, data);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update employee');
    }
  }
);

export const addEmployeeDocument = createAsyncThunk(
  'employees/addDocument',
  async ({ employeeId, doc }: { employeeId: string; doc: any }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/employees/${employeeId}/documents`, doc);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to attach document');
    }
  }
);

export const updateOnboardingTask = createAsyncThunk(
  'employees/updateOnboardingTask',
  async ({ employeeId, taskId, status }: { employeeId: string; taskId: string; status: string }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/employees/${employeeId}/onboarding-tasks/${taskId}`, { status });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update task');
    }
  }
);

export const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.meta.total;
        state.page = action.payload.meta.page;
        state.limit = action.payload.meta.limit;
        state.totalPages = action.payload.meta.totalPages;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Single Detail
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.currentEmployee = action.payload;
      })
      // Create Employee
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      // Update Employee
      .addCase(updateEmployee.fulfilled, (state, action) => {
        if (state.currentEmployee?.id === action.payload.id) {
          state.currentEmployee = { ...state.currentEmployee, ...action.payload };
        }
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      // Add Document
      .addCase(addEmployeeDocument.fulfilled, (state, action) => {
        if (state.currentEmployee) {
          state.currentEmployee.employeeDocuments.unshift(action.payload);
        }
      })
      // Update Onboarding Task
      .addCase(updateOnboardingTask.fulfilled, (state, action) => {
        if (state.currentEmployee) {
          const idx = state.currentEmployee.onboardingTasks.findIndex((t) => t.id === action.payload.id);
          if (idx !== -1) {
            state.currentEmployee.onboardingTasks[idx] = action.payload;
          }
        }
      });
  },
});

export const { clearCurrentEmployee } = employeeSlice.actions;
export default employeeSlice.reducer;
