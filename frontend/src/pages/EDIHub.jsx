import React, { useEffect, useState } from 'react'
import { ediAPI } from '../api'
import {
  ArrowLeftRight, Server, CheckCircle, XCircle, AlertTriangle,
  Send, RefreshCw, Eye, ChevronRight, Loader, Wifi, FileCode
} from 'lucide-react'

const TX_TYPE_COLORS = {
  '837P': 'bg-blue-100 text-blue-700',
  '835': 'bg-green-100 text-green-700',
  '276/277': 'bg-purple-100 text-purple-700',
  '270/271': 'bg-cyan-100 text-cyan-700',
  '999': 'bg-gray-100 text-gray-700',
}

const STATUS_COLORS = {
  Accepted: 'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
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

export default function EDIHub() {
  const [connections, setConnections] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('connections')
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [submitPayer, setSubmitPayer] = useState('')
  const [submitting837, setSubmitting837] = useState(false)
  const [submit837Result, setSubmit837Result] = useState(null)
  const [statusClaimId, setStatusClaimId] = useState('')
  const [submitting276, setSubmitting276] = useState(false)
  const [submit276Result, setSubmit276Result] = useState(null)
  const [viewingTx, setViewingTx] = useState(null)
  const [txDetail, setTxDetail] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [c, t, s] = await Promise.all([
        ediAPI.getConnections(),
        ediAPI.getTransactions(),
        ediAPI.getSummary(),
      ])
      setConnections(c.data)
      setTransactions(t.data.transactions)
      setSummary(s.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const testConnection = async (id) => {
    setTestingId(id)
    setTestResult(null)
    try {
      const { data } = await ediAPI.testConnection(id)
      setTestResult(data)
    } finally {
      setTestingId(null)
    }
  }

  const submit837 = async () => {
    if (!submitPayer) return
    setSubmitting837(true)
    setSubmit837Result(null)
    try {
      const { data } = await ediAPI.submit837({ payer: submitPayer })
      setSubmit837Result(data)
      loadData()
    } catch (e) {
      setSubmit837Result({ error: e.response?.data?.detail || 'Submission failed' })
    } finally {
      setSubmitting837(false)
    }
  }

  const submit276 = async () => {
    if (!statusClaimId) return
    setSubmitting276(true)
    setSubmit276Result(null)
    try {
      const { data } = await ediAPI.submit276({ claim_id: statusClaimId })
      setSubmit276Result(data)
      loadData()
    } catch (e) {
      setSubmit276Result({ error: e.response?.data?.detail || 'Inquiry failed' })
    } finally {
      setSubmitting276(false)
    }
  }

  const viewTransaction = async (txId) => {
    setViewingTx(txId)
    try {
      const { data } = await ediAPI.getTransaction(txId)
      setTxDetail(data)
    } catch (e) {
      setTxDetail(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  )

  const payers = [...new Set(connections.map(c => c.payer_name))].sort()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EDI Hub</h1>
          <p className="text-gray-500 text-sm mt-0.5">Electronic Data Interchange — Payer Connectivity</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Server} label="EDI Connections" value={summary?.total_connections} sub={`${summary?.active_connections} active`} color="bg-blue-500" />
        <StatCard icon={ArrowLeftRight} label="Total Transactions" value={summary?.total_transactions} color="bg-indigo-500" />
        <StatCard icon={FileCode} label="Claims Submitted" value={summary?.total_claims_submitted?.toLocaleString()} color="bg-green-500" />
        <StatCard icon={Send} label="Total Transmitted" value={`$${((summary?.total_amount || 0) / 1000).toFixed(0)}K`} color="bg-purple-500" />
        <StatCard icon={Wifi} label="Connection Rate" value={summary?.active_connections && summary?.total_connections ? `${Math.round(summary.active_connections / summary.total_connections * 100)}%` : '0%'} color="bg-teal-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          {['connections', 'transactions', 'submit', 'status-inquiry'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'status-inquiry' ? '276/277 Inquiry' : tab === 'submit' ? '837 Submit' : tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'connections' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Payer', 'Payer ID', 'Type', 'Format', 'Endpoint', 'Status', 'Success Rate', 'Transactions', 'Actions'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {connections.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{c.payer_name}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-600">{c.payer_id}</td>
                        <td className="px-3 py-3 text-xs text-gray-600">{c.connection_type}</td>
                        <td className="px-3 py-3 text-xs text-gray-600">{c.edi_format}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-500">{c.endpoint_url}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs font-semibold ${c.success_rate >= 95 ? 'text-green-600' : 'text-orange-500'}`}>
                            {c.success_rate}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{c.total_transactions}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => testConnection(c.id)} disabled={testingId === c.id}
                            className="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                            {testingId === c.id ? <Loader size={12} className="animate-spin" /> : 'Test'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {testResult && (
                <div className={`mt-4 p-4 rounded-xl border ${testResult.test_result === 'SUCCESS' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.test_result === 'SUCCESS' ? <CheckCircle size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-600" />}
                    <span className="font-semibold text-gray-800">Connection Test: {testResult.payer_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${testResult.test_result === 'SUCCESS' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {testResult.test_result}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{testResult.latency_ms}ms latency</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {Object.entries(testResult.details).map(([key, val]) => (
                      <div key={key} className="text-xs p-2 bg-white rounded-lg border">
                        <span className="text-gray-500 block mb-0.5">{key.replace(/_/g, ' ')}</span>
                        <span className={`font-semibold ${val === 'OK' || val === 'PASSED' ? 'text-green-600' : 'text-red-600'}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Transaction ID', 'Payer', 'Type', 'Direction', 'Claims', 'Amount', 'Status', 'File', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map(t => (
                      <tr key={t.transaction_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-medium">{t.transaction_id}</td>
                        <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs">{t.payer_name}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TX_TYPE_COLORS[t.transaction_type] || 'bg-gray-100 text-gray-700'}`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{t.direction}</td>
                        <td className="px-3 py-2.5 text-gray-600">{t.claim_count}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">${t.total_amount?.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-700'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 font-mono truncate max-w-32">{t.file_name}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => viewTransaction(t.transaction_id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingTx && txDetail && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Transaction: {txDetail.transaction_id}</h3>
                    <button onClick={() => { setViewingTx(null); setTxDetail(null) }} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {[
                      ['Type', txDetail.transaction_type],
                      ['Payer', txDetail.payer_name],
                      ['Claims', txDetail.claim_count],
                      ['Amount', `$${txDetail.total_amount?.toLocaleString()}`],
                      ['Status', txDetail.status],
                      ['Response', txDetail.response_code],
                      ['Direction', txDetail.direction],
                      ['Completed', txDetail.completed_at?.split('T')[0] || 'Pending'],
                    ].map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-gray-500">{k}:</span>
                        <span className="font-medium text-gray-800 ml-1">{v}</span>
                      </div>
                    ))}
                  </div>
                  {txDetail.edi_content && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">EDI Content Preview:</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-52 whitespace-pre-wrap">
                        {txDetail.edi_content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'submit' && (
            <div className="max-w-2xl">
              <h3 className="font-semibold text-gray-800 mb-1">Submit 837P Claims Batch</h3>
              <p className="text-sm text-gray-500 mb-4">Generate and transmit an EDI 837 Professional claim submission to a payer.</p>

              <div className="flex gap-3 mb-4">
                <select value={submitPayer} onChange={e => setSubmitPayer(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Payer...</option>
                  {payers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={submit837} disabled={!submitPayer || submitting837}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {submitting837 ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  Submit 837P
                </button>
              </div>

              {submit837Result && (
                <div className={`p-4 rounded-xl border ${submit837Result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  {submit837Result.error ? (
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle size={18} />
                      <span className="font-medium">{submit837Result.error}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="font-semibold text-gray-800">837P Batch Submitted</span>
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">{submit837Result.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center border">
                          <div className="text-xl font-bold text-gray-900">{submit837Result.claims_submitted}</div>
                          <div className="text-xs text-gray-500">Claims Submitted</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                          <div className="text-lg font-bold text-gray-900">${submit837Result.total_amount?.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Total Amount</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                          <div className="text-xs font-mono text-blue-600 font-bold">{submit837Result.transaction_id}</div>
                          <div className="text-xs text-gray-500 mt-1">Transaction ID</div>
                        </div>
                      </div>
                      {submit837Result.edi_preview && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">EDI 837P Output Preview:</p>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-52 whitespace-pre-wrap">
                            {submit837Result.edi_preview}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'status-inquiry' && (
            <div className="max-w-2xl">
              <h3 className="font-semibold text-gray-800 mb-1">EDI 276/277 Claim Status Inquiry</h3>
              <p className="text-sm text-gray-500 mb-4">Send a 276 claim status inquiry and receive a simulated 277 response from the payer.</p>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={statusClaimId}
                  onChange={e => setStatusClaimId(e.target.value)}
                  placeholder="Enter Claim ID (e.g., CLM-2025001)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={submit276} disabled={!statusClaimId || submitting276}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  {submitting276 ? <Loader size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
                  Send 276 Inquiry
                </button>
              </div>

              {submit276Result && (
                <div className={`p-4 rounded-xl border ${submit276Result.error ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  {submit276Result.error ? (
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle size={18} />
                      <span className="font-medium">{submit276Result.error}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={18} className="text-blue-600" />
                        <span className="font-semibold text-gray-800">277 Response Received</span>
                        <span className="text-xs font-mono bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">{submit276Result.transaction_id}</span>
                      </div>

                      {submit276Result.response_277 && (
                        <div className="bg-white rounded-xl border border-blue-100 p-4 mb-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2">277 Claim Status Response</h4>
                          <dl className="grid grid-cols-2 gap-2">
                            {Object.entries(submit276Result.response_277).map(([key, val]) => (
                              <div key={key} className="flex gap-2 text-sm">
                                <span className="text-gray-500 min-w-32">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:</span>
                                <span className={`font-medium ${
                                  key === 'status_description' && String(val).includes('Paid') ? 'text-green-600' :
                                  key === 'status_description' && String(val).includes('Denied') ? 'text-red-600' :
                                  key === 'status_description' && String(val).includes('Rejected') ? 'text-red-600' :
                                  'text-gray-800'
                                }`}>
                                  {typeof val === 'number' ? (key.includes('amount') || key.includes('charged') || key.includes('paid') ? `$${val.toLocaleString()}` : val) : String(val)}
                                </span>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}

                      {submit276Result.edi_276_preview && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">EDI 276 Output:</p>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                            {submit276Result.edi_276_preview}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
