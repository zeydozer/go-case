import { useState, useEffect } from 'react'
import { 
  ServerIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ActivityIcon,
  DatabaseIcon,
  MessageSquareIcon,
  RefreshCwIcon
} from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function Services() {
  const [services, setServices] = useState({
    nodeApi: { status: 'unknown', lastCheck: null, responseTime: null },
    goService: { status: 'unknown', lastCheck: null, responseTime: null },
    mongodb: { status: 'unknown', lastCheck: null },
    kafka: { status: 'unknown', lastCheck: null },
    rabbitmq: { status: 'unknown', lastCheck: null }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAllServices()
    // Set up interval to check services every 30 seconds
    const interval = setInterval(checkAllServices, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkAllServices = async () => {
    setLoading(true)
    
    const newServices = { ...services }
    
    // Check Node.js API
    try {
      const start = Date.now()
      await api.items.health()
      const responseTime = Date.now() - start
      newServices.nodeApi = { 
        status: 'online', 
        lastCheck: new Date().toLocaleTimeString(),
        responseTime: `${responseTime}ms`
      }
    } catch (error) {
      newServices.nodeApi = { 
        status: 'offline', 
        lastCheck: new Date().toLocaleTimeString(),
        responseTime: null
      }
    }

    // Check Go Service
    try {
      const start = Date.now()
      await api.go.health()
      const responseTime = Date.now() - start
      newServices.goService = { 
        status: 'online', 
        lastCheck: new Date().toLocaleTimeString(),
        responseTime: `${responseTime}ms`
      }
    } catch (error) {
      newServices.goService = { 
        status: 'offline', 
        lastCheck: new Date().toLocaleTimeString(),
        responseTime: null
      }
    }

    // Check MongoDB (indirectly through API)
    try {
      await api.items.getAll()
      newServices.mongodb = { 
        status: 'online', 
        lastCheck: new Date().toLocaleTimeString()
      }
    } catch (error) {
      newServices.mongodb = { 
        status: 'offline', 
        lastCheck: new Date().toLocaleTimeString()
      }
    }

    // Kafka and RabbitMQ status are inferred from service health
    newServices.kafka = { 
      status: newServices.nodeApi.status === 'online' && newServices.goService.status === 'online' ? 'online' : 'unknown',
      lastCheck: new Date().toLocaleTimeString()
    }
    
    newServices.rabbitmq = { 
      status: newServices.nodeApi.status === 'online' && newServices.goService.status === 'online' ? 'online' : 'unknown',
      lastCheck: new Date().toLocaleTimeString()
    }

    setServices(newServices)
    setLoading(false)
  }

  const sendTestEvent = async () => {
    try {
      await api.go.sendEvent({
        type: 'service_test',
        message: 'Test event from services page',
        timestamp: new Date().toISOString()
      })
      toast.success('Test event sent to Go service!')
    } catch (error) {
      toast.error('Failed to send test event')
    }
  }

  const sendTestNotification = async () => {
    try {
      await api.items.notify({
        message: 'Test notification from services page',
        recipient: 'system@example.com'
      })
      toast.success('Test notification sent!')
    } catch (error) {
      toast.error('Failed to send test notification')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100'
      case 'offline':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return CheckCircleIcon
      case 'offline':
        return XCircleIcon
      default:
        return ActivityIcon
    }
  }

  const servicesList = [
    {
      id: 'nodeApi',
      name: 'Node.js API',
      description: 'Main API service for CRUD operations',
      icon: ServerIcon,
      data: services.nodeApi
    },
    {
      id: 'goService',
      name: 'Go Service',
      description: 'Microservice for data processing and analytics',
      icon: ServerIcon,
      data: services.goService
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      description: 'Primary database for storing items',
      icon: DatabaseIcon,
      data: services.mongodb
    },
    {
      id: 'kafka',
      name: 'Apache Kafka',
      description: 'Event streaming platform for microservices communication',
      icon: MessageSquareIcon,
      data: services.kafka
    },
    {
      id: 'rabbitmq',
      name: 'RabbitMQ',
      description: 'Message broker for queue-based communication',
      icon: MessageSquareIcon,
      data: services.rabbitmq
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Status</h1>
          <p className="text-gray-600">Monitor the health of your microservices</p>
        </div>
        <button
          onClick={checkAllServices}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          <RefreshCwIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Services Online</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(services).filter(s => s.status === 'online').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <XCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Services Offline</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(services).filter(s => s.status === 'offline').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <ActivityIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unknown Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(services).filter(s => s.status === 'unknown').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {servicesList.map((service) => {
          const StatusIcon = getStatusIcon(service.data.status)
          const statusColor = getStatusColor(service.data.status)
          
          return (
            <div key={service.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <service.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-gray-600">{service.description}</p>
                    {service.data.lastCheck && (
                      <p className="text-sm text-gray-500">
                        Last checked: {service.data.lastCheck}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {service.data.responseTime && (
                    <span className="text-sm text-gray-600">
                      {service.data.responseTime}
                    </span>
                  )}
                  <div className={`flex items-center px-3 py-1 rounded-full ${statusColor}`}>
                    <StatusIcon className="h-4 w-4 mr-2" />
                    <span className="font-medium capitalize">{service.data.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Service Tests */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Tests</h3>
        <p className="text-gray-600 mb-6">
          Test the communication between your microservices
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={sendTestEvent}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <MessageSquareIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Test Kafka Event</h4>
            <p className="text-sm text-gray-600">Send test event to Go service via Kafka</p>
          </button>
          
          <button
            onClick={sendTestNotification}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <MessageSquareIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900">Test RabbitMQ Notification</h4>
            <p className="text-sm text-gray-600">Send test notification via RabbitMQ</p>
          </button>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Architecture Overview</h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">React App</span>
              </div>
              <span className="text-gray-400">↔</span>
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">Node.js API</span>
              </div>
              <span className="text-gray-400">↔</span>
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">MongoDB</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">Kafka</span>
              </div>
              <span className="text-gray-400">↔</span>
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">Go Service</span>
              </div>
              <span className="text-gray-400">↔</span>
              <div className="p-3 bg-white rounded-lg shadow">
                <span className="text-sm font-medium">RabbitMQ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Services
