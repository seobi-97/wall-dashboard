import { useHashRoute } from './hooks/useHashRoute'
import AdminPage from './pages/AdminPage'
import WallPage from './pages/WallPage'

export default function App() {
  const [route] = useHashRoute()
  return route === 'admin' ? <AdminPage /> : <WallPage />
}
