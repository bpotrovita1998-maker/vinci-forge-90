import { Suspense, lazy } from "react";
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
import { useWebVitals } from "./hooks/useWebVitals";
import { PageLoadingSkeleton } from "./components/LazyComponent";
import { TranslationErrorBoundary } from "@/components/TranslationErrorBoundary";
import AdBlockDetector from "./components/AdBlockDetector";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Scenes = lazy(() => import("./pages/Scenes"));
const Auth = lazy(() => import("./pages/Auth"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MovieViewer = lazy(() => import("./pages/MovieViewer"));
const Memory = lazy(() => import("./pages/Memory"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Tutorials = lazy(() => import("./pages/Tutorials"));
const Blog = lazy(() => import("./pages/Blog"));
const FAQ = lazy(() => import("./pages/FAQ"));

const queryClient = new QueryClient();

// Web Vitals monitoring component
function WebVitalsMonitor() {
  useWebVitals({
    enabled: true,
    debug: import.meta.env.DEV, // Only log in development
    onMetric: (data) => {
      // In production, you could send this to an analytics service
      if (import.meta.env.PROD && data.rating === "poor") {
        console.warn(`[Performance] Poor ${data.metric}: ${data.value.toFixed(2)}`);
      }
    },
  });
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <JobProvider>
        <TooltipProvider>
          <WebVitalsMonitor />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TranslationErrorBoundary>
              <Navigation />
              <Suspense fallback={<PageLoadingSkeleton />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Landing />} />
                  <Route
                    path="/create"
                    element={
                      <ProtectedRoute skipSubscriptionCheck>
                        <Index />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/gallery"
                    element={
                      <ProtectedRoute skipSubscriptionCheck>
                        <Gallery />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/scenes" element={<ProtectedRoute><Scenes /></ProtectedRoute>} />
                  <Route path="/movie" element={<MovieViewer />} />
                  <Route
                    path="/pricing"
                    element={
                      <ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}>
                        <Pricing />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/memory"
                    element={
                      <ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}>
                        <Memory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute requireAuth={true} skipSubscriptionCheck={true}>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/tutorials" element={<Tutorials />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/faq" element={<FAQ />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieConsent />
              <AdBlockDetector />
            </TranslationErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </JobProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
