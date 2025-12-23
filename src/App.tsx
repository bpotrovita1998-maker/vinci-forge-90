import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { JobProvider } from "@/contexts/JobContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import { CookieConsent } from "./components/CookieConsent";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Gallery from "./pages/Gallery";
import Scenes from "./pages/Scenes";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import MovieViewer from "./pages/MovieViewer";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";

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
              <Route path="/" element={<Landing />} />
              <Route path="/create" element={<ProtectedRoute requireTokens><Index /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute><Gallery /></ProtectedRoute>} />
              <Route path="/scenes" element={<ProtectedRoute><Scenes /></ProtectedRoute>} />
              <Route path="/movie" element={<MovieViewer />} />
              <Route path="/pricing" element={<ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}><Pricing /></ProtectedRoute>} />
              <Route path="/memory" element={<ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}><Memory /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}><Settings /></ProtectedRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </BrowserRouter>
        </TooltipProvider>
      </JobProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
