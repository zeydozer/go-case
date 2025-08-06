import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PackageIcon, 
  PlusCircleIcon, 
  BarChart3Icon, 
  ServerIcon,
  ActivityIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    recentItems: [],
    serviceStatus: {
      nodeApi: false,
      goService: false
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load items from Node API
      const itemsResponse = await api.items.getAll()
      const items = itemsResponse.data.data || []
      
      // Load stats from Go service
      let goStats = null
      try {
        const goStatsResponse = await api.go.getStats()
        goStats = goStatsResponse.data.data
      } catch (error) {
        console.log('Go service stats not available')
      }
      
      // Check service health
      const serviceStatus = await checkServiceHealth()
      
      setStats({
        totalItems: items.length,
        recentItems: items.slice(0, 5),
        serviceStatus,
        goStats
      })
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const checkServiceHealth = async () => {
    const status = {
      nodeApi: false,
      goService: false
    }

    try {
      await api.items.health()
      status.nodeApi = true
    } catch (error) {
      console.log('Node API health check failed')
    }

    try {
      await api.go.health()
      status.goService = true
    } catch (error) {
      console.log('Go service health check failed')
    }

    return status
  }

  const sendTestNotification = async () => {
    try {
      await api.items.notify({
        message: 'Test notification from React dashboard',
        recipient: 'admin@example.com'
      })
      toast.success('Test notification sent successfully!')
    } catch (error) {
      toast.error('Failed to send notification')
    }
  }

  const sendTestEvent = async () => {
    try {
      await api.go.sendEvent({
        type: 'dashboard_test',
        message: 'Test event from React dashboard',
        timestamp: new Date().toISOString()
      })
      toast.success('Test event sent to Go service!')
    } catch (error) {
      toast.error('Failed to send test event')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Microservices Dashboard</h1>
        <p className="text-primary-100">
          Manage your items and monitor your microservices architecture
        </p>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${stats.serviceStatus.nodeApi ? 'bg-green-100' : 'bg-red-100'}`}>
              {stats.serviceStatus.nodeApi ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Node.js API</p>
              <p className={`text-lg font-semibold ${stats.serviceStatus.nodeApi ? 'text-green-600' : 'text-red-600'}`}>
                {stats.serviceStatus.nodeApi ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${stats.serviceStatus.goService ? 'bg-green-100' : 'bg-red-100'}`}>
              {stats.serviceStatus.goService ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Go Service</p>
              <p className={`text-lg font-semibold ${stats.serviceStatus.goService ? 'text-green-600' : 'text-red-600'}`}>
                {stats.serviceStatus.goService ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <PackageIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <ActivityIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.goStats?.category_stats?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/create-item" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <PlusCircleIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Item</h3>
            <p className="text-gray-600">Add a new item to the system</p>
          </div>
        </Link>

        <Link to="/items" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <PackageIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View Items</h3>
            <p className="text-gray-600">Browse all items</p>
          </div>
        </Link>

        <Link to="/stats" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <BarChart3Icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Statistics</h3>
            <p className="text-gray-600">View analytics and stats</p>
          </div>
        </Link>

        <Link to="/services" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-center">
            <ServerIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Services</h3>
            <p className="text-gray-600">Monitor service health</p>
          </div>
        </Link>
      </div>

      {/* Test Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Microservices</h3>
        <div className="flex space-x-4">
          <button
            onClick={sendTestNotification}
            className="btn-primary"
          >
            Send Test Notification
          </button>
          <button
            onClick={sendTestEvent}
            className="btn-secondary"
          >
            Send Test Event
          </button>
          <button
            onClick={loadDashboardData}
            className="btn-secondary"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>

      {/* Recent Items */}
      {stats.recentItems.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Items</h3>
            <Link to="/items" className="text-primary-600 hover:text-primary-700 font-medium">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {stats.recentItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-gray-600">{item.description}</p>
                  <p className="text-sm text-gray-500">
                    {item.category} • ${item.price}
                  </p>
                </div>
                <Link
                  to={`/items/${item._id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
