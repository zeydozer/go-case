import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon, PlusCircleIcon } from 'lucide-react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

function CreateItem() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Item name is required')
      return
    }

    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) < 0) {
      toast.error('Please enter a valid price')
      return
    }

    try {
      setLoading(true)
      
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim() || 'Uncategorized'
      }

      const response = await api.items.create(itemData)
      toast.success('Item created successfully!')
      navigate(`/items/${response.data.data._id}`)
      
    } catch (error) {
      console.error('Error creating item:', error)
      toast.error(error.response?.data?.error || 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Home & Garden',
    'Sports',
    'Toys',
    'Health & Beauty',
    'Automotive',
    'Food & Beverage',
    'Office Supplies'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/items"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Item</h1>
          <p className="text-gray-600">Add a new item to your inventory</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter item name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter item description"
              rows={4}
              className="input-field resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="input-field pl-7"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Or enter custom category"
                className="input-field mt-2"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link
              to="/items"
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center">
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Create Item
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Preview */}
        {(formData.name || formData.description || formData.price) && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                {formData.name || 'Item Name'}
              </h4>
              <p className="text-gray-600 mb-3">
                {formData.description || 'No description provided'}
              </p>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {formData.category || 'Uncategorized'}
                </span>
                <span className="text-lg font-bold text-green-600">
                  ${formData.price || '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateItem
