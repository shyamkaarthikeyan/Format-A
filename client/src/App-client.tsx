import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import MigrationNotification from "@/components/migration-notification";
import Homepage from "@/pages/homepage";
import HomeClient from "@/pages/home-client";
import SigninPage from "@/pages/signin";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import DebugPage from "@/pages/debug";
import AdminDashboard from "@/pages/admin-dashboard";

function RouterClient() {
  return (
    <Router>
      <Route path="/" component={Homepage} />
      <Route path="/try" component={HomeClient} />
      <Route path="/generator" component={HomeClient} />
      <Route path="/editor" component={HomeClient} />
      <Route path="/home" component={HomeClient} />
      <Route path="/signin" component={SigninPage} />
      <Route path="/debug" component={DebugPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/:section" component={AdminDashboard} />
    </Router>
  );
}

function AppClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <MigrationNotification />
          <RouterClient />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppClient;