import React, { useEffect, useState } from 'react'
import { rpaAPI } from '../api'
import {
  Bot, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Loader, Terminal, ChevronDown, ChevronUp,
  Wifi, WifiOff, Shield, Activity
} from 'lucide-react'

const BOT_TYPE_ICONS = {
  claim_status_checker: '🔍',
  eligibility_verifier: '✅',
  denial_retriever: '📄',
  prior_auth_submitter: '📋',
  payment_poster: '💳',
}

const STATUS_STYLES = {
  Idle: 'bg-gray-100 text-gray-700',
  Running: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Scheduled: 'bg-purple-100 text-purple-700',
  Error: 'bg-red-100 text-red-700',
  Failed: 'bg-red-100 text-red-700',
  Completed: 'bg-green-100 text-green-700',
  'Completed with Errors': 'bg-yellow-100 text-yellow-700',
}

const CRED_STYLES = {
  Valid: 'text-green-600',
  'Expiring Soon': 'text-orange-500',
  Expired: 'text-red-600',
  Invalid: 'text-red-600',
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function RPABots() {
  const [bots, setBots] = useState([])
  const [summary, setSummary] = useState(null)
  const [botTypes, setBotTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningBot, setRunningBot] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [expandedBot, setExpandedBot] = useState(null)
  const [botLogs, setBotLogs] = useState({})
  const [loadingLogs, setLoadingLogs] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [b, s, t] = await Promise.all([
        rpaAPI.getBots(),
        rpaAPI.getSummary(),
        rpaAPI.getBotTypes(),
      ])
      setBots(b.data)
      setSummary(s.data)
      setBotTypes(t.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const runBot = async (botId) => {
    setRunningBot(botId)
    setRunResult(null)
    try {
      const { data } = await rpaAPI.runBot(botId)
      setRunResult(data)
      loadData()
    } catch (e) {
      setRunResult({ error: e.response?.data?.detail || 'Bot run failed' })
    } finally {
      setRunningBot(null)
    }
  }

  const toggleLogs = async (botId) => {
    if (expandedBot === botId) {
      setExpandedBot(null)
      return
    }
    setExpandedBot(botId)
    if (!botLogs[botId]) {
      setLoadingLogs(botId)
      try {
        const { data } = await rpaAPI.getBotLogs(botId)
        setBotLogs(prev => ({ ...prev, [botId]: data }))
      } finally {
        setLoadingLogs(null)
      }
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  )

  const groupedBots = bots.reduce((acc, bot) => {
    if (!acc[bot.payer_name]) acc[bot.payer_name] = []
    acc[bot.payer_name].push(bot)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RPA Bot Center</h1>
          <p className="text-gray-500 text-sm mt-0.5">Robotic Process Automation — Payer Portal Connectivity</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Bot} label="Total Bots" value={summary?.total_bots} sub={`${summary?.idle_bots} idle`} color="bg-blue-500" />
        <StatCard icon={Activity} label="Active Bots" value={summary?.active_bots} color="bg-green-500" />
        <StatCard icon={Play} label="Total Runs" value={summary?.total_runs?.toLocaleString()} color="bg-indigo-500" />
        <StatCard icon={CheckCircle} label="Claims Processed" value={summary?.total_claims_processed?.toLocaleString()} color="bg-purple-500" />
        <StatCard icon={Shield} label="Avg Success Rate" value={`${summary?.avg_success_rate}%`} color="bg-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-2">
        {botTypes.map(bt => (
          <div key={bt.type} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <div className="text-2xl mb-1">{BOT_TYPE_ICONS[bt.type]}</div>
            <p className="text-xs font-semibold text-gray-800">{bt.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{bt.description}</p>
          </div>
        ))}
      </div>

      {runResult && (
        <div className={`rounded-xl border p-5 ${runResult.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          {runResult.error ? (
            <div className="flex items-center gap-2 text-red-700">
              <XCircle size={18} />
              <span className="font-medium">{runResult.error}</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-600" />
                <span className="font-semibold text-gray-800">{runResult.bot_name} — Run Complete</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[runResult.status]}`}>{runResult.status}</span>
                <span className="text-xs text-gray-500 ml-auto">{runResult.duration} · Run ID: {runResult.run_id}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 text-center border">
                  <div className="text-xl font-bold text-gray-900">{runResult.claims_processed}</div>
                  <div className="text-xs text-gray-500">Processed</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border">
                  <div className="text-xl font-bold text-green-600">{runResult.claims_updated}</div>
                  <div className="text-xs text-gray-500">Updated</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border">
                  <div className="text-xl font-bold text-red-500">{runResult.errors}</div>
                  <div className="text-xs text-gray-500">Errors</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border">
                  <div className="text-sm font-bold text-gray-800">{runResult.duration}</div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
              </div>
              {runResult.log_output && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Bot Execution Log:</p>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                    {runResult.log_output}
                  </pre>
                </div>
              )}
              {runResult.error_details?.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Error Details:</p>
                  {runResult.error_details.map((e, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-center gap-1">
                      <AlertTriangle size={10} className="text-red-400" /> {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(groupedBots).sort().map(([payer, payerBots]) => (
          <div key={payer} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-blue-500" />
                <span className="font-semibold text-gray-800">{payer}</span>
                <span className="text-xs text-gray-400">{payerBots.length} bots configured</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {payerBots.map(bot => (
                <div key={bot.bot_id}>
                  <div className="px-5 py-3 flex items-center gap-4">
                    <div className="text-xl">{BOT_TYPE_ICONS[bot.bot_type] || '🤖'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-800 truncate">{bot.bot_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[bot.status]}`}>{bot.status}</span>
                        <span className={`text-xs font-medium ${CRED_STYLES[bot.credentials_status]}`}>
                          {bot.credentials_status === 'Valid' ? '🔑 Valid' : bot.credentials_status === 'Expiring Soon' ? '⚠️ Expiring' : '❌ ' + bot.credentials_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>Runs: {bot.total_runs}</span>
                        <span>Claims: {bot.claims_processed?.toLocaleString()}</span>
                        <span className={bot.success_rate >= 95 ? 'text-green-600' : 'text-orange-500'}>
                          Success: {bot.success_rate}%
                        </span>
                        <span>Avg Time: {bot.avg_run_time}</span>
                        {bot.last_run && <span>Last: {new Date(bot.last_run).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => runBot(bot.bot_id)} disabled={runningBot === bot.bot_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors">
                        {runningBot === bot.bot_id ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                        Run Now
                      </button>
                      <button onClick={() => toggleLogs(bot.bot_id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
                        <Terminal size={12} />
                        {expandedBot === bot.bot_id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {expandedBot === bot.bot_id && (
                    <div className="px-5 pb-4">
                      {loadingLogs === bot.bot_id ? (
                        <div className="text-center py-4 text-gray-400 text-sm">Loading run history...</div>
                      ) : (botLogs[bot.bot_id] && botLogs[bot.bot_id].length > 0) ? (
                        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-100">
                                {['Run ID', 'Status', 'Processed', 'Updated', 'Errors', 'Duration', 'Date'].map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {botLogs[bot.bot_id].map(log => (
                                <tr key={log.run_id} className="hover:bg-gray-100">
                                  <td className="px-3 py-2 font-mono text-blue-600">{log.run_id}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[log.status]}`}>{log.status}</span>
                                  </td>
                                  <td className="px-3 py-2">{log.claims_processed}</td>
                                  <td className="px-3 py-2 text-green-600">{log.claims_updated}</td>
                                  <td className="px-3 py-2 text-red-500">{log.errors}</td>
                                  <td className="px-3 py-2">{log.duration}</td>
                                  <td className="px-3 py-2 text-gray-500">{log.started_at ? new Date(log.started_at).toLocaleDateString() : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">No run history yet — click "Run Now" to execute this bot</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
