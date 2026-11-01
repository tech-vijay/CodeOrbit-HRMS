import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { User, ActiveOrganization, UserMembershipSummary } from '../../types';

interface AuthState {
  user: User | null;
  activeOrganization: ActiveOrganization | null;
  memberships: UserMembershipSummary[];
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  activeOrganization: null,
  memberships: [],
  accessToken: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,
};

// Check current session & load user profile
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to authenticate user');
    }
  }
);

// Switch Active Organization
export const switchOrganization = createAsyncThunk(
  'auth/switchOrganization',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/switch-organization', { organizationId });
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to switch organization');
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('active_tenant_id');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession: (
      state,
      action: PayloadAction<{
        user: User;
        activeOrganization: ActiveOrganization | null;
        organizations?: UserMembershipSummary[];
        accessToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.activeOrganization = action.payload.activeOrganization;
      if (action.payload.organizations) {
        state.memberships = action.payload.organizations;
      }
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;

      localStorage.setItem('access_token', action.payload.accessToken);
      if (action.payload.activeOrganization) {
        localStorage.setItem('active_tenant_id', action.payload.activeOrganization.id);
      }
    },
    clearAuth: (state) => {
      state.user = null;
      state.activeOrganization = null;
      state.memberships = [];
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('active_tenant_id');
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.activeOrganization = action.payload.activeOrganization;
        state.memberships = action.payload.memberships || [];
        state.isAuthenticated = true;
        if (action.payload.activeOrganization) {
          localStorage.setItem('active_tenant_id', action.payload.activeOrganization.id);
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.activeOrganization = null;
        state.error = action.payload as string;
      })
      // Switch Organization
      .addCase(switchOrganization.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.activeOrganization = action.payload.activeOrganization;
        localStorage.setItem('access_token', action.payload.accessToken);
        localStorage.setItem('active_tenant_id', action.payload.activeOrganization.id);
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.activeOrganization = null;
        state.memberships = [];
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setAuthSession, clearAuth } = authSlice.actions;
export default authSlice.reducer;
