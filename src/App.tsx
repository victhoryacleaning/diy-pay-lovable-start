
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProducerDashboard from "./pages/ProducerDashboard";
import CompleteProducerProfile from "./pages/CompleteProducerProfile";
import ProductsPage from "./pages/ProductsPage";
import CreateProductPage from "./pages/CreateProductPage";
import EditProductPage from "./pages/EditProductPage";
import Checkout from "./pages/Checkout";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import ProducerSalesPage from "./pages/ProducerSalesPage";
import ProducerSubscriptionsPage from "./pages/ProducerSubscriptionsPage";
import FinancialsPage from "./pages/FinancialsPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/complete-profile" element={<CompleteProducerProfile />} />
              <Route path="/checkout/:slug" element={<Checkout />} />
              <Route path="/payment-confirmation/:saleId" element={<PaymentConfirmation />} />
              
              {/* Protected Producer Routes */}
              <Route path="/producer" element={
                <ProtectedRoute>
                  <ProducerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/producer/products" element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              } />
              <Route path="/producer/products/create" element={
                <ProtectedRoute>
                  <CreateProductPage />
                </ProtectedRoute>
              } />
              <Route path="/producer/products/:id/edit" element={
                <ProtectedRoute>
                  <EditProductPage />
                </ProtectedRoute>
              } />
              <Route path="/producer/sales" element={
                <ProtectedRoute>
                  <ProducerSalesPage />
                </ProtectedRoute>
              } />
              <Route path="/producer/subscriptions" element={
                <ProtectedRoute>
                  <ProducerSubscriptionsPage />
                </ProtectedRoute>
              } />
              <Route path="/producer/financials" element={
                <ProtectedRoute>
                  <FinancialsPage />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
