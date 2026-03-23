import React, { useEffect, useState } from 'react'
import { authAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { Users, Shield, Settings, Database, Activity, Zap } from 'lucide-react'

const ROLE_PERMISSIONS = {
  'Client Leadership': ['Revenue analytics', 'AR trends', 'Denial insights', 'Financial impact', 'Workflow modules', 'Admin settings'],
  'Operations Leadership': ['Operational KPIs', 'Team productivity', 'Queue performance', 'Workflow modules', 'Admin settings'],
  'Operations Manager': ['Work queues', 'Team assignments', 'Escalations', 'Claims', 'EDI Hub', 'RPA Bots', 'File uploads'],
  'Team Lead': ['Agent tasks', 'Claim workflows', 'Quality metrics', 'Work queues', 'File uploads'],
  'AR Executive': ['Claim follow-ups', 'Denial resolution', 'Appeals', 'EDI Hub', 'RPA Bots', 'File uploads'],
  'QA Auditor': ['Resolved claims', 'Quality scores', 'Compliance checks', 'Analytics'],
}

const ROLE_COLORS = {
  'Client Leadership': 'bg-violet-100 text-violet-700',
  'Operations Leadership': 'bg-blue-100 text-blue-700',
  'Operations Manager': 'bg-emerald-100 text-emerald-700',
  'Team Lead': 'bg-amber-100 text-amber-700',
  'AR Executive': 'bg-cyan-100 text-cyan-700',
  'QA Auditor': 'bg-rose-100 text-rose-700',
}

export default function AdminSettings() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    authAPI.getUsers().then(r => setUsers(r.data))
  }, [])

  const hasAccess = ['Client Leadership', 'Operations Leadership'].includes(user?.role)

  if (!hasAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <Shield size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Access Denied</p>
          <p className="text-sm mt-1">Leadership role required to access this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">NovaArc Health — System configuration and user management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Users', value: users.length, color: 'bg-blue-500' },
          { icon: Shield, label: 'Roles Defined', value: Object.keys(ROLE_PERMISSIONS).length, color: 'bg-purple-500' },
          { icon: Database, label: 'Database', value: 'PostgreSQL', color: 'bg-green-500' },
          { icon: Activity, label: 'API Status', value: 'Online', color: 'bg-emerald-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          {['users', 'roles', 'system'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">System Users</h2>
                <span className="text-xs text-gray-400">{users.length} accounts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {['ID', 'Username', 'Full Name', 'Role', 'Access Privileges'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">#{u.id}</td>
                        <td className="px-4 py-3 font-mono font-medium text-gray-800">{u.username}</td>
                        <td className="px-4 py-3 text-gray-700">{u.full_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(ROLE_PERMISSIONS[u.role] || []).slice(0, 3).map(p => (
                              <span key={p} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p}</span>
                            ))}
                            {(ROLE_PERMISSIONS[u.role] || []).length > 3 && (
                              <span className="text-xs text-gray-400">+{(ROLE_PERMISSIONS[u.role] || []).length - 3} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-4">Role Permissions Matrix</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                  <div key={role} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={16} className="text-gray-400" />
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>{role}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {perms.map(p => (
                        <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h2 className="font-semibold text-gray-800 mb-3">System Configuration</h2>
                <dl className="space-y-3">
                  {[
                    ['Platform', 'NovaArc Health v2.0'],
                    ['Backend Framework', 'FastAPI (Python)'],
                    ['Frontend Framework', 'React 18 + Tailwind CSS'],
                    ['Database', 'PostgreSQL'],
                    ['AI Layer', 'Rule-based + Heuristic + Denial Advisor'],
                    ['EDI Engine', 'ANSI X12 (837P, 276/277, 835)'],
                    ['RPA Engine', '5 Bot Types, 24 Active Bots'],
                    ['Environment', 'Development / Demo'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 mb-3">Supported Work Queues</h2>
                <ul className="space-y-2">
                  {[
                    { name: 'High Dollar AR', trigger: 'Charge >= $5,000', priority: 'Critical' },
                    { name: 'Authorization Denials', trigger: 'CO-197 / Auth Required', priority: 'High' },
                    { name: 'Eligibility Issues', trigger: 'CO-22 / COB codes', priority: 'High' },
                    { name: 'Aging >120 Days', trigger: 'Aging > 120 days', priority: 'Critical' },
                    { name: 'Medicaid Claims', trigger: 'Medicaid payer', priority: 'Medium' },
                    { name: 'General AR', trigger: 'All other claims', priority: 'Normal' },
                  ].map(q => (
                    <div key={q.name} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{q.name}</span>
                        <span className="text-xs text-gray-500 ml-2">- {q.trigger}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                        q.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                        q.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>{q.priority}</span>
                    </div>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
