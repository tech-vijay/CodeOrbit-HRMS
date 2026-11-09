import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchExpenseSummary,
  fetchExpenseClaims,
  submitExpenseClaim,
  reviewExpenseClaim,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseClaim,
} from '../../store/slices/expenseSlice';
import { uploadFile } from '../../services/upload';
import { resolveApiAssetUrl } from '../../services/api';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  AlertCircle,
  X,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES: { label: string; value: ExpenseCategory }[] = [
  { label: 'Travel & Commute', value: 'TRAVEL' },
  { label: 'Food & Meals', value: 'MEALS' },
  { label: 'Hardware & Equipment', value: 'EQUIPMENT' },
  { label: 'Internet & Mobile', value: 'INTERNET' },
  { label: 'Training & Certifications', value: 'TRAINING' },
  { label: 'Client Entertainment', value: 'CLIENT_ENTERTAINMENT' },
  { label: 'Other Business Expense', value: 'OTHER' },
];

export const ExpensesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { claims, summary, isLoading, isActionLoading } = useSelector(
    (state: RootState) => state.expenses
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<ExpenseClaim | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE_MANAGER' | 'APPROVE_FINANCE' | 'REJECT'>(
    'APPROVE_MANAGER'
  );
  const [rejectionReason, setRejectionReason] = useState('');

  // Submit Claim Form
  const [claimTitle, setClaimTitle] = useState('');
  const [claimCategory, setClaimCategory] = useState<ExpenseCategory>('TRAVEL');
  const [claimAmount, setClaimAmount] = useState<number | ''>('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimDescription, setClaimDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchExpenseSummary());
    dispatch(fetchExpenseClaims());
  }, [dispatch]);

  const handleOpenSubmitModal = () => {
    setClaimTitle('');
    setClaimCategory('TRAVEL');
    setClaimAmount('');
    setClaimDate(new Date().toISOString().split('T')[0]);
    setClaimDescription('');
    setReceiptFile(null);
    setFormError(null);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTitle.trim()) {
      setFormError('Please enter a claim title');
      return;
    }
    if (!claimAmount || Number(claimAmount) <= 0) {
      setFormError('Please enter a valid expense amount');
      return;
    }

    try {
      setFormError(null);
      let receiptUrl: string | undefined;
      let receiptName: string | undefined;

      if (receiptFile) {
        setIsUploadingReceipt(true);
        const uploaded = await uploadFile(receiptFile, 'documents');
        receiptUrl = uploaded.fileUrl;
        receiptName = uploaded.fileName;
        setIsUploadingReceipt(false);
      }

      await dispatch(
        submitExpenseClaim({
          title: claimTitle.trim(),
          category: claimCategory,
          amount: Number(claimAmount),
          currency: 'INR',
          expenseDate: claimDate,
          description: claimDescription.trim() || undefined,
          receiptUrl,
          receiptName,
        })
      ).unwrap();

      setIsSubmitModalOpen(false);
      dispatch(fetchExpenseSummary());
    } catch (err: any) {
      setIsUploadingReceipt(false);
      setFormError(err || 'Failed to submit claim');
    }
  };

  const handleOpenReviewModal = (
    claim: ExpenseClaim,
    action: 'APPROVE_MANAGER' | 'APPROVE_FINANCE' | 'REJECT'
  ) => {
    setSelectedClaimForReview(claim);
    setReviewAction(action);
    setRejectionReason('');
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedClaimForReview) return;
    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this claim.');
      return;
    }

    try {
      await dispatch(
        reviewExpenseClaim({
          claimId: selectedClaimForReview.id,
          action: reviewAction,
          rejectionReason: reviewAction === 'REJECT' ? rejectionReason.trim() : undefined,
        })
      ).unwrap();

      setIsReviewModalOpen(false);
      setSelectedClaimForReview(null);
      dispatch(fetchExpenseSummary());
      dispatch(fetchExpenseClaims());
    } catch (err: any) {
      alert(err || 'Failed to review claim');
    }
  };

  // Filtered claims
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || claim.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || claim.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: ExpenseStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" /> Pending Manager
          </span>
        );
      case 'APPROVED_BY_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-500" /> Pending Finance
          </span>
        );
      case 'APPROVED_BY_FINANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ready for Payout
          </span>
        );
      case 'REIMBURSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <Wallet className="w-3 h-3 text-green-600" /> Reimbursed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" /> Rejected
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E52328] mb-1">
            <Receipt className="w-4 h-4 text-[#E52328]" />
            <span>Finance & Reimbursements</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Expenses & Claims
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track business claims, upload receipts, approve multi-tier reimbursements, and disburse via payroll.
          </p>
        </div>

        <button
          onClick={handleOpenSubmitModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-xs font-bold shadow-sm transition-all hover:shadow hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Expense Claim</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Claimed
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-display">
            ₹ {(summary?.totalClaimed || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.totalClaims || 0} total business expenses submitted
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2 font-display">
            ₹ {(summary?.pendingApprovalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.pendingApprovalCount || 0} claims awaiting manager/finance review
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Approved For Payout
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2 font-display">
            ₹ {(summary?.approvedForPayoutAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.approvedForPayoutCount || 0} claims queued for next payroll disbursal
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Total Reimbursed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2 font-display">
            ₹ {(summary?.reimbursedAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.reimbursedCount || 0} claims paid out successfully
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, title, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E52328]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Manager</option>
            <option value="APPROVED_BY_MANAGER">Pending Finance</option>
            <option value="APPROVED_BY_FINANCE">Approved for Payout</option>
            <option value="REIMBURSED">Reimbursed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-[#E52328]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-6">Claim Title & Category</th>
                <th className="py-3.5 px-6">Expense Date</th>
                <th className="py-3.5 px-6">Receipt</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E52328]" />
                    <span>Loading expense claims...</span>
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No expense claims found matching criteria</p>
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E52328]/10 text-[#E52328] font-bold text-xs flex items-center justify-center shrink-0">
                          {claim.employee.firstName[0]}
                          {claim.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {claim.employee.firstName} {claim.employee.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {claim.employee.employeeCode} &bull;{' '}
                            {claim.employee.department?.name || 'General'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Claim Details */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{claim.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {claim.category}
                        </span>
                        {claim.description && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={claim.description}>
                            {claim.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Expense Date */}
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {new Date(claim.expenseDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Receipt */}
                    <td className="py-4 px-6">
                      {claim.receiptUrl ? (
                        <a
                          href={resolveApiAssetUrl(claim.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E52328] hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">No Receipt</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6">
                      <span className="font-extrabold text-slate-900 text-sm">
                        ₹ {Number(claim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">{getStatusBadge(claim.status)}</td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {claim.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenReviewModal(claim, 'APPROVE_MANAGER')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              title="Approve as Manager"
                            >
                              Manager OK
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(claim, 'REJECT')}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Reject Claim"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {claim.status === 'APPROVED_BY_MANAGER' && (
                          <>
                            <button
                              onClick={() => handleOpenReviewModal(claim, 'APPROVE_FINANCE')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Finance Final Approval"
                            >
                              Finance Approve
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(claim, 'REJECT')}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Reject Claim"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {claim.status === 'APPROVED_BY_FINANCE' && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            Queued in Payroll
                          </span>
                        )}

                        {claim.status === 'REIMBURSED' && (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Settled
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Claim Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E52328]/10 text-[#E52328] flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 font-display">
                      Submit Expense Claim
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Submit reimbursement claim with supporting receipt proof
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitClaim} className="space-y-4 pt-4 text-xs">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Claim Title / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client Dinner in Delhi, Flight to Mumbai"
                    value={claimTitle}
                    onChange={(e) => setClaimTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                    <select
                      value={claimCategory}
                      onChange={(e) => setClaimCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#E52328]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="e.g. 2450.00"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Expense *</label>
                  <input
                    type="date"
                    required
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description & Justification
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide context on attendees, project or client name..."
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supporting Receipt / Invoice
                  </label>
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50/50 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="receipt-file-input"
                    />
                    <label
                      htmlFor="receipt-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1"
                    >
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {receiptFile ? receiptFile.name : 'Click to upload receipt (PDF or Image)'}
                      </span>
                      <span className="text-[10.5px] text-slate-400">
                        PNG, JPG, or PDF up to 10MB
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActionLoading || isUploadingReceipt}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white font-semibold disabled:opacity-50 shadow-sm"
                  >
                    {(isActionLoading || isUploadingReceipt) && (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Submit Claim</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedClaimForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 font-display">
                  {reviewAction === 'REJECT' ? 'Reject Claim' : 'Approve Claim'}
                </h3>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="font-bold text-slate-900">{selectedClaimForReview.title}</p>
                  <p className="text-slate-500">
                    Employee: {selectedClaimForReview.employee.firstName}{' '}
                    {selectedClaimForReview.employee.lastName}
                  </p>
                  <p className="font-bold text-slate-900 text-sm">
                    Amount: ₹ {Number(selectedClaimForReview.amount).toLocaleString('en-IN')}
                  </p>
                </div>

                {reviewAction === 'REJECT' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reason for Rejection *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Missing official tax invoice, expense outside travel policy..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                ) : (
                  <p className="text-slate-600">
                    Are you sure you want to approve this claim? It will advance to{' '}
                    <span className="font-bold">
                      {reviewAction === 'APPROVE_MANAGER'
                        ? 'Finance Verification'
                        : 'Payroll Disbursement'}
                    </span>
                    .
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReview}
                  disabled={isActionLoading}
                  className={`px-4 py-2 rounded-xl text-white font-semibold shadow-sm ${
                    reviewAction === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#E52328] hover:bg-[#AB1428]'
                  }`}
                >
                  {reviewAction === 'REJECT' ? 'Confirm Rejection' : 'Confirm Approval'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
