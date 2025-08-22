import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  List,
  Code,
  TrendingUp,
  Mic,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Problems", href: "/problems", icon: List },
  { name: "Code Editor", href: "/code-editor", icon: Code },
  { name: "Progress", href: "/progress", icon: TrendingUp },
  { name: "Mock Interviews", href: "/interviews", icon: Mic },
  { name: "Study Groups", href: "/study-groups", icon: Users },
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
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Code className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">CodeLearn</h1>
            <p className="text-sm text-gray-500">University Dashboard</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gray-300 text-gray-600 text-sm font-medium">
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
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
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
            <a className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </a>
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
