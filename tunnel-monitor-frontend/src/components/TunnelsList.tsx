'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ExternalLink, Play, MoreVertical, History, Eye } from 'lucide-react'
import { tunnelApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import TestDetails from './TestDetails'

interface Tunnel {
  id: string
  name: string
  url: string
  type: string
  owner?: string
  lastCheck?: string
  currentStatus: string
  performanceScore?: number
  loadTime?: number
}

interface TunnelsListProps {
  tunnels: Tunnel[]
}

export default function TunnelsList({ tunnels }: TunnelsListProps) {
  const [selectedTunnel, setSelectedTunnel] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)
  const [selectedTest, setSelectedTest] = useState<any>(null)

  // Fetch history when a tunnel is selected
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['tunnelHistory', showHistory],
    queryFn: () => showHistory ? tunnelApi.getTunnelHistory(showHistory, 50) : null,
    enabled: !!showHistory,
  })

  const testMutation = useMutation({
    mutationFn: (tunnelId: string) => tunnelApi.testTunnel(tunnelId),
    onSuccess: () => {
      alert('Test lancé avec succès')
    },
    onError: () => {
      alert('Erreur lors du lancement du test')
    }
  })

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'status-success'
      case 'warning':
        return 'status-warning'
      case 'error':
        return 'status-error'
      case 'critical':
        return 'status-critical'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Tunnels surveillés</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière vérification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tunnels.map((tunnel) => (
              <tr key={tunnel.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{tunnel.name}</div>
                    <div className="text-xs text-gray-500">{tunnel.type}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`status-badge ${getStatusClass(tunnel.currentStatus)}`}>
                    {tunnel.currentStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={getPerformanceColor(tunnel.performanceScore)}>
                    <div className="text-sm font-medium">
                      {tunnel.performanceScore ? `${tunnel.performanceScore}%` : '-'}
                    </div>
                    {tunnel.loadTime && (
                      <div className="text-xs">
                        {(tunnel.loadTime / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tunnel.lastCheck && tunnel.lastCheck !== 'null'
                    ? format(new Date(tunnel.lastCheck), 'dd MMM à HH:mm', { locale: fr })
                    : 'Jamais'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => testMutation.mutate(tunnel.id)}
                      disabled={testMutation.isPending}
                      className="text-primary-600 hover:text-primary-900"
                      title="Lancer un test"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowHistory(tunnel.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Voir l'historique"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <a
                      href={tunnel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900"
                      title="Ouvrir le tunnel"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setSelectedTunnel(tunnel.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal pour l'historique */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Historique - {tunnels.find(t => t.id === showHistory)?.name}
                </h2>
                <button
                  onClick={() => {
                    setShowHistory(null)
                    setSelectedTest(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-gray-500">Chargement de l'historique...</p>
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((test: any) => (
                    <div
                      key={test.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedTest(test)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`status-badge ${getStatusClass(test.status)}`}>
                              {test.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              {test.createdTime && test.createdTime !== 'null' 
                                ? format(new Date(test.createdTime), 'dd MMM yyyy à HH:mm', { locale: fr })
                                : 'Date inconnue'}
                            </span>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Performance:</span>
                              <span className={`ml-2 font-medium ${getPerformanceColor(test.performanceScore)}`}>
                                {test.performanceScore ? `${test.performanceScore}%` : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Temps de chargement:</span>
                              <span className="ml-2 font-medium">
                                {test.loadTime ? `${(test.loadTime / 1000).toFixed(2)}s` : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Formulaires:</span>
                              <span className="ml-2 font-medium">{test.formsCount || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">CTAs:</span>
                              <span className="ml-2 font-medium">{test.ctaCount || 0}</span>
                            </div>
                          </div>

                          {test.errorDetails && (
                            <div className="mt-2 text-sm text-red-600">
                              Erreur: {test.errorDetails}
                            </div>
                          )}
                        </div>
                        
                        <button className="ml-4 text-blue-600 hover:text-blue-800">
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucun historique disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Affichage des détails du test */}
      {selectedTest && (
        <TestDetails 
          test={selectedTest} 
          onClose={() => setSelectedTest(null)} 
        />
      )}
    </div>
  )
}