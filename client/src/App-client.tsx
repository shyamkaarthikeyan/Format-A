import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedRoute from "@/components/protected-route";
import Homepage from "@/pages/homepage";
import HomeClient from "@/pages/home-client";
import SigninPage from "@/pages/signin";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import DebugPage from "@/pages/debug";

function RouterClient() {
  return (
    <Router>
      <Route path="/" component={Homepage} />
      <Route path="/generator">
        <ProtectedRoute>
          <HomeClient />
        </ProtectedRoute>
      </Route>
      <Route path="/editor">
        <ProtectedRoute>
          <HomeClient />
        </ProtectedRoute>
      </Route>
      <Route path="/home">
        <ProtectedRoute>
          <HomeClient />
        </ProtectedRoute>
      </Route>
      <Route path="/signin" component={SigninPage} />
      <Route path="/debug" component={DebugPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
    </Router>
  );
}

function AppClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <RouterClient />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppClient;