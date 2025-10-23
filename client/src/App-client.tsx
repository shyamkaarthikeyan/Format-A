import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Homepage from "@/pages/homepage";
import HomeClient from "@/pages/home-client";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";

function RouterClient() {
  return (
    <Router>
      <Route path="/" component={Homepage} />
      <Route path="/generator" component={HomeClient} />
      <Route path="/home" component={HomeClient} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
    </Router>
  );
}

function AppClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <RouterClient />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default AppClient;