import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchPerformanceSummary,
  fetchCycles,
  createCycle,
  fetchGoals,
  createGoal,
  updateGoalProgress,
  fetchReviews,
  fetchReviewById,
  submitSelfReview,
  submitManagerReview,
  calibrateReview,
  PerformanceReview,
} from '../../store/slices/performanceSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import {
  TrendingUp,
  Target,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Star,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasPermission } from '../../utils/permissions';

export const PerformancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { summary, cycles, goals, reviews, selectedReview } = useSelector(
    (state: RootState) => state.performance
  );
  const { items: employees } = useSelector((state: RootState) => state.employees);
  const { activeOrganization } = useSelector((state: RootState) => state.auth);
  const canManageCycles = hasPermission(activeOrganization?.role.permissions, 'performance:manage_cycles');
  const canManageGoals = hasPermission(activeOrganization?.role.permissions, 'performance:manage_goals');
  const canReviewPerformance = hasPermission(activeOrganization?.role.permissions, 'performance:review');

  const [activeTab, setActiveTab] = useState<'goals' | 'reviews' | 'cycles'>('goals');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [targetGoal, setTargetGoal] = useState<any>(null);

  // Forms
  const [goalForm, setGoalForm] = useState({
    employeeId: '',
    title: '',
    description: '',
    category: 'INDIVIDUAL',
    weightage: 100,
    targetValue: 100,
    currentValue: 0,
    unit: '%',
    dueDate: '',
    keyResult1: '',
    keyResult2: '',
  });

  const [cycleForm, setCycleForm] = useState({
    title: 'Q1 2026 Growth & Engineering Review',
    description: 'Quarterly OKR evaluation and 360-degree performance appraisal cycle.',
    reviewType: 'QUARTERLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    selfReviewDeadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    managerReviewDeadline: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
  });

  // Review & Calibration inputs inside Dossier
  const [selfRating, setSelfRating] = useState(4.5);
  const [selfFeedback, setSelfFeedback] = useState('');
  const [managerRating, setManagerRating] = useState(4.0);
  const [managerFeedback, setManagerFeedback] = useState('');
  const [finalRating, setFinalRating] = useState(4.2);
  const [hikePercentage, setHikePercentage] = useState(12);
  const [isPromotion, setIsPromotion] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [pipNotes, setPipNotes] = useState('');

  const [newProgress, setNewProgress] = useState(50);
  const [feedbackAlert, setFeedbackAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    dispatch(fetchPerformanceSummary());
    dispatch(fetchCycles());
    dispatch(fetchGoals());
    dispatch(fetchReviews());
    dispatch(fetchEmployees({}));
  }, [dispatch]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setFeedbackAlert({ type, text });
    setTimeout(() => setFeedbackAlert(null), 4000);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.employeeId || !goalForm.title) return;

    const keyResults: any[] = [];
    if (goalForm.keyResult1.trim()) {
      keyResults.push({ title: goalForm.keyResult1.trim(), targetValue: 100, currentValue: 0, unit: '%' });
    }
    if (goalForm.keyResult2.trim()) {
      keyResults.push({ title: goalForm.keyResult2.trim(), targetValue: 100, currentValue: 0, unit: '%' });
    }

    const payload = {
      employeeId: goalForm.employeeId,
      title: goalForm.title,
      description: goalForm.description,
      category: goalForm.category,
      weightage: Number(goalForm.weightage) || 100,
      targetValue: Number(goalForm.targetValue) || 100,
      currentValue: Number(goalForm.currentValue) || 0,
      unit: goalForm.unit,
      dueDate: goalForm.dueDate || undefined,
      keyResults: keyResults.length > 0 ? keyResults : undefined,
    };

    try {
      const res = await dispatch(createGoal(payload));
      if (createGoal.fulfilled.match(res)) {
        showAlert('success', 'Goal and OKR key results established successfully.');
        setIsGoalModalOpen(false);
        setGoalForm({
          employeeId: '',
          title: '',
          description: '',
          category: 'INDIVIDUAL',
          weightage: 100,
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          dueDate: '',
          keyResult1: '',
          keyResult2: '',
        });
        dispatch(fetchPerformanceSummary());
      } else {
        showAlert('error', res.payload as string);
      }
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dispatch(createCycle(cycleForm));
      if (createCycle.fulfilled.match(res)) {
        showAlert('success', `Cycle '${cycleForm.title}' launched. All staff enrolled.`);
        setIsCycleModalOpen(false);
        dispatch(fetchPerformanceSummary());
        dispatch(fetchReviews());
      } else {
        showAlert('error', res.payload as string);
      }
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGoal) return;
    try {
      const res = await dispatch(updateGoalProgress({ id: targetGoal.id, data: { progress: newProgress } }));
      if (updateGoalProgress.fulfilled.match(res)) {
        showAlert('success', 'Goal progress updated successfully.');
        setIsProgressModalOpen(false);
        dispatch(fetchPerformanceSummary());
      }
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleOpenDossier = async (review: PerformanceReview) => {
    await dispatch(fetchReviewById(review.id));
    setSelfRating(review.selfRating || 4.5);
    setSelfFeedback(review.selfFeedback || '');
    setManagerRating(review.managerRating || 4.0);
    setManagerFeedback(review.managerFeedback || '');
    setFinalRating(review.finalRating || 4.2);
    setHikePercentage(review.salaryHikePercentage || 10);
    setIsPromotion(review.promotionRecommended || false);
    setIsPip(review.pipRequired || false);
    setPipNotes(review.pipNotes || '');
    setIsDossierModalOpen(true);
  };

  const handleSaveSelf = async () => {
    if (!selectedReview) return;
    await dispatch(submitSelfReview({ id: selectedReview.id, data: { selfRating, selfFeedback } }));
    showAlert('success', 'Self assessment submitted to reporting manager.');
  };

  const handleSaveManager = async () => {
    if (!selectedReview) return;
    await dispatch(
      submitManagerReview({
        id: selectedReview.id,
        data: {
          managerRating,
          managerFeedback,
          promotionRecommended: isPromotion,
          salaryHikePercentage: hikePercentage,
          pipRequired: isPip,
          pipNotes,
        },
      })
    );
    showAlert('success', 'Manager review completed and passed to HR for calibration.');
  };

  const handleSaveCalibration = async () => {
    if (!selectedReview) return;
    await dispatch(
      calibrateReview({
        id: selectedReview.id,
        data: {
          finalRating,
          promotionRecommended: isPromotion,
          salaryHikePercentage: hikePercentage,
          pipRequired: isPip,
          pipNotes,
        },
      })
    );
    showAlert('success', 'Appraisal review calibrated and finalized.');
    setIsDossierModalOpen(false);
    dispatch(fetchPerformanceSummary());
  };

  const filteredGoals = goals.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${g.employee.firstName} ${g.employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.employee.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredReviews = reviews.filter((r) =>
    `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employee.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.employee.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Performance, Goals & OKRs (PMS)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {summary?.activeCycle ? summary.activeCycle.title : 'Continuous Appraisal'}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Align company objectives, track individual OKR progress, and execute 360-degree rating calibrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageCycles && (
            <button
              onClick={() => setIsCycleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              Launch Review Cycle
            </button>
          )}
          {canManageGoals && (
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Establish New Goal
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      <AnimatePresence>
        {feedbackAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
              feedbackAlert.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedbackAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackAlert.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#E52328]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Goals / OKRs</p>
            <p className="text-2xl font-extrabold text-slate-900">{summary?.totalGoals ?? 0}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {summary?.completedGoals ?? 0} Goals Completed
            </p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average OKR Progress</p>
            <p className="text-2xl font-extrabold text-slate-900">{summary?.avgGoalProgress ?? 0}%</p>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${summary?.avgGoalProgress ?? 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Calibration</p>
            <p className="text-2xl font-extrabold text-slate-900 flex items-center gap-1">
              <span>{summary?.avgRating ?? 4.2}</span>
              <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold">Exceeding Expectations</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promotion Pipeline</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {summary?.reviewStats.promotions ?? 0}
            </p>
            <p className="text-[11px] text-purple-600 font-medium">Recommended for Elevate</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('goals'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'goals'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Goals & OKRs ({goals.length})
          </button>
          <button
            onClick={() => { setActiveTab('reviews'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'reviews'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Performance Reviews ({reviews.length})
          </button>
          <button
            onClick={() => { setActiveTab('cycles'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cycles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Cycles ({cycles.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'goals' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="DEPARTMENT">Departmental</option>
              <option value="COMPANY">Company Wide</option>
              <option value="DEVELOPMENT">Professional Development</option>
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:border-[#E52328]"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: GOALS & OKRS */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {goal.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      goal.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : goal.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {goal.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display line-clamp-1">{goal.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {goal.description || 'Deliver targeted milestone objectives.'}
                  </p>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-900">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        goal.progress >= 75
                          ? 'bg-emerald-500'
                          : goal.progress >= 40
                          ? 'bg-blue-500'
                          : 'bg-[#E52328]'
                      }`}
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Results Checklist */}
                {goal.keyResults && goal.keyResults.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Results</p>
                    {goal.keyResults.map((kr) => (
                      <div key={kr.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${kr.isCompleted ? 'text-emerald-500' : 'text-slate-300'}`}
                        />
                        <span className={`truncate ${kr.isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {kr.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-50 text-[#E52328] font-bold text-[10px] flex items-center justify-center">
                    {goal.employee.firstName[0]}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                    {goal.employee.firstName} {goal.employee.lastName}
                  </span>
                </div>

                {canManageGoals && (
                  <button
                    onClick={() => {
                      setTargetGoal(goal);
                      setNewProgress(goal.progress);
                      setIsProgressModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-[#E52328] hover:bg-red-50 transition-colors"
                  >
                    Update
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredGoals.length === 0 && (
            <div className="col-span-full p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No goals found</p>
              <p className="text-xs text-slate-400 mt-1">Set the first milestone or OKR target for your employees.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERFORMANCE REVIEWS MATRIX */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Cycle</th>
                  <th className="py-3.5 px-6">Self Score</th>
                  <th className="py-3.5 px-6">Manager Score</th>
                  <th className="py-3.5 px-6">Calibrated Rating</th>
                  <th className="py-3.5 px-6">Outcomes</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">
                          {rev.employee.firstName[0]}
                          {rev.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {rev.employee.firstName} {rev.employee.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {rev.employee.employeeCode} • {rev.employee.designation?.title || 'Engineer'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">{rev.cycle.title}</td>
                    <td className="py-4 px-6">
                      {rev.selfRating ? (
                        <span className="font-bold font-mono text-slate-900">{rev.selfRating} / 5.0</span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {rev.managerRating ? (
                        <span className="font-bold font-mono text-slate-900">{rev.managerRating} / 5.0</span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {rev.finalRating ? (
                        <span className="inline-flex items-center gap-1 font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          {rev.finalRating}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {rev.promotionRecommended && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            PROMOTION
                          </span>
                        )}
                        {rev.salaryHikePercentage && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            +{rev.salaryHikePercentage}% HIKE
                          </span>
                        )}
                        {rev.pipRequired && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            PIP
                          </span>
                        )}
                        {!rev.promotionRecommended && !rev.salaryHikePercentage && !rev.pipRequired && (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          rev.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : rev.status === 'PENDING_HR'
                            ? 'bg-purple-50 text-purple-700'
                            : rev.status === 'PENDING_MANAGER'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {rev.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canReviewPerformance && (
                        <button
                          onClick={() => handleOpenDossier(rev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          <span>Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredReviews.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">No appraisal reviews found</p>
                      <p className="text-xs text-slate-400">Enroll your team into an active cycle to trigger review forms.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: APPRAISAL CYCLES */}
      {activeTab === 'cycles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cycles.map((cyc) => (
            <div
              key={cyc.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E52328]/10 text-[#E52328] border border-[#E52328]/25">
                    {cyc.reviewType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {cyc.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">{cyc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                    {cyc.description || 'Organizational cycle for performance scoring.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Period:</span>
                    <span>{new Date(cyc.startDate).toLocaleDateString()} — {new Date(cyc.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Self Review Deadline:</span>
                    <span className="font-mono text-slate-800">
                      {cyc.selfReviewDeadline ? new Date(cyc.selfReviewDeadline).toLocaleDateString() : 'Rolling'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Staff Enrolled:</span>
                    <span className="font-bold text-slate-900">{cyc._count?.reviews || 0} employees</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Created {new Date(cyc.createdAt).toLocaleDateString()}</span>
                <span className="text-slate-900 font-bold">Active Engine</span>
              </div>
            </div>
          ))}

          {cycles.length === 0 && (
            <div className="col-span-full p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No review cycles configured</p>
              <p className="text-xs text-slate-400">Launch a quarterly or annual appraisal cycle to begin.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ESTABLISH NEW GOAL */}
      <AnimatePresence>
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Establish Goal & Key Results (OKR)</h3>
                  <p className="text-xs text-slate-400">Assign measurable targets to an employee.</p>
                </div>
                <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign To Employee *
                  </label>
                  <select
                    required
                    value={goalForm.employeeId}
                    onChange={(e) => setGoalForm({ ...goalForm, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-[#E52328]"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Goal / Objective Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ship Multi-Region Database Replication"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={goalForm.category}
                      onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="DEPARTMENT">Departmental</option>
                      <option value="COMPANY">Company</option>
                      <option value="DEVELOPMENT">Professional Development</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={goalForm.dueDate}
                      onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description & Success Criteria
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Outline key deliverables and architectural benchmarks..."
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Results (Measurable)</p>
                  <input
                    type="text"
                    placeholder="KR 1: Maintain p99 latency < 50ms under peak load"
                    value={goalForm.keyResult1}
                    onChange={(e) => setGoalForm({ ...goalForm, keyResult1: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E52328]"
                  />
                  <input
                    type="text"
                    placeholder="KR 2: Complete disaster recovery drill with 0 data loss"
                    value={goalForm.keyResult2}
                    onChange={(e) => setGoalForm({ ...goalForm, keyResult2: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGoalModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Save Goal & OKRs
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LAUNCH CYCLE */}
      <AnimatePresence>
        {isCycleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">Launch Appraisal Review Cycle</h3>
                  <p className="text-xs text-slate-400">Automatically creates review dossiers for active staff.</p>
                </div>
                <button onClick={() => setIsCycleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCycle} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cycle Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={cycleForm.title}
                    onChange={(e) => setCycleForm({ ...cycleForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Review Frequency
                    </label>
                    <select
                      value={cycleForm.reviewType}
                      onChange={(e) => setCycleForm({ ...cycleForm, reviewType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                    >
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUAL">Annual</option>
                      <option value="MID_YEAR">Mid-Year</option>
                      <option value="PROBATION">Probation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Self Deadline
                    </label>
                    <input
                      type="date"
                      value={cycleForm.selfReviewDeadline}
                      onChange={(e) => setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCycleModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Launch Cycle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: UPDATE GOAL PROGRESS */}
      <AnimatePresence>
        {isProgressModalOpen && targetGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">Update Progress</h3>
                <button onClick={() => setIsProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProgress} className="p-6 space-y-4">
                <p className="text-xs font-bold text-slate-800">{targetGoal.title}</p>
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500">Progress Percentage</span>
                    <span className="text-[#E52328] font-mono">{newProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newProgress}
                    onChange={(e) => setNewProgress(Number(e.target.value))}
                    className="w-full accent-[#E52328]"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProgressModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Save Progress
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: APPRAISAL DOSSIER & CALIBRATION */}
      <AnimatePresence>
        {isDossierModalOpen && selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E52328]/10 text-[#E52328]">
                      {selectedReview.cycle.title}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {selectedReview.employee.employeeCode}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 font-display">
                    {selectedReview.employee.firstName} {selectedReview.employee.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedReview.employee.designation?.title || 'Engineer'} • {selectedReview.employee.department?.name || 'Technology'}
                  </p>
                </div>
                <button onClick={() => setIsDossierModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs text-slate-700">
                {/* Linked OKRs Progress */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Linked OKRs ({selectedReview.goals?.length || 0})
                  </p>
                  {selectedReview.goals && selectedReview.goals.length > 0 ? (
                    selectedReview.goals.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-medium text-slate-800 truncate max-w-md">{g.title}</span>
                        <span className="font-bold font-mono text-slate-900">{g.progress}% Complete</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific OKRs tied to current cycle.</p>
                  )}
                </div>

                {/* 1. Self Review Section */}
                <div className="p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Employee Self Assessment</span>
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>{selfRating} / 5.0</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={selfRating}
                    onChange={(e) => setSelfRating(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="Describe personal milestones, obstacles overcome, and contributions..."
                    value={selfFeedback}
                    onChange={(e) => setSelfFeedback(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E52328]"
                  />
                  <button
                    onClick={handleSaveSelf}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Save Self Assessment
                  </button>
                </div>

                {/* 2. Manager Review Section */}
                <div className="p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. Manager Appraisal & Feedback</span>
                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
                      <span>{managerRating} / 5.0</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={managerRating}
                    onChange={(e) => setManagerRating(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <textarea
                    rows={2}
                    placeholder="Manager evaluation of technical rigor, team culture, and business impact..."
                    value={managerFeedback}
                    onChange={(e) => setManagerFeedback(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#E52328]"
                  />
                  <button
                    onClick={handleSaveManager}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                  >
                    Submit Manager Review
                  </button>
                </div>

                {/* 3. HR Committee Calibration (Final Decision) */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      3. HR Committee Final Calibration
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Final Score: {finalRating} / 5.0
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={finalRating}
                    onChange={(e) => setFinalRating(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Salary Hike Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={hikePercentage}
                        onChange={(e) => setHikePercentage(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                        <input
                          type="checkbox"
                          checked={isPromotion}
                          onChange={(e) => setIsPromotion(e.target.checked)}
                          className="rounded text-[#E52328]"
                        />
                        <span>Recommend Promotion</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-300">
                        <input
                          type="checkbox"
                          checked={isPip}
                          onChange={(e) => setIsPip(e.target.checked)}
                          className="rounded text-rose-500"
                        />
                        <span>Place on PIP (Performance Plan)</span>
                      </label>
                    </div>
                  </div>

                  {isPip && (
                    <div>
                      <label className="block text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1">
                        PIP Remediation Benchmarks
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Specific 60-day corrective action expectations..."
                        value={pipNotes}
                        onChange={(e) => setPipNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-rose-900/40 text-xs text-rose-200 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveCalibration}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all"
                    >
                      Finalize Calibration & Close Review
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
