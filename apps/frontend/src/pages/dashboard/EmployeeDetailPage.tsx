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
import { api, resolveApiAssetUrl } from '../../services/api';
import { uploadFile } from '../../services/upload';
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
  const [docFile, setDocFile] = useState<File | null>(null);
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
      let finalFileUrl = docFileUrl.trim();
      let finalFileName = docFileName.trim();
      let finalFileSize = 250000;
      let finalMimeType = 'application/pdf';

      if (docFile) {
        const uploadRes = await uploadFile(docFile, 'documents');
        finalFileUrl = uploadRes.fileUrl;
        finalFileName = uploadRes.fileName;
        finalFileSize = uploadRes.fileSize;
        finalMimeType = uploadRes.mimeType;
      } else if (!finalFileUrl) {
        finalFileName = finalFileName || `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        finalFileUrl = `/uploads/documents/${id}_${finalFileName}`;
      }

      const payload = {
        title: docTitle.trim(),
        documentType: docType,
        fileName: finalFileName,
        fileUrl: finalFileUrl,
        fileSize: finalFileSize,
        mimeType: finalMimeType,
        expiryDate: docExpiryDate || undefined,
      };

      const result = await dispatch(addEmployeeDocument({ employeeId: id, doc: payload }));
      if (addEmployeeDocument.fulfilled.match(result)) {
        setIsDocModalOpen(false);
        setDocTitle('');
        setDocFileName('');
        setDocFileUrl('');
        setDocFile(null);
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
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#E52328] mb-3" />
        <p className="text-slate-500 text-sm">Loading employee dossier...</p>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Employee Record Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">
          The requested employee may have been deleted or belongs to a different tenant.
        </p>
        <Link
          to="/dashboard/employees"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#E52328] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Employee Directory</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">ID: {currentEmployee.id}</span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Identification */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#E52328] via-[#fb2c36] to-[#AB1428] p-[2px] shadow-sm shrink-0">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center font-extrabold text-2xl text-slate-900 font-display">
                {currentEmployee.firstName?.[0]}
                {currentEmployee.lastName?.[0]}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
                  {currentEmployee.firstName} {currentEmployee.lastName}
                </h1>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200/60 font-mono text-xs font-bold text-[#E52328]">
                  <span>{currentEmployee.employeeCode}</span>
                  <button
                    onClick={() => handleCopyCode(currentEmployee.employeeCode)}
                    className="text-slate-400 hover:text-[#E52328] transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-[#00bb7f]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {currentEmployee.designation?.title || 'Team Member'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {currentEmployee.department?.name || 'General Operations'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                Lifecycle State
              </label>
              <div className="relative inline-block">
                <select
                  disabled={isUpdatingStatus}
                  value={currentEmployee.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-3.5 py-2 pr-8 rounded-xl text-xs font-semibold border appearance-none cursor-pointer focus:outline-none ${
                    currentEmployee.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : currentEmployee.status === 'ONBOARDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : currentEmployee.status === 'PROBATION'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <option value="ACTIVE" className="bg-white text-slate-900">ACTIVE</option>
                  <option value="ONBOARDING" className="bg-white text-slate-900">ONBOARDING</option>
                  <option value="PROBATION" className="bg-white text-slate-900">PROBATION</option>
                  <option value="SUSPENDED" className="bg-white text-slate-900">SUSPENDED</option>
                  <option value="TERMINATED" className="bg-white text-slate-900">TERMINATED</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Contact Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-[#E52328] shrink-0" />
            <span className="truncate">{currentEmployee.workEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-[#3080ff] shrink-0" />
            <span>{currentEmployee.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Shield className="w-4 h-4 text-[#00bb7f] shrink-0" />
            <span>Employment: {currentEmployee.employmentType.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#E52328] to-[#AB1428] text-white shadow-glow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Overview & Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('onboarding')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeTab === 'onboarding'
              ? 'bg-gradient-to-r from-[#E52328] to-[#AB1428] text-white shadow-glow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Onboarding Checklist</span>
          {totalTasks > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-mono">
              {completedTasks}/{totalTasks}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'bg-gradient-to-r from-[#E52328] to-[#AB1428] text-white shadow-glow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents ({currentEmployee.employeeDocuments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'lifecycle'
              ? 'bg-gradient-to-r from-[#E52328] to-[#AB1428] text-white shadow-glow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
              <Briefcase className="w-4 h-4 text-[#E52328]" />
              <span>Organizational & Job Assignment</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-slate-500 font-medium">Department</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.department?.name || 'Unassigned'} ({currentEmployee.department?.code || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Designation / Role</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.designation?.title || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Employment Type</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.employmentType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Reports To</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.manager
                    ? `${currentEmployee.manager.firstName} ${currentEmployee.manager.lastName}`
                    : 'Direct to Executive'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Official Work Email</p>
                <p className="text-slate-900 font-semibold mt-1 truncate">
                  {currentEmployee.workEmail}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Joining Date</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {new Date(currentEmployee.joiningDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Profile Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
              <User className="w-4 h-4 text-[#E52328]" />
              <span>Personal & Contact Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <p className="text-slate-500 font-medium">Personal Email</p>
                <p className="text-slate-900 font-semibold mt-1 truncate">
                  {currentEmployee.personalEmail || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Phone</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.phone || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Gender</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.gender ? currentEmployee.gender.replace('_', ' ') : 'Not Disclosed'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Date of Birth</p>
                <p className="text-slate-900 font-semibold mt-1">
                  {currentEmployee.dateOfBirth
                    ? new Date(currentEmployee.dateOfBirth).toLocaleDateString()
                    : 'Not recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contacts Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <AlertCircle className="w-4 h-4 text-[#f99c00]" />
                <span>Emergency Contacts ({currentEmployee.emergencyContacts?.length || 0})</span>
              </h3>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E52328]" />
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
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-[#E52328] mt-2 flex items-center gap-1.5 font-medium">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <CheckCircle2 className="w-4 h-4 text-[#00bb7f]" />
                  <span>Onboarding Completion Status</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track automated checklists generated during employee registration.
                </p>
              </div>
              <span className="text-lg font-black text-[#00bb7f] font-mono">
                {onboardingPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-[#AB1428] via-[#E52328] to-[#00bb7f] transition-all duration-500 rounded-full"
                style={{ width: `${onboardingPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
            {currentEmployee.onboardingTasks?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No onboarding checklist tasks found for this employee.
              </div>
            ) : (
              currentEmployee.onboardingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                    task.status === 'COMPLETED' ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleTaskStatusToggle(task.id, task.status)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        task.status === 'COMPLETED'
                          ? 'bg-[#00bb7f] border-[#00bb7f] text-white'
                          : 'border-slate-300 bg-white hover:border-[#E52328]'
                      }`}
                    >
                      {task.status === 'COMPLETED' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
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
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
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
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <FileText className="w-4 h-4 text-[#E52328]" />
                <span>Employee Records & Attachments</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Securely attached compliance forms, IDs, and employment contracts.
              </p>
            </div>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="btn-wipronix-primary px-4 py-2 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Attach Document</span>
            </button>
          </div>

          {currentEmployee.employeeDocuments?.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
              <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No documents attached</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Attach government identity documents, signed offer letters, or education transcripts.
              </p>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="btn-wipronix-primary mt-4 px-4 py-2 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
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
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#E52328]/40 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#E52328] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
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
                    href={resolveApiAssetUrl(doc.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
              <History className="w-4 h-4 text-[#E52328]" />
              <span>Employee Lifecycle Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable audit history of status updates, promotions, and organizational shifts.
            </p>
          </div>

          {currentEmployee.lifecycleEvents?.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No lifecycle events recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {currentEmployee.lifecycleEvents.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#E52328] border-2 border-white group-hover:scale-125 transition-transform shadow-sm"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
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
                    <p className="text-xs text-slate-600 mt-1">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <Upload className="w-4 h-4 text-[#E52328]" />
                <span>Attach Employee Document</span>
              </h3>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {docError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {docError}
              </div>
            )}

            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Passport Copy"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Upload Document File (.pdf, .png, .jpg, .docx)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setDocFile(f);
                      setDocFileName(f.name);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                />
                {docFileName && (
                  <p className="mt-1.5 text-[11px] text-emerald-600 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready: {docFileName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc}
                  className="btn-wipronix-primary px-4 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <AlertCircle className="w-4 h-4 text-[#f99c00]" />
                <span>Add Emergency Contact</span>
              </h3>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmergencyContact} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Michael Connor"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Relationship *
                </label>
                <select
                  value={contactRel}
                  onChange={(e) => setContactRel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 901-2345"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="m.connor@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E52328] focus:ring-1 focus:ring-[#E52328]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="btn-wipronix-primary px-4 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
