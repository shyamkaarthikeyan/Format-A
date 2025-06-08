import { Router, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
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
    <>
      <RouterClient />
      <Toaster />
    </>
  );
}

export default AppClient;