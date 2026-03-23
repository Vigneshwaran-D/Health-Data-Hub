import React, { useEffect, useState } from 'react'
import { analyticsAPI } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { Lightbulb, RefreshCw } from 'lucide-react'

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function DenialAnalytics() {
  const [denials, setDenials] = useState([])
  const [aging, setAging] = useState([])
  const [payer, setPayer] = useState([])
  const [risk, setRisk] = useState([])
  const [specialty, setSpecialty] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [d, a, p, r, s, i] = await Promise.all([
        analyticsAPI.getDenialBreakdown(),
        analyticsAPI.getAgingDistribution(),
        analyticsAPI.getPayerPerformance(),
        analyticsAPI.getRiskDistribution(),
        analyticsAPI.getSpecialtyBreakdown(),
        analyticsAPI.getInsights(),
      ])
      setDenials(d.data)
      setAging(a.data)
      setPayer(p.data.slice(0, 8))
      setRisk(r.data)
      setSpecialty(s.data.slice(0, 6))
      setInsights(i.data.insights)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  )

  const riskColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Denial Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Revenue cycle performance insights</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={18} className="text-yellow-300" />
          <h2 className="font-semibold">AI Narrative Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="bg-white/10 rounded-lg p-3 text-sm">
              {insight}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Denial Code Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={denials} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="denial_code" tick={{ fontSize: 12, fontFamily: 'monospace' }} width={60} />
              <Tooltip formatter={(v) => [v, 'Claims']} />
              <Bar dataKey="count" fill="#ef4444" radius={[0,4,4,0]}>
                {denials.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {denials.slice(0, 5).map(d => (
              <div key={d.denial_code} className="flex items-center gap-3 text-xs">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 w-14">{d.denial_code}</span>
                <span className="text-gray-500 flex-1 truncate">{d.description}</span>
                <span className="font-semibold text-gray-800">{d.count}</span>
                <span className="text-gray-400">${(d.total_value / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">AR Aging Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aging} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Claims" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Risk Distribution</h3>
            <div className="grid grid-cols-3 gap-3">
              {risk.map(r => (
                <div key={r.risk} className="text-center p-3 rounded-lg border" style={{ borderColor: riskColors[r.risk] + '40', backgroundColor: riskColors[r.risk] + '10' }}>
                  <div className="text-xl font-bold" style={{ color: riskColors[r.risk] }}>{r.count}</div>
                  <div className="text-xs text-gray-500">{r.risk} Risk</div>
                  <div className="text-xs font-medium text-gray-400">${(r.value / 1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Payer Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Payer</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Claims</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Charged</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Denial %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payer.map(p => (
                  <tr key={p.payer} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800 text-xs">{p.payer}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{p.total_claims}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">${(p.total_charged / 1000).toFixed(0)}K</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs font-semibold ${p.denial_rate > 30 ? 'text-red-600' : p.denial_rate > 20 ? 'text-orange-500' : 'text-green-600'}`}>
                        {p.denial_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">AR by Specialty</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={specialty} cx="50%" cy="50%" outerRadius={90} dataKey="count"
                nameKey="specialty" label={({ specialty: s, percent }) => `${s?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {specialty.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n, props) => [`${v} claims`, props.payload.specialty]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {specialty.map((s, i) => (
              <div key={s.specialty} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 flex-1">{s.specialty}</span>
                <span className="font-semibold text-gray-800">{s.count}</span>
                <span className="text-gray-400">${(s.total_value / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
