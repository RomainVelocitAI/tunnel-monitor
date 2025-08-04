'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  X, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Image, 
  Link2, 
  Code,
  Monitor,
  Smartphone,
  Activity,
  Eye,
  TrendingUp
} from 'lucide-react'

interface TestDetailsProps {
  test: any
  onClose: () => void
}

export default function TestDetails({ test, onClose }: TestDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'screenshots' | 'performance' | 'elements'>('overview')
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop')

  // Parser les données JSON si nécessaire
  const performanceMetrics = test.performanceMetrics ? 
    (typeof test.performanceMetrics === 'string' ? JSON.parse(test.performanceMetrics) : test.performanceMetrics) : {}
  
  const elementsDetected = test.elementsDetected ? 
    (typeof test.elementsDetected === 'string' ? JSON.parse(test.elementsDetected) : test.elementsDetected) : {}
  
  const trackingPixelsDetails = test.trackingPixelsDetails ? 
    (typeof test.trackingPixelsDetails === 'string' ? JSON.parse(test.trackingPixelsDetails) : test.trackingPixelsDetails) : []

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{test.tunnelName || test.url}</h2>
              <p className="text-primary-100">
                Test du {format(new Date(test.testDate), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(test.status)}`}>
              {test.status === 'success' && <CheckCircle className="h-4 w-4 mr-1" />}
              {test.status === 'warning' && <AlertTriangle className="h-4 w-4 mr-1" />}
              {test.status === 'error' && <AlertTriangle className="h-4 w-4 mr-1" />}
              {test.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 p-2">
            {['overview', 'screenshots', 'performance', 'elements'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {tab === 'overview' && 'Vue d\'ensemble'}
                {tab === 'screenshots' && 'Captures d\'écran'}
                {tab === 'performance' && 'Performance'}
                {tab === 'elements' && 'Éléments détectés'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Performance Score */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                  Score de Performance
                </h3>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getPerformanceColor(test.performanceScore || 0)}`}>
                    {test.performanceScore || 0}%
                  </div>
                  <div className="text-gray-600 mt-2">Score global de santé du tunnel</div>
                </div>
              </div>

              {/* Load Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Monitor className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium">Desktop</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {(test.loadTimeDesktop / 1000).toFixed(2)}s
                  </div>
                  <div className="text-sm text-blue-700">Temps de chargement</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Smartphone className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium">Mobile</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {(test.loadTimeMobile / 1000).toFixed(2)}s
                  </div>
                  <div className="text-sm text-purple-700">Temps de chargement</div>
                </div>
              </div>

              {/* Validation Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className={`text-2xl mb-2 ${test.formsOk ? 'text-green-600' : 'text-red-600'}`}>
                    {test.formsOk ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-gray-600">Formulaires</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className={`text-2xl mb-2 ${test.ctaOk ? 'text-green-600' : 'text-red-600'}`}>
                    {test.ctaOk ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-gray-600">CTAs</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {test.brokenLinks || 0}
                  </div>
                  <div className="text-sm text-gray-600">Liens cassés</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {test.missingImages || 0}
                  </div>
                  <div className="text-sm text-gray-600">Images manquantes</div>
                </div>
              </div>

              {/* Errors & Warnings */}
              {(test.errors || test.warnings) && (
                <div className="space-y-4">
                  {test.errors && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">Erreurs</h4>
                      <pre className="text-sm text-red-700 whitespace-pre-wrap">
                        {typeof test.errors === 'string' ? test.errors : JSON.stringify(test.errors, null, 2)}
                      </pre>
                    </div>
                  )}
                  {test.warnings && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Avertissements</h4>
                      <pre className="text-sm text-yellow-700 whitespace-pre-wrap">
                        {typeof test.warnings === 'string' ? test.warnings : JSON.stringify(test.warnings, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Screenshots Tab */}
          {activeTab === 'screenshots' && (
            <div className="space-y-6">
              {/* Device Selector */}
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setActiveDevice('desktop')}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    activeDevice === 'desktop'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </button>
                <button
                  onClick={() => setActiveDevice('mobile')}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    activeDevice === 'mobile'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </button>
              </div>

              {/* Screenshot Display */}
              <div className="bg-gray-100 rounded-lg p-4">
                {activeDevice === 'desktop' && test.screenshotDesktop ? (
                  <img
                    src={test.screenshotDesktop[0]?.url || test.screenshotDesktop}
                    alt="Desktop Screenshot"
                    className="w-full rounded-lg shadow-lg"
                  />
                ) : activeDevice === 'mobile' && test.screenshotMobile ? (
                  <div className="flex justify-center">
                    <img
                      src={test.screenshotMobile[0]?.url || test.screenshotMobile}
                      alt="Mobile Screenshot"
                      className="max-w-sm rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Image className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucune capture d'écran disponible pour {activeDevice}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-indigo-600" />
                  Métriques de Performance Détaillées
                </h3>
                
                {performanceMetrics && Object.keys(performanceMetrics).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">First Contentful Paint</div>
                      <div className="text-2xl font-bold text-indigo-900">
                        {performanceMetrics.firstContentfulPaint ? 
                          `${(performanceMetrics.firstContentfulPaint / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">DOM Content Loaded</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {performanceMetrics.domContentLoaded ? 
                          `${(performanceMetrics.domContentLoaded / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Page Load Complete</div>
                      <div className="text-2xl font-bold text-green-900">
                        {performanceMetrics.loadEvent ? 
                          `${(performanceMetrics.loadEvent / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Aucune métrique de performance détaillée disponible</p>
                  </div>
                )}
              </div>

              {/* Performance Score Breakdown */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Répartition du Score</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Temps de chargement</span>
                      <span className="text-sm font-medium">{test.loadTimeDesktop < 3000 ? '100%' : test.loadTimeDesktop < 5000 ? '75%' : '50%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${test.loadTimeDesktop < 3000 ? 100 : test.loadTimeDesktop < 5000 ? 75 : 50}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Éléments fonctionnels</span>
                      <span className="text-sm font-medium">{test.formsOk && test.ctaOk ? '100%' : test.formsOk || test.ctaOk ? '50%' : '0%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${test.formsOk && test.ctaOk ? 100 : test.formsOk || test.ctaOk ? 50 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Intégrité des ressources</span>
                      <span className="text-sm font-medium">{test.brokenLinks === 0 && test.missingImages === 0 ? '100%' : '50%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${test.brokenLinks === 0 && test.missingImages === 0 ? 100 : 50}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Elements Tab */}
          {activeTab === 'elements' && (
            <div className="space-y-6">
              {/* Forms */}
              {elementsDetected.forms && elementsDetected.forms.length > 0 && (
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-900">
                    Formulaires détectés ({elementsDetected.forms.length})
                  </h3>
                  <div className="space-y-2">
                    {elementsDetected.forms.map((form: any, index: number) => (
                      <div key={index} className="bg-white rounded p-3">
                        <div className="text-sm">
                          <span className="font-medium">ID:</span> {form.id || 'Sans ID'}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Action:</span> {form.action || 'Non définie'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs */}
              {elementsDetected.ctas && elementsDetected.ctas.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-900">
                    Call-to-Actions détectés ({elementsDetected.ctas.length})
                  </h3>
                  <div className="space-y-2">
                    {elementsDetected.ctas.map((cta: any, index: number) => (
                      <div key={index} className="bg-white rounded p-3">
                        <div className="text-sm font-medium">{cta.text}</div>
                        {cta.href && (
                          <div className="text-sm text-gray-600">
                            <Link2 className="h-3 w-3 inline mr-1" />
                            {cta.href}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking Pixels */}
              {trackingPixelsDetails && trackingPixelsDetails.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-purple-900">
                    Pixels de tracking détectés ({trackingPixelsDetails.length})
                  </h3>
                  <div className="space-y-2">
                    {trackingPixelsDetails.map((pixel: string, index: number) => (
                      <div key={index} className="bg-white rounded p-3">
                        <code className="text-xs text-purple-700 break-all">{pixel}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No elements message */}
              {(!elementsDetected.forms || elementsDetected.forms.length === 0) &&
               (!elementsDetected.ctas || elementsDetected.ctas.length === 0) &&
               (!trackingPixelsDetails || trackingPixelsDetails.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <Code className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Aucun élément détecté dans ce test</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}