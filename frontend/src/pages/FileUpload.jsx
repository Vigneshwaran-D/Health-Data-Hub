import React, { useState, useRef } from 'react'
import { uploadAPI } from '../api'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'

function generateSampleCSV() {
  const headers = ['claim_id', 'patient_name', 'dos', 'payer', 'cpt', 'icd', 'charge_amount', 'allowed_amount', 'aging_days', 'denial_code', 'provider', 'specialty']
  const rows = [
    ['CLM-SAMPLE-001', 'John Doe', '2025-01-15', 'Aetna', '99214', 'I10', '450.00', '380.00', '45', 'CO-197', 'Dr. James Mitchell', 'Primary Care'],
    ['CLM-SAMPLE-002', 'Jane Smith', '2025-02-10', 'Blue Cross Blue Shield', '27447', 'M17.11', '15000.00', '', '90', 'CO-29', 'Dr. Sarah Chen', 'Orthopedic Surgery'],
    ['CLM-SAMPLE-003', 'Bob Johnson', '2025-03-01', 'Medicare', '71046', 'J18.9', '800.00', '650.00', '20', '', 'Dr. David Johnson', 'Radiology'],
  ]
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_ar_claims.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function FileUpload() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Only CSV and Excel files are accepted.')
      return
    }
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await uploadAPI.uploadClaims(file)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Please check your file format.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AR File Upload</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload CSV or Excel files to import claims into the AR inventory</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <Upload size={36} className={`mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
            {file ? (
              <div>
                <div className="flex items-center justify-center gap-2 text-gray-800">
                  <FileText size={18} className="text-blue-500" />
                  <span className="font-semibold">{file.name}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-700">Drop your file here, or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Supports CSV, XLSX, XLS · Max 50MB</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <XCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={handleUpload} disabled={!file || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload & Process Claims
                </>
              )}
            </button>
            {file && (
              <button onClick={() => { setFile(null); setResult(null) }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                Clear
              </button>
            )}
          </div>
        </div>

        {result && (
          <div className={`rounded-xl border p-5 mb-5 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              {result.success ? <CheckCircle size={20} className="text-green-600" /> : <XCircle size={20} className="text-red-600" />}
              <span className="font-semibold text-gray-800">{result.success ? 'Upload Successful' : 'Upload Failed'}</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{result.message}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{result.added}</div>
                <div className="text-xs text-gray-500">Claims Added</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-500">{result.skipped}</div>
                <div className="text-xs text-gray-500">Duplicates Skipped</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{result.errors?.length || 0}</div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-red-100">
                <p className="text-xs font-semibold text-red-700 mb-1">Error Details:</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs text-gray-600">{e}</p>)}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Required File Format</h2>
            <button onClick={generateSampleCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors">
              <Download size={14} />
              Download Sample CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {['Column', 'Required', 'Description', 'Example'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['claim_id', true, 'Unique claim identifier', 'CLM-2025001'],
                  ['patient_name', true, 'Patient full name', 'John Smith'],
                  ['dos', true, 'Date of service', '2025-01-15'],
                  ['payer', true, 'Insurance payer name', 'Aetna'],
                  ['cpt', false, 'CPT procedure code', '99214'],
                  ['icd', false, 'ICD-10 diagnosis code', 'I10'],
                  ['charge_amount', false, 'Billed charge amount', '450.00'],
                  ['allowed_amount', false, 'Payer allowed amount', '380.00'],
                  ['aging_days', false, 'Days outstanding', '45'],
                  ['denial_code', false, 'Denial/adjustment code', 'CO-197'],
                  ['provider', false, 'Rendering provider name', 'Dr. Smith'],
                  ['specialty', false, 'Medical specialty', 'Primary Care'],
                ].map(([col, req, desc, ex]) => (
                  <tr key={col} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-blue-600">{col}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${req ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {req ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{desc}</td>
                    <td className="px-3 py-2 font-mono text-gray-500">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
