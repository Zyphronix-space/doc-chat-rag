import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PublicLayout from './components/layout/PublicLayout'

import Landing from './pages/Landing'
import Features from './pages/Features'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import CookiePolicy from './pages/legal/CookiePolicy'

import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import Collections from './pages/Collections'
import CollectionDetail from './pages/CollectionDetail'
import Conversations from './pages/Conversations'
import Chat from './pages/Chat'
import NewChat from './pages/NewChat'
import Sources from './pages/Sources'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/chat" element={<NewChat />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App
