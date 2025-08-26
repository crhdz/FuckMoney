import React, { useState } from 'react'
import Layout from '../components/Layout'
import { checkSupabaseConnection } from '../lib/supabase'

export default function Settings() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  React.useEffect(() => {
    (async () => {
      const ok = await checkSupabaseConnection();
      setDbStatus(ok ? 'ok' : 'error');
    })();
  }, []);
  const [settings, setSettings] = useState({
    currency: 'EUR',
    language: 'es',
    theme: 'light',
    notifications: true,
    budgetAlerts: true,
    weeklyReports: false,
    monthlyReports: true
  })

  const [exportFormat, setExportFormat] = useState('xlsx')
  const [importFile, setImportFile] = useState<File | null>(null)

  const currencies = [
    { value: 'EUR', label: '€ Euro' },
    { value: 'USD', label: '$ Dólar Americano' },
    { value: 'GBP', label: '£ Libra Esterlina' },
    { value: 'JPY', label: '¥ Yen Japonés' }
  ]

  const languages = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' }
  ]

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveSettings = () => {
    // Aquí se guardarían las configuraciones
    console.log('Configuraciones guardadas:', settings)
    alert('Configuraciones guardadas correctamente')
  }

  const handleExport = () => {
    // Aquí se implementaría la exportación
    console.log('Exportando datos en formato:', exportFormat)
    alert(`Exportando datos en formato ${exportFormat.toUpperCase()}...`)
  }

  const handleImport = () => {
    if (!importFile) {
      alert('Por favor selecciona un archivo')
      return
    }
    
    // Aquí se implementaría la importación
    console.log('Importando archivo:', importFile.name)
    alert(`Importando archivo: ${importFile.name}`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setImportFile(file || null)
  }

  return (
    <Layout title="Configuración">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configuración
          </h2>
          <p className="text-gray-600">
            Personaliza tu experiencia y gestiona tus datos
          </p>
            <div className="mt-4">
              <span className="text-sm font-medium">Estado de conexión a la base de datos: </span>
              {dbStatus === 'checking' && (
                <span className="text-yellow-500">Comprobando...</span>
              )}
              {dbStatus === 'ok' && (
                <span className="text-green-600">Conectado</span>
              )}
              {dbStatus === 'error' && (
                <span className="text-red-600">Error de conexión</span>
              )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuraciones generales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Configuración General
            </h3>
            
            <div className="space-y-6">
              {/* Moneda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value)}
                  className="input w-full"
                >
                  {currencies.map(currency => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Idioma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="input w-full"
                >
                  {languages.map(language => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="input w-full"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>

              {/* Notificaciones */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Notificaciones</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Habilitar notificaciones
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.budgetAlerts}
                      onChange={(e) => handleSettingChange('budgetAlerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Alertas de presupuesto
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.weeklyReports}
                      onChange={(e) => handleSettingChange('weeklyReports', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Reportes semanales
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.monthlyReports}
                      onChange={(e) => handleSettingChange('monthlyReports', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Reportes mensuales
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="btn-primary w-full"
              >
                Guardar Configuración
              </button>
            </div>
          </div>

          {/* Importación y Exportación */}
          <div className="space-y-6">
            {/* Exportación */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Exportar Datos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de exportación
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="input w-full"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="json">JSON (.json)</option>
                  </select>
                </div>
                
                <button
                  onClick={handleExport}
                  className="btn-primary w-full"
                >
                  📥 Exportar Todos los Datos
                </button>
                
                <p className="text-sm text-gray-600">
                  Exporta todos tus gastos, categorías y configuraciones en el formato seleccionado.
                </p>
              </div>
            </div>

            {/* Importación */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Importar Datos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar archivo
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.csv,.json"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                {importFile && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Archivo seleccionado: <strong>{importFile.name}</strong>
                    </p>
                  </div>
                )}
                
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📤 Importar Datos
                </button>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Formatos soportados:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Excel (.xlsx) con columnas: nombre, cantidad, frecuencia, categoría, fecha</li>
                    <li>CSV con la misma estructura</li>
                    <li>JSON con el formato de exportación de la app</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categorías personalizadas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Gestionar Categorías
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Hogar', color: 'bg-blue-500', count: 12 },
              { name: 'Transporte', color: 'bg-green-500', count: 8 },
              { name: 'Ocio', color: 'bg-purple-500', count: 5 },
              { name: 'Alimentación', color: 'bg-yellow-500', count: 15 },
              { name: 'Salud', color: 'bg-red-500', count: 3 },
              { name: 'Servicios', color: 'bg-pink-500', count: 7 },
              { name: 'Educación', color: 'bg-indigo-500', count: 2 },
              { name: 'Otros', color: 'bg-gray-500', count: 4 }
            ].map((category, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                  <span className="font-medium text-gray-900">{category.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {category.count} gastos
                </p>
                <button className="text-xs text-blue-600 hover:text-blue-800 mt-2">
                  Editar
                </button>
              </div>
            ))}
          </div>
          
          <button className="btn-secondary mt-6">
            + Añadir Nueva Categoría
          </button>
        </div>

        {/* Información de la cuenta */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Información de la Cuenta
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">127</p>
              <p className="text-sm text-gray-600">Gastos registrados</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">8</p>
              <p className="text-sm text-gray-600">Categorías utilizadas</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">6</p>
              <p className="text-sm text-gray-600">Meses de datos</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
