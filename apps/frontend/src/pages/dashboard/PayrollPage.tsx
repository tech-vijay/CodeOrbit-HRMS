import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchPayrollSummary,
  fetchPayrollRuns,
  fetchPayrollRunById,
  processPayrollRun,
  updatePayrollStatus,
  disbursePayroll,
  previewStatutoryStructure,
  saveSalaryStructure,
  fetchPayslips,
  fetchPayslipById,
  clearCurrentRun,
  clearCurrentPayslip,
} from '../../store/slices/payrollSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  X,
  Plus,
  Send,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PayrollPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    runs,
    currentRun,
    payslips,
    currentPayslip,
    previewStructure,
    summary,
    actionLoading,
  } = useSelector((state: RootState) => state.payroll);

  const { items: employees } = useSelector((state: RootState) => state.employees);

  // Active tab: 'runs' | 'structures' | 'payslips'
  const [activeTab, setActiveTab] = useState<'runs' | 'structures' | 'payslips'>('runs');

  // Modals
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isRunDetailModalOpen, setIsRunDetailModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  // Form states
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [runNotes, setRunNotes] = useState('');

  // Structure form
  const [structEmployeeId, setStructEmployeeId] = useState('');
  const [structCtc, setStructCtc] = useState(1200000);
  const [structBasic, setStructBasic] = useState(50000);
  const [structHra, setStructHra] = useState(20000);
  const [structSpecial, setStructSpecial] = useState(25350);
  const [structConveyance, setStructConveyance] = useState(1600);
  const [structMedical, setStructMedical] = useState(1250);
  const [structPfEmployee, setStructPfEmployee] = useState(1800);
  const [structPfEmployer, setStructPfEmployer] = useState(1800);
  const [structPt, setStructPt] = useState(200);
  const [structTds, setStructTds] = useState(5000);
  const [structEffectiveFrom, setStructEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  // Disbursement modal state
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  // Payslip filter
  const [payslipSearch, setPayslipSearch] = useState('');

  useEffect(() => {
    dispatch(fetchPayrollSummary());
    dispatch(fetchPayrollRuns());
    dispatch(fetchPayslips());
    dispatch(fetchEmployees({ limit: 100 }));
  }, [dispatch]);

  // When preview calculation is ready
  useEffect(() => {
    if (previewStructure) {
      setStructBasic(previewStructure.basicSalary);
      setStructHra(previewStructure.hra);
      setStructSpecial(previewStructure.specialAllowance);
      setStructConveyance(previewStructure.conveyance);
      setStructMedical(previewStructure.medicalAllowance);
      setStructPfEmployee(previewStructure.pfEmployee);
      setStructPfEmployer(previewStructure.pfEmployer);
      setStructPt(previewStructure.professionalTax);
      setStructTds(previewStructure.tds);
    }
  }, [previewStructure]);

  const handleCalculateBreakdown = () => {
    if (structCtc > 0 && structEmployeeId) {
      dispatch(previewStatutoryStructure({ ctc: structCtc, employeeId: structEmployeeId }));
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structEmployeeId) return;

    await dispatch(
      saveSalaryStructure({
        employeeId: structEmployeeId,
        ctc: Number(structCtc),
        basicSalary: Number(structBasic),
        hra: Number(structHra),
        specialAllowance: Number(structSpecial),
        conveyance: Number(structConveyance),
        medicalAllowance: Number(structMedical),
        pfEmployer: Number(structPfEmployer),
        pfEmployee: Number(structPfEmployee),
        professionalTax: Number(structPt),
        tds: Number(structTds),
        effectiveFrom: structEffectiveFrom,
      })
    );

    setIsStructureModalOpen(false);
    dispatch(fetchPayrollSummary());
  };

  const handleProcessRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(
      processPayrollRun({
        month: Number(selectedMonth),
        year: Number(selectedYear),
        notes: runNotes,
      })
    );
    setIsProcessModalOpen(false);
    setRunNotes('');
    dispatch(fetchPayrollSummary());
  };

  const handleViewRun = async (id: string) => {
    await dispatch(fetchPayrollRunById(id));
    setIsRunDetailModalOpen(true);
  };

  const handleViewPayslip = async (id: string) => {
    await dispatch(fetchPayslipById(id));
    setIsPayslipModalOpen(true);
  };

  const handleApproveRun = async (id: string) => {
    if (window.confirm('Are you sure you want to approve this monthly payroll run for disbursement?')) {
      await dispatch(updatePayrollStatus({ id, status: 'APPROVED', notes: 'Approved for disbursement' }));
      dispatch(fetchPayrollSummary());
    }
  };

  const handleOpenDisburse = () => {
    setPaymentRef(`DISB-${Date.now()}`);
    setIsDisburseModalOpen(true);
  };

  const handleConfirmDisburse = async () => {
    if (!currentRun) return;
    await dispatch(
      disbursePayroll({
        id: currentRun.id,
        paymentMode,
        paymentRef,
      })
    );
    setIsDisburseModalOpen(false);
    setIsRunDetailModalOpen(false);
    dispatch(fetchPayrollSummary());
    dispatch(fetchPayslips());
  };

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Payroll & Compensation
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25 font-semibold font-mono">
              Phase 5
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Automated statutory deductions, CTC structures, salary runs, and payslips generation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (employees.length > 0) {
                setStructEmployeeId(employees[0].id);
                dispatch(previewStatutoryStructure({ ctc: structCtc, employeeId: employees[0].id }));
              }
              setIsStructureModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-sm hover:border-[#E52328]/30"
          >
            <Plus className="w-4 h-4 text-[#E52328]" />
            <span>Configure CTC</span>
          </button>

          <button
            onClick={() => setIsProcessModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-sm font-semibold transition-all shadow-md shadow-[#E52328]/20 hover:scale-[1.01]"
          >
            <DollarSign className="w-4 h-4" />
            <span>Run Monthly Payroll</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
              Configured Salaries
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E52328]/10 border border-[#E52328]/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#E52328]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3 font-display">
            {summary?.totalEmployeesWithSalary || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00bb7f]" /> Eligible for payroll computation
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
              Latest Run Status
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#3080ff]/10 border border-[#3080ff]/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#3080ff]" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 font-display">
            {summary?.latestRun
              ? `${monthNames[summary.latestRun.month - 1]} ${summary.latestRun.year}`
              : 'No runs yet'}
          </p>
          <div className="mt-1">
            {summary?.latestRun ? (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  summary.latestRun.status === 'PAID'
                    ? 'bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20'
                    : summary.latestRun.status === 'APPROVED'
                    ? 'bg-[#3080ff]/10 text-[#3080ff] border border-[#3080ff]/20'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {summary.latestRun.status}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Ready to initiate</span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
              YTD Disbursed Net
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#00bb7f]/10 border border-[#00bb7f]/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#00bb7f]" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 font-display truncate">
            {formatCurrency(summary?.ytdDisbursedNet)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Paid directly to employee accounts
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display">
              YTD Deductions (PF/PT/TDS)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 font-display truncate">
            {formatCurrency(summary?.ytdDeductions)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Compliance & tax withholdings
          </p>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('runs')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'runs'
              ? 'border-[#E52328] text-[#E52328]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Monthly Payroll Runs</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
            {runs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payslips')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'payslips'
              ? 'border-[#E52328] text-[#E52328]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Employee Payslips</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
            {payslips.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'structures'
              ? 'border-[#E52328] text-[#E52328]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Statutory CTC Policy</span>
        </button>
      </div>

      {/* TAB 1: Monthly Payroll Runs */}
      {activeTab === 'runs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">Payroll Register</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly execution cycle, statutory deductions, approvals, and banking disburse ledger.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Pay Period</th>
                  <th className="py-3 px-6">Employees</th>
                  <th className="py-3 px-6">Gross Pay</th>
                  <th className="py-3 px-6">Deductions</th>
                  <th className="py-3 px-6">Net Disbursable</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      No payroll runs processed yet. Click "Run Monthly Payroll" to compute first disbursal.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900 font-display">
                        {monthNames[r.month - 1]} {r.year}
                        {r.notes && (
                          <span className="block text-[11px] text-slate-400 font-normal truncate max-w-xs">
                            {r.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-mono">
                        {r.employeeCount} staff
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {formatCurrency(r.totalGross)}
                      </td>
                      <td className="py-4 px-6 text-rose-600 font-medium">
                        -{formatCurrency(r.totalDeductions)}
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-700 font-display">
                        {formatCurrency(r.totalNet)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            r.status === 'PAID'
                              ? 'bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20'
                              : r.status === 'APPROVED'
                              ? 'bg-[#3080ff]/10 text-[#3080ff] border border-[#3080ff]/20'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleViewRun(r.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
                        >
                          View Breakdown
                        </button>
                        {r.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApproveRun(r.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#3080ff] hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            Approve
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
      )}

      {/* TAB 2: Payslips */}
      {activeTab === 'payslips' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">Individual Payslips</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official payslips with itemized statutory earnings, deductions, and payment reference numbers.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee..."
                value={payslipSearch}
                onChange={(e) => setPayslipSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#E52328] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6">Period</th>
                  <th className="py-3 px-6">Payable Days</th>
                  <th className="py-3 px-6">Gross Pay</th>
                  <th className="py-3 px-6">Deductions</th>
                  <th className="py-3 px-6">Net Salary</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No approved or finalized payslips available yet.
                    </td>
                  </tr>
                ) : (
                  payslips
                    .filter((p) => {
                      if (!payslipSearch) return true;
                      const q = payslipSearch.toLowerCase();
                      const name = `${p.employee?.firstName} ${p.employee?.lastName}`.toLowerCase();
                      const code = p.employee?.employeeCode?.toLowerCase() || '';
                      return name.includes(q) || code.includes(q);
                    })
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25 flex items-center justify-center font-bold text-xs font-display">
                              {p.employee?.firstName?.[0]}
                              {p.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm font-display">
                                {p.employee?.firstName} {p.employee?.lastName}
                              </p>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {p.employee?.employeeCode} • {p.employee?.designation?.title || 'Staff'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium">
                          {p.payrollRun ? `${monthNames[p.payrollRun.month - 1]} ${p.payrollRun.year}` : '-'}
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-mono">
                          {Number(p.payableDays)} / {p.monthDays}
                          {Number(p.lopDays) > 0 && (
                            <span className="text-rose-600 text-[10px] block">
                              ({Number(p.lopDays)} LOP)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-800 font-medium">
                          {formatCurrency(p.grossSalary)}
                        </td>
                        <td className="py-4 px-6 text-rose-600 font-medium">
                          -{formatCurrency(p.totalDeductions)}
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-700 font-display">
                          {formatCurrency(p.netSalary)}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              p.isPaid
                                ? 'bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20'
                                : 'bg-[#3080ff]/10 text-[#3080ff] border border-[#3080ff]/20'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {p.isPaid ? 'PAID' : 'APPROVED'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleViewPayslip(p.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all hover:border-[#E52328]/30"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#E52328]" />
                            <span>View Payslip</span>
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Statutory CTC Policy Breakdown */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Indian Statutory Compensation Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Complies with EPFO statutory limits, Gratuity Act, and standard Indian Payroll structures.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Basic Salary (50% of CTC)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Core taxable base salary for computation of EPF and Gratuity.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  House Rent Allowance (HRA) (40% of Basic)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Exempt under Section 10(13A) of Income Tax Act for eligible rent payments.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Employee Provident Fund (EPF - 12%)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Statutory 12% contribution with matching employer share.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Professional Tax (PT - ₹200/mo)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  State-mandated employment tax levied on salaried professionals.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Assign Salary Structure to Staff</p>
                <p className="text-[11px] text-slate-500">
                  Select an employee and enter annual CTC to auto-generate statutory breakdown.
                </p>
              </div>
              <button
                onClick={() => setIsStructureModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-xs font-semibold transition-all shadow-sm"
              >
                Configure New Structure
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#E52328] uppercase tracking-wider font-mono">
                Statutory Compliance
              </span>
              <h3 className="text-xl font-extrabold mt-2 font-display">
                Zero-Leakage Payroll Engine
              </h3>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                Attendance clock-in records and Loss-of-Pay (LOP) leaves are automatically mapped
                into monthly payable day deductions.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" />
                  <span>Auto-deducts unapproved absence</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" />
                  <span>Pro-rates month calendar days (28-31)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" />
                  <span>Immutable audit trail for financial disbursals</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-700/60 mt-6">
              <span className="text-[11px] text-slate-400">Enterprise Security Grade</span>
              <p className="text-xs font-bold text-white font-mono mt-0.5">
                Multi-Tenant Bank NEFT / RTGS Ready
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Run Monthly Payroll */}
      <AnimatePresence>
        {isProcessModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/20 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                      Execute Monthly Payroll
                    </h3>
                    <p className="text-xs text-slate-500">
                      Calculates earnings, deductions, and LOP for active staff.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProcessModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProcessRun} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                    >
                      {monthNames.map((m, idx) => (
                        <option key={idx} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payroll Run Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={runNotes}
                    onChange={(e) => setRunNotes(e.target.value)}
                    placeholder="e.g. Regular monthly salary computation with Q4 bonus adjustments"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Executing payroll will pull all active staff with configured CTCs and calculate statutory deductions.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsProcessModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Run Computation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Configure Salary Structure */}
      <AnimatePresence>
        {isStructureModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Configure Employee CTC & Salary Structure
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculates Indian statutory components (Basic, HRA, PF, PT, TDS).
                  </p>
                </div>
                <button
                  onClick={() => setIsStructureModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStructure} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select Employee
                    </label>
                    <select
                      value={structEmployeeId}
                      onChange={(e) => {
                        setStructEmployeeId(e.target.value);
                        dispatch(previewStatutoryStructure({ ctc: structCtc, employeeId: e.target.value }));
                      }}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Annual CTC (₹)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="100000"
                        step="50000"
                        value={structCtc}
                        onChange={(e) => setStructCtc(Number(e.target.value))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleCalculateBreakdown}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
                      >
                        Auto-Calculate
                      </button>
                    </div>
                  </div>
                </div>

                {/* Statutory Breakdown Grid */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Monthly Salary Components
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Basic Salary</span>
                      <input
                        type="number"
                        value={structBasic}
                        onChange={(e) => setStructBasic(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">HRA</span>
                      <input
                        type="number"
                        value={structHra}
                        onChange={(e) => setStructHra(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Special Allowance</span>
                      <input
                        type="number"
                        value={structSpecial}
                        onChange={(e) => setStructSpecial(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">PF (Employee 12%)</span>
                      <input
                        type="number"
                        value={structPfEmployee}
                        onChange={(e) => setStructPfEmployee(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Professional Tax</span>
                      <input
                        type="number"
                        value={structPt}
                        onChange={(e) => setStructPt(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">TDS Withholding</span>
                      <input
                        type="number"
                        value={structTds}
                        onChange={(e) => setStructTds(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    value={structEffectiveFrom}
                    onChange={(e) => setStructEffectiveFrom(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#E52328] focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsStructureModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-xs font-semibold shadow-md transition-all"
                  >
                    Save Structure
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Payroll Run Itemized Details */}
      <AnimatePresence>
        {isRunDetailModalOpen && currentRun && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                      Payroll Run: {monthNames[currentRun.month - 1]} {currentRun.year}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        currentRun.status === 'PAID'
                          ? 'bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20'
                          : currentRun.status === 'APPROVED'
                          ? 'bg-[#3080ff]/10 text-[#3080ff] border border-[#3080ff]/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {currentRun.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total Gross: {formatCurrency(currentRun.totalGross)} • Total Deductions: -{formatCurrency(currentRun.totalDeductions)} • Net Disbursable: {formatCurrency(currentRun.totalNet)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentRun.status === 'APPROVED' && (
                    <button
                      onClick={handleOpenDisburse}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00bb7f] hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Disburse Salaries</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsRunDetailModalOpen(false);
                      dispatch(clearCurrentRun());
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Payable Days</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">PF (12%)</th>
                      <th className="py-3 px-4">PT & TDS</th>
                      <th className="py-3 px-4">LOP Deduction</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRun.payrollItems?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.employee?.firstName} {item.employee?.lastName}
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {item.employee?.employeeCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {Number(item.payableDays)} / {item.monthDays}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {formatCurrency(item.grossSalary)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {formatCurrency(item.pfDeduction)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {formatCurrency(Number(item.professionalTax) + Number(item.tdsDeduction))}
                        </td>
                        <td className="py-3 px-4 text-rose-600 font-mono">
                          {Number(item.lopDeduction) > 0 ? `-${formatCurrency(item.lopDeduction)}` : '₹0'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {formatCurrency(item.netSalary)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.isPaid ? 'PAID' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Disburse Confirmation */}
      <AnimatePresence>
        {isDisburseModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#00bb7f]/10 text-[#00bb7f] border border-[#00bb7f]/20 flex items-center justify-center font-bold mb-4">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Disburse Payroll Funds
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confirm execution of banking transfer for {currentRun?.employeeCount} employees.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="BANK_TRANSFER">Direct Bank NEFT / RTGS</option>
                    <option value="CORPORATE_CARD">Corporate Payroll Account</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Bank Batch Reference
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisburse}
                  className="px-5 py-2 rounded-xl bg-[#00bb7f] hover:bg-emerald-600 text-white text-xs font-semibold shadow-md"
                >
                  Confirm & Disburse
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Printable Individual Payslip */}
      <AnimatePresence>
        {isPayslipModalOpen && currentPayslip && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="CodeOrbit HRMS" className="h-10 w-auto object-contain" />
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#E52328] uppercase tracking-wider block">
                    Payslip for the month of
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 font-display">
                    {currentPayslip.payrollRun ? `${monthNames[currentPayslip.payrollRun.month - 1]} ${currentPayslip.payrollRun.year}` : '-'}
                  </h4>
                </div>
              </div>

              {/* Employee Information */}
              <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Employee Name:</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {currentPayslip.employee?.firstName} {currentPayslip.employee?.lastName}
                  </p>
                  <span className="text-slate-400 block mt-2">Designation:</span>
                  <p className="font-semibold text-slate-800">
                    {currentPayslip.employee?.designation?.title || 'Staff Member'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block">Employee Code:</span>
                  <p className="font-mono font-bold text-slate-900">
                    {currentPayslip.employee?.employeeCode}
                  </p>
                  <span className="text-slate-400 block mt-2">Payable Days:</span>
                  <p className="font-semibold text-slate-800">
                    {Number(currentPayslip.payableDays)} / {currentPayslip.monthDays} Days
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="py-6 border-b border-slate-200 grid grid-cols-2 gap-8 text-xs">
                {/* Earnings Column */}
                <div>
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider mb-3 text-[11px]">
                    Earnings
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Basic Salary</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.hra)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Special Allowance</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.specialAllowance)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Conveyance Allowance</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.conveyance)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Medical Allowance</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.medicalAllowance)}</span>
                    </div>
                    <div className="flex justify-between pt-2 font-bold text-slate-900 text-sm">
                      <span>Gross Earnings</span>
                      <span className="font-mono">{formatCurrency(currentPayslip.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div>
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider mb-3 text-[11px]">
                    Deductions
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Provident Fund (EPF)</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.pfDeduction)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Professional Tax (PT)</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.professionalTax)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">TDS (Income Tax)</span>
                      <span className="font-mono font-semibold">{formatCurrency(currentPayslip.tdsDeduction)}</span>
                    </div>
                    {Number(currentPayslip.lopDeduction) > 0 && (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                        <span>Loss of Pay (LOP)</span>
                        <span className="font-mono font-semibold">-{formatCurrency(currentPayslip.lopDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-bold text-rose-600 text-sm">
                      <span>Total Deductions</span>
                      <span className="font-mono">-{formatCurrency(currentPayslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight */}
              <div className="py-6 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Net Salary Payable</span>
                  <p className="text-3xl font-extrabold text-emerald-700 font-display">
                    {formatCurrency(currentPayslip.netSalary)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Payment Mode: {currentPayslip.paymentMode || 'Direct Bank NEFT'}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Ref: {currentPayslip.paymentRef || 'PENDING_DISBURSE'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsPayslipModalOpen(false);
                    dispatch(clearCurrentPayslip());
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E52328] hover:bg-[#AB1428] text-white text-xs font-semibold shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Payslip</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
