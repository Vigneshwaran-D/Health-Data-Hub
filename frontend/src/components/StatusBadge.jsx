import React from 'react'

export default function StatusBadge({ status }) {
  const styles = {
    'Created': 'bg-slate-100 text-slate-700',
    'Submitted': 'bg-blue-100 text-blue-700',
    'Rejected': 'bg-red-100 text-red-700',
    'Received': 'bg-purple-100 text-purple-700',
    'No Response': 'bg-orange-100 text-orange-700',
    'In Process': 'bg-cyan-100 text-cyan-700',
    'Denied': 'bg-red-100 text-red-700',
    'Paid': 'bg-green-100 text-green-700',
    'Appealed': 'bg-amber-100 text-amber-700',
    'Resolved': 'bg-teal-100 text-teal-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Pending Review': 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
