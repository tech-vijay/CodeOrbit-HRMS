import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchEmployees,
  createEmployee,
} from '../../store/slices/employeeSlice';
import {
  fetchDepartments,
  fetchDesignations,
} from '../../store/slices/orgSlice';
import { api } from '../../services/api';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Download,
  Briefcase,
  Building,
  Mail,
  ChevronRight,
  Shield,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrganization } = useSelector((state: RootState) => state.auth);
  const { items: employees, total, page, totalPages, isLoading } = useSelector(
    (state: RootState) => state.employees
  );
  const { departments, designations } = useSelector((state: RootState) => state.org);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Add Employee Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    personalEmail: '',
    phone: '',
    gender: 'PREFER_NOT_TO_SAY',
    dateOfBirth: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    employmentType: 'FULL_TIME',
    departmentId: '',
    designationId: '',
    createUserAccount: true,
    accountPassword: '',
    emergencyContactName: '',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    if (activeOrganization) {
      dispatch(fetchDepartments());
      dispatch(fetchDesignations());
    }
  }, [dispatch, activeOrganization]);

  useEffect(() => {
    if (activeOrganization) {
      dispatch(
        fetchEmployees({
          search: searchTerm || undefined,
          departmentId: selectedDept || undefined,
          status: selectedStatus || undefined,
          page: currentPage,
          limit: 15,
        })
      );
    }
  }, [dispatch, activeOrganization, searchTerm, selectedDept, selectedStatus, currentPage]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/employees/export', {
        params: { format: 'csv' },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employees_${activeOrganization?.slug || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export employee records: ' + (err.message || 'Error'));
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const payload: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      workEmail: formData.workEmail.trim(),
      personalEmail: formData.personalEmail.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || undefined,
      joiningDate: formData.joiningDate,
      status: formData.status,
      employmentType: formData.employmentType,
      departmentId: formData.departmentId || undefined,
      designationId: formData.designationId || undefined,
      createUserAccount: formData.createUserAccount,
      accountPassword: formData.createUserAccount && formData.accountPassword ? formData.accountPassword : undefined,
    };

    if (formData.emergencyContactName && formData.emergencyContactPhone) {
      payload.emergencyContacts = [
        {
          name: formData.emergencyContactName.trim(),
          relationship: formData.emergencyContactRelationship,
          phone: formData.emergencyContactPhone.trim(),
          isPrimary: true,
        },
      ];
    }

    try {
      const resultAction = await dispatch(createEmployee(payload));
      if (createEmployee.fulfilled.match(resultAction)) {
        setIsModalOpen(false);
        setFormData({
          firstName: '',
          lastName: '',
          workEmail: '',
          personalEmail: '',
          phone: '',
          gender: 'PREFER_NOT_TO_SAY',
          dateOfBirth: '',
          joiningDate: new Date().toISOString().split('T')[0],
          status: 'ACTIVE',
          employmentType: 'FULL_TIME',
          departmentId: '',
          designationId: '',
          createUserAccount: true,
          accountPassword: '',
          emergencyContactName: '',
          emergencyContactRelationship: 'Spouse',
          emergencyContactPhone: '',
        });
      } else {
        setSubmitError(resultAction.payload as string);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper avatar generator
  const getInitials = (first: string, last: string) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ONBOARDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PROBATION':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'SUSPENDED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'TERMINATED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const onboardingCount = employees.filter((e) => e.status === 'ONBOARDING').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Human Capital Management</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Phase 2 Core</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Employee Directory & Profiles
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage comprehensive employee dossiers, lifecycle transitions, onboarding tasks, and documents.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-glow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Workforce</p>
            <p className="text-xl font-bold text-white tracking-tight">{total}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Active Staff</p>
            <p className="text-xl font-bold text-white tracking-tight">{activeCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">In Onboarding</p>
            <p className="text-xl font-bold text-white tracking-tight">{onboardingCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center gap-3 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Departments</p>
            <p className="text-xl font-bold text-white tracking-tight">{departments.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="relative flex-1 md:w-48">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="PROBATION">Probation</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(searchTerm || selectedDept || selectedStatus) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('');
                setSelectedStatus('');
              }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Clear Filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Employee Profile</th>
                <th className="py-4 px-6">Employee Code</th>
                <th className="py-4 px-6">Department & Role</th>
                <th className="py-4 px-6">Employment</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Joined Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {isLoading && employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading employee directory...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                    <p className="font-semibold text-white">No employees found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchTerm || selectedDept || selectedStatus
                        ? 'Try refining your search terms or filters.'
                        : 'Begin onboarding your staff members to manage their lifecycle, documents, and roles.'}
                    </p>
                    {!searchTerm && !selectedDept && !selectedStatus && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add First Employee</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 p-[1.5px] shrink-0">
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">
                            {getInitials(emp.firstName, emp.lastName)}
                          </div>
                        </div>
                        <div>
                          <Link
                            to={`/dashboard/employees/${emp.id}`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{emp.firstName} {emp.lastName}</span>
                          </Link>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{emp.workEmail}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-xs font-semibold text-indigo-300">
                        <span>{emp.employeeCode}</span>
                        <button
                          onClick={() => handleCopyCode(emp.employeeCode)}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode === emp.employeeCode ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="text-white font-medium text-xs">
                          {emp.designation?.title || 'Not Assigned'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          <span>{emp.department?.name || 'General'}</span>
                        </p>
                      </div>
                    </td>

                    {/* Employment Type */}
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-300 font-medium">
                        {emp.employmentType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          emp.status
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{emp.status}</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(emp.joiningDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/dashboard/employees/${emp.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-semibold transition-all border border-slate-700/60"
                      >
                        <span>Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-900/30">
            <span>
              Showing page {page} of {totalPages} ({total} employees)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-white"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <span>Onboard New Employee</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Creates an employee profile with automatic code generation, onboarding checklist, and user account.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Personal Details</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. Sarah"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g. Connor"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      placeholder="s.connor@acme.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      placeholder="sarah@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Assignment */}
              <div className="pt-4 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Job Assignment & Role</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Designation / Title
                    </label>
                    <select
                      value={formData.designationId}
                      onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Designation</option>
                      {designations.map((desig) => (
                        <option key={desig.id} value={desig.id}>
                          {desig.title} ({desig.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Employment Type
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Joining Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Portal Access */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      User Portal Access
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.createUserAccount}
                      onChange={(e) => setFormData({ ...formData, createUserAccount: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {formData.createUserAccount && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Account Initial Password (optional — defaults to secure random)
                    </label>
                    <input
                      type="password"
                      value={formData.accountPassword}
                      onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-slate-800/80">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Emergency Contact (Optional)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <select
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Contact Phone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 shadow-glow-sm transition-all"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Registering...' : 'Register Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
