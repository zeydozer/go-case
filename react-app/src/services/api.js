import axios from 'axios'

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const GO_API_BASE_URL = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080'

// Create axios instances
export const nodeAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const goAPI = axios.create({
  baseURL: GO_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptors
nodeAPI.interceptors.request.use(
  (config) => {
    console.log(`Making request to Node API: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

goAPI.interceptors.request.use(
  (config) => {
    console.log(`Making request to Go API: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptors
nodeAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Node API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

goAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Go API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// API functions for Node.js service
export const itemsAPI = {
  // Get all items
  getAll: () => nodeAPI.get('/api/items'),
  
  // Get item by ID
  getById: (id) => nodeAPI.get(`/api/items/${id}`),
  
  // Create new item
  create: (data) => nodeAPI.post('/api/items', data),
  
  // Update item
  update: (id, data) => nodeAPI.put(`/api/items/${id}`, data),
  
  // Delete item
  delete: (id) => nodeAPI.delete(`/api/items/${id}`),
  
  // Search items
  search: (query) => nodeAPI.get(`/api/items/search/${query}`),
  
  // Send notification
  notify: (data) => nodeAPI.post('/api/notify', data),
  
  // Health check
  health: () => nodeAPI.get('/health'),
}

// API functions for Go service
export const goServiceAPI = {
  // Get all items from Go service
  getItems: () => goAPI.get('/api/items'),
  
  // Get item by ID from Go service
  getItemById: (id) => goAPI.get(`/api/items/${id}`),
  
  // Get statistics
  getStats: () => goAPI.get('/api/stats'),
  
  // Send custom event
  sendEvent: (data) => goAPI.post('/api/events', data),
  
  // Health check
  health: () => goAPI.get('/health'),
}

// Combined API for easier use
export const api = {
  items: itemsAPI,
  go: goServiceAPI,
}

export default api
