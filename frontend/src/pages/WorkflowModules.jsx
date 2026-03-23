import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { claimsAPI, analyticsAPI } from '../api'
import {
  FileSearch, DollarSign, PhoneCall, BarChart3, CreditCard,
  CheckCircle, AlertTriangle, Clock, Zap, ChevronRight,
  ArrowRight, RefreshCw, TrendingUp, FileText, Settings
} from 'lucide-react'

const MODULES = [
  {
    id: 'pre-billing',
    name: 'Pre-Billing Review',
    icon: FileSearch,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    description: 'Validate claims before submission to ensure clean claim rates and reduce first-pass denials.',
    tasks: [
      { name: 'Patient demographics verification', status: 'automated', trigger: 'On claim creation' },
      { name: 'Insurance eligibility check', status: 'automated', trigger: 'Real-time verification' },
      { name: 'Prior authorization validation', status: 'rule-based', trigger: 'CPT code match' },
      { name: 'Medical necessity review', status: 'ai-assisted', trigger: 'ICD/CPT cross-reference' },
      { name: 'Coding accuracy audit', status: 'ai-assisted', trigger: 'Pre-submission scan' },
      { name: 'Modifier validation', status: 'automated', trigger: 'Charge entry' },
    ],
    rules: [
      'Flag claims missing prior auth for surgical CPT codes',
      'Auto-verify eligibility within 24 hours of DOS',
      'Route high-dollar claims ($5K+) for manual review',
      'Validate NPI and taxonomy codes before submission',
    ],
    automations: [
      { name: 'Auto-Eligibility Check', type: 'RPA', frequency: 'Every new claim' },
      { name: 'Prior Auth Lookup', type: 'EDI 278', frequency: 'CPT-triggered' },
      { name: 'Clean Claim Score', type: 'AI Model', frequency: 'Pre-submission' },
    ],
    kpis: { clean_claim_rate: '94.2%', first_pass_rate: '91.8%', avg_review_time: '2.4 min' },
  },
  {
    id: 'charge-review',
    name: 'Charge Review',
    icon: DollarSign,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Audit charges for accuracy, ensure proper coding, and maximize reimbursement before claim submission.',
    tasks: [
      { name: 'CPT/HCPCS code validation', status: 'automated', trigger: 'Charge entry' },
      { name: 'ICD-10 diagnosis code review', status: 'ai-assisted', trigger: 'Charge capture' },
      { name: 'Fee schedule verification', status: 'automated', trigger: 'Payer contract lookup' },
      { name: 'Bundling/unbundling check', status: 'rule-based', trigger: 'CCI edit check' },
      { name: 'Duplicate charge detection', status: 'automated', trigger: 'Real-time' },
      { name: 'Missing charge identification', status: 'ai-assisted', trigger: 'EHR encounter review' },
    ],
    rules: [
      'Apply NCCI edit checks for bundled procedures',
      'Flag charges exceeding 150% of Medicare fee schedule',
      'Alert on missing evaluation codes for surgical encounters',
      'Validate modifier usage against payer-specific rules',
    ],
    automations: [
      { name: 'CCI Edit Engine', type: 'Rule Engine', frequency: 'Every charge' },
      { name: 'Fee Schedule Validator', type: 'Database', frequency: 'Pre-billing' },
      { name: 'Charge Capture AI', type: 'ML Model', frequency: 'Post-encounter' },
    ],
    kpis: { charge_accuracy: '97.1%', revenue_captured: '$2.4M', coding_errors_caught: '847' },
  },
  {
    id: 'ar-followup',
    name: 'AR Follow-Up',
    icon: PhoneCall,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Systematic follow-up on outstanding accounts receivable with prioritized work queues and automated status checks.',
    tasks: [
      { name: 'Claim status inquiry (276/277)', status: 'automated', trigger: 'Aging threshold' },
      { name: 'Payer portal status check', status: 'rpa', trigger: 'Scheduled (daily)' },
      { name: 'Phone follow-up prioritization', status: 'ai-assisted', trigger: 'AI scoring' },
      { name: 'Escalation management', status: 'rule-based', trigger: 'Aging >60 days' },
      { name: 'Payment posting reconciliation', status: 'automated', trigger: 'ERA received' },
      { name: 'Patient balance follow-up', status: 'rule-based', trigger: 'Insurance adjudicated' },
    ],
    rules: [
      'Auto-submit 276 inquiry at 30, 45, and 60-day marks',
      'Prioritize follow-up by expected reimbursement value',
      'Escalate no-response claims after 3 follow-up attempts',
      'Route timely filing risk claims to urgent queue',
    ],
    automations: [
      { name: 'Auto 276/277 Inquiry', type: 'EDI', frequency: 'Aging-triggered' },
      { name: 'Portal Status Bot', type: 'RPA', frequency: 'Daily 6AM' },
      { name: 'Priority Scoring', type: 'AI Engine', frequency: 'Continuous' },
    ],
    kpis: { days_in_ar: '34.2', collection_rate: '94.7%', followup_touches: '1,247' },
  },
  {
    id: 'denial-analytics',
    name: 'Denial Analytics',
    icon: BarChart3,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    description: 'Analyze denial patterns, identify root causes, and drive corrective actions to reduce denial rates.',
    tasks: [
      { name: 'Denial categorization & trending', status: 'ai-assisted', trigger: 'Denial received' },
      { name: 'Root cause analysis', status: 'ai-assisted', trigger: 'Pattern detection' },
      { name: 'Appeal generation', status: 'ai-assisted', trigger: 'Denial review' },
      { name: 'Payer-specific denial tracking', status: 'automated', trigger: 'ERA processing' },
      { name: 'Prevention rule creation', status: 'rule-based', trigger: 'Trend threshold' },
      { name: 'Financial impact assessment', status: 'automated', trigger: 'Monthly cycle' },
    ],
    rules: [
      'Auto-categorize denials by CARC/RARC codes',
      'Generate appeal within 24 hours for high-dollar denials',
      'Alert operations when payer denial rate exceeds 15%',
      'Track denial overturn rate by appeal strategy',
    ],
    automations: [
      { name: 'Denial Categorizer', type: 'AI/NLP', frequency: 'Real-time' },
      { name: 'Appeal Generator', type: 'AI Template', frequency: 'On denial' },
      { name: 'Trend Analyzer', type: 'Analytics', frequency: 'Weekly' },
    ],
    kpis: { denial_rate: '8.3%', overturn_rate: '62.4%', appeal_success: '$1.8M' },
  },
  {
    id: 'payment-posting',
    name: 'Payment Posting',
    icon: CreditCard,
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Automate payment posting from ERA/EOB files, reconcile payments, and identify underpayments.',
    tasks: [
      { name: 'ERA/835 auto-posting', status: 'automated', trigger: '835 file received' },
      { name: 'Manual EOB posting', status: 'manual', trigger: 'Paper EOB scan' },
      { name: 'Contractual adjustment posting', status: 'automated', trigger: 'Payment match' },
      { name: 'Underpayment detection', status: 'ai-assisted', trigger: 'Contract comparison' },
      { name: 'Patient responsibility calculation', status: 'automated', trigger: 'Insurance adjudicated' },
      { name: 'Refund processing', status: 'rule-based', trigger: 'Overpayment detected' },
    ],
    rules: [
      'Auto-post 835 payments matching within 2% of expected',
      'Flag underpayments >$50 for manual review',
      'Queue balance transfers for secondary billing',
      'Reconcile daily deposit totals with posted amounts',
    ],
    automations: [
      { name: '835 Auto-Poster', type: 'EDI Engine', frequency: 'On receipt' },
      { name: 'Underpayment Detector', type: 'Contract AI', frequency: 'Post-payment' },
      { name: 'Balance Transfer Bot', type: 'RPA', frequency: 'Daily' },
    ],
    kpis: { auto_post_rate: '87.3%', underpayments_caught: '$342K', posting_accuracy: '99.2%' },
  },
]

const STATUS_BADGES = {
  automated: { label: 'Automated', color: 'bg-green-100 text-green-700' },
  'ai-assisted': { label: 'AI-Assisted', color: 'bg-blue-100 text-blue-700' },
  'rule-based': { label: 'Rule-Based', color: 'bg-purple-100 text-purple-700' },
  rpa: { label: 'RPA', color: 'bg-cyan-100 text-cyan-700' },
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-600' },
}

export default function WorkflowModules() {
  const { user } = useAuth()
  const [expandedModule, setExpandedModule] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <h1 className="text-2xl font-bold text-gray-900">RCM Revenue Surge Workflow</h1>
        <p className="text-gray-500 text-sm mt-0.5">Five integrated modules powering end-to-end revenue cycle management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {MODULES.map(m => {
          const Icon = m.icon
          const kpiEntries = Object.entries(m.kpis)
          return (
            <div key={m.id} className={`${m.bg} ${m.border} border rounded-xl p-3 text-center`}>
              <div className={`w-10 h-10 bg-gradient-to-br ${m.color} rounded-lg flex items-center justify-center mx-auto mb-2 shadow-md`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-xs font-bold text-gray-800">{m.name}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{kpiEntries[0][1]}</p>
              <p className="text-[10px] text-gray-500">{kpiEntries[0][0].replace(/_/g, ' ')}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={20} className="text-cyan-400" />
          <h2 className="font-bold text-lg">Claim Lifecycle Flow</h2>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {['Created', 'Submitted', 'Acknowledged', 'In Process', 'Paid / Denied', 'Appealed', 'Resolved'].map((stage, i, arr) => (
            <React.Fragment key={stage}>
              <div className="flex-shrink-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-center min-w-[100px]">
                <div className="text-xs font-semibold">{stage}</div>
              </div>
              {i < arr.length - 1 && <ArrowRight size={16} className="text-cyan-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {MODULES.map(m => {
          const Icon = m.icon
          const isExpanded = expandedModule === m.id
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                className="w-full px-6 py-5 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${m.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{m.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{m.description}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {Object.entries(m.kpis).map(([k, v]) => (
                    <div key={k} className="text-center hidden lg:block">
                      <div className="text-sm font-bold text-gray-900">{v}</div>
                      <div className="text-[10px] text-gray-400">{k.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                  <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-gray-500" /> Task List
                      </h4>
                      <div className="space-y-2">
                        {m.tasks.map((task, i) => (
                          <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{task.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGES[task.status]?.color}`}>
                                  {STATUS_BADGES[task.status]?.label}
                                </span>
                                <span className="text-[10px] text-gray-400">{task.trigger}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Settings size={14} className="text-gray-500" /> Workflow Rules
                      </h4>
                      <div className="space-y-2">
                        {m.rules.map((rule, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                            <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-700">{rule}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Zap size={14} className="text-gray-500" /> Automation Triggers
                      </h4>
                      <div className="space-y-2">
                        {m.automations.map((auto, i) => (
                          <div key={i} className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-800">{auto.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{auto.type}</span>
                            </div>
                            <p className="text-[10px] text-gray-500">{auto.frequency}</p>
                          </div>
                        ))}
                      </div>

                      <h4 className="text-sm font-bold text-gray-800 mt-5 mb-3 flex items-center gap-2">
                        <TrendingUp size={14} className="text-gray-500" /> Key Metrics
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(m.kpis).map(([k, v]) => (
                          <div key={k} className={`p-3 ${m.bg} ${m.border} border rounded-lg flex items-center justify-between`}>
                            <span className="text-xs text-gray-600">{k.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-gray-900">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
