import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const tunnelApi = {
  // Get all tunnels
  getTunnels: async () => {
    const { data } = await api.get('/tunnels')
    return data
  },

  // Get tunnel history
  getTunnelHistory: async (tunnelId: string, limit = 30) => {
    const { data } = await api.get(`/tunnels/${tunnelId}/history`, {
      params: { limit }
    })
    return data
  },

  // Trigger manual test
  testTunnel: async (tunnelId: string) => {
    const { data } = await api.post(`/tunnels/${tunnelId}/test`)
    return data
  },

  // Update tunnel
  updateTunnel: async (tunnelId: string, updates: any) => {
    const { data } = await api.put(`/tunnels/${tunnelId}`, updates)
    return data
  },
}

export const dashboardApi = {
  // Get statistics
  getStats: async (period: number = 7) => {
    const { data } = await api.get(`/dashboard/stats/${period}`)
    return data
  },

  // Get current status
  getCurrentStatus: async () => {
    const { data } = await api.get('/dashboard/current-status')
    return data
  },

  // Get alerts
  getAlerts: async (days: number = 7) => {
    const { data } = await api.get('/dashboard/alerts', {
      params: { days }
    })
    return data
  },
}

export const exportApi = {
  // Export CSV
  exportCSV: async (days: number = 30, tunnelId?: string) => {
    const params = new URLSearchParams()
    params.append('days', days.toString())
    if (tunnelId) params.append('tunnelId', tunnelId)
    
    const response = await api.get(`/export/csv?${params}`, {
      responseType: 'blob'
    })
    
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tunnel-monitoring-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },

  // Export JSON
  exportJSON: async (days: number = 30, tunnelId?: string) => {
    const params = new URLSearchParams()
    params.append('days', days.toString())
    if (tunnelId) params.append('tunnelId', tunnelId)
    
    const response = await api.get(`/export/json?${params}`)
    
    const dataStr = JSON.stringify(response.data, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    
    const link = document.createElement('a')
    link.href = dataUri
    link.setAttribute('download', `tunnel-monitoring-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}