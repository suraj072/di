import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import Index from "./pages/Index";
import InitiativeDetail from "./pages/InitiativeDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import InitiativesManagement from "./pages/admin/InitiativesManagement";
import InitiativeForm from "./pages/admin/InitiativeForm";
import CategoryForm from "./pages/admin/CategoryForm";
import PartnersManagement from "./pages/admin/PartnersManagement";
import PartnerForm from "./pages/admin/PartnerForm";
import AdminAccess from "./pages/admin/AdminAccess";
import ProductsManagement from "./pages/admin/ProductsManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected stakeholder routes */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/initiatives/:id" element={<InitiativeDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="initiatives" element={<InitiativesManagement />} />
              {/* Sub-initiative form (with partner management) */}
              <Route path="initiatives/new" element={<InitiativeForm />} />
              <Route path="initiatives/:id" element={<InitiativeForm />} />
              {/* Main category form */}
              <Route path="categories/new" element={<CategoryForm />} />
              <Route path="categories/:id" element={<CategoryForm />} />
              {/* Partners routes */}
              <Route path="partners" element={<PartnersManagement />} />
              <Route path="partners/new" element={<PartnerForm />} />
              <Route path="partners/:id" element={<PartnerForm />} />
              <Route path="access" element={<AdminAccess />} />
              <Route path="products" element={<ProductsManagement />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
