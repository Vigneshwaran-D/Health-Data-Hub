import React from 'react'

export default function RiskBadge({ risk }) {
  const styles = {
    High: 'bg-red-100 text-red-700 border border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    Low: 'bg-green-100 text-green-700 border border-green-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${styles[risk] || styles.Low}`}>
      {risk}
    </span>
  )
}
