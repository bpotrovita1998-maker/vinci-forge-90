import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { JobProvider } from "@/contexts/JobContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import Scenes from "./pages/Scenes";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <JobProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navigation />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute requireTokens><Index /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
              <Route path="/scenes" element={<ProtectedRoute><Scenes /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </JobProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
