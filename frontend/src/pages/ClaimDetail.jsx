import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { claimsAPI } from '../api'
import RiskBadge from '../components/RiskBadge'
import StatusBadge from '../components/StatusBadge'
import {
  ArrowLeft, Brain, CheckCircle, XCircle, AlertCircle,
  FileText, Copy, Check, Loader, Play, Download
} from 'lucide-react'

function AgentCard({ result, loading }) {
  const iconMap = {
    'Claim Status Agent': <FileText size={16} />,
    'Eligibility Agent': <CheckCircle size={16} />,
    'Authorization Agent': <AlertCircle size={16} />,
    'Denial Analysis Agent': <Brain size={16} />,
  }

  const colorMap = {
    completed: 'border-green-200 bg-green-50',
    error: 'border-red-200 bg-red-50',
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className={`border rounded-xl p-4 ${colorMap[result.status] || 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">{iconMap[result.agent]}</span>
          <span className="font-semibold text-sm text-gray-800">{result.agent}</span>
        </div>
        <div className="flex items-center gap-2">
          {result.confidence && (
            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            result.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>{result.status}</span>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-1.5">
        {Object.entries(result.result).map(([key, val]) => {
          if (val === null || val === undefined) return null
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const isBoolean = typeof val === 'boolean'
          return (
            <div key={key} className="flex gap-2 text-sm">
              <span className="text-gray-500 min-w-36 flex-shrink-0">{label}:</span>
              <span className={`font-medium ${
                isBoolean ? (val ? 'text-green-700' : 'text-red-700') : 'text-gray-800'
              }`}>
                {isBoolean ? (val ? 'Yes' : 'No') : String(val)}
              </span>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

export default function ClaimDetail() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const [claim, setClaim] = useState(null)
  const [agents, setAgents] = useState([])
  const [appeal, setAppeal] = useState('')
  const [loadingClaim, setLoadingClaim] = useState(true)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [loadingAppeal, setLoadingAppeal] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [copied, setCopied] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    claimsAPI.getClaim(claimId).then(r => {
      setClaim(r.data)
      setNotes(r.data.notes || '')
      setLoadingClaim(false)
    })
  }, [claimId])

  const runAgents = async () => {
    setLoadingAgents(true)
    setActiveTab('agents')
    try {
      const { data } = await claimsAPI.investigate(claimId)
      setAgents(data.agents)
    } finally {
      setLoadingAgents(false)
    }
  }

  const generateAppeal = async () => {
    setLoadingAppeal(true)
    setActiveTab('appeal')
    try {
      const { data } = await claimsAPI.generateAppeal(claimId)
      setAppeal(data.letter)
    } catch (e) {
      setAppeal(e.response?.data?.detail || 'Error generating appeal')
    } finally {
      setLoadingAppeal(false)
    }
  }

  const copyAppeal = () => {
    navigator.clipboard.writeText(appeal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await claimsAPI.updateNotes(claimId, notes)
    setSavingNotes(false)
  }

  if (loadingClaim) return (
    <div className="flex items-center justify-center h-96">
      <Loader className="animate-spin text-blue-500" size={28} />
    </div>
  )

  if (!claim) return (
    <div className="p-6 text-center text-gray-500">Claim not found</div>
  )

  const tabs = ['details', 'agents', 'appeal', 'notes']

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Claim {claim.claim_id}</h1>
            <RiskBadge risk={claim.risk_score} />
            <StatusBadge status={claim.claim_status} />
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{claim.patient_name} · {claim.payer} · DOS: {claim.dos}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAgents} disabled={loadingAgents}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
            {loadingAgents ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
            Run AI Investigation
          </button>
          {claim.denial_code && (
            <button onClick={generateAppeal} disabled={loadingAppeal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {loadingAppeal ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
              Generate Appeal
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {[
          { key: 'charge_amount', label: 'Charge Amount', value: `$${claim.charge_amount?.toLocaleString()}`, color: 'text-gray-900' },
          { key: 'aging', label: 'Aging Days', value: `${claim.aging_days} days`, color: claim.aging_days > 120 ? 'text-red-600' : claim.aging_days > 90 ? 'text-orange-500' : 'text-gray-900' },
          { key: 'denial', label: 'Denial Code', value: claim.denial_code || 'No Denial', color: claim.denial_code ? 'text-red-600 font-mono' : 'text-green-600' },
          { key: 'queue', label: 'Work Queue', value: claim.work_queue || 'Unassigned', color: 'text-blue-600' },
        ].map(item => (
          <div key={item.key} className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'agents' ? 'AI Agents' : tab}
              {tab === 'agents' && agents.length > 0 && (
                <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{agents.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Claim Information</h3>
                <dl className="space-y-2">
                  {[
                    ['Claim ID', claim.claim_id],
                    ['Patient Name', claim.patient_name],
                    ['Date of Birth', claim.patient_dob],
                    ['Date of Service', claim.dos],
                    ['Provider', claim.provider],
                    ['Specialty', claim.specialty],
                    ['CPT Code', claim.cpt],
                    ['ICD Code', claim.icd],
                  ].map(([label, val]) => val && (
                    <div key={label} className="flex gap-2 text-sm">
                      <span className="text-gray-500 w-36 flex-shrink-0">{label}:</span>
                      <span className="font-medium text-gray-800">{val}</span>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Payer & Financial</h3>
                <dl className="space-y-2">
                  {[
                    ['Payer', claim.payer],
                    ['Insurance ID', claim.insurance_id],
                    ['Group Number', claim.group_number],
                    ['Charge Amount', claim.charge_amount ? `$${claim.charge_amount.toLocaleString()}` : null],
                    ['Allowed Amount', claim.allowed_amount ? `$${claim.allowed_amount.toLocaleString()}` : 'N/A'],
                    ['Paid Amount', claim.paid_amount ? `$${claim.paid_amount.toLocaleString()}` : 'N/A'],
                    ['Eligibility Status', claim.eligibility_status],
                    ['Auth Required', claim.auth_required ? 'Yes' : 'No'],
                    ['Auth Status', claim.auth_status || 'N/A'],
                  ].map(([label, val]) => val !== null && val !== undefined && (
                    <div key={label} className="flex gap-2 text-sm">
                      <span className="text-gray-500 w-36 flex-shrink-0">{label}:</span>
                      <span className={`font-medium ${
                        label === 'Auth Required' && val === 'Yes' ? 'text-orange-600' :
                        label === 'Eligibility Status' && val === 'Verified' ? 'text-green-600' :
                        'text-gray-800'
                      }`}>{val}</span>
                    </div>
                  ))}
                </dl>
                {claim.denial_code && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-semibold text-red-700 mb-1">Denial Information</p>
                    <p className="text-sm font-mono font-bold text-red-600">{claim.denial_code}</p>
                    <p className="text-xs text-red-500 mt-0.5">{claim.denial_description}</p>
                    <div className="mt-2 text-xs text-gray-600 bg-white rounded p-2 border border-red-100">
                      <span className="font-medium">Recommended: </span>{claim.recommended_action}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div>
              {agents.length === 0 && !loadingAgents ? (
                <div className="text-center py-12">
                  <Brain size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No investigation results yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Run AI Investigation" to analyze this claim</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingAgents ? (
                    [1,2,3,4].map(i => <AgentCard key={i} loading={true} />)
                  ) : (
                    agents.map((a, i) => <AgentCard key={i} result={a} />)
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'appeal' && (
            <div>
              {!appeal && !loadingAppeal ? (
                <div className="text-center py-12">
                  <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No appeal letter generated yet</p>
                  {claim.denial_code ? (
                    <p className="text-sm text-gray-400 mt-1">Click "Generate Appeal" to create an appeal letter</p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1">This claim has no denial code — appeal not required</p>
                  )}
                </div>
              ) : loadingAppeal ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin mx-auto mb-3 text-blue-500" size={28} />
                  <p className="text-gray-500">Generating appeal letter...</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Appeal Letter</h3>
                    <button onClick={copyAppeal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[500px]">
                    {appeal}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Claim Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-48 border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add notes about this claim, follow-up actions, or observations..."
              />
              <button onClick={saveNotes} disabled={savingNotes}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                {savingNotes ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
