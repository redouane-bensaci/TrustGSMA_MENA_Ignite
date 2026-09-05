import { Routes, Route } from 'react-router-dom'
import MarketingLayout from './layouts/MarketingLayout'
import DocsLayout from './layouts/DocsLayout'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Playground from './pages/Playground'
import PlaygroundHistory from './pages/PlaygroundHistory'

import DocsHome from './pages/docs/DocsHome'
import Quickstart from './pages/docs/Quickstart'
import ApiReference from './pages/docs/ApiReference'
import ToolsRegistry from './pages/docs/ToolsRegistry'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'

import Overview from './pages/dashboard/Overview'
import Onboarding from './pages/dashboard/Onboarding'
import ApiKeys from './pages/dashboard/ApiKeys'
import Transactions from './pages/dashboard/Transactions'
import TransactionDetail from './pages/dashboard/TransactionDetail'
import DashboardTools from './pages/dashboard/DashboardTools'
import Webhooks from './pages/dashboard/Webhooks'
import Usage from './pages/dashboard/Usage'
import Settings from './pages/dashboard/Settings'

import NotFound from './pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/playground/history" element={<PlaygroundHistory />} />

        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<DocsHome />} />
          <Route path="quickstart" element={<Quickstart />} />
          <Route path="api-reference" element={<ApiReference />} />
          <Route path="tools" element={<ToolsRegistry />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/:id" element={<TransactionDetail />} />
        <Route path="tools" element={<DashboardTools />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="usage" element={<Usage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
