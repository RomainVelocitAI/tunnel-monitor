'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle, Clock, Download, RefreshCw } from 'lucide-react'
import { dashboardApi, exportApi } from '@/lib/api'
import StatsCard from './StatsCard'
import TunnelsList from './TunnelsList'
import PerformanceChart from './PerformanceChart'
import AlertsList from './AlertsList'

export default function Dashboard() {
  const [period, setPeriod] = useState(7)

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['stats', period],
    queryFn: () => dashboardApi.getStats(period),
  })

  const { data: currentStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['currentStatus'],
    queryFn: dashboardApi.getCurrentStatus,
    refetchInterval: 60000, // Refresh every minute
  })

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', period],
    queryFn: () => dashboardApi.getAlerts(period),
  })

  const handleRefresh = () => {
    refetchStats()
    refetchStatus()
  }

  const handleExportCSV = () => {
    exportApi.exportCSV(period)
  }

  const handleExportJSON = () => {
    exportApi.exportJSON(period)
  }

  if (statsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tunnel Monitor Dashboard</h1>
            <p className="text-gray-600 mt-2">Surveillance en temps réel de vos tunnels de vente</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
            
            <div className="relative group">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exporter
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block">
                <button
                  onClick={handleExportCSV}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Exporter en CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Exporter en JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="mt-4 flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-lg ${
                period === days
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {days} jours
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Tests totaux"
          value={stats?.totalTests || 0}
          icon={Activity}
          color="blue"
        />
        <StatsCard
          title="Taux de succès"
          value={`${stats?.totalTests > 0 ? Math.round((stats.successfulTests / stats.totalTests) * 100) : 0}%`}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Performance moyenne"
          value={`${stats?.averagePerformance || 0}%`}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="Alertes critiques"
          value={stats?.criticalIssues || 0}
          icon={AlertTriangle}
          color="red"
          highlight={stats?.criticalIssues > 0}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tunnels List */}
        <div className="lg:col-span-2">
          <TunnelsList tunnels={currentStatus || []} />
        </div>

        {/* Alerts */}
        <div className="lg:col-span-1">
          <AlertsList alerts={alerts || []} />
        </div>
      </div>

      {/* Performance Chart */}
      <div className="mt-6">
        <PerformanceChart data={stats?.testsByDay || {}} />
      </div>
    </div>
  )
}