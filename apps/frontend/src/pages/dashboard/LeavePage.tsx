import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchLeaveTypes,
  fetchLeaveBalances,
  fetchLeaveRequests,
  fetchHolidays,
  fetchLeaveSummary,
  applyLeave,
  reviewLeaveRequest,
  cancelLeaveRequest,
  createHoliday,
  LeaveRequestItem,
} from '../../store/slices/leaveSlice';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Hourglass,
  CalendarCheck,
  CalendarDays,
  Palmtree,
  Gift,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasAdminPermission } from '../../utils/permissions';

export const LeavePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    types,
    balances,
    requests,
    pagination,
    holidays,
    summary,
    actionLoading,
  } = useSelector((state: RootState) => state.leave);
  const { activeOrganization, user } = useSelector((state: RootState) => state.auth);
  const activeRole = activeOrganization?.role.name || activeOrganization?.role.slug || user?.role;
  const canManageLeave = hasAdminPermission(activeRole, activeOrganization?.role.permissions, 'leave:manage_balance', user?.isSuperAdmin);
  const canApproveLeave = hasAdminPermission(activeRole, activeOrganization?.role.permissions, 'leave:approve', user?.isSuperAdmin);
  const balancesLoading = useSelector((state: RootState) => state.leave.balancesLoading);
  const balancesError = useSelector((state: RootState) => state.leave.balancesError);

  // Active view tab: 'my-leaves' | 'approvals' | 'calendar' | 'holidays'
  const [activeTab, setActiveTab] = useState<'my-leaves' | 'approvals' | 'calendar' | 'holidays'>('my-leaves');

  // Search and status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);

  // Forms
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    isHalfDay: false,
    halfDaySession: 'FIRST_HALF' as 'FIRST_HALF' | 'SECOND_HALF',
    reason: '',
  });

  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    managerRemarks: '',
  });

  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    isMandatory: true,
  });

  // Initial Data Fetch
  useEffect(() => {
    dispatch(fetchLeaveTypes());
    dispatch(fetchLeaveBalances());
    dispatch(fetchLeaveRequests({ page: currentPage, status: statusFilter || undefined }));
    dispatch(fetchHolidays());
    dispatch(fetchLeaveSummary());
  }, [dispatch, currentPage, statusFilter]);

  // Set default leave type when types load
  useEffect(() => {
    if (types.length > 0 && !applyForm.leaveTypeId) {
      setApplyForm((prev) => ({ ...prev, leaveTypeId: types[0].id }));
    }
  }, [types]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.leaveTypeId || !applyForm.reason) return;

    await dispatch(
      applyLeave({
        leaveTypeId: applyForm.leaveTypeId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        isHalfDay: applyForm.isHalfDay,
        halfDaySession: applyForm.isHalfDay ? applyForm.halfDaySession : undefined,
        reason: applyForm.reason,
      })
    );

    setIsApplyModalOpen(false);
    setApplyForm({
      leaveTypeId: types[0]?.id || '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      isHalfDay: false,
      halfDaySession: 'FIRST_HALF',
      reason: '',
    });
  };

  const handleReviewLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    await dispatch(
      reviewLeaveRequest({
        id: selectedRequest.id,
        status: reviewForm.status,
        managerRemarks: reviewForm.managerRemarks,
      })
    );

    setIsReviewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleCancelLeave = async (requestId: string) => {
    if (window.confirm('Are you sure you want to cancel this leave application?')) {
      await dispatch(cancelLeaveRequest({ id: requestId, cancellationReason: 'Cancelled by applicant' }));
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name) return;

    await dispatch(createHoliday(holidayForm));
    setIsHolidayModalOpen(false);
    setHolidayForm({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      isMandatory: true,
    });
  };

  // Helper date formatter
  const formatDateRange = (start: string, end: string, isHalfDay: boolean) => {
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (s === e) {
      return isHalfDay ? `${s} (Half Day)` : s;
    }
    return `${s} — ${e}`;
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
    const code = r.employee.employeeCode.toLowerCase();
    const reason = r.reason.toLowerCase();
    return (
      name.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase()) ||
      reason.includes(searchQuery.toLowerCase())
    );
  });

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  // Selected leave type balance info for apply modal
  const selectedTypeBalance = balances.find((b) => b.leaveType.id === applyForm.leaveTypeId);

  return (
    <div className="space-y-8 pb-12 font-sans bg-[#F8FAFC]">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#E52328] animate-pulse" />
            <h1 className="text-3xl font-bold font-outfit text-slate-900 tracking-tight">
              Leave & Time-Off Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Apply for annual paid leave, review team absence requests, track entitlements, and manage holidays.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageLeave && (
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
            >
              <Gift className="w-4 h-4 text-slate-600" />
              Add Holiday
            </button>
          )}

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#E52328] hover:bg-[#AB1428] text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </button>
        </div>
      </div>

      {/* 2. Leave Balances Overview Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            My Annual Leave Allocations & Entitlements ({new Date().getFullYear()})
          </h2>
          <span className="text-xs text-slate-400">Auto-calculated based on organizational policy</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balancesLoading ? (
            <div className="col-span-4 p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-sm">
              Loading leave balances...
            </div>
          ) : balancesError && balances.length === 0 ? (
            <div role="alert" className="col-span-4 p-8 text-center bg-white border border-rose-200 rounded-xl text-rose-700 text-sm">
              {balancesError}
            </div>
          ) : balances.length === 0 ? (
            <div className="col-span-4 p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-sm">
              No leave balances are available for this account.
            </div>
          ) : (
            balances.map((b) => {
              const totalAllocated = b.allocatedDays + b.carryForwardDays;
              const usedPercent = totalAllocated > 0 ? Math.round((b.usedDays / totalAllocated) * 100) : 0;
              return (
                <div
                  key={b.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition relative overflow-hidden group"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: b.leaveType.color || '#E52328' }}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <span className="font-outfit font-bold text-slate-900 text-base">
                      {b.leaveType.name}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${b.leaveType.color || '#E52328'}15`,
                        color: b.leaveType.color || '#E52328',
                      }}
                    >
                      {b.leaveType.code}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-extrabold text-slate-900 font-outfit">
                      {b.availableDays}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {totalAllocated} Days Available
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden my-3">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${usedPercent}%`,
                        backgroundColor: b.leaveType.color || '#E52328',
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                    <span>Used: {b.usedDays}d</span>
                    {b.pendingDays > 0 && (
                      <span className="text-amber-600 font-semibold">
                        Pending: {b.pendingDays}d
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setApplyForm((prev) => ({ ...prev, leaveTypeId: b.leaveType.id }));
                        setIsApplyModalOpen(true);
                      }}
                      className="text-xs font-semibold text-[#E52328] hover:underline"
                    >
                      Apply &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. KPI Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-bold font-outfit text-slate-900">
              {summary?.pendingCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 block">Pending Leave Approvals</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50 text-[#E52328] border border-red-100">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-bold font-outfit text-slate-900">
              {summary?.todayOnLeaveCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 block">Employees on Leave Today</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-bold font-outfit text-slate-900">
              {summary?.upcomingApprovedCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 block">Upcoming Approved Leaves</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-bold font-outfit text-slate-900">
              {holidays.length}
            </span>
            <span className="text-xs text-slate-500 block">Public & Company Holidays</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('my-leaves')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'my-leaves'
                ? 'border-[#E52328] text-[#E52328]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            My Leave Applications
          </button>

          {canApproveLeave && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition relative ${
                activeTab === 'approvals'
                  ? 'border-[#E52328] text-[#E52328]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Hourglass className="w-4 h-4" />
              Manager Approval Inbox
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-[#E52328] font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'calendar'
                ? 'border-[#E52328] text-[#E52328]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Team Leave Calendar
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === 'holidays'
                ? 'border-[#E52328] text-[#E52328]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Gift className="w-4 h-4" />
            Company Holidays ({holidays.length})
          </button>
        </nav>
      </div>

      {/* 5. Tab Panes */}

      {/* TAB 1: MY LEAVE APPLICATIONS */}
      {activeTab === 'my-leaves' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:w-auto relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search leave requests by reason or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Duration & Dates</th>
                    <th className="py-3.5 px-4">Total Days</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Applied On</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No leave applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${req.leaveType.color || '#E52328'}15`,
                              color: req.leaveType.color || '#E52328',
                            }}
                          >
                            {req.leaveType.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {formatDateRange(req.startDate, req.endDate, req.isHalfDay)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {req.totalDays} day(s)
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                          {req.managerRemarks && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Manager: {req.managerRemarks}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {new Date(req.appliedAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          {req.status === 'PENDING' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              Rejected
                            </span>
                          )}
                          {req.status === 'CANCELLED' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Cancelled
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelLeave(req.id)}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} requests)
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

      {/* TAB 2: MANAGER APPROVAL INBOX */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-outfit">
                Manager Leave Approvals
              </h2>
              <p className="text-xs text-slate-500">
                Review, approve, or reject employee leave applications with feedback remarks.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              {pendingRequests.length} pending approval
            </span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Dates</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        Inbox clean! No pending leave requests to review.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-[#E52328] font-bold flex items-center justify-center text-xs">
                              {req.employee.firstName[0]}
                              {req.employee.lastName[0]}
                            </div>
                            <div>
                              <div className="font-semibold">
                                {req.employee.firstName} {req.employee.lastName}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                {req.employee.employeeCode}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${req.leaveType.color || '#E52328'}15`,
                              color: req.leaveType.color || '#E52328',
                            }}
                          >
                            {req.leaveType.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {formatDateRange(req.startDate, req.endDate, req.isHalfDay)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {req.totalDays} day(s)
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {canApproveLeave && (
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setIsReviewModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-black transition shadow-sm"
                            >
                              Review & Decide
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

      {/* TAB 3: TEAM LEAVE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold font-outfit text-slate-900">
              Team Absence & Coverage Timeline
            </h2>
            <p className="text-xs text-slate-500">
              View scheduled employee leaves across departments to avoid staffing bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests
              .filter((r) => r.status === 'APPROVED')
              .map((req) => (
                <div key={req.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {req.employee.firstName} {req.employee.lastName}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${req.leaveType.color || '#E52328'}15`,
                        color: req.leaveType.color || '#E52328',
                      }}
                    >
                      {req.leaveType.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium text-slate-700">
                        {formatDateRange(req.startDate, req.endDate, req.isHalfDay)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Time-off:</span>
                      <span className="font-bold text-slate-800">{req.totalDays} day(s)</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate pt-1">
                      Reason: {req.reason}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPANY HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-outfit">
                Corporate Holiday Calendar ({new Date().getFullYear()})
              </h2>
              <p className="text-xs text-slate-500">
                Mandatory and optional public holidays recognized by the organization.
              </p>
            </div>
            {canManageLeave && (
              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E52328] hover:bg-[#AB1428] text-white transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Holiday
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.map((h) => (
              <div key={h.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-outfit">{h.name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {h.isMandatory ? 'Mandatory' : 'Optional'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-[#E52328]" />
                  <span>
                    {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {h.description && (
                  <p className="text-xs text-slate-600 pt-1">{h.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: APPLY FOR LEAVE */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Apply for Time-Off / Leave
                </h3>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Leave Type *
                  </label>
                  <select
                    required
                    value={applyForm.leaveTypeId}
                    onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                  {selectedTypeBalance && (
                    <span className="text-xs text-emerald-600 font-medium block mt-1">
                      Available Balance: {selectedTypeBalance.availableDays} day(s)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={applyForm.startDate}
                      onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={applyForm.endDate}
                      onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-b border-slate-100 py-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isHalfDayCheck"
                      checked={applyForm.isHalfDay}
                      onChange={(e) => setApplyForm({ ...applyForm, isHalfDay: e.target.checked })}
                      className="w-4 h-4 text-[#E52328] rounded border-slate-300 focus:ring-[#E52328]"
                    />
                    <label htmlFor="isHalfDayCheck" className="text-xs text-slate-700 font-medium">
                      Half-Day Leave
                    </label>
                  </div>

                  {applyForm.isHalfDay && (
                    <select
                      value={applyForm.halfDaySession}
                      onChange={(e) => setApplyForm({ ...applyForm, halfDaySession: e.target.value as any })}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-md"
                    >
                      <option value="FIRST_HALF">First Half (Morning)</option>
                      <option value="SECOND_HALF">Second Half (Afternoon)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Leave *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a detailed reason for the requested time off..."
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#E52328] hover:bg-[#AB1428] text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REVIEW LEAVE (MANAGER / ADMIN) */}
      <AnimatePresence>
        {isReviewModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Review Leave Application
                </h3>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-800">Staff:</span> {selectedRequest.employee.firstName}{' '}
                  {selectedRequest.employee.lastName} ({selectedRequest.employee.employeeCode})
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Type:</span> {selectedRequest.leaveType.name} (
                  {selectedRequest.totalDays} days)
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Duration:</span>{' '}
                  {formatDateRange(selectedRequest.startDate, selectedRequest.endDate, selectedRequest.isHalfDay)}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Reason:</span> {selectedRequest.reason}
                </div>
              </div>

              <form onSubmit={handleReviewLeave} className="space-y-4 text-sm">
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
                      <Check className="w-4 h-4" /> Approve Leave
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
                      <X className="w-4 h-4" /> Reject Leave
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manager Remarks / Feedback
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional feedback for the employee..."
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

      {/* MODAL: ADD COMPANY HOLIDAY */}
      <AnimatePresence>
        {isHolidayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold font-outfit text-slate-900">
                  Register Company Holiday
                </h3>
                <button
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateHoliday} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Holiday Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Diwali, Independence Day, Christmas"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes regarding the holiday..."
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E52328]/20 focus:border-[#E52328]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isMandatoryCheck"
                    checked={holidayForm.isMandatory}
                    onChange={(e) => setHolidayForm({ ...holidayForm, isMandatory: e.target.checked })}
                    className="w-4 h-4 text-[#E52328] rounded border-slate-300 focus:ring-[#E52328]"
                  />
                  <label htmlFor="isMandatoryCheck" className="text-xs text-slate-700 font-medium">
                    Mandatory paid holiday for all employees
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#E52328] hover:bg-[#AB1428] text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Save Holiday
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
