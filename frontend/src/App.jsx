import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkflowModules from './pages/WorkflowModules'
import ClaimInventory from './pages/ClaimInventory'
import ClaimDetail from './pages/ClaimDetail'
import WorkQueues from './pages/WorkQueues'
import FileUpload from './pages/FileUpload'
import EDIHub from './pages/EDIHub'
import RPABots from './pages/RPABots'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/workflows" element={<ProtectedRoute><WorkflowModules /></ProtectedRoute>} />
          <Route path="/claims" element={<ProtectedRoute><ClaimInventory /></ProtectedRoute>} />
          <Route path="/claims/:claimId" element={<ProtectedRoute><ClaimDetail /></ProtectedRoute>} />
          <Route path="/queues" element={<ProtectedRoute><WorkQueues /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><FileUpload /></ProtectedRoute>} />
          <Route path="/edi" element={<ProtectedRoute><EDIHub /></ProtectedRoute>} />
          <Route path="/rpa" element={<ProtectedRoute><RPABots /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
