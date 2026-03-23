import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, queuesAPI, aiAPI } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Shield, Activity,
  Clock, FileText, ChevronRight, RefreshCw, Download, BarChart3,
  PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Lightbulb, Users,
  MessageSquare, Send, Bot, User, Sparkles, X, Minimize2, Maximize2
} from 'lucide-react'

const AGING_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6']

const TABS = [
  'Revenue Health',
  'AR Health',
  'Denial Intelligence',
  'Payer Performance',
  'Risk to Cash Flow',
  'Operations'
]

const fmt = (n) => {
  if (n == null || isNaN(n)) return '$0'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const pct = (n) => n != null ? `${Number(n).toFixed(1)}%` : '0%'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function ExportButtons() {
  const handleExport = (type) => {
    alert(`${type} Export — Coming Soon`)
  }
  return (
    <div className="flex gap-2">
      {['CSV', 'Excel', 'PDF'].map((t) => (
        <button key={t} onClick={() => handleExport(t)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <Download size={12} />
          {t}
        </button>
      ))}
    </div>
  )
}

function TabHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-3">
        {children}
        <ExportButtons />
      </div>
    </div>
  )
}

const aiSuggestedQueries = [
  "What is the total AR over 90 days?",
  "Which payer has the highest denial rate?",
  "Show AR aging by specialty",
  "What is the denial rate?",
  "Show collection rate",
  "Show payer performance",
  "What are the top denial codes?",
  "Show revenue leakage",
  "How many unworked claims?",
  "Show claim status breakdown",
]

function formatBold(text) {
  if (!text) return ''
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function exportCSV(data, filename = 'export.csv') {
  if (!data || !data.headers || !data.rows) return
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function AIChatPanel({ isOpen, onClose, isExpanded, onToggleExpand }) {
  const [messages, setMessages] = useState([{
    id: Date.now(),
    type: 'assistant',
    text: "Hi! I'm your RCM AI assistant. Ask me about AR aging, denial rates, payer performance, collections, or type 'help' for all options.",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const hasUserMessages = messages.some(m => m.type === 'user')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)
    try {
      const res = await aiAPI.chat(trimmed)
      const data = res.data
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        text: data.response,
        chart: data.chart || null,
        table: data.table || null,
        metrics: data.metrics || null,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const panelWidth = isExpanded ? 'w-[600px]' : 'w-[400px]'
  const panelHeight = isExpanded ? 'h-[85vh]' : 'h-[520px]'

  return (
    <div className={`fixed bottom-4 right-4 ${panelWidth} ${panelHeight} bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300`}>
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleExpand} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5 text-white" />}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50">
        {!hasUserMessages && (
          <div className="mb-2">
            <p className="text-[11px] text-gray-400 font-medium text-center mb-2">Quick queries</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {aiSuggestedQueries.slice(0, 6).map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[90%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.type === 'user' ? 'bg-blue-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'
              }`}>
                {msg.type === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
              </div>
              <div className={`rounded-xl px-3 py-2 ${
                msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{formatBold(msg.text)}</p>

                {msg.metrics && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {msg.metrics.map((m, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p className="text-[10px] text-gray-500">{m.label}</p>
                        <p className="text-sm font-bold text-gray-900">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {msg.chart && msg.chart.data && (
                  <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={msg.chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={msg.chart.xKey || 'name'} tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey={msg.chart.yKey || 'value'} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {msg.table && msg.table.headers && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-slate-100">
                        <tr>
                          {msg.table.headers.map((h, i) => (
                            <th key={i} className="px-2 py-1.5 text-left font-semibold text-gray-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.table.rows.slice(0, 8).map((row, ri) => (
                          <tr key={ri} className="border-t border-slate-200">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-2 py-1 text-gray-600">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {msg.type === 'assistant' && (msg.chart || msg.table || msg.metrics) && (
                  <button onClick={() => { if (msg.table) exportCSV(msg.table); }}
                    className="mt-1.5 flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-gray-500 transition-colors">
                    <Download className="w-2.5 h-2.5" /> Export CSV
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white px-3 py-2 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Ask about AR, denials, payers..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const t = parseInt(searchParams.get('tab') || '0', 10)
    return isNaN(t) ? 0 : Math.min(t, TABS.length - 1)
  })
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)
  const [aging, setAging] = useState([])
  const [denials, setDenials] = useState([])
  const [payerIntelligence, setPayerIntelligence] = useState([])
  const [drillData, setDrillData] = useState([])
  const [drillDimension, setDrillDimension] = useState('payer')
  const [queues, setQueues] = useState([])
  const [insights, setInsights] = useState([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, agingRes, denialRes, payerRes, drillRes, queueRes, insightRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        analyticsAPI.getAgingDistribution(),
        analyticsAPI.getDenialBreakdown(),
        analyticsAPI.getPayerIntelligence(),
        analyticsAPI.getDrilldown('payer'),
        queuesAPI.getQueues(),
        analyticsAPI.getInsights(),
      ])
      setDashboard(dashRes.data)
      setAging(agingRes.data)
      setDenials(denialRes.data)
      setPayerIntelligence(payerRes.data)
      setDrillData(drillRes.data)
      setQueues(queueRes.data)
      setInsights(insightRes.data.insights || [])
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadDrilldown = async (dimension) => {
    setDrillDimension(dimension)
    try {
      const res = await analyticsAPI.getDrilldown(dimension)
      setDrillData(res.data)
    } catch (e) {
      console.error('Drilldown error:', e)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <RefreshCw className="animate-spin mx-auto mb-3 text-blue-500" size={28} />
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    </div>
  )

  const rev = dashboard?.revenue_health || {}
  const arH = dashboard?.ar_health || {}
  const den = dashboard?.denial_intelligence || {}
  const risk = dashboard?.risk_indicators || {}
  const ops = dashboard?.operational || {}
  const priorityColor = { Critical: 'bg-red-500', High: 'bg-orange-400', Medium: 'bg-yellow-400', Normal: 'bg-blue-400' }

  const renderRevenueHealth = () => (
    <div className="space-y-6">
      <TabHeader title="Revenue Health Overview" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Total AR" value={fmt(rev.total_ar || 0)} sub="Outstanding receivables" color="bg-indigo-500" />
        <StatCard icon={TrendingUp} label="Total Paid" value={fmt(rev.total_paid || 0)} sub="Collections received" color="bg-green-500" />
        <StatCard icon={BarChart3} label="Gross Collection Rate" value={pct(rev.gross_collection_rate)} sub="Charged vs collected" color="bg-blue-500" />
        <StatCard icon={BarChart3} label="Net Collection Rate" value={pct(rev.net_collection_rate)} sub="Allowed vs collected" color="bg-cyan-500" />
        <StatCard icon={TrendingDown} label="Revenue Leakage" value={fmt(rev.revenue_leakage || 0)} sub="Potential lost revenue" color="bg-red-500" />
        <StatCard icon={DollarSign} label="Expected Reimbursement" value={fmt(rev.expected_reimbursement || 0)} sub="Projected collections" color="bg-purple-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">AR Aging Distribution</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={aging} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'value' ? fmt(v) : v} />
            <Bar dataKey="count" name="Claims" radius={[4, 4, 0, 0]}>
              {aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Cash Flow Summary</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Paid</span>
              <span className="font-medium text-green-600">{fmt(rev.total_paid || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full" style={{ width: `${Math.min(((rev.total_paid || 0) / (rev.total_ar || 1)) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Total Charged</span>
              <span className="font-medium text-blue-600">{fmt(rev.total_ar || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderARHealth = () => (
    <div className="space-y-6">
      <TabHeader title="AR Health Analysis" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="AR > 90 Days %" value={pct(arH.ar_over_90_pct)} sub="Aged receivables" color="bg-red-500" />
        <StatCard icon={DollarSign} label="High Balance AR ($5K+)" value={arH.high_balance_count?.toLocaleString() || '0'} sub={fmt(arH.high_balance_value || 0)} color="bg-orange-500" />
        <StatCard icon={AlertTriangle} label="Denied AR" value={fmt(arH.denied_ar_value || 0)} sub={`${arH.denied_ar_count || 0} claims`} color="bg-red-500" />
        <StatCard icon={Shield} label="Appealed AR" value={fmt(arH.appealed_value || 0)} sub={`${arH.appealed_count || 0} appeals`} color="bg-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">AR Drilldown by {drillDimension.charAt(0).toUpperCase() + drillDimension.slice(1)}</h3>
          <div className="flex gap-2">
            {['payer', 'specialty', 'facility'].map((dim) => (
              <button key={dim} onClick={() => loadDrilldown(dim)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${drillDimension === dim
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {dim === 'facility' ? 'Facility/Provider' : dim.charAt(0).toUpperCase() + dim.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Claims</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Charged</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Denial Rate</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">High Risk</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">AR &gt;90</th>
              </tr>
            </thead>
            <tbody>
              {(drillData || []).map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{row.name}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{row.total_claims?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{fmt(row.total_charged || 0)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(row.denial_rate || 0) > 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {pct(row.denial_rate)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{row.high_risk || 0}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{row.ar_over_90 || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!drillData || drillData.length === 0) && (
            <p className="text-center text-gray-400 py-6">No drilldown data available</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderDenialIntelligence = () => (
    <div className="space-y-6">
      <TabHeader title="Denial Intelligence" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Denial Rate" value={pct(den.denial_rate)} sub="Of total claims" color="bg-red-500" />
        <StatCard icon={DollarSign} label="Denial Value" value={fmt(den.denial_value || 0)} sub="Total denied amount" color="bg-red-600" />
        <StatCard icon={TrendingUp} label="Recovery Rate" value={pct(den.denial_recovery_rate)} sub="Overturned denials" color="bg-green-500" />
        <StatCard icon={TrendingDown} label="Write-off" value={fmt(den.writeoff_due_to_denial || 0)} sub="Unrecoverable" color="bg-gray-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Top Denial Codes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Code</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Count</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {denials.slice(0, 10).map((d, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-red-50 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{d.denial_code}</span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-700">{d.description}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-gray-800">{d.count}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-gray-800">{fmt(d.total_value || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Denial Code Distribution</h3>
        <div className="space-y-3">
          {denials.slice(0, 8).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded w-16 text-center flex-shrink-0">{d.denial_code}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{
                  width: `${Math.min((d.count / (denials[0]?.count || 1)) * 100, 100)}%`,
                  backgroundColor: AGING_COLORS[i % AGING_COLORS.length]
                }} />
              </div>
              <span className="text-xs text-gray-600 w-20 text-right">{d.count} ({fmt(d.total_value || 0)})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPayerPerformance = () => (
    <div className="space-y-6">
      <TabHeader title="Payer Performance" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Payer Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Payer</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Claims</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Charged</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Paid</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Avg Days</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Denial Rate</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Underpay Rate</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">AR &gt;60</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Escalations</th>
              </tr>
            </thead>
            <tbody>
              {(payerIntelligence || []).map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{p.payer}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{p.total_claims?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{fmt(p.total_charged || 0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{fmt(p.total_paid || 0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{p.avg_days_to_pay || 0}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(p.denial_rate || 0) > 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {pct(p.denial_rate)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{pct(p.underpayment_rate)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{p.ar_over_60 || 0}</td>
                  <td className="py-2.5 px-3 text-right">
                    {(p.escalations || 0) > 0 ? (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">{p.escalations}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!payerIntelligence || payerIntelligence.length === 0) && (
            <p className="text-center text-gray-400 py-6">No payer data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Charged vs Paid by Payer</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={(payerIntelligence || []).slice(0, 8)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="payer" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Bar dataKey="total_charged" name="Charged" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total_paid" name="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  const renderRiskToCashFlow = () => {
    const riskItems = [
      { countKey: 'high_value_at_risk_count', valueKey: 'high_value_at_risk_value', label: 'High Value at Risk (>$10K)', icon: DollarSign, color: 'bg-red-500' },
      { countKey: 'tfl_risk_count', valueKey: 'tfl_risk_value', label: 'Timely Filing Risk', icon: Clock, color: 'bg-orange-500' },
      { countKey: 'appeals_pending', valueKey: 'appeals_value', label: 'Appeals Deadline', icon: AlertTriangle, color: 'bg-yellow-500' },
      { countKey: 'underpayment_value', valueKey: 'underpayment_value', label: 'Underpayment', icon: TrendingDown, color: 'bg-purple-500', isValue: true },
      { countKey: 'unworked_count', valueKey: 'unworked_value', label: 'Unworked AR', icon: FileText, color: 'bg-blue-500' },
    ]
    return (
      <div className="space-y-6">
        <TabHeader title="Risk to Cash Flow" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskItems.map((item) => (
              <div key={item.countKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{item.isValue ? fmt(risk[item.countKey] || 0) : (risk[item.countKey] || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmt(risk[item.valueKey] || 0)} at risk</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon size={18} className="text-white" />
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
    )
  }

  const renderOperations = () => (
    <div className="space-y-6">
      <TabHeader title="Operations Overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Claims" value={ops.total_claims?.toLocaleString() || '0'} sub="In system" color="bg-blue-500" />
        <StatCard icon={Shield} label="Clean Claim Rate" value={pct(ops.clean_claim_rate)} sub="First-pass acceptance" color="bg-green-500" />
        <StatCard icon={Clock} label="Avg Aging" value={`${ops.avg_aging_days || 0} days`} sub="Claim age" color="bg-orange-500" />
        <StatCard icon={AlertTriangle} label="High Risk" value={ops.high_risk_count?.toLocaleString() || '0'} sub="Flagged claims" color="bg-red-500" />
        <StatCard icon={DollarSign} label="AR Backlog" value={fmt(ops.ar_backlog || 0)} sub="Unworked claims" color="bg-indigo-500" />
        <StatCard icon={Activity} label="In Process" value={ops.in_process?.toLocaleString() || '0'} sub="Being worked" color="bg-cyan-500" />
        <StatCard icon={TrendingUp} label="Paid" value={ops.paid_claims?.toLocaleString() || '0'} sub="Resolved paid" color="bg-green-600" />
        <StatCard icon={FileText} label="Resolved" value={ops.resolved_claims?.toLocaleString() || '0'} sub="Completed claims" color="bg-gray-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Work Queues</h3>
          <button onClick={() => navigate('/queues')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {queues.map((q) => (
            <div key={q.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
              onClick={() => navigate('/queues')}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${priorityColor[q.priority] || 'bg-gray-300'}`} />
                <div>
                  <div className="text-sm font-medium text-gray-800">{q.name}</div>
                  <div className="text-xs text-gray-500">{q.description || `${fmt(q.total_ar_value || 0)} AR Value`}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{q.claim_count}</div>
                <div className="text-xs text-red-500">{q.high_risk_count} high risk</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-800">AI Narrative Insights</h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700">{insight}</p>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-center text-gray-400 py-4">No insights available</p>
          )}
        </div>
      </div>

      {user?.role === 'Team Lead' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-800">Team Dashboard</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-indigo-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-indigo-700">{ops.total_claims || 0}</p>
              <p className="text-xs text-indigo-500 mt-1">Total Assigned</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{ops.resolved_claims || 0}</p>
              <p className="text-xs text-green-500 mt-1">Resolved Today</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-700">{ops.in_process || 0}</p>
              <p className="text-xs text-orange-500 mt-1">In Progress</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{ops.high_risk_count || 0}</p>
              <p className="text-xs text-red-500 mt-1">High Risk Queue</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const tabContent = [
    renderRevenueHealth,
    renderARHealth,
    renderDenialIntelligence,
    renderPayerPerformance,
    renderRiskToCashFlow,
    renderOperations,
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NovaArc Health Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {user?.full_name || 'User'} · <span className="text-blue-600 font-medium">{user?.role || 'Analyst'}</span></p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === i
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {tabContent[activeTab]()}

      {!aiOpen && (
        <button onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform z-50 group">
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-8 right-0 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
        </button>
      )}

      <AIChatPanel
        isOpen={aiOpen}
        onClose={() => { setAiOpen(false); setAiExpanded(false) }}
        isExpanded={aiExpanded}
        onToggleExpand={() => setAiExpanded(!aiExpanded)}
      />
    </div>
  )
}
