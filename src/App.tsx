import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CompleteProducerProfile from "./pages/CompleteProducerProfile";
import ProducerDashboard from "./pages/ProducerDashboard";
import ProductsPage from "./pages/ProductsPage";
import CreateProductPage from "./pages/CreateProductPage";
import EditProductPage from "./pages/EditProductPage";
import ProducerSalesPage from "./pages/ProducerSalesPage";
import ProducerSubscriptionsPage from "./pages/ProducerSubscriptionsPage";
import ProducerFinancialsPage from "./pages/ProducerFinancialsPage";
import SpacesListPage from "./pages/SpacesListPage";
import CreateSpacePage from "./pages/CreateSpacePage";
import EditSpacePage from "./pages/EditSpacePage";
import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminProducersPage from "./pages/Admin/AdminProducersPage";
import AdminFinancialsPage from "./pages/Admin/AdminFinancialsPage";
import AdminFeesPage from "./pages/Admin/AdminFeesPage";
import AdminGatewaysPage from "./pages/Admin/AdminGatewaysPage";
import VerificationPage from "./pages/Admin/VerificationPage";
import AdminPagesPage from "./pages/Admin/AdminPagesPage";
import AdminEditPage from "./pages/Admin/AdminEditPage";
import PublicPage from "./pages/PublicPage";
import SettingsHubPage from "./pages/Producer/SettingsHubPage";
import AccountPage from "./pages/Producer/Settings/AccountPage";
import WebhooksPage from "./pages/Producer/Settings/WebhooksPage";
import APIPage from "./pages/Producer/Settings/APIPage";
import PersonalizeSpacePage from "./pages/PersonalizeSpacePage";
import MyCoursesPage from "./pages/MyCoursesPage";
import CoursePlayerPage from "./pages/CoursePlayerPage";
import MembersCoursePlayerPage from "./pages/members/CoursePlayerPage";
import MembersHubPage from "./pages/members/MembersHubPage";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/checkout/:slug" element={<Checkout />} />
              <Route path="/payment-confirmation/:saleId" element={<PaymentConfirmation />} />
              <Route path="/p/:slug" element={<PublicPage />} />

              {/* Producer Routes */}
              <Route path="/complete-producer-profile" element={<ProtectedRoute requiredView="producer"><CompleteProducerProfile /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requiredView="producer"><ProducerDashboard /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute requiredView="producer"><ProductsPage /></ProtectedRoute>} />
              <Route path="/products/new" element={<ProtectedRoute requiredView="producer"><CreateProductPage /></ProtectedRoute>} />
              <Route path="/products/edit/:id" element={<ProtectedRoute requiredView="producer"><EditProductPage /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute requiredView="producer"><ProducerSalesPage /></ProtectedRoute>} />
              <Route path="/members-area" element={<ProtectedRoute requiredView="producer"><SpacesListPage /></ProtectedRoute>} />
              <Route path="/members-area/new" element={<ProtectedRoute requiredView="producer"><CreateSpacePage /></ProtectedRoute>} />
              <Route path="/spaces/edit/:spaceId" element={<ProtectedRoute requiredView="producer"><EditSpacePage /></ProtectedRoute>} />
              <Route path="/personalize/edit/:spaceId" element={<ProtectedRoute requiredView="producer"><PersonalizeSpacePage /></ProtectedRoute>} />
              <Route path="/producer/subscriptions" element={<ProtectedRoute requiredView="producer"><ProducerSubscriptionsPage /></ProtectedRoute>} />
              <Route path="/financials" element={<ProtectedRoute requiredView="producer"><ProducerFinancialsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredView="producer"><SettingsHubPage /></ProtectedRoute>} />
              <Route path="/settings/account" element={<ProtectedRoute requiredView="producer"><AccountPage /></ProtectedRoute>} />
              <Route path="/settings/webhooks" element={<ProtectedRoute requiredView="producer"><WebhooksPage /></ProtectedRoute>} />
              <Route path="/settings/api" element={<ProtectedRoute requiredView="producer"><APIPage /></ProtectedRoute>} />

              {/* Student Routes */}
              <Route path="/members" element={<ProtectedRoute requiredView="student"><MyCoursesPage /></ProtectedRoute>} />
              <Route path="/members/:slug" element={<ProtectedRoute requiredView="student"><CoursePlayerPage /></ProtectedRoute>} />
              <Route path="/members/courses/:productId" element={<ProtectedRoute requiredView="student"><MembersCoursePlayerPage /></ProtectedRoute>} />
              <Route path="/members/spaces/:spaceId" element={<ProtectedRoute requiredView="student"><MembersHubPage /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="producers" element={<AdminProducersPage />} />
                <Route path="financials" element={<AdminFinancialsPage />} />
                <Route path="fees" element={<AdminFeesPage />} />
                <Route path="gateways" element={<AdminGatewaysPage />} />
                <Route path="verifications" element={<VerificationPage />} />
                <Route path="pages" element={<AdminPagesPage />} />
                <Route path="pages/new" element={<AdminEditPage />} />
                <Route path="pages/edit/:pageId" element={<AdminEditPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
