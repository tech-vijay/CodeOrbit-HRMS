import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchTodayStatus,
  fetchAttendanceSummary,
  fetchAttendanceRecords,
  fetchRegularizations,
  fetchShifts,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  submitRegularization,
  reviewRegularization,
  createShift,
} from '../../store/slices/attendanceSlice';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Calendar,
  Download,
  Plus,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  User,
  Hourglass,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasPermission } from '../../utils/permissions';

export const AttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    todayStatus,
    summary,
    records,
    pagination,
    regularizations,
    shifts,
    actionLoading,
  } = useSelector((state: RootState) => state.attendance);
  const { activeOrganization } = useSelector((state: RootState) => state.auth);
  const canReviewAttendance = hasPermission(activeOrganization?.role.permissions, 'attendance:approve');
  const canManageShifts = hasPermission(activeOrganization?.role.permissions, 'attendance:update');
  const canViewWorkforce = hasPermission(activeOrganization?.role.permissions, 'employee:read') || canManageShifts;

  // Active view tab: 'workforce' | 'my-log' | 'regularization' | 'shifts'
  const [activeTab, setActiveTab] = useState<'workforce' | 'my-log' | 'regularization' | 'shifts'>(
    canViewWorkforce ? 'workforce' : 'my-log'
  );

  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter state for records
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isBreakDropdownOpen, setIsBreakDropdownOpen] = useState(false);
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any>(null);

  // Form states
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    requestedCheckIn: '09:00',
    requestedCheckOut: '18:00',
    reason: '',
  });

  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    managerRemarks: '',
  });

  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    isDefault: false,
  });

  const [punchRemarks, setPunchRemarks] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    dispatch(fetchTodayStatus(undefined));
    dispatch(fetchAttendanceSummary(selectedDate));
    dispatch(fetchAttendanceRecords({ page: currentPage, startDate: selectedDate, endDate: selectedDate, status: statusFilter || undefined }));
    dispatch(fetchRegularizations({ page: 1 }));
    dispatch(fetchShifts());
  }, [dispatch, selectedDate, statusFilter, currentPage]);

  const handleClockIn = async () => {
    try {
      await dispatch(clockIn({ remarks: punchRemarks || undefined })).unwrap();
      await Promise.all([
        dispatch(fetchTodayStatus(undefined)).unwrap(),
        dispatch(fetchAttendanceSummary()).unwrap(),
        dispatch(fetchAttendanceRecords({ page: currentPage, startDate: selectedDate, endDate: selectedDate })).unwrap(),
      ]);
      setPunchRemarks('');
      setFeedback({ type: 'success', message: 'You are checked in.' });
    } catch (error) {
      setFeedback({ type: 'error', message: String(error) });
    }
  };

  const handleClockOut = async () => {
    try {
      await dispatch(clockOut({ remarks: punchRemarks || undefined })).unwrap();
      await Promise.all([
        dispatch(fetchTodayStatus(undefined)).unwrap(),
        dispatch(fetchAttendanceSummary()).unwrap(),
        dispatch(fetchAttendanceRecords({ page: currentPage, startDate: selectedDate, endDate: selectedDate })).unwrap(),
      ]);
      setPunchRemarks('');
      setFeedback({ type: 'success', message: 'You are checked out.' });
    } catch (error) {
      setFeedback({ type: 'error', message: String(error) });
    }
  };

  const handleStartBreak = async (breakType: 'LUNCH' | 'TEA' | 'PERSONAL' | 'MEETING') => {
    setIsBreakDropdownOpen(false);
    try {
      await dispatch(startBreak({ breakType })).unwrap();
      await Promise.all([
        dispatch(fetchTodayStatus(undefined)).unwrap(),
        dispatch(fetchAttendanceSummary()).unwrap(),
        dispatch(fetchAttendanceRecords({ page: currentPage, startDate: selectedDate, endDate: selectedDate })).unwrap(),
      ]);
      setFeedback({ type: 'success', message: 'Break started.' });
    } catch (error) {
      setFeedback({ type: 'error', message: String(error) });
    }
  };

  const handleEndBreak = async () => {
    try {
      await dispatch(endBreak({})).unwrap();
      await Promise.all([
        dispatch(fetchTodayStatus(undefined)).unwrap(),
        dispatch(fetchAttendanceSummary()).unwrap(),
        dispatch(fetchAttendanceRecords({ page: currentPage, startDate: selectedDate, endDate: selectedDate })).unwrap(),
      ]);
      setFeedback({ type: 'success', message: 'Break ended.' });
    } catch (error) {
      setFeedback({ type: 'error', message: String(error) });
    }
  };

  const handleExportCSV = () => {
    const columns = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Check In',
      'Check Out',
      'Productive Time',
      'Overtime',
      'Breaks',
      'Status',
    ];
    const escapeCsv = (value: string | number) => {
      let safeValue = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(safeValue)) safeValue = `'${safeValue}`;
      return `"${safeValue.replace(/"/g, '""')}"`;
    };
    const rows = filteredRecords.map((record) => {
      const breakSummary = (record.breaks || [])
        .map((item) => `${item.breakType}: ${item.durationMinutes ?? 0}m`)
        .join('; ');
      return [
        record.employee.employeeCode,
        `${record.employee.firstName} ${record.employee.lastName}`,
        record.employee.department?.name || '',
        record.date.slice(0, 10),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        formatHours(record.productiveMinutes || 0),
        formatHours(record.overtimeMinutes || 0),
        breakSummary,
        record.status,
      ].map(escapeCsv).join(',');
    });
    const blob = new Blob([[columns.map(escapeCsv).join(','), ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `attendance-report-${selectedDate || new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleSubmitRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.reason) return;
    const result = await dispatch(
      submitRegularization({
        date: regForm.date,
        requestedCheckIn: regForm.requestedCheckIn ? `${regForm.date}T${regForm.requestedCheckIn}:00.000Z` : undefined,
        requestedCheckOut: regForm.requestedCheckOut ? `${regForm.date}T${regForm.requestedCheckOut}:00.000Z` : undefined,
        reason: regForm.reason,
      })
    );
    if (submitRegularization.fulfilled.match(result)) {
      await dispatch(fetchRegularizations({ page: 1 }));
      setIsRegularizeModalOpen(false);
      setRegForm({
        date: new Date().toISOString().slice(0, 10),
        requestedCheckIn: '09:00',
        requestedCheckOut: '18:00',
        reason: '',
      });
      setFeedback({ type: 'success', message: 'Regularization request submitted. Its status is Pending.' });
    } else {
      setFeedback({ type: 'error', message: result.payload as string });
    }
  };

  const handleReviewRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    await dispatch(
      reviewRegularization({
        id: selectedReg.id,
        status: reviewForm.status,
        managerRemarks: reviewForm.managerRemarks,
      })
    );
    setIsReviewModalOpen(false);
    setSelectedReg(null);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name) return;
    await dispatch(createShift(shiftForm));
    setIsShiftModalOpen(false);
    setShiftForm({
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      isDefault: false,
    });
  };

  // Helper formatters
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
    const code = r.employee.employeeCode.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-12 font-sans bg-[#F8FAFC]">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#E52328] animate-pulse" />
            <h1 className="text-3xl font-bold font-outfit text-slate-900 tracking-tight">
              Attendance & Time Tracking
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Real-time biometric & web punches, automated overtime computation, break logs, and regularization workflows.
          </p>
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-lg border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export CSV
          </button>

          <button
            onClick={() => setIsRegularizeModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#E52328] hover:bg-[#AB1428] text-white transition shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Request Regularization
          </button>
        </div>
      </div>

      {/* 2. Hero Interactive Live Punch Widget */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Digital Clock & Live Status Badge */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                Live Employee Punch Terminal
              </span>
              {todayStatus?.isOnBreak ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Coffee className="w-3.5 h-3.5" />
                  On {todayStatus.activeBreak?.breakType || 'Break'}
                </span>
              ) : todayStatus?.isCheckedOut ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  Shift Concluded
                </span>
              ) : todayStatus?.isCheckedIn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Currently On Shift
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Not Checked In Today
                </span>
              )}
            </div>

            {/* Time readout */}
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-extrabold text-slate-900 font-outfit tracking-tight tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
            <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E52328]" />
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            {/* Shift hours target reminder */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Standard Shift: 09:00 - 18:00 (8h Work + 1h Break)</span>
              {todayStatus?.isLate && (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Marked Late (after grace)
                </span>
              )}
            </div>
          </div>

          {/* Real-time Time Trackers & Punch Controls */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Check In</span>
                <span className="text-lg font-bold text-slate-900 font-outfit mt-0.5 block">
                  {formatTime(todayStatus?.checkIn)}
                </span>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Check Out</span>
                <span className="text-lg font-bold text-slate-900 font-outfit mt-0.5 block">
                  {formatTime(todayStatus?.checkOut)}
                </span>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Productive</span>
                <span className="text-lg font-bold text-emerald-600 font-outfit mt-0.5 block">
                  {formatHours(todayStatus?.productiveMinutes || 0)}
                </span>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Overtime</span>
                <span className="text-lg font-bold text-[#E52328] font-outfit mt-0.5 block">
                  {formatHours(todayStatus?.overtimeMinutes || 0)}
                </span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3">
              {!todayStatus?.isCheckedIn ? (
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading}
                  className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-[#E52328] hover:bg-[#AB1428] shadow-md shadow-red-500/20 active:scale-[0.98] transition disabled:opacity-50"
                >
                  <Clock className="w-5 h-5" />
                  Clock In Now
                </button>
              ) : !todayStatus?.isCheckedOut ? (
                <>
                  <button
                    onClick={handleClockOut}
                    disabled={actionLoading}
                    className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-slate-900 hover:bg-black shadow-md shadow-slate-900/20 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Clock Out
                  </button>

                  {todayStatus.isOnBreak ? (
                    <button
                      onClick={handleEndBreak}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition active:scale-[0.98]"
                    >
                      <Coffee className="w-5 h-5" />
                      End Break
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setIsBreakDropdownOpen(!isBreakDropdownOpen)}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                      >
                        <Coffee className="w-4 h-4 text-amber-600" />
                        Start Break
                      </button>

                      <AnimatePresence>
                        {isBreakDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5"
                          >
                            <button
                              onClick={() => handleStartBreak('LUNCH')}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <span>🍱</span> Lunch Break
                            </button>
                            <button
                              onClick={() => handleStartBreak('TEA')}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <span>☕</span> Tea Break
                            </button>
                            <button
                              onClick={() => handleStartBreak('MEETING')}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <span>👥</span> Client Meeting
                            </button>
                            <button
                              onClick={() => handleStartBreak('PERSONAL')}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <span>🏃</span> Personal Break
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Punched out for today. For timing corrections, submit a regularization request below.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Daily Organization KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span>{canViewWorkforce ? 'Present Workforce' : 'My Attendance Today'}</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-outfit">
              {summary?.presentCount ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {canViewWorkforce ? `/ ${summary?.totalStaff ?? 0} Staff` : 'Today'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${summary?.attendancePercentage ?? 0}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 mt-2 block">
            {canViewWorkforce
              ? `${summary?.attendancePercentage ?? 0}% Attendance rate today`
              : todayStatus?.isCheckedIn ? 'Attendance recorded today' : 'No check-in recorded today'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span>{canViewWorkforce ? 'Late Arrivals' : 'My Late Status'}</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-amber-600 font-outfit">
              {summary?.lateCount ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {canViewWorkforce ? 'Past grace period' : todayStatus?.isLate ? 'Past grace period' : 'On time'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-4">
            {canViewWorkforce ? 'Threshold: After 09:15 AM' : 'Your check-in status'}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span>{canViewWorkforce ? 'Currently On Break' : 'My Break Status'}</span>
            <span className="p-2 rounded-lg bg-red-50 text-[#E52328]">
              <Coffee className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-outfit">
              {summary?.onBreakCount ?? 0}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {canViewWorkforce ? 'Employees resting' : todayStatus?.isOnBreak ? 'On break' : 'Not on break'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-4">
            {canViewWorkforce ? 'Lunch & tea sessions active' : todayStatus?.activeBreak?.breakType || 'No active break'}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span>{canViewWorkforce ? 'Avg Productive Time' : 'My Productive Time'}</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-outfit">
              {summary?.averageProductiveHours ?? '0.0'}h
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {canViewWorkforce ? 'Per employee' : 'Today'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-4">
            Total OT: {summary?.totalOvertimeHours ?? '0.0'} hrs today
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {canViewWorkforce && (
            <button
              onClick={() => setActiveTab('workforce')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'workforce'
                  ? 'border-[#E52328] text-[#E52328]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <User className="w-4 h-4" />
              Live Workforce Directory
            </button>
          )}

          <button
            onClick={() => setActiveTab('my-log')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'my-log'
                ? 'border-[#E52328] text-[#E52328]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Attendance Calendar
          </button>

          <button
            onClick={() => setActiveTab('regularization')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition relative ${
              activeTab === 'regularization'
                ? 'border-[#E52328] text-[#E52328]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Hourglass className="w-4 h-4" />
            Regularization Requests
            {regularizations.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-[#E52328] font-bold">
                {regularizations.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>

          {canManageShifts && (
            <button
              onClick={() => setActiveTab('shifts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                activeTab === 'shifts'
                  ? 'border-[#E52328] text-[#E52328]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Shift Policies
            </button>
          )}
        </nav>
      </div>

      {/* 5. Tab Content Panes */}

      {/* TAB 1: WORKFORCE ATTENDANCE DIRECTORY */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:w-auto relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search staff by name or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
              >
                <option value="">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Check In</th>
                    <th className="py-3.5 px-4">Check Out</th>
                    <th className="py-3.5 px-4">Productive Time</th>
                    <th className="py-3.5 px-4">Overtime</th>
                    <th className="py-3.5 px-4">Breaks</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No attendance records found for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const activeBreak = r.breaks.find((b) => !b.endTime);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 text-[#E52328] font-bold flex items-center justify-center text-xs">
                                {r.employee.firstName[0]}
                                {r.employee.lastName[0]}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {r.employee.firstName} {r.employee.lastName}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  {r.employee.employeeCode}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {r.employee.department?.name || 'General'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">
                            {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">
                            {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {formatHours(r.productiveMinutes)}
                          </td>

                          <td className="py-3.5 px-4 text-[#E52328] font-semibold">
                            {r.overtimeMinutes > 0 ? formatHours(r.overtimeMinutes) : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-xs">
                            {activeBreak ? (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <Coffee className="w-3.5 h-3.5" /> On {activeBreak.breakType}
                              </span>
                            ) : (
                              <span className="text-slate-500">{r.breaks.length} break(s)</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {r.status === 'PRESENT' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Present
                              </span>
                            )}
                            {r.status === 'LATE' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Late
                              </span>
                            )}
                            {r.status === 'HALF_DAY' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Half Day
                              </span>
                            )}
                            {r.status === 'ABSENT' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                Absent
                              </span>
                            )}
                            {r.isRegularized && (
                              <span className="ml-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                (Reg)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-2.5 py-1.5 rounded border border-slate-200 text-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-2.5 py-1.5 rounded border border-slate-200 text-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY ATTENDANCE CALENDAR */}
      {activeTab === 'my-log' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-outfit text-slate-900">
                Monthly Work & Overtime Calendar
              </h2>
              <p className="text-xs text-slate-500">
                Daily breakdown of punches, total work minutes, and attendance regularity.
              </p>
            </div>
            <button
              onClick={() => setIsRegularizeModalOpen(true)}
              className="text-xs font-semibold text-[#E52328] hover:underline flex items-center gap-1"
            >
              Missing punch? Submit regularization <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((rec) => (
              <div key={rec.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    rec.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' :
                    rec.status === 'LATE' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rec.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>In / Out:</span>
                    <span className="font-mono text-slate-700">
                      {formatTime(rec.checkIn)} - {formatTime(rec.checkOut)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Productive Hours:</span>
                    <span className="font-semibold text-slate-800">{formatHours(rec.productiveMinutes)}</span>
                  </div>
                  {rec.overtimeMinutes > 0 && (
                    <div className="flex justify-between text-[#E52328]">
                      <span>Overtime Hours:</span>
                      <span className="font-semibold">+{formatHours(rec.overtimeMinutes)}</span>
                    </div>
                  )}
                  {rec.isRegularized && (
                    <div className="text-[11px] text-indigo-600 font-semibold pt-1">
                      ✓ Regularized by manager
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE REGULARIZATION */}
      {activeTab === 'regularization' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-outfit">
                Attendance Regularization Requests
              </h2>
              <p className="text-xs text-slate-500">
                Staff can request attendance corrections for biometric machine offline, client meetings, or forgotten checkout.
              </p>
            </div>
            <button
              onClick={() => setIsRegularizeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E52328] hover:bg-[#AB1428] text-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Request
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Requested Times</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {regularizations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No regularization requests found.
                      </td>
                    </tr>
                  ) : (
                    regularizations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {reg.employee.firstName} {reg.employee.lastName}
                          <span className="block text-xs text-slate-400 font-mono">
                            {reg.employee.employeeCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {new Date(reg.date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">
                          {reg.requestedCheckIn ? formatTime(reg.requestedCheckIn) : '09:00'} -{' '}
                          {reg.requestedCheckOut ? formatTime(reg.requestedCheckOut) : '18:00'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={reg.reason}>
                          {reg.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          {canReviewAttendance && reg.status === 'PENDING' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Review
                            </span>
                          )}
                          {reg.status === 'APPROVED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved
                            </span>
                          )}
                          {reg.status === 'REJECTED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {reg.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedReg(reg);
                                setIsReviewModalOpen(true);
                              }}
                              className="px-3 py-1 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-black transition"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHIFTS & POLICIES */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-outfit">
                Shift Timing & Punctuality Policy
              </h2>
              <p className="text-xs text-slate-500">
                Configure corporate shifts, arrival grace periods, and overtime eligibility criteria.
              </p>
            </div>
            {canManageShifts && (
              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E52328] hover:bg-[#AB1428] text-white transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Shift
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 font-outfit">{shift.name}</h3>
                  {shift.isDefault && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#E52328] border border-red-200">
                      Default Shift
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Working Hours:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {shift.startTime} - {shift.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Arrival Grace:</span>
                    <span className="font-bold text-amber-600">{shift.graceMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Target Productive:</span>
                    <span className="font-bold text-emerald-600">8 hours (480 mins)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Half-Day Threshold:</span>
                    <span className="font-bold text-slate-700">&lt; 4 hours work</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT REGULARIZATION */}
      <AnimatePresence>
        {isRegularizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Attendance Regularization Request
                </h3>
                <button
                  onClick={() => setIsRegularizeModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitRegularization} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={regForm.date}
                    onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Correct Check-In
                    </label>
                    <input
                      type="time"
                      value={regForm.requestedCheckIn}
                      onChange={(e) => setRegForm({ ...regForm, requestedCheckIn: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Correct Check-Out
                    </label>
                    <input
                      type="time"
                      value={regForm.requestedCheckOut}
                      onChange={(e) => setRegForm({ ...regForm, requestedCheckOut: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Adjustment *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g., Biometric device offline, client on-site visit, power outage..."
                    value={regForm.reason}
                    onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegularizeModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#E52328] hover:bg-[#AB1428] text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REVIEW REGULARIZATION (MANAGER / ADMIN) */}
      <AnimatePresence>
        {isReviewModalOpen && selectedReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Review Regularization Request
                </h3>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800">Staff:</span> {selectedReg.employee.firstName}{' '}
                  {selectedReg.employee.lastName} ({selectedReg.employee.employeeCode})
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Date:</span> {new Date(selectedReg.date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Reason:</span> {selectedReg.reason}
                </div>
              </div>

              <form onSubmit={handleReviewRegularization} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approval Decision *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, status: 'APPROVED' })}
                      className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                        reviewForm.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, status: 'REJECTED' })}
                      className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                        reviewForm.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border-red-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manager Remarks / Feedback
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Verified with team lead / security register..."
                    value={reviewForm.managerRemarks}
                    onChange={(e) => setReviewForm({ ...reviewForm, managerRemarks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Submit Decision
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD SHIFT POLICY */}
      <AnimatePresence>
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Create Shift Policy
                </h3>
                <button
                  onClick={() => setIsShiftModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateShift} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Morning Shift, Night Shift, Tech Support"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Time (HH:mm) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="09:00"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Time (HH:mm) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="18:00"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={shiftForm.graceMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, graceMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultShift"
                    checked={shiftForm.isDefault}
                    onChange={(e) => setShiftForm({ ...shiftForm, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[#E52328] rounded border-slate-300 focus:ring-[#E52328]"
                  />
                  <label htmlFor="isDefaultShift" className="text-xs text-slate-700 font-medium">
                    Set as default organization shift
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#E52328] hover:bg-[#AB1428] text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Create Shift
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
