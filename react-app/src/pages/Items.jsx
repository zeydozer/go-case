import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, PlusCircle, Edit, Trash, Package } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function Items() {
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  useEffect(() => {
    filterItems()
  }, [items, searchQuery, selectedCategory])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await api.items.getAll()
      setItems(response.data.data || [])
    } catch (error) {
      console.error('Error loading items:', error)
      toast.error('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = items

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    setFilteredItems(filtered)
  }

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      await api.items.delete(id)
      toast.success('Item deleted successfully!')
      loadItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const getUniqueCategories = () => {
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))]
    return categories.sort()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <p className="text-gray-600">Manage your items</p>
        </div>
        <Link to="/create-item" className="btn-primary">
          <PlusCircle className="h-5 w-5 mr-2" />
          Create Item
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            <option value="">All Categories</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredItems.length} of {items.length} items
          </p>
          {(searchQuery || selectedCategory) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('')
              }}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600 mb-6">
            {items.length === 0 
              ? "Get started by creating your first item"
              : "Try adjusting your search or filter criteria"
            }
          </p>
          {items.length === 0 && (
            <Link to="/create-item" className="btn-primary">
              Create your first item
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {item.category || 'Uncategorized'}
                </span>
                <span className="text-lg font-bold text-green-600">
                  ${item.price}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Link
                  to={`/items/${item._id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View Details
                </Link>
                <div className="flex space-x-2">
                  <Link
                    to={`/edit-item/${item._id}`}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => deleteItem(item._id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Created: {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Items
