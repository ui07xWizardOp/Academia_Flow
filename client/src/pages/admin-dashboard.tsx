import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
  Activity,
  School,
  Database,
  Settings,
  BarChart3,
  PieChart,
  FileText,
  UserCheck,
  Shield,
  Cpu,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Target,
  Link2,
  Brain,
  Zap,
  Sparkles,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch comprehensive admin statistics
  const { data: systemStats = {
    totalUsers: 15234,
    activeUsers: 8742,
    totalCourses: 156,
    totalSubmissions: 48295,
    totalRevenue: 287500,
    systemHealth: 98.5,
    storageUsed: 67,
    apiCalls: 125000,
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/system-stats'],
  });

  const { data: userStats = {
    students: 14500,
    professors: 680,
    admins: 54,
    growth: 12.5,
  }} = useQuery({
    queryKey: ['/api/admin/user-stats'],
  });

  const { data: courseStats = {
    active: 142,
    archived: 14,
    enrollments: 58420,
    completionRate: 72.3,
  }} = useQuery({
    queryKey: ['/api/admin/course-stats'],
  });

  const { data: performanceData = [
    { month: 'Jan', users: 12000, revenue: 185000, submissions: 35000 },
    { month: 'Feb', users: 12500, revenue: 192000, submissions: 38000 },
    { month: 'Mar', users: 13200, revenue: 210000, submissions: 42000 },
    { month: 'Apr', users: 13800, revenue: 225000, submissions: 44000 },
    { month: 'May', users: 14500, revenue: 245000, submissions: 46000 },
    { month: 'Jun', users: 15234, revenue: 287500, submissions: 48295 },
  ]} = useQuery({
    queryKey: ['/api/admin/performance-data'],
  });

  const { data: departmentData = [
    { name: 'Computer Science', value: 35, students: 5200, color: '#8884d8' },
    { name: 'Engineering', value: 25, students: 3800, color: '#82ca9d' },
    { name: 'Mathematics', value: 20, students: 3000, color: '#ffc658' },
    { name: 'Physics', value: 12, students: 1800, color: '#ff7c7c' },
    { name: 'Business', value: 8, students: 1200, color: '#8dd1e1' },
  ]} = useQuery({
    queryKey: ['/api/admin/department-stats'],
  });

  const { data: recentActivities = [
    { id: 1, type: 'user_registration', message: 'New student registered', time: '5 minutes ago', status: 'success' },
    { id: 2, type: 'course_created', message: 'Advanced Algorithms course created', time: '1 hour ago', status: 'success' },
    { id: 3, type: 'system_update', message: 'System maintenance completed', time: '2 hours ago', status: 'info' },
    { id: 4, type: 'payment_received', message: 'Payment received from 45 students', time: '3 hours ago', status: 'success' },
    { id: 5, type: 'backup_completed', message: 'Daily backup completed successfully', time: '5 hours ago', status: 'success' },
  ]} = useQuery({
    queryKey: ['/api/admin/recent-activities'],
  });

  const { data: systemHealth = [
    { service: 'Database', status: 'operational', uptime: 99.9 },
    { service: 'API Gateway', status: 'operational', uptime: 99.8 },
    { service: 'Authentication', status: 'operational', uptime: 100 },
    { service: 'Storage', status: 'operational', uptime: 99.7 },
    { service: 'Analytics', status: 'degraded', uptime: 97.5 },
  ]} = useQuery({
    queryKey: ['/api/admin/system-health'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserCheck className="h-4 w-4" />;
      case 'course_created':
        return <BookOpen className="h-4 w-4" />;
      case 'system_update':
        return <Settings className="h-4 w-4" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4" />;
      case 'backup_completed':
        return <Database className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">System overview and management</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setLocation("/user-management")}
                data-testid="button-manage-users"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button 
                onClick={() => setLocation("/institutional-analytics")}
                data-testid="button-view-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-users">{systemStats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{userStats.growth}%</span> from last month
                </p>
                <div className="mt-2 text-xs">
                  <div className="flex justify-between">
                    <span>Students:</span>
                    <span className="font-medium">{userStats.students.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Professors:</span>
                    <span className="font-medium">{userStats.professors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admins:</span>
                    <span className="font-medium">{userStats.admins}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-courses">{courseStats.active}</div>
                <p className="text-xs text-muted-foreground">
                  {courseStats.enrollments.toLocaleString()} total enrollments
                </p>
                <Progress value={courseStats.completionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {courseStats.completionRate}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-revenue">${systemStats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+23.5%</span> from last month
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Monthly target:</span>
                    <span className="font-medium">$300,000</span>
                  </div>
                  <Progress value={(systemStats.totalRevenue / 300000) * 100} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-system-health">{systemStats.systemHealth}%</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Storage:</span>
                    <span className="font-medium">{systemStats.storageUsed}% used</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>API Calls:</span>
                    <span className="font-medium">{(systemStats.apiCalls / 1000).toFixed(0)}k today</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Health and Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemHealth.map((service) => (
                    <div key={service.service} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          service.status === 'operational' ? 'bg-green-500' :
                          service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">{service.service}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {service.uptime}% uptime
                        </span>
                        <Badge className={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        activity.status === 'success' ? 'bg-green-100 text-green-600' :
                        activity.status === 'info' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/user-management")}
                  data-testid="button-quick-users"
                >
                  <Shield className="h-6 w-6" />
                  <span>User Management</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/course-management")}
                  data-testid="button-quick-courses"
                >
                  <BookOpen className="h-6 w-6" />
                  <span>Course Management</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/ai-content-generation")}
                  data-testid="button-quick-ai"
                >
                  <Sparkles className="h-6 w-6" />
                  <span>AI Content</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/lms-integration")}
                  data-testid="button-quick-lms"
                >
                  <Link2 className="h-6 w-6" />
                  <span>LMS Integration</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/automated-grading")}
                  data-testid="button-quick-grading"
                >
                  <Zap className="h-6 w-6" />
                  <span>Auto Grading</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/intelligent-tutoring")}
                  data-testid="button-quick-tutoring"
                >
                  <Brain className="h-6 w-6" />
                  <span>AI Tutoring</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/predictive-analytics")}
                  data-testid="button-quick-predictions"
                >
                  <Target className="h-6 w-6" />
                  <span>Predictions</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => setLocation("/institutional-analytics")}
                  data-testid="button-quick-analytics"
                >
                  <PieChart className="h-6 w-6" />
                  <span>Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Submissions Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="submissions" stroke="#82ca9d" name="Submissions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}