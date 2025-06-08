
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
import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/checkout/:slug" element={<Checkout />} />
            <Route path="/payment-confirmation/:saleId" element={<PaymentConfirmation />} />
            <Route 
              path="/complete-producer-profile" 
              element={
                <ProtectedRoute requiredRole="producer">
                  <CompleteProducerProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/producer-dashboard" 
              element={
                <ProtectedRoute requiredRole="producer">
                  <ProducerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products" 
              element={
                <ProtectedRoute requiredRole="producer">
                  <ProductsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products/new" 
              element={
                <ProtectedRoute requiredRole="producer">
                  <CreateProductPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products/edit/:id" 
              element={
                <ProtectedRoute requiredRole="producer">
                  <EditProductPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
