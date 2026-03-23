import React, { useEffect, useState } from 'react'
import { analyticsAPI, claimsAPI } from '../api'
import {
  RefreshCw, ArrowRight, ArrowDown, FileText, Send, XCircle,
  CheckCircle, Clock, AlertTriangle, DollarSign, RotateCcw,
  Award, ChevronDown, ChevronUp, Zap, GitBranch
} from 'lucide-react'

const LIFECYCLE_STATES = [
  {
    id: 'created',
    label: 'Claim Created',
    status: 'Created',
    icon: FileText,
    color: 'bg-slate-500',
    gradient: 'from-slate-400 to-slate-600',
    description: 'Charge captured from encounter, claim record initialized in billing system.',
    actions: ['Demographics verification', 'Insurance eligibility check', 'Coding review'],
    nextStates: ['submitted'],
    priority: 'Standard',
  },
  {
    id: 'submitted',
    label: 'Claim Submitted',
    status: 'Submitted',
    icon: Send,
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    description: 'Clean claim transmitted to payer via EDI 837P or electronic submission.',
    actions: ['EDI 837 transmission', 'Submission confirmation', 'Tracking ID assignment'],
    nextStates: ['rejected', 'received', 'no_response'],
    priority: 'Normal',
  },
  {
    id: 'rejected',
    label: 'Claim Rejected',
    status: 'Rejected',
    icon: XCircle,
    color: 'bg-red-500',
    gradient: 'from-red-400 to-red-600',
    description: 'Claim failed front-end edits or payer validation rules. Requires correction and resubmission.',
    actions: ['Identify rejection reason', 'Correct claim data', 'Resubmit within timely filing'],
    nextStates: ['submitted'],
    priority: 'High - Immediate',
  },
  {
    id: 'received',
    label: 'Received / Acknowledged',
    status: 'Received',
    icon: CheckCircle,
    color: 'bg-green-500',
    gradient: 'from-green-400 to-green-600',
    description: 'Payer acknowledged receipt via EDI 277/999. Claim is in payer adjudication queue.',
    actions: ['Monitor via 276 inquiry', 'Track acknowledgment ID', 'Set follow-up timer'],
    nextStates: ['in_process', 'no_response'],
    priority: 'Monitor',
  },
  {
    id: 'no_response',
    label: 'Claim No Response',
    status: 'No Response',
    icon: Clock,
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-orange-600',
    description: 'No acknowledgment or response from payer within expected timeframe. Requires active follow-up.',
    actions: ['Submit 276 status inquiry', 'Phone follow-up', 'Escalate if >45 days'],
    nextStates: ['received', 'in_process', 'denied'],
    priority: 'High - Aging Risk',
  },
  {
    id: 'in_process',
    label: 'Claim In Process',
    status: 'In Process',
    icon: RefreshCw,
    color: 'bg-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600',
    description: 'Payer is actively adjudicating the claim. May request additional information.',
    actions: ['Respond to payer requests', 'Provide medical records', 'Monitor adjudication timeline'],
    nextStates: ['paid', 'denied'],
    priority: 'Active Monitoring',
  },
  {
    id: 'denied',
    label: 'Claim Denied',
    status: 'Denied',
    icon: AlertTriangle,
    color: 'bg-red-600',
    gradient: 'from-red-500 to-red-700',
    description: 'Payer denied payment. Requires root cause analysis and corrective action or appeal.',
    actions: ['Analyze denial code (CARC/RARC)', 'Determine appealability', 'Generate appeal letter', 'Submit corrected claim'],
    nextStates: ['appealed', 'resolved'],
    priority: 'Critical - Revenue Impact',
  },
  {
    id: 'paid',
    label: 'Claim Paid',
    status: 'Paid',
    icon: DollarSign,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600',
    description: 'Payer remitted payment. Verify payment accuracy against contract and post to account.',
    actions: ['Post payment (835/ERA)', 'Verify against fee schedule', 'Identify underpayments', 'Transfer patient balance'],
    nextStates: ['resolved'],
    priority: 'Standard',
  },
  {
    id: 'appealed',
    label: 'Claim Appealed',
    status: 'Appealed',
    icon: RotateCcw,
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600',
    description: 'Formal appeal submitted to payer with supporting clinical documentation.',
    actions: ['Track appeal deadline', 'Monitor appeal status', 'Prepare 2nd level appeal if needed'],
    nextStates: ['paid', 'denied', 'resolved'],
    priority: 'High - Time-Sensitive',
  },
  {
    id: 'resolved',
    label: 'Claim Resolved',
    status: 'Resolved',
    icon: Award,
    color: 'bg-teal-500',
    gradient: 'from-teal-400 to-teal-600',
    description: 'Claim fully adjudicated and closed. All payments posted and balances reconciled.',
    actions: ['Final audit', 'Close claim', 'Update analytics', 'Archive documentation'],
    nextStates: [],
    priority: 'Complete',
  },
]

const PRIORITY_RULES = [
  {
    scenario: 'Timely Filing Risk',
    condition: 'Aging > 90 days and status is No Response or Submitted',
    action: 'Escalate to urgent queue, auto-submit 276, assign senior AR exec',
    priority: 'Critical',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    scenario: 'High Dollar Denied',
    condition: 'Charge amount > $5,000 and status is Denied',
    action: 'Auto-generate appeal, assign to denial specialist, track appeal deadline',
    priority: 'Critical',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    scenario: 'Authorization Denial',
    condition: 'Denial code CO-197 (Prior Auth Required)',
    action: 'Retrieve auth records, generate clinical appeal, submit within 30 days',
    priority: 'High',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    scenario: 'Underpayment Detected',
    condition: 'Paid amount < 80% of allowed amount per contract',
    action: 'Flag for contract variance review, generate underpayment appeal',
    priority: 'High',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  {
    scenario: 'Duplicate Claim',
    condition: 'Rejection code indicates duplicate submission',
    action: 'Cross-reference original claim, verify payment status, void if needed',
    priority: 'Medium',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    scenario: 'No Response - Standard',
    condition: 'No payer response within 30 days of submission',
    action: 'Auto-submit EDI 276 inquiry, schedule phone follow-up at 45 days',
    priority: 'Medium',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  {
    scenario: 'Clean Claim Paid',
    condition: 'Payment received within expected timeframe, matches contract',
    action: 'Auto-post payment, transfer patient responsibility, close claim',
    priority: 'Standard',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
]

export default function ClaimLifecycle() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState(null)
  const [showPriority, setShowPriority] = useState(false)

  useEffect(() => {
    analyticsAPI.getSummary().then(r => {
      setSummary(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claim Lifecycle Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">End-to-end claim state machine with workflow prioritization rules</p>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-5">
          <GitBranch size={18} className="text-cyan-400" />
          <h2 className="font-bold text-white">Claim Lifecycle State Machine</h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
          {LIFECYCLE_STATES.map((state, i) => {
            const Icon = state.icon
            const isSelected = selectedState === state.id
            return (
              <React.Fragment key={state.id}>
                <button
                  onClick={() => setSelectedState(isSelected ? null : state.id)}
                  className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-white/20 border-2 border-cyan-400 shadow-lg shadow-cyan-400/20 scale-105'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-7 h-7 ${state.color} rounded-lg flex items-center justify-center`}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white whitespace-nowrap">{state.label}</span>
                </button>
                {i < LIFECYCLE_STATES.length - 1 && (
                  <ArrowRight size={14} className="text-cyan-400/50 flex-shrink-0 hidden lg:block" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {selectedState && (() => {
        const state = LIFECYCLE_STATES.find(s => s.id === selectedState)
        if (!state) return null
        const Icon = state.icon
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-r ${state.gradient} p-5 text-white`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{state.label}</h3>
                  <p className="text-sm text-white/80">{state.description}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Priority: {state.priority}</span>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Required Actions</h4>
                <div className="space-y-2">
                  {state.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-sm text-gray-700">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Possible Transitions</h4>
                {state.nextStates.length > 0 ? (
                  <div className="space-y-2">
                    {state.nextStates.map(nextId => {
                      const next = LIFECYCLE_STATES.find(s => s.id === nextId)
                      if (!next) return null
                      const NextIcon = next.icon
                      return (
                        <button key={nextId}
                          onClick={() => setSelectedState(nextId)}
                          className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left"
                        >
                          <ArrowRight size={14} className="text-gray-400" />
                          <div className={`w-7 h-7 ${next.color} rounded-lg flex items-center justify-center`}>
                            <NextIcon size={12} className="text-white" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-800">{next.label}</span>
                            <p className="text-xs text-gray-500">{next.description.substring(0, 60)}...</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-center">
                    <Award size={24} className="mx-auto text-teal-500 mb-2" />
                    <p className="text-sm font-medium text-teal-700">Terminal State - Claim Resolved</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => setShowPriority(!showPriority)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-amber-500" />
            <h2 className="font-bold text-gray-900">AR Workflow Prioritization Rules</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{PRIORITY_RULES.length} rules</span>
          </div>
          {showPriority ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showPriority && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <div className="space-y-3">
              {PRIORITY_RULES.map((rule, i) => (
                <div key={i} className={`p-4 rounded-xl border ${rule.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm">{rule.scenario}</h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50">{rule.priority}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-semibold">Condition: </span>
                      <span>{rule.condition}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Action: </span>
                      <span>{rule.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
