import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Book from './pages/Book'
import MyReservations from './pages/MyReservations'
import Admin from './pages/Admin'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Book />} />
        <Route path="my-reservations" element={<MyReservations />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default App
