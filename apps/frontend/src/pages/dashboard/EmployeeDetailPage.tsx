import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchEmployeeById,
  updateEmployee,
  addEmployeeDocument,
  updateOnboardingTask,
} from '../../store/slices/employeeSlice';
import { api } from '../../services/api';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  User,
  Shield,
  AlertCircle,
  Copy,
  History,
  Check,
  Plus,
  Loader2,
  X,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const { currentEmployee, isLoading } = useSelector(
    (state: RootState) => state.employees
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'onboarding' | 'documents' | 'lifecycle'>('overview');
  const [copiedCode, setCopiedCode] = useState(false);

  // Status Change State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Add Document Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('IDENTITY_PROOF');
  const [docFileName, setDocFileName] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docError, setDocError] = useState<string | null>(null);

  // Add Emergency Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRel, setContactRel] = useState('Spouse');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchEmployeeById(id));
    }
  }, [dispatch, id]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || newStatus === currentEmployee?.status) return;
    setIsUpdatingStatus(true);
    try {
      await dispatch(updateEmployee({ id, data: { status: newStatus } }));
      dispatch(fetchEmployeeById(id));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleTaskStatusToggle = async (taskId: string, currentStatus: string) => {
    if (!id) return;
    const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await dispatch(updateOnboardingTask({ employeeId: id, taskId, status: nextStatus }));
    dispatch(fetchEmployeeById(id));
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !docTitle) return;
    setDocError(null);
    setIsUploadingDoc(true);

    try {
      const payload = {
        title: docTitle.trim(),
        documentType: docType,
        fileName: docFileName.trim() || `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileUrl: docFileUrl.trim() || `https://storage.codeorbit.io/docs/${id}/${docFileName || 'doc.pdf'}`,
        fileSize: Math.floor(Math.random() * 800000) + 120000,
        expiryDate: docExpiryDate || undefined,
      };

      const result = await dispatch(addEmployeeDocument({ employeeId: id, doc: payload }));
      if (addEmployeeDocument.fulfilled.match(result)) {
        setIsDocModalOpen(false);
        setDocTitle('');
        setDocFileName('');
        setDocFileUrl('');
        setDocExpiryDate('');
        dispatch(fetchEmployeeById(id));
      } else {
        setDocError(result.payload as string);
      }
    } catch (err: any) {
      setDocError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleAddEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !contactName || !contactPhone) return;
    setIsSubmittingContact(true);

    try {
      await api.post(`/employees/${id}/emergency-contacts`, {
        name: contactName.trim(),
        relationship: contactRel,
        phone: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
        isPrimary: currentEmployee?.emergencyContacts.length === 0,
      });
      setIsContactModalOpen(false);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      dispatch(fetchEmployeeById(id));
    } catch (err: any) {
      alert('Failed to add emergency contact: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingContact(false);
    }
  };

  if (isLoading && !currentEmployee) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
        <p className="text-slate-400 text-sm">Loading employee dossier...</p>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white">Employee Record Not Found</h2>
        <p className="text-sm text-slate-400 mt-1">
          The requested employee may have been deleted or belongs to a different tenant.
        </p>
        <Link
          to="/dashboard/employees"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  // Calculate Onboarding Completion
  const totalTasks = currentEmployee.onboardingTasks?.length || 0;
  const completedTasks = currentEmployee.onboardingTasks?.filter((t) => t.status === 'COMPLETED').length || 0;
  const onboardingPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/employees"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Employee Directory</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">ID: {currentEmployee.id}</span>
      </div>

      {/* Hero Header Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Identification */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-[2px] shadow-glow-sm shrink-0">
              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center font-extrabold text-2xl text-white">
                {currentEmployee.firstName?.[0]}
                {currentEmployee.lastName?.[0]}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {currentEmployee.firstName} {currentEmployee.lastName}
                </h1>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 font-mono text-xs font-bold text-indigo-300">
                  <span>{currentEmployee.employeeCode}</span>
                  <button
                    onClick={() => handleCopyCode(currentEmployee.employeeCode)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  {currentEmployee.designation?.title || 'Team Member'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {currentEmployee.department?.name || 'General Operations'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Joined {new Date(currentEmployee.joiningDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Quick Action Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Lifecycle State
              </label>
              <div className="relative inline-block">
                <select
                  disabled={isUpdatingStatus}
                  value={currentEmployee.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-3.5 py-2 pr-8 rounded-xl text-xs font-semibold border appearance-none cursor-pointer focus:outline-none ${
                    currentEmployee.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : currentEmployee.status === 'ONBOARDING'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : currentEmployee.status === 'PROBATION'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <option value="ACTIVE" className="bg-slate-900 text-white">ACTIVE</option>
                  <option value="ONBOARDING" className="bg-slate-900 text-white">ONBOARDING</option>
                  <option value="PROBATION" className="bg-slate-900 text-white">PROBATION</option>
                  <option value="SUSPENDED" className="bg-slate-900 text-white">SUSPENDED</option>
                  <option value="TERMINATED" className="bg-slate-900 text-white">TERMINATED</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Contact Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{currentEmployee.workEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{currentEmployee.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Employment: {currentEmployee.employmentType.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-glow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Overview & Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('onboarding')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'onboarding'
              ? 'bg-indigo-600 text-white shadow-glow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Onboarding Checklist</span>
          {totalTasks > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-900/60 font-mono">
              {completedTasks}/{totalTasks}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'bg-indigo-600 text-white shadow-glow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents ({currentEmployee.employeeDocuments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'lifecycle'
              ? 'bg-indigo-600 text-white shadow-glow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Lifecycle History</span>
        </button>
      </div>

      {/* Tab Content 1: Overview & Dossier */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Assignment Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Organizational & Job Assignment</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-slate-500 font-medium">Department</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.department?.name || 'Unassigned'} ({currentEmployee.department?.code || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Designation / Role</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.designation?.title || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Employment Type</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.employmentType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Reports To</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.manager
                    ? `${currentEmployee.manager.firstName} ${currentEmployee.manager.lastName}`
                    : 'Direct to Executive'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Official Work Email</p>
                <p className="text-white font-semibold mt-1 truncate">
                  {currentEmployee.workEmail}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Joining Date</p>
                <p className="text-white font-semibold mt-1">
                  {new Date(currentEmployee.joiningDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Profile Details */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Personal & Contact Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-slate-500 font-medium">Personal Email</p>
                <p className="text-white font-semibold mt-1 truncate">
                  {currentEmployee.personalEmail || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Phone</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.phone || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Gender</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.gender ? currentEmployee.gender.replace('_', ' ') : 'Not Disclosed'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Date of Birth</p>
                <p className="text-white font-semibold mt-1">
                  {currentEmployee.dateOfBirth
                    ? new Date(currentEmployee.dateOfBirth).toLocaleDateString()
                    : 'Not recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contacts Section */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Emergency Contacts ({currentEmployee.emergencyContacts?.length || 0})</span>
              </h3>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {currentEmployee.emergencyContacts?.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No emergency contacts registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentEmployee.emergencyContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{contact.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>{contact.phone}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Interactive Onboarding Checklist */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Onboarding Completion Status</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track automated checklists generated during employee registration.
                </p>
              </div>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {onboardingPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${onboardingPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="glass-card rounded-2xl border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
            {currentEmployee.onboardingTasks?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No onboarding checklist tasks found for this employee.
              </div>
            ) : (
              currentEmployee.onboardingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                    task.status === 'COMPLETED' ? 'bg-emerald-950/10' : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleTaskStatusToggle(task.id, task.status)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-700 bg-slate-900 hover:border-indigo-400'
                      }`}
                    >
                      {task.status === 'COMPLETED' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                          {task.category}
                        </span>
                        {task.dueDate && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border shrink-0 ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Documents & Compliance */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Employee Records & Attachments</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Securely attached compliance forms, IDs, and employment contracts.
              </p>
            </div>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Attach Document</span>
            </button>
          </div>

          {currentEmployee.employeeDocuments?.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-slate-800/80">
              <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-white">No documents attached</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Attach government identity documents, signed offer letters, or education transcripts.
              </p>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentEmployee.employeeDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-indigo-500/30 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{doc.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {doc.documentType}
                        </span>
                        {doc.fileSize && (
                          <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                        )}
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="View Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Lifecycle History */}
      {activeTab === 'lifecycle' && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Employee Lifecycle Timeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable audit history of status updates, promotions, and organizational shifts.
            </p>
          </div>

          {currentEmployee.lifecycleEvents?.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No lifecycle events recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
              {currentEmployee.lifecycleEvents.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-950 group-hover:scale-125 transition-transform"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {event.eventType.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(event.effectiveDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Attach Employee Document</span>
              </h3>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {docError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {docError}
              </div>
            )}

            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Passport Copy"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="IDENTITY_PROOF">ID Proof / Passport</option>
                  <option value="RESUME">Resume / CV</option>
                  <option value="OFFER_LETTER">Signed Offer Letter</option>
                  <option value="EMPLOYMENT_CONTRACT">Employment Contract</option>
                  <option value="EDUCATIONAL_CERTIFICATE">Educational Degree / Certificate</option>
                  <option value="EXPERIENCE_LETTER">Experience Certificate</option>
                  <option value="PAYSLIP_PREVIOUS">Previous Payslip</option>
                  <option value="OTHER">Other Compliance Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  placeholder="passport_scan.pdf"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Document Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isUploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Attach Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Add Emergency Contact</span>
              </h3>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmergencyContact} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Michael Connor"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Relationship *
                </label>
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 901-2345"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="m.connor@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isSubmittingContact && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Contact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
