import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { Department, Designation, Member, AuditLogItem } from '../../types';

interface OrgState {
  profile: any | null;
  departments: Department[];
  designations: Designation[];
  members: Member[];
  auditLogs: AuditLogItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: OrgState = {
  profile: null,
  departments: [],
  designations: [],
  members: [],
  auditLogs: [],
  isLoading: false,
  error: null,
};

export const fetchOrgProfile = createAsyncThunk(
  'org/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/organizations/profile');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load organization profile');
    }
  }
);

export const fetchDepartments = createAsyncThunk(
  'org/fetchDepartments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/organizations/departments');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load departments');
    }
  }
);

export const createDepartment = createAsyncThunk(
  'org/createDepartment',
  async (dept: { name: string; code: string; description?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/organizations/departments', dept);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create department');
    }
  }
);

export const fetchDesignations = createAsyncThunk(
  'org/fetchDesignations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/organizations/designations');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load designations');
    }
  }
);

export const createDesignation = createAsyncThunk(
  'org/createDesignation',
  async (desig: { title: string; code: string; description?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/organizations/designations', desig);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create designation');
    }
  }
);

export const fetchMembers = createAsyncThunk(
  'org/fetchMembers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/organizations/members');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load members');
    }
  }
);

export const inviteMember = createAsyncThunk(
  'org/inviteMember',
  async (
    payload: { email: string; firstName: string; lastName: string; roleId: string; phone?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post('/organizations/members/invite', payload);
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to invite member');
    }
  }
);

export const fetchAuditLogs = createAsyncThunk(
  'org/fetchAuditLogs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/organizations/audit-logs');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load audit logs');
    }
  }
);

export const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Profile
      .addCase(fetchOrgProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      // Departments
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.departments = action.payload;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.departments.unshift(action.payload);
      })
      // Designations
      .addCase(fetchDesignations.fulfilled, (state, action) => {
        state.designations = action.payload;
      })
      .addCase(createDesignation.fulfilled, (state, action) => {
        state.designations.unshift(action.payload);
      })
      // Members
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.members = action.payload;
      })
      .addCase(inviteMember.fulfilled, (state, action) => {
        state.members.unshift(action.payload);
      })
      // Audit Logs
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.auditLogs = action.payload;
      });
  },
});

export default orgSlice.reducer;
