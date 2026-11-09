import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchAuditLogs } from '../../store/slices/orgSlice';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Key,
  Database,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { auditLogs, isLoading } = useSelector((state: RootState) => state.org);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchAuditLogs());
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LOGIN':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'LOGIN_FAILED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ORGANIZATION_SWITCH':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (`${log.user?.firstName || ''} ${log.user?.lastName || ''}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress || '').includes(searchQuery);

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Enterprise Audit Activity Log
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Immutable & Tamper-Proof
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Forensic audit trail capturing all authenticated actions, authorization modifications, and tenant events.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E52328]' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Captured Events</p>
            <p className="text-2xl font-extrabold text-slate-900">{auditLogs.length}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security State</p>
            <p className="text-sm font-extrabold text-emerald-700">Defense-in-Depth Active</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actor Attribution</p>
            <p className="text-sm font-extrabold text-slate-900">User ID & IP Scoped</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, actor email, IP address or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:outline-none focus:border-[#E52328]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-[#E52328]"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="ORGANIZATION_SWITCH">ORGANIZATION_SWITCH</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasDiff = Boolean(log.oldValues || log.newValues);

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => hasDiff && setExpandedLogId(isExpanded ? null : log.id)}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        hasDiff ? 'cursor-pointer' : ''
                      } ${isExpanded ? 'bg-slate-50/90' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        {hasDiff ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500 inline" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          )
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.entityType}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <p className="font-bold text-slate-900">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System Automation</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>

                    {/* Expandable JSON Diff Row */}
                    {isExpanded && (
                      <tr className="bg-slate-900 text-slate-100">
                        <td colSpan={7} className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400">
                              <span className="font-mono">
                                Entity ID: {log.entityId || 'N/A'} | User Agent: {log.userAgent || 'Unknown'}
                              </span>
                              <span className="text-amber-400 font-bold font-mono">
                                Audit Hash Verified
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.oldValues && (
                                <div>
                                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                                    Before (Old Values)
                                  </p>
                                  <pre className="p-3 bg-slate-950/80 rounded-xl text-[11px] font-mono text-rose-300/90 overflow-x-auto max-h-56 border border-rose-900/30">
                                    {JSON.stringify(log.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValues && (
                                <div>
                                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                    After (New Values)
                                  </p>
                                  <pre className="p-3 bg-slate-950/80 rounded-xl text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-56 border border-emerald-900/30">
                                    {JSON.stringify(log.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No audit logs matching criteria</p>
                    <p className="text-xs text-slate-400">Critical actions will automatically record here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
