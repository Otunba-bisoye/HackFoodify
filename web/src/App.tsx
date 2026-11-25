import { Routes, Route} from 'react-router-dom'
import Home from './pages/Home/Home.tsx'
import './App.css'
import Vendor from './pages/Vendor/Vendor.tsx'
// import Cart from './pages/Cart/Cart.tsx'
// import Discover from './pages/Discover/Discover.tsx'
// import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute.tsx'
// import Checkout from './pages/Checkout/Checkout.tsx'

const App = () => {

  return (
    <>
      <div className="app">
        <Routes>
          <Route index element={<Home/>}/>
          {/* <Route path="/cart" element={ <ProtectedRoute> <Cart /> </ProtectedRoute> } /> */}
          {/* <Route path="/checkout" element={ <ProtectedRoute> <Checkout /> </ProtectedRoute> } /> */}
          <Route path='/vendor' element={<Vendor/>} />
          {/* <Route path='/discover' element={<Discover/>} /> */}
        </Routes>
      </div>
    </>
  )
}

export default App