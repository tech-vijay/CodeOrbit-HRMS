import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchDepartments,
  createDepartment,
  fetchDesignations,
  createDesignation,
  fetchMembers,
  inviteMember,
  fetchRoles,
} from '../../store/slices/orgSlice';
import {
  Building2,
  Briefcase,
  Shield,
  Users,
  Plus,
  Search,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { hasAdminPermission } from '../../utils/permissions';

export const DepartmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { departments, designations, members, roles, isLoading } = useSelector(
    (state: RootState) => state.org
  );
  const { activeOrganization, user } = useSelector((state: RootState) => state.auth);
  const activeRole = activeOrganization?.role.name || activeOrganization?.role.slug || user?.role;
  const canManageOrganization = hasAdminPermission(activeRole, activeOrganization?.role.permissions, 'org:update', user?.isSuperAdmin);
  const canInviteMembers = hasAdminPermission(activeRole, activeOrganization?.role.permissions, 'employee:create', user?.isSuperAdmin);

  const [activeTab, setActiveTab] = useState<'departments' | 'designations' | 'roles' | 'members'>('departments');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [desigForm, setDesigForm] = useState({ title: '', code: '', description: '' });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    phone: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [invitationCopied, setInvitationCopied] = useState(false);

  useEffect(() => {
    dispatch(fetchDepartments());
    dispatch(fetchDesignations());
    dispatch(fetchMembers());
    dispatch(fetchRoles());
  }, [dispatch]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    try {
      const res = await dispatch(createDepartment({ ...deptForm, code: deptForm.code.toUpperCase() }));
      if (createDepartment.fulfilled.match(res)) {
        showFeedback('success', `Department '${deptForm.name}' created successfully.`);
        setDeptForm({ name: '', code: '', description: '' });
        setIsDeptModalOpen(false);
      } else {
        showFeedback('error', res.payload as string);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleCreateDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigForm.title || !desigForm.code) return;
    try {
      const res = await dispatch(createDesignation({ ...desigForm, code: desigForm.code.toUpperCase() }));
      if (createDesignation.fulfilled.match(res)) {
        showFeedback('success', `Designation '${desigForm.title}' created successfully.`);
        setDesigForm({ title: '', code: '', description: '' });
        setIsDesigModalOpen(false);
      } else {
        showFeedback('error', res.payload as string);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.roleId) return;
    try {
      const res = await dispatch(inviteMember(inviteForm));
      if (inviteMember.fulfilled.match(res)) {
        setInvitationUrl(res.payload.invitationUrl);
        showFeedback('success', `Invitation prepared for ${inviteForm.email}. Share the setup link within 72 hours.`);
        dispatch(fetchMembers());
        setInviteForm({ email: '', firstName: '', lastName: '', roleId: '', phone: '' });
        setIsInviteModalOpen(false);
      } else {
        showFeedback('error', res.payload as string);
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDesignations = designations.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Departments, Roles & Governance
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Configure business units, titles, role-based access control (RBAC), and team memberships.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-3">
          {canManageOrganization && activeTab === 'departments' && (
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          )}
          {canManageOrganization && activeTab === 'designations' && (
            <button
              onClick={() => setIsDesigModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Designation
            </button>
          )}
          {canInviteMembers && activeTab === 'members' && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52328] hover:bg-[#c41e22] text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Mail className="w-4 h-4" />
              Invite Team Member
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {invitationUrl && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-blue-900">One-time setup link (expires in 72 hours)</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(invitationUrl);
                setInvitationCopied(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800"
            >
              <Copy className="w-3.5 h-3.5" /> {invitationCopied ? 'Copied' : 'Copy link'}
            </button>
          </div>
          <p className="break-all text-xs text-blue-800">{invitationUrl}</p>
          <button type="button" onClick={() => setInvitationUrl(null)} className="text-xs text-blue-700 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('departments'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'departments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            onClick={() => { setActiveTab('designations'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'designations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Designations ({designations.length})
          </button>
          <button
            onClick={() => { setActiveTab('roles'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roles'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Roles & Permissions ({roles.length})
          </button>
          <button
            onClick={() => { setActiveTab('members'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Team Members ({members.length})
          </button>
        </div>

        {activeTab !== 'roles' && (
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
        )}
      </div>

      {/* TAB 1: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => (
            <div
              key={dept.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                    {dept.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {dept._count?.employees ?? 0} employees
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display mb-1">{dept.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {dept.description || 'No description provided for this department.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Created {new Date(dept.createdAt).toLocaleDateString()}</span>
                <span className="text-[#00bb7f] font-semibold">Active Unit</span>
              </div>
            </div>
          ))}

          {filteredDepartments.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No departments found</p>
              <p className="text-xs text-slate-400 mt-1">Get started by creating your first organizational unit.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DESIGNATIONS */}
      {activeTab === 'designations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDesignations.map((desig) => (
            <div
              key={desig.id}
              className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-100">
                    {desig.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {desig._count?.employees ?? 0} staff
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display mb-1">{desig.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {desig.description || 'Standard corporate job title and grading position.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Active Title</span>
                <span className="text-purple-600 font-semibold font-mono text-[11px]">Rank Scoped</span>
              </div>
            </div>
          ))}

          {filteredDesignations.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No designations found</p>
              <p className="text-xs text-slate-400 mt-1">Add job titles and positions for your organizational hierarchy.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROLES & RBAC MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {roles.map((role) => (
              <div
                key={role.id}
                className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white">
                      {role.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      slug: {role.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    {role.description || (role.isSystemRole ? 'System-defined security policy role.' : 'Custom organization role.')}
                  </p>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Granted Permissions ({role.permissions?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {role.permissions && role.permissions.length > 0 ? (
                        role.permissions.map((rp: any) => (
                          <span
                            key={rp.id || rp.permission?.id}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {rp.permission?.code || rp.permissionCode}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No specific permissions attached</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    OWASP RBAC Protected
                  </span>
                  {role.isSystemRole && (
                    <span className="text-xs font-semibold text-slate-500">System Protected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Member Name & Email</th>
                  <th className="py-3.5 px-6">Assigned Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Last Active</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {m.user.firstName[0]}
                          {m.user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-[#E52328] border border-red-100">
                        <Shield className="w-3 h-3" />
                        {m.role.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">Create Department</h3>
                <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDept} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering & Platform"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Department Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ENG"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the department's mandate..."
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#E52328] hover:bg-[#c41e22] text-white shadow-xs"
                  >
                    Create Department
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD DESIGNATION */}
      <AnimatePresence>
        {isDesigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">Create Designation</h3>
                <button onClick={() => setIsDesigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDesig} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Title / Designation
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer"
                    value={desigForm.title}
                    onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designation Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. SSE"
                    value={desigForm.code}
                    onChange={(e) => setDesigForm({ ...desigForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Responsibilities and rank overview..."
                    value={desigForm.description}
                    onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDesigModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#E52328] hover:bg-[#c41e22] text-white shadow-xs"
                  >
                    Create Designation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: INVITE MEMBER */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">Invite Team Member</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@codeorbit.io"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign Role
                  </label>
                  <select
                    required
                    value={inviteForm.roleId}
                    onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  >
                    <option value="">Select a security role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#E52328]"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#E52328] hover:bg-[#c41e22] text-white shadow-xs"
                  >
                    Send Invitation
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
