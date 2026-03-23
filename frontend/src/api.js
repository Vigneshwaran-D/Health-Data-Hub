import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getUsers: () => api.get('/auth/users'),
}

export const claimsAPI = {
  getClaims: (params) => api.get('/claims/', { params }),
  getClaim: (claimId) => api.get(`/claims/${claimId}`),
  investigate: (claimId) => api.post(`/claims/${claimId}/investigate`),
  generateAppeal: (claimId) => api.post(`/claims/${claimId}/appeal`),
  updateNotes: (claimId, notes) => api.put(`/claims/${claimId}/notes`, { notes }),
  getFilters: () => api.get('/claims/filters'),
}

export const queuesAPI = {
  getQueues: () => api.get('/queues/'),
  getQueueClaims: (queueName, params) => api.get(`/queues/${encodeURIComponent(queueName)}/claims`, { params }),
}

export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getDashboard: () => api.get('/analytics/dashboard'),
  getDrilldown: (dimension) => api.get('/analytics/drilldown', { params: { dimension } }),
  getPayerIntelligence: () => api.get('/analytics/payer-intelligence'),
  getRiskIndicators: () => api.get('/analytics/risk-indicators'),
  getAgingDistribution: () => api.get('/analytics/aging-distribution'),
  getDenialBreakdown: () => api.get('/analytics/denial-breakdown'),
  getPayerPerformance: () => api.get('/analytics/payer-performance'),
  getRiskDistribution: () => api.get('/analytics/risk-distribution'),
  getSpecialtyBreakdown: () => api.get('/analytics/specialty-breakdown'),
  getInsights: () => api.get('/analytics/insights'),
  getTeamDashboard: () => api.get('/analytics/team-dashboard'),
}

export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
}

export const uploadAPI = {
  uploadClaims: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/claims', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export const ediAPI = {
  getConnections: () => api.get('/edi/connections'),
  testConnection: (id) => api.get(`/edi/connections/${id}/test`),
  getTransactions: (params) => api.get('/edi/transactions', { params }),
  getTransaction: (txId) => api.get(`/edi/transactions/${txId}`),
  submit837: (data) => api.post('/edi/submit-837', data),
  submit276: (data) => api.post('/edi/submit-276', data),
  getTransactionTypes: () => api.get('/edi/transaction-types'),
  getSummary: () => api.get('/edi/summary'),
}

export const rpaAPI = {
  getBots: () => api.get('/rpa/bots'),
  runBot: (botId) => api.post(`/rpa/bots/${botId}/run`),
  getBotLogs: (botId, limit) => api.get(`/rpa/bots/${botId}/logs`, { params: { limit } }),
  getBotTypes: () => api.get('/rpa/bot-types'),
  getSummary: () => api.get('/rpa/summary'),
  updateSchedule: (botId, data) => api.post(`/rpa/bots/${botId}/schedule`, data),
}

export default api
