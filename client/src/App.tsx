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
import AIAssistant from "@/pages/ai-assistant";
import { lazy } from "react";
import StudentProfile from "@/pages/student-profile";
import Submissions from "@/pages/submissions";

// Lazy load Stage 3 enterprise components
const CourseManagement = lazy(() => import("./pages/course-management"));
const InstitutionalAnalytics = lazy(() => import("./pages/institutional-analytics"));
const AdvancedAssessment = lazy(() => import("./pages/advanced-assessment"));
const LMSIntegration = lazy(() => import("./pages/lms-integration"));
const UserManagement = lazy(() => import("./pages/user-management"));

// Lazy load Stage 4 AI components
const AIContentGeneration = lazy(() => import("./pages/ai-content-generation"));
const IntelligentTutoring = lazy(() => import("./pages/intelligent-tutoring"));
const AutomatedGrading = lazy(() => import("./pages/automated-grading"));
const SmartRecommendations = lazy(() => import("./pages/smart-recommendations"));
const PredictiveAnalytics = lazy(() => import("./pages/predictive-analytics"));

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
          <Redirect to="/app" />
        </ProtectedRoute>
      </Route>
      <Route path="/app">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/app/problems">
        <ProtectedRoute>
          <Problems />
        </ProtectedRoute>
      </Route>
      <Route path="/app/problems/:id">
        <ProtectedRoute>
          <CodeEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/app/submissions">
        <ProtectedRoute>
          <Submissions />
        </ProtectedRoute>
      </Route>
      <Route path="/app/interview">
        <ProtectedRoute>
          <Interviews />
        </ProtectedRoute>
      </Route>
      <Route path="/app/interview/session/:id">
        <ProtectedRoute>
          <AIInterview />
        </ProtectedRoute>
      </Route>
      <Route path="/app/groups">
        <ProtectedRoute>
          <StudyGroups />
        </ProtectedRoute>
      </Route>
      <Route path="/app/profile">
        <ProtectedRoute>
          <StudentProfile />
        </ProtectedRoute>
      </Route>
      {/* Keep old routes for backward compatibility */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Redirect to="/app" />
        </ProtectedRoute>
      </Route>
      <Route path="/problems">
        <ProtectedRoute>
          <Redirect to="/app/problems" />
        </ProtectedRoute>
      </Route>
      <Route path="/progress">
        <ProtectedRoute>
          <Redirect to="/app/submissions" />
        </ProtectedRoute>
      </Route>
      <Route path="/study-groups">
        <ProtectedRoute>
          <Redirect to="/app/groups" />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-interview">
        <ProtectedRoute>
          <Redirect to="/app/interview" />
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
      <Route path="/ai-content-generation">
        <ProtectedRoute>
          <AIContentGeneration />
        </ProtectedRoute>
      </Route>
      <Route path="/intelligent-tutoring">
        <ProtectedRoute>
          <IntelligentTutoring />
        </ProtectedRoute>
      </Route>
      <Route path="/automated-grading">
        <ProtectedRoute>
          <AutomatedGrading />
        </ProtectedRoute>
      </Route>
      <Route path="/smart-recommendations">
        <ProtectedRoute>
          <SmartRecommendations />
        </ProtectedRoute>
      </Route>
      <Route path="/predictive-analytics">
        <ProtectedRoute>
          <PredictiveAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/app/ai-assistant">
        <ProtectedRoute>
          <AIAssistant />
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
