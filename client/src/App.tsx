import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AccessibilityProvider } from "@/contexts/accessibility-context";
import { SkipLinks } from "@/components/accessibility/skip-links";
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
import AccessibilitySettings from "@/pages/accessibility-settings";

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

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  // Check if user has admin role
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <button 
            onClick={() => window.location.href = '/app'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
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
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
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
        <AdminProtectedRoute>
          <InstitutionalAnalytics />
        </AdminProtectedRoute>
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
        <AdminProtectedRoute>
          <PredictiveAnalytics />
        </AdminProtectedRoute>
      </Route>
      <Route path="/lms-integration">
        <AdminProtectedRoute>
          <LmsIntegration />
        </AdminProtectedRoute>
      </Route>
      <Route path="/advanced-assessment">
        <ProtectedRoute>
          <AdvancedAssessment />
        </ProtectedRoute>
      </Route>
      <Route path="/accessibility-settings">
        <ProtectedRoute>
          <AccessibilitySettings />
        </ProtectedRoute>
      </Route>
      <Route path="/user-management">
        <AdminProtectedRoute>
          <AdminUserManagement />
        </AdminProtectedRoute>
      </Route>
      <Route path="/smart-recommendations">
        <ProtectedRoute>
          <SmartRecommendations />
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
        <AccessibilityProvider>
          <TooltipProvider>
            <SkipLinks />
            <Toaster />
            <Router />
          </TooltipProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
