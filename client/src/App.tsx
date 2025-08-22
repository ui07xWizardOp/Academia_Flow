import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Problems from "@/pages/problems";
import CodeEditor from "@/pages/code-editor";
import ProgressPage from "@/pages/progress";
import Interviews from "@/pages/interviews";
import StudyGroups from "@/pages/study-groups";
import Settings from "@/pages/settings";
import AIInterview from "@/pages/ai-interview";
import Collaboration from "@/pages/collaboration";
import Analytics from "@/pages/analytics";
import { lazy } from "react";

// Lazy load Stage 3 enterprise components
const CourseManagement = lazy(() => import("./pages/course-management"));
const InstitutionalAnalytics = lazy(() => import("./pages/institutional-analytics"));
const AdvancedAssessment = lazy(() => import("./pages/advanced-assessment"));
const LMSIntegration = lazy(() => import("./pages/lms-integration"));
const UserManagement = lazy(() => import("./pages/user-management"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Redirect to="/dashboard" />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/problems">
        <ProtectedRoute>
          <Problems />
        </ProtectedRoute>
      </Route>
      <Route path="/code-editor">
        <ProtectedRoute>
          <CodeEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/progress">
        <ProtectedRoute>
          <ProgressPage />
        </ProtectedRoute>
      </Route>
      <Route path="/interviews">
        <ProtectedRoute>
          <Interviews />
        </ProtectedRoute>
      </Route>
      <Route path="/study-groups">
        <ProtectedRoute>
          <StudyGroups />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-interview">
        <ProtectedRoute>
          <AIInterview />
        </ProtectedRoute>
      </Route>
      <Route path="/collaboration">
        <ProtectedRoute>
          <Collaboration />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/course-management">
        <ProtectedRoute>
          <CourseManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/institutional-analytics">
        <ProtectedRoute>
          <InstitutionalAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/advanced-assessment">
        <ProtectedRoute>
          <AdvancedAssessment />
        </ProtectedRoute>
      </Route>
      <Route path="/lms-integration">
        <ProtectedRoute>
          <LMSIntegration />
        </ProtectedRoute>
      </Route>
      <Route path="/user-management">
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
