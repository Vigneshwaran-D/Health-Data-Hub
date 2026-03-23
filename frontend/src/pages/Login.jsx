import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api'
import {
  Eye, EyeOff, TrendingUp, BarChart3, Settings, Users,
  FileText, Shield, Zap, ArrowRight
} from 'lucide-react'

const PERSONAS = [
  {
    username: 'clientlead',
    password: 'nova123',
    role: 'Client Leadership',
    icon: TrendingUp,
    color: 'from-violet-500 to-purple-600',
    accent: 'bg-violet-500',
    access: ['Revenue Analytics', 'AR Trends', 'Denial Insights', 'Financial Impact'],
  },
  {
    username: 'opslead',
    password: 'nova123',
    role: 'Operations Leadership',
    icon: BarChart3,
    color: 'from-blue-500 to-indigo-600',
    accent: 'bg-blue-500',
    access: ['Operational KPIs', 'Team Productivity', 'Queue Performance'],
  },
  {
    username: 'opsmgr',
    password: 'nova123',
    role: 'Operations Manager',
    icon: Settings,
    color: 'from-emerald-500 to-teal-600',
    accent: 'bg-emerald-500',
    access: ['Work Queues', 'Team Assignments', 'Escalations'],
  },
  {
    username: 'teamlead',
    password: 'nova123',
    role: 'Team Lead',
    icon: Users,
    color: 'from-amber-500 to-orange-600',
    accent: 'bg-amber-500',
    access: ['Agent Tasks', 'Claim Workflows', 'Quality Metrics'],
  },
  {
    username: 'arexec',
    password: 'nova123',
    role: 'AR Executive',
    icon: FileText,
    color: 'from-cyan-500 to-blue-600',
    accent: 'bg-cyan-500',
    access: ['Claim Follow-ups', 'Denial Resolution', 'Appeals'],
  },
  {
    username: 'qaauditor',
    password: 'nova123',
    role: 'QA Auditor',
    icon: Shield,
    color: 'from-rose-500 to-pink-600',
    accent: 'bg-rose-500',
    access: ['Resolved Claims', 'Quality Scores', 'Compliance Checks'],
  },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authAPI.login({ username, password })
      login(data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePersonaLogin = async (persona) => {
    setSelectedPersona(persona.role)
    setUsername(persona.username)
    setPassword(persona.password)
    setLoading(true)
    setError('')
    try {
      const { data } = await authAPI.login({ username: persona.username, password: persona.password })
      login(data)
      navigate('/dashboard')
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
      setSelectedPersona(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">NovaArc Health</h1>
              <p className="text-xs text-blue-300/80">AI-Powered RCM Workflow Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span>v2.0</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to NovaArc Health</h2>
            <p className="text-slate-400 max-w-xl">Select your role to access the RCM Revenue Surge workflow platform. Each persona provides tailored access to the tools and analytics you need.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-2xl w-full text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full mb-8">
            {PERSONAS.map((persona) => {
              const Icon = persona.icon
              return (
                <button
                  key={persona.username}
                  onClick={() => handlePersonaLogin(persona)}
                  disabled={loading}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-60"
                >
                  {selectedPersona === persona.role && (
                    <div className="absolute inset-0 bg-white/5 rounded-2xl animate-pulse" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${persona.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">{persona.role}</h3>
                        <ArrowRight size={14} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {persona.access.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="max-w-md w-full">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-950 px-4 text-slate-500">or sign in manually</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  placeholder="Username"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 pr-10"
                  placeholder="Password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full">
            {[
              { label: '300+', sub: 'Claims Managed' },
              { label: '94%', sub: 'Collection Rate' },
              { label: '5x', sub: 'Faster Processing' },
              { label: '32%', sub: 'Denial Reduction' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
