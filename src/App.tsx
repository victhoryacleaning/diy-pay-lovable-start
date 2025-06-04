
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
import Checkout from "./pages/Checkout";
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
            {/* Rotas futuras */}
            {/* <Route path="/member-area" element={<ProtectedRoute requiredRole="user"><MemberArea /></ProtectedRoute>} /> */}
            {/* <Route path="/admin-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} /> */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
