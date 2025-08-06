import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon, EditIcon, TrashIcon, CalendarIcon, TagIcon, DollarSignIcon } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadItem()
    }
  }, [id])

  const loadItem = async () => {
    try {
      setLoading(true)
      const response = await api.items.getById(id)
      setItem(response.data.data)
    } catch (error) {
      console.error('Error loading item:', error)
      toast.error('Failed to load item details')
      navigate('/items')
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      await api.items.delete(id)
      toast.success('Item deleted successfully!')
      navigate('/items')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Item not found</h3>
        <p className="text-gray-600 mb-6">The item you're looking for doesn't exist.</p>
        <Link to="/items" className="btn-primary">
          Back to Items
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/items"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-gray-600">Item Details</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link to={`/edit-item/${item._id}`} className="btn-secondary">
            <EditIcon className="h-5 w-5 mr-2" />
            Edit
          </Link>
          <button onClick={deleteItem} className="btn-danger">
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Item Information</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <p className="text-lg text-gray-900">{item.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900">{item.description || 'No description provided'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="flex items-center">
                    <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {item.category || 'Uncategorized'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <div className="flex items-center">
                    <DollarSignIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-2xl font-bold text-green-600">
                      ${item.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item ID
                </label>
                <p className="text-sm text-gray-600 font-mono break-all">
                  {item._id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created At
                </label>
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Updated
                </label>
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {new Date(item.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              <Link
                to={`/edit-item/${item._id}`}
                className="w-full btn-primary text-center block"
              >
                Edit Item
              </Link>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(item._id)
                  toast.success('Item ID copied to clipboard!')
                }}
                className="w-full btn-secondary"
              >
                Copy Item ID
              </button>
              
              <button
                onClick={() => {
                  const itemData = JSON.stringify(item, null, 2)
                  navigator.clipboard.writeText(itemData)
                  toast.success('Item data copied to clipboard!')
                }}
                className="w-full btn-secondary"
              >
                Copy Item Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemDetail
