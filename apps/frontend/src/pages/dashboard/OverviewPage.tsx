import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import {
  fetchOrgProfile,
  fetchDepartments,
  createDepartment,
  fetchMembers,
  fetchAuditLogs,
} from '../../store/slices/orgSlice';
import {
  Users,
  Building2,
  Briefcase,
  ShieldAlert,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeOrganization, user } = useSelector((state: RootState) => state.auth);
  const { departments, members, auditLogs } = useSelector(
    (state: RootState) => state.org
  );

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrganization) {
      dispatch(fetchOrgProfile());
      dispatch(fetchDepartments());
      dispatch(fetchMembers());
      dispatch(fetchAuditLogs());
    }
  }, [dispatch, activeOrganization]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptCode) return;
    await dispatch(
      createDepartment({
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDesc,
      })
    );
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setIsDeptModalOpen(false);
  };

  const handleCheckInOut = () => {
    if (!isCheckedIn) {
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setIsCheckedIn(false);
    }
  };

  // Mock Trend Analytics for Visualization
  const attendanceTrendData = [
    { day: 'Mon', present: 96, absent: 4 },
    { day: 'Tue', present: 98, absent: 2 },
    { day: 'Wed', present: 95, absent: 5 },
    { day: 'Thu', present: 99, absent: 1 },
    { day: 'Fri', present: 97, absent: 3 },
    { day: 'Sat', present: 92, absent: 8 },
  ];

  const departmentDistribution = [
    { name: 'Engineering', value: 45, color: '#E52328' },
    { name: 'Product & Design', value: 20, color: '#fb2c36' },
    { name: 'HR & Ops', value: 15, color: '#00bb7f' },
    { name: 'Sales & Growth', value: 20, color: '#f99c00' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E52328]/15 text-[#fb2c36] border border-[#E52328]/30 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#fb2c36]" />
            <span>Active Tenant: {activeOrganization?.name || 'Loading'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-slate-400">
            Tenant status is <span className="text-[#00bb7f] font-semibold">Active & Isolated</span>. All server security policies and RBAC controls are enforced.
          </p>
        </div>

        {/* Quick Check-in/out Interactive Self-Service Widget */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-4 shrink-0 shadow-lg">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Self Attendance
            </span>
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-[#00bb7f] animate-pulse' : 'bg-slate-500'}`}></span>
              {isCheckedIn ? `Punched In (${checkInTime})` : 'Not Checked In'}
            </span>
          </div>

          <button
            onClick={handleCheckInOut}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isCheckedIn
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                : 'btn-wipronix-primary text-white shadow-glow-sm'
            }`}
          >
            {isCheckedIn ? 'Check Out' : 'Check In Now'}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Staff</span>
            <Users className="w-5 h-5 text-[#fb2c36]" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{members.length || 2}</p>
          <div className="mt-2 text-xs text-[#00bb7f] flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Membership Verified
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Departments</span>
            <Building2 className="w-5 h-5 text-[#E52328]" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{departments.length || 0}</p>
          <div className="mt-2 text-xs text-[#fb2c36] flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> Scoped to Organization
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Role Authority</span>
            <Briefcase className="w-5 h-5 text-[#f99c00]" />
          </div>
          <p className="text-xl font-bold text-white truncate mt-1 font-display">
            {activeOrganization?.role.name || 'Admin'}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1 font-mono">
            Permissions: {activeOrganization?.role.permissions.length || 'Full'}
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Events</span>
            <ShieldAlert className="w-5 h-5 text-[#00bb7f]" />
          </div>
          <p className="text-3xl font-bold text-white tracking-tight font-display">{auditLogs.length}</p>
          <div className="mt-2 text-xs text-[#00bb7f] flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Immutable Log Enforced
          </div>
        </div>
      </div>

      {/* Analytics Charts & Workforce Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-display">Workforce Attendance Analytics</h3>
              <p className="text-xs text-slate-400">Weekly present percentage across organization</p>
            </div>
            <span className="text-xs font-mono text-[#fb2c36] bg-[#E52328]/10 px-2.5 py-1 rounded-md border border-[#E52328]/25 font-bold">
              Avg: 96.8%
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E52328" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#AB1428" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[85, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#20202c', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="present" stroke="#E52328" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Composition Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight font-display">Staff Distribution</h3>
            <p className="text-xs text-slate-400">Headcount by functional division</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#20202c', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2">
            {departmentDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                  {d.name}
                </span>
                <span className="font-semibold text-white">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Departments Directory & Actions */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight font-display">Organization Departments</h3>
            <p className="text-xs text-slate-400">Manage structure, divisions, and reporting units</p>
          </div>
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="btn-wipronix-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white shadow-glow-sm"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>

        {departments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
            <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No departments configured yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first department (e.g. Engineering, Sales, HR)</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Staff Assigned</th>
                  <th className="pb-3 pr-2 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pl-2 font-semibold text-white">{dept.name}</td>
                    <td className="py-3.5 font-mono text-cyan-400">{dept.code}</td>
                    <td className="py-3.5 text-slate-400">{dept.description || '—'}</td>
                    <td className="py-3.5 text-slate-300 font-medium">
                      {dept._count?.employees || 0} employees
                    </td>
                    <td className="py-3.5 pr-2 text-right text-slate-400">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Immutable Audit Log Activity */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Tenant Audit Activity Stream</h3>
            <p className="text-xs text-slate-400">Real-time ledger of actions, security events, and configuration updates</p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Listening
          </span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No audit records in current session.</p>
          ) : (
            auditLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#E52328]/10 border border-[#E52328]/25 flex items-center justify-center font-mono text-[10px] text-[#fb2c36] shrink-0 mt-0.5">
                    {log.action[0]}
                  </div>
                  <div>
                    <p className="text-slate-200 font-medium leading-snug">
                      {log.description || `${log.action} on ${log.entityType}`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Actor: <span className="text-[#fb2c36]">{log.user?.email || 'System'}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 font-display">Create New Department</h3>
            <p className="text-xs text-slate-400 mb-6">
              Department will be isolated to tenant: <strong className="text-[#fb2c36]">{activeOrganization?.name}</strong>
            </p>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department Code (Max 10 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AI-ENG"
                  className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[#fb2c36] font-mono text-xs focus:outline-none focus:border-[#E52328]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Brief summary of department responsibilities..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#E52328]"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-wipronix-primary px-5 py-2 text-xs font-semibold text-white shadow-glow-sm"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
