import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import AgentDetail from './pages/AgentDetail'
import WalletDetail from './pages/WalletDetail'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient()

const App = () => (
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    clientId={import.meta.env.VITE_PRIVY_CLIENT_ID}
    config={{
      embeddedWallets: {
        solana: {
          createOnLogin: 'off',
        },
      },
      loginMethods: ['email', 'google'],
      appearance: {
        theme: 'dark',
        accentColor: '#E11D48',
      },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path='/login' element={<Login />} />
              <Route
                path='/'
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/agents/:agentId'
                element={
                  <ProtectedRoute>
                    <AgentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/agents/:agentId/wallets/:walletId'
                element={
                  <ProtectedRoute>
                    <WalletDetail />
                  </ProtectedRoute>
                }
              />
              <Route path='*' element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </PrivyProvider>
)

export default App
