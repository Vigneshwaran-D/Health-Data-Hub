import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { claimsAPI } from '../api'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

const AGING_BUCKETS = ['0-30', '31-60', '61-90', '91-120', '>120']

export default function ClaimInventory() {
  const navigate = useNavigate()
  const [claims, setClaims] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ payer: '', specialty: '', denial_type: '', aging_bucket: '', risk_score: '', search: '' })
  const [filterOptions, setFilterOptions] = useState({ payers: [], specialties: [], denial_codes: [] })

  useEffect(() => {
    claimsAPI.getFilters().then(r => setFilterOptions(r.data))
  }, [])

  const loadClaims = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 50 }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const { data } = await claimsAPI.getClaims(params)
      setClaims(data.claims)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { loadClaims() }, [loadClaims])

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claim Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total claims</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search claim ID or patient..."
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={filters.payer} onChange={e => setFilter('payer', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Payers</option>
              {filterOptions.payers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.specialty} onChange={e => setFilter('specialty', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Specialties</option>
              {filterOptions.specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.denial_type} onChange={e => setFilter('denial_type', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Denials</option>
              <option value="No Denial">No Denial</option>
              {filterOptions.denial_codes.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filters.aging_bucket} onChange={e => setFilter('aging_bucket', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Aging</option>
              {AGING_BUCKETS.map(b => <option key={b} value={b}>{b} Days</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Claim ID', 'Patient', 'Payer', 'DOS', 'Specialty', 'Charge', 'Aging', 'Denial', 'Risk', 'Recommended Action', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-12 text-gray-400">Loading claims...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan="11" className="text-center py-12 text-gray-400">No claims found</td></tr>
              ) : claims.map(c => (
                <tr key={c.claim_id} className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/claims/${c.claim_id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{c.claim_id}</td>
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{c.patient_name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.payer}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.dos}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{c.specialty}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">${c.charge_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium ${c.aging_days > 120 ? 'text-red-600' : c.aging_days > 90 ? 'text-orange-500' : 'text-gray-600'}`}>
                      {c.aging_days}d
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.denial_code ? (
                      <span className="text-xs font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{c.denial_code}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><RiskBadge risk={c.risk_score} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-48 truncate">{c.recommended_action}</td>
                  <td className="px-4 py-3">
                    <ExternalLink size={14} className="text-gray-300 hover:text-blue-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
