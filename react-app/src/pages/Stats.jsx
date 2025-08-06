import { useState, useEffect } from 'react'
import { BarChart3Icon, TrendingUpIcon, PackageIcon, TagIcon } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function Stats() {
  const [stats, setStats] = useState({
    nodeStats: null,
    goStats: null,
    loading: true
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }))
      
      // Load stats from Node.js API
      const nodeItemsResponse = await api.items.getAll()
      const items = nodeItemsResponse.data.data || []
      
      // Calculate Node.js stats
      const nodeStats = calculateNodeStats(items)
      
      // Load stats from Go service
      let goStats = null
      try {
        const goStatsResponse = await api.go.getStats()
        goStats = goStatsResponse.data.data
      } catch (error) {
        console.log('Go service stats not available')
      }
      
      setStats({
        nodeStats,
        goStats,
        loading: false
      })
      
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Failed to load statistics')
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  const calculateNodeStats = (items) => {
    const total = items.length
    const categories = {}
    let totalValue = 0
    let minPrice = Infinity
    let maxPrice = 0

    items.forEach(item => {
      // Category stats
      const category = item.category || 'Uncategorized'
      categories[category] = (categories[category] || 0) + 1
      
      // Price stats
      const price = parseFloat(item.price) || 0
      totalValue += price
      minPrice = Math.min(minPrice, price)
      maxPrice = Math.max(maxPrice, price)
    })

    const avgPrice = total > 0 ? totalValue / total : 0
    const categoryStats = Object.entries(categories).map(([name, count]) => ({
      _id: name,
      count
    }))

    return {
      total_items: total,
      category_stats: categoryStats,
      price_stats: {
        total_value: totalValue,
        average_price: avgPrice,
        min_price: minPrice === Infinity ? 0 : minPrice,
        max_price: maxPrice
      }
    }
  }

  const { nodeStats, goStats, loading } = stats

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistics & Analytics</h1>
        <p className="text-gray-600">Overview of your microservices data</p>
      </div>

      {/* Service Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node.js Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Node.js API Stats</h2>
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3Icon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          
          {nodeStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{nodeStats.total_items}</p>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{nodeStats.category_stats.length}</p>
                  <p className="text-sm text-gray-600">Categories</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-900">
                    ${nodeStats.price_stats.total_value.toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-600">Total Value</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-900">
                    ${nodeStats.price_stats.average_price.toFixed(2)}
                  </p>
                  <p className="text-sm text-blue-600">Avg Price</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Go Service Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Go Service Stats</h2>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          {goStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{goStats.total_items}</p>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{goStats.category_stats?.length || 0}</p>
                  <p className="text-sm text-gray-600">Categories</p>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Service Status</p>
                <p className="text-lg font-bold text-green-900">Online & Processing</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <TrendingUpIcon className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600">Go service statistics not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {nodeStats && nodeStats.category_stats.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Category Breakdown</h2>
            <TagIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {nodeStats.category_stats
              .sort((a, b) => b.count - a.count)
              .map((category, index) => {
                const percentage = ((category.count / nodeStats.total_items) * 100).toFixed(1)
                return (
                  <div key={category._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index % 5 === 0 ? 'bg-blue-500' :
                        index % 5 === 1 ? 'bg-green-500' :
                        index % 5 === 2 ? 'bg-yellow-500' :
                        index % 5 === 3 ? 'bg-purple-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium text-gray-900">{category._id}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">{category.count} items</span>
                      <span className="text-sm text-gray-500">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Price Analysis */}
      {nodeStats && nodeStats.total_items > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Price Analysis</h2>
            <BarChart3Icon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-900">
                ${nodeStats.price_stats.total_value.toFixed(2)}
              </p>
              <p className="text-sm text-green-600">Total Value</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-900">
                ${nodeStats.price_stats.average_price.toFixed(2)}
              </p>
              <p className="text-sm text-blue-600">Average Price</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-900">
                ${nodeStats.price_stats.min_price.toFixed(2)}
              </p>
              <p className="text-sm text-purple-600">Minimum Price</p>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-900">
                ${nodeStats.price_stats.max_price.toFixed(2)}
              </p>
              <p className="text-sm text-orange-600">Maximum Price</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={loadStats}
            className="btn-primary"
          >
            Refresh Statistics
          </button>
          <button
            onClick={() => {
              const statsData = JSON.stringify({ nodeStats, goStats }, null, 2)
              navigator.clipboard.writeText(statsData)
              toast.success('Statistics copied to clipboard!')
            }}
            className="btn-secondary"
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  )
}

export default Stats
