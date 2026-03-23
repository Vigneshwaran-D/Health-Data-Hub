import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { queuesAPI } from '../api'
import RiskBadge from '../components/RiskBadge'
import { Inbox, DollarSign, AlertTriangle, ChevronRight, ExternalLink, X, Play, FileSearch } from 'lucide-react'

const PRIORITY_STYLES = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Normal: 'bg-blue-100 text-blue-700 border-blue-200',
}

const PRIORITY_BAR = {
  Critical: 'bg-red-500',
  High: 'bg-orange-400',
  Medium: 'bg-yellow-400',
  Normal: 'bg-blue-400',
}

const LIFECYCLE_STAGES = ['Created', 'Submitted', 'In Process', 'Paid/Denied']

function getLifecycleStage(claim) {
  if (claim.claim_status === 'Paid' || claim.claim_status === 'Denied' || claim.denial_code) return 3
  if (claim.claim_status === 'In Process' || claim.claim_status === 'Under Review') return 2
  if (claim.claim_status === 'Submitted' || claim.claim_status === 'Pending') return 1
  return 0
}

function ClaimActionPanel({ claim, onClose, navigate }) {
  const stage = getLifecycleStage(claim)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-lg mt-4 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">{claim.claim_id}</h3>
            <p className="text-blue-100 text-sm">{claim.patient_name} · {claim.payer}</p>
          </div>
          <span className="bg-white/20 text-white text-sm font-semibold px-3 py-1 rounded-full">
            ${claim.charge_amount?.toLocaleString()}
          </span>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Claim Lifecycle</h4>
          <div className="flex items-center gap-1">
            {LIFECYCLE_STAGES.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-colors ${
                  i <= stage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {s}
                </div>
                {i < LIFECYCLE_STAGES.length - 1 && (
                  <ChevronRight size={14} className={i < stage ? 'text-blue-400' : 'text-gray-300'} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {claim.denial_code && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Denial Analytics
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Denial Code</span>
                <p className="font-mono font-bold text-red-700">{claim.denial_code}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Description</span>
                <p className="text-gray-800 font-medium">{claim.denial_reason || 'Missing or invalid information'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Recommended Action</span>
                <p className="text-gray-800 font-medium">{claim.recommended_action || 'Review and resubmit with corrections'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Play size={14} />
            Next Best Action
          </h4>
          <p className="text-sm text-gray-800 font-medium">
            {claim.recommended_action || 'No recommended action available'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/claims/${claim.claim_id}`)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FileSearch size={15} />
            View Full Detail
          </button>
          <button
            onClick={() => alert(`Generate Appeal initiated for claim ${claim.claim_id}`)}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Play size={15} />
            Generate Appeal
          </button>
          <button
            onClick={() => alert(`EDI Inquiry initiated for claim ${claim.claim_id}`)}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <ExternalLink size={15} />
            EDI Inquiry
          </button>
          <a
            href="https://www.arlearningonline.com/p/ar-scenario.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-4 py-2 rounded-lg transition-colors ml-auto"
          >
            <ExternalLink size={15} />
            AR Knowledge Base
          </a>
        </div>
      </div>
    </div>
  )
}

export default function WorkQueues() {
  const navigate = useNavigate()
  const [queues, setQueues] = useState([])
  const [selected, setSelected] = useState(null)
  const [queueClaims, setQueueClaims] = useState([])
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState(null)

  useEffect(() => {
    queuesAPI.getQueues().then(r => {
      setQueues(r.data)
      setLoading(false)
    })
  }, [])

  const selectQueue = async (q) => {
    setSelected(q)
    setSelectedClaim(null)
    setLoadingClaims(true)
    try {
      const { data } = await queuesAPI.getQueueClaims(q.name)
      setQueueClaims(data.claims)
    } finally {
      setLoadingClaims(false)
    }
  }

  const totalClaims = queues.reduce((a, q) => a + q.claim_count, 0)
  const totalAR = queues.reduce((a, q) => a + q.total_ar_value, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Queues</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalClaims} claims · ${(totalAR / 1000).toFixed(0)}K total AR value
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading queues...</div>
          ) : queues.map(q => (
            <div key={q.name}
              onClick={() => selectQueue(q)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                selected?.name === q.name ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-100 shadow-sm'
              }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_BAR[q.priority]}`} />
                  <span className="font-semibold text-gray-800 text-sm">{q.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[q.priority]}`}>
                  {q.priority}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{q.description}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{q.claim_count}</div>
                  <div className="text-xs text-gray-400">Claims</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-sm font-bold text-gray-900">${(q.total_ar_value / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-gray-400">AR Value</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-600">{q.high_risk_count}</div>
                  <div className="text-xs text-red-400">High Risk</div>
                </div>
              </div>
              {selected?.name === q.name && (
                <div className="mt-2 text-xs text-blue-600 text-center font-medium">Selected ↓</div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Inbox size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Select a queue to view claims</p>
                <p className="text-sm mt-1">Click any queue on the left to load its claims</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div>
                    <h2 className="font-semibold text-gray-800">{selected.name}</h2>
                    <p className="text-sm text-gray-500">{queueClaims.length} claims loaded</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${PRIORITY_STYLES[selected.priority]}`}>
                    {selected.priority} Priority
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Claim ID', 'Patient', 'Payer', 'Charge', 'Aging', 'Denial', 'Risk', 'Action', ''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingClaims ? (
                        <tr><td colSpan="9" className="text-center py-10 text-gray-400">Loading...</td></tr>
                      ) : queueClaims.map(c => (
                        <tr key={c.claim_id}
                          className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedClaim?.claim_id === c.claim_id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
                          onClick={() => setSelectedClaim(selectedClaim?.claim_id === c.claim_id ? null : c)}>
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-medium">{c.claim_id}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{c.patient_name}</td>
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">{c.payer}</td>
                          <td className="px-4 py-2.5 font-medium">${c.charge_amount?.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium ${c.aging_days > 120 ? 'text-red-600' : c.aging_days > 90 ? 'text-orange-500' : 'text-gray-600'}`}>
                              {c.aging_days}d
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {c.denial_code ? (
                              <span className="text-xs font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{c.denial_code}</span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5"><RiskBadge risk={c.risk_score} /></td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 max-w-40 truncate">{c.recommended_action}</td>
                          <td className="px-4 py-2.5">
                            <FileSearch size={14} className={`${selectedClaim?.claim_id === c.claim_id ? 'text-blue-500' : 'text-gray-300 hover:text-blue-500'}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedClaim && (
                <ClaimActionPanel
                  claim={selectedClaim}
                  onClose={() => setSelectedClaim(null)}
                  navigate={navigate}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
