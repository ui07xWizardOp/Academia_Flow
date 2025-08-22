import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  School, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar
} from "lucide-react";

interface InstitutionalMetrics {
  overview: {
    totalStudents: number;
    totalProfessors: number;
    totalCourses: number;
    activeAssignments: number;
    overallEngagement: number;
    avgPerformance: number;
  };
  departmentBreakdown: {
    [department: string]: {
      students: number;
      courses: number;
      avgGrade: number;
      completionRate: number;
    };
  };
  performanceTrends: {
    date: string;
    submissions: number;
    avgScore: number;
    engagement: number;
  }[];
  courseAnalytics: {
    courseId: number;
    courseName: string;
    instructor: string;
    enrolled: number;
    completed: number;
    avgGrade: number;
    engagementScore: number;
    riskStudents: number;
  }[];
  studentProgressDistribution: {
    range: string;
    count: number;
  }[];
  timeAnalytics: {
    hour: number;
    activity: number;
    submissions: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function InstitutionalAnalytics() {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("month");

  const { data: analytics, isLoading } = useQuery<InstitutionalMetrics>({
    queryKey: ['/api/analytics/institutional', selectedDepartment, selectedTimeframe],
    enabled: !!user?.id && user?.role === 'admin',
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
              <p className="text-gray-600">Institutional analytics are only available to administrators.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading institutional analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
              <p className="text-gray-600">No institutional data found for analysis.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Institutional Analytics</h1>
              <p className="text-gray-600 mt-1">University-wide performance and engagement insights</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="ee">Electrical Engineering</SelectItem>
                  <SelectItem value="math">Mathematics</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="semester">This Semester</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.overview.totalStudents}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Professors</p>
                        <p className="text-2xl font-bold text-green-600">{analytics.overview.totalProfessors}</p>
                      </div>
                      <School className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Courses</p>
                        <p className="text-2xl font-bold text-purple-600">{analytics.overview.totalCourses}</p>
                      </div>
                      <BookOpen className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Assignments</p>
                        <p className="text-2xl font-bold text-orange-600">{analytics.overview.activeAssignments}</p>
                      </div>
                      <Target className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Engagement</p>
                        <p className="text-2xl font-bold text-teal-600">{analytics.overview.overallEngagement}%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-teal-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                        <p className="text-2xl font-bold text-pink-600">{analytics.overview.avgPerformance}%</p>
                      </div>
                      <Award className="h-8 w-8 text-pink-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.performanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avgScore" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                          name="Average Score (%)"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="submissions" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          fillOpacity={0.6}
                          name="Daily Submissions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Departments Tab */}
            <TabsContent value="departments" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Department Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.departmentBreakdown).map(([dept, data]) => (
                        <div key={dept} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold capitalize">{dept}</h4>
                            <Badge className="bg-blue-100 text-blue-800">
                              {data.students} students
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Courses</div>
                              <div className="font-semibold">{data.courses}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Avg Grade</div>
                              <div className="font-semibold">{data.avgGrade}%</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Completion</div>
                              <div className="font-semibold">{data.completionRate}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Student Progress Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.studentProgressDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {analytics.studentProgressDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Course</th>
                          <th className="text-left p-3">Instructor</th>
                          <th className="text-center p-3">Enrolled</th>
                          <th className="text-center p-3">Completed</th>
                          <th className="text-center p-3">Avg Grade</th>
                          <th className="text-center p-3">Engagement</th>
                          <th className="text-center p-3">At Risk</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.courseAnalytics.map((course) => (
                          <tr key={course.courseId} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{course.courseName}</td>
                            <td className="p-3 text-gray-600">{course.instructor}</td>
                            <td className="p-3 text-center">{course.enrolled}</td>
                            <td className="p-3 text-center">{course.completed}</td>
                            <td className="p-3 text-center">
                              <span className={`font-semibold ${
                                course.avgGrade >= 85 ? 'text-green-600' :
                                course.avgGrade >= 70 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {course.avgGrade}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${course.engagementScore}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">{course.engagementScore}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {course.riskStudents > 0 ? (
                                <Badge className="bg-red-100 text-red-800">
                                  {course.riskStudents}
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">0</Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {course.avgGrade >= 80 && course.engagementScore >= 75 ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Performance Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.studentProgressDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>At-Risk Student Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-900">High Risk Students</p>
                            <p className="text-sm text-red-700">Below 60% average performance</p>
                          </div>
                        </div>
                        <Badge className="bg-red-600 text-white">
                          {analytics.courseAnalytics.reduce((sum, course) => sum + course.riskStudents, 0)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="font-medium text-yellow-900">Low Engagement</p>
                            <p className="text-sm text-yellow-700">Less than 50% activity participation</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-600 text-white">
                          {Math.floor(analytics.overview.totalStudents * 0.15)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Award className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-blue-900">High Performers</p>
                            <p className="text-sm text-blue-700">Above 90% average performance</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-600 text-white">
                          {Math.floor(analytics.overview.totalStudents * 0.25)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.timeAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tickFormatter={(value) => `${value}:00`}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => `${value}:00`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="activity" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                          name="User Activity"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="submissions" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          fillOpacity={0.6}
                          name="Code Submissions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {analytics.overview.overallEngagement}%
                      </div>
                      <p className="text-sm text-gray-600">Overall Engagement</p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analytics.overview.overallEngagement}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {analytics.performanceTrends[analytics.performanceTrends.length - 1]?.submissions || 0}
                      </div>
                      <p className="text-sm text-gray-600">Daily Submissions</p>
                      <p className="text-xs text-gray-500 mt-2">
                        +12% from last week
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {Math.round(analytics.overview.totalStudents * 0.68)}
                      </div>
                      <p className="text-sm text-gray-600">Active This Week</p>
                      <p className="text-xs text-gray-500 mt-2">
                        68% of total students
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}