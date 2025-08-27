import React from 'react'
import Link from 'next/link'
import { 
  Home, 
  PlusCircle, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Settings,
  Menu,
  CreditCard,
  List
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export default function Layout({ children, title = "FuckMoney" }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Añadir Gasto', href: '/expenses/add', icon: PlusCircle },
    { name: 'Gestionar Gastos', href: '/expenses', icon: List },
    { name: 'Préstamos', href: '/loans', icon: CreditCard },
    { name: 'Vista Anual', href: '/annual', icon: Calendar },
    { name: 'Vista Mensual', href: '/monthly', icon: BarChart3 },
    { name: 'Predicciones', href: '/predictions', icon: TrendingUp },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
            </div>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={`${
          isMenuOpen ? 'block' : 'hidden'
        } md:block w-64 bg-white shadow-sm min-h-screen`}>
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
