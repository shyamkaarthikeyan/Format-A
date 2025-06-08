import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomeClient from "@/pages/home-client";

function RouterClient() {
  return (
    <Router>
      <Route path="/" component={HomeClient} />
      <Route path="/home" component={HomeClient} />
      <Route>
        {() => <HomeClient />}
      </Route>
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