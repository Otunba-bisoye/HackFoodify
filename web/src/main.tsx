import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext.tsx';
import { VendorProvider } from './context/VendorContext.tsx';

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <CartProvider>
          <VendorProvider>
            <App />
          </VendorProvider>
        </CartProvider>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>
)