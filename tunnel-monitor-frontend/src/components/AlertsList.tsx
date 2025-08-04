'use client'

import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Alert {
  id: string
  tunnelId: string
  date: string
  status: string
  errors: any[]
}

interface AlertsListProps {
  alerts: Alert[]
}

export default function AlertsList({ alerts }: AlertsListProps) {
  const getAlertIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getAlertBg = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'error':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes récentes</h2>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Aucune alerte récente
          </p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertBg(alert.status)}`}
            >
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.status)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Tunnel #{alert.tunnelId.slice(-6)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {format(new Date(alert.date), 'dd MMM à HH:mm', { locale: fr })}
                  </p>
                  {alert.errors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.errors.length} erreur{alert.errors.length > 1 ? 's' : ''} détectée{alert.errors.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}