import React, { useEffect, useState } from 'react'
import { analyticsAPI, claimsAPI } from '../api'
import {
  Brain, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  FileText, DollarSign, TrendingUp, Lightbulb, ExternalLink,
  ChevronDown, ChevronUp, Search, Zap, BookOpen, ArrowRight
} from 'lucide-react'

const DENIAL_SCENARIOS = [
  {
    code: 'CO-16',
    name: 'Claim/Service Lacks Information',
    category: 'Information',
    severity: 'Medium',
    rootCause: 'Missing or incomplete claim data — demographics, authorization number, or supporting documentation not included.',
    aiRecommendation: 'Review claim for missing fields. Auto-populate from EHR data feed. Resubmit with complete information within payer timely filing window.',
    preventionStrategy: 'Implement pre-submission validation rules that check for all required fields before EDI 837 transmission.',
    appealApproach: 'Corrected claim submission with highlighted additions. No formal appeal needed — resubmit as corrected claim.',
    expectedRecovery: '85-92%',
    timeToResolve: '5-10 days',
    automationLevel: 'High',
  },
  {
    code: 'CO-29',
    name: 'Timely Filing Limit Exceeded',
    category: 'Administrative',
    severity: 'Critical',
    rootCause: 'Claim submitted after payer-specific timely filing deadline. Often caused by delayed charge capture or claim hold.',
    aiRecommendation: 'Check proof of timely submission (EDI 999/277 acknowledgment). If evidence exists, appeal with transmission records. If truly late, write off and implement preventive controls.',
    preventionStrategy: 'Set aging alerts at 50%, 75%, and 90% of payer timely filing limits. Auto-escalate approaching deadlines.',
    appealApproach: 'Submit proof of original electronic submission with ISA/GS control numbers and 999 acknowledgment.',
    expectedRecovery: '30-45%',
    timeToResolve: '30-60 days',
    automationLevel: 'Medium',
  },
  {
    code: 'CO-197',
    name: 'Prior Authorization Required',
    category: 'Authorization',
    severity: 'High',
    rootCause: 'Procedure performed without obtaining required prior authorization from the payer.',
    aiRecommendation: 'Verify if auth was obtained but not attached to claim. If auth exists, resubmit with auth number. If no auth, submit retroactive auth request with clinical necessity documentation.',
    preventionStrategy: 'Integrate payer auth requirements database. Auto-flag procedures requiring auth during scheduling. Block claim submission without valid auth number.',
    appealApproach: 'Peer-to-peer review request with attending physician. Include clinical records demonstrating medical necessity and emergent nature of procedure.',
    expectedRecovery: '55-70%',
    timeToResolve: '30-45 days',
    automationLevel: 'Medium',
  },
  {
    code: 'CO-4',
    name: 'Procedure Code Inconsistent with Modifier',
    category: 'Coding',
    severity: 'Medium',
    rootCause: 'Incorrect modifier used with CPT code, or modifier required but not appended.',
    aiRecommendation: 'Review CPT/modifier combination against payer-specific modifier policies. Correct and resubmit. Cross-reference with CCI edit guidelines.',
    preventionStrategy: 'Implement real-time modifier validation during charge entry. Maintain payer-specific modifier matrices.',
    appealApproach: 'Corrected claim with appropriate modifier. Include operative note if modifier usage is clinically justified.',
    expectedRecovery: '88-95%',
    timeToResolve: '7-14 days',
    automationLevel: 'High',
  },
  {
    code: 'CO-50',
    name: 'Non-Covered Service',
    category: 'Coverage',
    severity: 'High',
    rootCause: 'Service is not covered under the patient\'s benefit plan, or medical necessity criteria not met per payer guidelines.',
    aiRecommendation: 'Verify patient\'s specific benefit plan coverage. If covered, appeal with benefit plan documentation. If not covered, check for alternate billing codes or transfer to patient responsibility.',
    preventionStrategy: 'Real-time eligibility and benefit verification before service delivery. Flag non-covered services during scheduling.',
    appealApproach: 'Medical necessity appeal with clinical documentation, peer-reviewed literature, and attending physician letter of medical necessity.',
    expectedRecovery: '35-50%',
    timeToResolve: '45-90 days',
    automationLevel: 'Low',
  },
  {
    code: 'CO-45',
    name: 'Charges Exceed Fee Schedule / Maximum Allowable',
    category: 'Payment',
    severity: 'Low',
    rootCause: 'Billed amount exceeds the payer\'s contracted fee schedule or UCR (usual, customary, and reasonable) rate.',
    aiRecommendation: 'Verify contracted rate. If payment aligns with contract, post contractual adjustment. If underpaid vs contract, file underpayment dispute.',
    preventionStrategy: 'Load payer fee schedules into billing system for real-time comparison. Flag variances >5% for review.',
    appealApproach: 'Contract variance dispute with fee schedule documentation showing agreed-upon rates.',
    expectedRecovery: '70-80%',
    timeToResolve: '14-30 days',
    automationLevel: 'High',
  },
  {
    code: 'PR-1',
    name: 'Patient Deductible Amount',
    category: 'Patient Responsibility',
    severity: 'Low',
    rootCause: 'Amount applied to patient deductible per insurance plan benefits. This is not a denial but a patient balance transfer.',
    aiRecommendation: 'Post payment with patient responsibility. Generate patient statement. Enroll in payment plan if balance exceeds threshold.',
    preventionStrategy: 'Collect estimated patient responsibility at time of service using real-time deductible accumulator data.',
    appealApproach: 'Not appealable — transfer to patient billing workflow. Focus on collection optimization.',
    expectedRecovery: '60-75%',
    timeToResolve: '30-90 days',
    automationLevel: 'High',
  },
  {
    code: 'OA-18',
    name: 'Duplicate Claim/Service',
    category: 'Administrative',
    severity: 'Medium',
    rootCause: 'Same claim or service already submitted and processed. May be legitimate duplicate or different date of service.',
    aiRecommendation: 'Cross-reference with original claim. If true duplicate, void duplicate. If different DOS or service, resubmit with documentation distinguishing services.',
    preventionStrategy: 'Implement duplicate claim detection before submission. Check for matching CPT + DOS + patient combinations.',
    appealApproach: 'If services are distinct, appeal with documentation showing different dates, different anatomical sites, or medical necessity for repeat service.',
    expectedRecovery: '40-60%',
    timeToResolve: '14-21 days',
    automationLevel: 'High',
  },
]

const SEVERITY_COLORS = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
}

const CATEGORY_COLORS = {
  Information: 'bg-blue-50 text-blue-700',
  Administrative: 'bg-slate-50 text-slate-700',
  Authorization: 'bg-purple-50 text-purple-700',
  Coding: 'bg-cyan-50 text-cyan-700',
  Coverage: 'bg-rose-50 text-rose-700',
  Payment: 'bg-emerald-50 text-emerald-700',
  'Patient Responsibility': 'bg-amber-50 text-amber-700',
}

export default function DenialAdvisor() {
  const [denials, setDenials] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    analyticsAPI.getDenialBreakdown().then(r => {
      setDenials(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  )

  const filteredScenarios = DENIAL_SCENARIOS.filter(s =>
    !searchQuery ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Denial Decision Advisor</h1>
          <p className="text-gray-500 text-sm mt-0.5">Intelligent recommendations for denial resolution and prevention</p>
        </div>
        <a href="https://www.arlearningonline.com/p/denial.html" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors">
          <BookOpen size={14} />
          AR Knowledge Base
          <ExternalLink size={12} />
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Active Denial Codes</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{denials.length}</p>
            </div>
            <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center"><AlertTriangle size={16} className="text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">AI Scenarios Loaded</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{DENIAL_SCENARIOS.length}</p>
            </div>
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center"><Brain size={16} className="text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Avg Recovery Rate</p>
              <p className="text-xl font-bold text-gray-900 mt-1">62%</p>
            </div>
            <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center"><TrendingUp size={16} className="text-white" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Prevention Automations</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{DENIAL_SCENARIOS.filter(s => s.automationLevel === 'High').length}</p>
            </div>
            <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center"><Zap size={16} className="text-white" /></div>
          </div>
        </div>
      </div>

      {denials.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Live Denial Distribution (from Inventory)</h2>
          <div className="flex flex-wrap gap-2">
            {denials.slice(0, 10).map(d => {
              const scenario = DENIAL_SCENARIOS.find(s => s.code === d.denial_code)
              return (
                <button key={d.denial_code}
                  onClick={() => scenario && setSelectedScenario(scenario.code === selectedScenario ? null : scenario.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    selectedScenario === d.denial_code
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <span className="font-mono font-bold text-red-600">{d.denial_code}</span>
                  <span className="text-gray-500">({d.count} claims)</span>
                  {scenario && <Brain size={12} className="text-blue-500" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search denial codes, categories, or keywords..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-4">
        {filteredScenarios.map(scenario => {
          const isExpanded = selectedScenario === scenario.code
          return (
            <div key={scenario.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setSelectedScenario(isExpanded ? null : scenario.code)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-mono font-bold text-white">{scenario.code}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-gray-900 text-sm">{scenario.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[scenario.severity]}`}>
                      {scenario.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[scenario.category]}`}>
                      {scenario.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{scenario.rootCause.substring(0, 100)}...</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center hidden lg:block">
                    <div className="text-sm font-bold text-green-600">{scenario.expectedRecovery}</div>
                    <div className="text-[10px] text-gray-400">Recovery</div>
                  </div>
                  <div className="text-center hidden lg:block">
                    <div className="text-sm font-bold text-gray-800">{scenario.timeToResolve}</div>
                    <div className="text-[10px] text-gray-400">Resolution</div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-5 space-y-5">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={16} className="text-blue-600" />
                      <h4 className="text-sm font-bold text-blue-900">AI Recommendation</h4>
                    </div>
                    <p className="text-sm text-blue-800">{scenario.aiRecommendation}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-red-500" /> Root Cause
                      </h4>
                      <p className="text-xs text-gray-600">{scenario.rootCause}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                        <FileText size={12} className="text-purple-500" /> Appeal Approach
                      </h4>
                      <p className="text-xs text-gray-600">{scenario.appealApproach}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                        <CheckCircle size={12} className="text-green-500" /> Prevention
                      </h4>
                      <p className="text-xs text-gray-600">{scenario.preventionStrategy}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                      <p className="text-lg font-bold text-green-700">{scenario.expectedRecovery}</p>
                      <p className="text-[10px] text-green-600">Expected Recovery</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                      <p className="text-lg font-bold text-blue-700">{scenario.timeToResolve}</p>
                      <p className="text-[10px] text-blue-600">Time to Resolve</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                      <p className="text-lg font-bold text-purple-700">{scenario.automationLevel}</p>
                      <p className="text-[10px] text-purple-600">Automation Level</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <a href="https://www.arlearningonline.com/p/denial.html" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800">
                      <BookOpen size={12} />
                      View in AR Knowledge Repository
                      <ExternalLink size={10} />
                    </a>
                    <span className="text-[10px] text-gray-400">Source: arlearningonline.com/p/denial.html</span>
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
