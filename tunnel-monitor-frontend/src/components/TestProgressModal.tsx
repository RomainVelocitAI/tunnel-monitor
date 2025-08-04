'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react'

interface TestProgressModalProps {
  isOpen: boolean
  onClose: () => void
  tunnelName: string
  tunnelId: string
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: any
}

export default function TestProgressModal({ isOpen, onClose, tunnelName, tunnelId }: TestProgressModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setLogs([])
      setIsComplete(false)
      setTestResult(null)
      setExpandedLogs(new Set())
      return
    }

    // Initialize with starting message
    setLogs([{
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Démarrage du test pour ${tunnelName}...`
    }])

    // Connect to SSE endpoint for real-time logs
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/tunnels/${tunnelId}/test-stream`
    )

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'log') {
          setLogs(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level: data.level || 'info',
            message: data.message,
            details: data.details
          }])
        } else if (data.type === 'complete') {
          setIsComplete(true)
          setTestResult(data.status)
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = () => {
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Connexion perdue avec le serveur'
      }])
      setIsComplete(true)
      setTestResult('error')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [isOpen, tunnelId, tunnelName])

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <ChevronRight className="h-4 w-4 text-blue-500" />
    }
  }

  const getLogStyles = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Test en cours</h2>
              <p className="text-blue-100 text-sm mt-1">{tunnelName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors"
              disabled={!isComplete}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {!isComplete && (
          <div className="px-6 py-3 bg-blue-50">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
              <span className="text-sm text-blue-700 font-medium">Analyse en cours...</span>
            </div>
          </div>
        )}

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-3 transition-all ${getLogStyles(log.level)}`}
              >
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => log.details && toggleLogExpansion(log.id)}
                >
                  <div className="mt-0.5">{getLogIcon(log.level)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.message}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                  {log.details && (
                    <ChevronRight 
                      className={`h-4 w-4 transition-transform ${
                        expandedLogs.has(log.id) ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </div>
                
                {/* Expanded Details */}
                {log.details && expandedLogs.has(log.id) && (
                  <div className="mt-3 ml-7 p-3 bg-white bg-opacity-50 rounded border">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Result */}
        {isComplete && (
          <div className={`p-6 border-t ${
            testResult === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {testResult === 'success' ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-green-900">Test terminé avec succès</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="font-semibold text-red-900">Test terminé avec des erreurs</span>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testResult === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}