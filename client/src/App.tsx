import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
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

// Career Services components
import JobBoard from "@/pages/job-board";
import ResumeBuilder from "@/pages/resume-builder";
import CareerCounseling from "@/pages/career-counseling";
import CareerEvents from "@/pages/career-events";
import AlumniNetwork from "@/pages/alumni-network";
import Internships from "@/pages/internships";
import SkillsAssessment from "@/pages/skills-assessment";
import AdminUserManagement from "@/pages/admin-user-management";
import CourseManagement from "@/pages/course-management";
import AiContentGeneration from "@/pages/ai-content-generation";
import AutomatedGrading from "@/pages/automated-grading";
import IntelligentTutoring from "@/pages/intelligent-tutoring";
import PredictiveAnalytics from "@/pages/predictive-analytics";
import LmsIntegration from "@/pages/lms-integration";
import InstitutionalAnalytics from "@/pages/institutional-analytics";

// Lazy load additional components if needed
const AdvancedAssessment = lazy(() => import("./pages/advanced-assessment"));
const UserManagement = lazy(() => import("./pages/user-management"));
const SmartRecommendations = lazy(() => import("./pages/smart-recommendations"));

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
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <AdminDashboard />
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
      <Route path="/course-management">
        <ProtectedRoute>
          <CourseManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-content-generation">
        <ProtectedRoute>
          <AiContentGeneration />
        </ProtectedRoute>
      </Route>
      <Route path="/automated-grading">
        <ProtectedRoute>
          <AutomatedGrading />
        </ProtectedRoute>
      </Route>
      <Route path="/intelligent-tutoring">
        <ProtectedRoute>
          <IntelligentTutoring />
        </ProtectedRoute>
      </Route>
      <Route path="/predictive-analytics">
        <ProtectedRoute>
          <PredictiveAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/lms-integration">
        <ProtectedRoute>
          <LmsIntegration />
        </ProtectedRoute>
      </Route>
      <Route path="/advanced-assessment">
        <ProtectedRoute>
          <AdvancedAssessment />
        </ProtectedRoute>
      </Route>
      <Route path="/lms-integration">
        <ProtectedRoute>
          <LmsIntegration />
        </ProtectedRoute>
      </Route>
      <Route path="/user-management">
        <ProtectedRoute>
          <AdminUserManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-content-generation">
        <ProtectedRoute>
          <AiContentGeneration />
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
      {/* Career Services Routes */}
      <Route path="/career/jobs">
        <ProtectedRoute>
          <JobBoard />
        </ProtectedRoute>
      </Route>
      <Route path="/career/resume">
        <ProtectedRoute>
          <ResumeBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/career/counseling">
        <ProtectedRoute>
          <CareerCounseling />
        </ProtectedRoute>
      </Route>
      <Route path="/career/events">
        <ProtectedRoute>
          <CareerEvents />
        </ProtectedRoute>
      </Route>
      <Route path="/career/alumni">
        <ProtectedRoute>
          <AlumniNetwork />
        </ProtectedRoute>
      </Route>
      <Route path="/career/internships">
        <ProtectedRoute>
          <Internships />
        </ProtectedRoute>
      </Route>
      <Route path="/career/skills">
        <ProtectedRoute>
          <SkillsAssessment />
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
