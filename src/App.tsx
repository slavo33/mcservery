import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import SupportPopup from "./components/SupportPopup";

// Lazy load non-critical routes
const Servers = lazy(() => import("./pages/Servers"));
const AddServer = lazy(() => import("./pages/AddServer"));
const ServerDetail = lazy(() => import("./pages/ServerDetail"));
const EditServer = lazy(() => import("./pages/EditServer"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const VipPage = lazy(() => import("./pages/VipPage"));
const VipSuccess = lazy(() => import("./pages/VipSuccess"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/servers" element={<Servers />} />
                <Route path="/server/:slug" element={<ServerDetail />} />
                <Route path="/server/:slug/edit" element={<EditServer />} />
                <Route path="/add-server" element={<AddServer />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/user/:userId" element={<UserProfile />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/vip" element={<VipPage />} />
                <Route path="/vip-success" element={<VipSuccess />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SupportPopup />
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
