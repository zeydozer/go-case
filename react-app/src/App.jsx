import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import ItemDetail from './pages/ItemDetail'
import CreateItem from './pages/CreateItem'
import Stats from './pages/Stats'
import Services from './pages/Services'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/create-item" element={<CreateItem />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/services" element={<Services />} />
      </Routes>
    </Layout>
  )
}

export default App
