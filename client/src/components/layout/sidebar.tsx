import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logoImage from "@assets/image_1755930165009.png";
import {
  Home,
  List,
  Code,
  TrendingUp,
  Mic,
  Users,
  Settings,
  LogOut,
  Bot,
  UserCheck,
  BarChart3,
  BookOpen,
  FileCheck,
  Link2,
  Shield,
  School,
  Sparkles,
  Brain,
  Zap,
  Target,
  User,
  Briefcase,
  FileText,
  Calendar,
  GraduationCap,
  Building2,
  Network
} from "lucide-react";

// Student navigation
const studentNavigation = [
  { name: "Dashboard", href: "/app", icon: Home },
  { name: "Problems", href: "/app/problems", icon: List },
  { name: "Submissions", href: "/app/submissions", icon: TrendingUp },
  { name: "Mock Interview", href: "/app/interview", icon: Mic },
  { name: "AI Assistant", href: "/app/ai-assistant", icon: Bot },
  { name: "Study Groups", href: "/app/groups", icon: Users },
  { name: "Profile", href: "/app/profile", icon: User },
  { name: "AI Tutor", href: "/intelligent-tutoring", icon: Brain },
  { name: "Collaboration", href: "/collaboration", icon: UserCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  // Career Services
  { name: "Job Board", href: "/career/jobs", icon: Briefcase },
  { name: "Resume Builder", href: "/career/resume", icon: FileText },
  { name: "Career Counseling", href: "/career/counseling", icon: Calendar },
  { name: "Career Events", href: "/career/events", icon: Calendar },
  { name: "Alumni Network", href: "/career/alumni", icon: Network },
  { name: "Internships", href: "/career/internships", icon: Building2 },
  { name: "Skills Assessment", href: "/career/skills", icon: Brain },
];

// Professor navigation
const professorNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Course Management", href: "/course-management", icon: BookOpen },
  { name: "Advanced Assessment", href: "/advanced-assessment", icon: FileCheck },
  { name: "AI Content Generation", href: "/ai-content-generation", icon: Sparkles },
  { name: "Intelligent Tutoring", href: "/intelligent-tutoring", icon: Brain },
  { name: "Automated Grading", href: "/automated-grading", icon: Zap },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Collaboration", href: "/collaboration", icon: UserCheck },
];

// Admin navigation  
const adminNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Institutional Analytics", href: "/institutional-analytics", icon: School },
  { name: "LMS Integration", href: "/lms-integration", icon: Link2 },
  { name: "User Management", href: "/user-management", icon: Shield },
  { name: "Course Management", href: "/course-management", icon: BookOpen },
  { name: "Advanced Assessment", href: "/advanced-assessment", icon: FileCheck },
  { name: "AI Content Generation", href: "/ai-content-generation", icon: Sparkles },
  { name: "Intelligent Tutoring", href: "/intelligent-tutoring", icon: Brain },
  { name: "Automated Grading", href: "/automated-grading", icon: Zap },
  { name: "Smart Recommendations", href: "/smart-recommendations", icon: Target },
  { name: "Predictive Analytics", href: "/predictive-analytics", icon: Brain },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-orange-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-purple-100 p-1">
            <img 
              src={logoImage} 
              alt="UniLearn Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-purple-700">UniLearn</h1>
            <p className="text-sm text-purple-500">Learning Platform</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-medium">
              {user ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900" data-testid="user-name">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500" data-testid="user-role">
              {user?.role === "student" ? "Computer Science Student" : user?.role || "Student"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {(
            user?.role === 'admin' ? adminNavigation :
            user?.role === 'professor' ? professorNavigation :
            studentNavigation
          ).map((item) => {
            const isActive = location === item.href || 
              (item.href !== '/' && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-all cursor-pointer ${
                      isActive
                        ? "text-white bg-gradient-to-r from-purple-600 to-purple-700 shadow-sm"
                        : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <Link href="/settings">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 cursor-pointer">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start space-x-3 px-3 py-2 text-gray-600 hover:bg-gray-50"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
