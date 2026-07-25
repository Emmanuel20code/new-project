import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import AdminLayout from "./pages/admin/layout.tsx";
import AdminDashboard from "./pages/admin/page.tsx";
import VouchersPage from "./pages/admin/vouchers/page.tsx";
import PackagesPage from "./pages/admin/packages/page.tsx";
import PaymentsPage from "./pages/admin/payments/page.tsx";
import CustomersPage from "./pages/admin/customers/page.tsx";
import DevicesPage from "./pages/admin/devices/page.tsx";
import RoutersPage from "./pages/admin/routers/page.tsx";
import SessionsPage from "./pages/admin/sessions/page.tsx";
import ReportsPage from "./pages/admin/reports/page.tsx";
import SettingsPage from "./pages/admin/settings/page.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import PortalPage from "./pages/portal/page.tsx";

function AdminAuthGate() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-primary">
          <div className="text-center space-y-4 text-primary-foreground">
            <h1 className="text-3xl font-bold">EMMATECH Admin</h1>
            <p className="text-primary-foreground/70">Sign in to access the admin dashboard</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-primary">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-foreground border-t-transparent" />
        </div>
      </AuthLoading>
      <Authenticated>
        <AdminLayout />
      </Authenticated>
    </>
  );
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/admin" element={<AdminAuthGate />}>
            <Route index element={<AdminDashboard />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="routers" element={<RoutersPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/portal" element={<PortalPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
