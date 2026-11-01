import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orgReducer from './slices/orgSlice';
import employeeReducer from './slices/employeeSlice';
import attendanceReducer from './slices/attendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    org: orgReducer,
    employees: employeeReducer,
    attendance: attendanceReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
