import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  School,
  Users,
  BookOpen,
  TrendingUp,
  Activity,
  Target,
  Award,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  GraduationCap,
  Brain,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format } from "date-fns";

export default function InstitutionalAnalytics() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current-semester");
  const [selectedMetric, setSelectedMetric] = useState("performance");

  // Fetch institutional data
  const { data: institutionalStats = {
    overallGPA: 3.42,
    graduationRate: 87.5,
    retentionRate: 92.3,
    enrollmentGrowth: 8.5,
    facultyStudentRatio: "1:15",
    researchOutput: 342,
    grantsReceived: 4500000,
    industryPartnerships: 47,
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/institutional-stats', selectedDepartment, selectedPeriod],
  });

  const { data: departmentPerformance = [
    { department: 'Computer Science', gpa: 3.65, enrollment: 2400, graduationRate: 91, satisfaction: 88 },
    { department: 'Engineering', gpa: 3.48, enrollment: 1800, graduationRate: 89, satisfaction: 85 },
    { department: 'Mathematics', gpa: 3.52, enrollment: 1200, graduationRate: 86, satisfaction: 84 },
    { department: 'Physics', gpa: 3.44, enrollment: 900, graduationRate: 84, satisfaction: 82 },
    { department: 'Business', gpa: 3.38, enrollment: 1500, graduationRate: 88, satisfaction: 86 },
  ]} = useQuery({
    queryKey: ['/api/admin/department-performance', selectedPeriod],
  });

  const { data: enrollmentTrends = [
    { year: '2019', undergraduate: 12000, graduate: 3000, total: 15000 },
    { year: '2020', undergraduate: 12500, graduate: 3200, total: 15700 },
    { year: '2021', undergraduate: 13000, graduate: 3400, total: 16400 },
    { year: '2022', undergraduate: 13500, graduate: 3600, total: 17100 },
    { year: '2023', undergraduate: 14000, graduate: 3800, total: 17800 },
    { year: '2024', undergraduate: 14500, graduate: 4000, total: 18500 },
  ]} = useQuery({
    queryKey: ['/api/admin/enrollment-trends'],
  });

  const { data: courseAnalytics = [
    { course: 'Introduction to CS', enrollment: 450, completion: 92, avgGrade: 3.4 },
    { course: 'Data Structures', enrollment: 380, completion: 88, avgGrade: 3.2 },
    { course: 'Machine Learning', enrollment: 320, completion: 85, avgGrade: 3.5 },
    { course: 'Web Development', enrollment: 290, completion: 94, avgGrade: 3.6 },
    { course: 'Database Systems', enrollment: 250, completion: 90, avgGrade: 3.3 },
    { course: 'Algorithms', enrollment: 220, completion: 86, avgGrade: 3.1 },
  ]} = useQuery({
    queryKey: ['/api/admin/course-analytics', selectedDepartment],
  });

  const { data: studentOutcomes = {
    employmentRate: 92,
    avgStartingSalary: 75000,
    graduateSchoolRate: 18,
    avgTimeToEmployment: 2.3,
    topEmployers: ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'],
  }} = useQuery({
    queryKey: ['/api/admin/student-outcomes'],
  });

  const { data: facultyMetrics = {
    totalFaculty: 680,
    phDHolders: 612,
    avgPublications: 4.2,
    avgTeachingScore: 4.3,
    researchFunding: 12500000,
  }} = useQuery({
    queryKey: ['/api/admin/faculty-metrics'],
  });

  const { data: competencyData = [
    { skill: 'Problem Solving', A: 85, B: 78, fullMark: 100 },
    { skill: 'Critical Thinking', A: 82, B: 75, fullMark: 100 },
    { skill: 'Communication', A: 78, B: 80, fullMark: 100 },
    { skill: 'Technical Skills', A: 88, B: 72, fullMark: 100 },
    { skill: 'Teamwork', A: 80, B: 85, fullMark: 100 },
    { skill: 'Leadership', A: 75, B: 70, fullMark: 100 },
  ]} = useQuery({
    queryKey: ['/api/admin/competency-assessment'],
  });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  if (statsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Institutional Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive institutional performance metrics</p>
            </div>
            <div className="flex space-x-3">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[200px]" data-testid="select-department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="computer-science">Computer Science</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[200px]" data-testid="select-period">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-semester">Current Semester</SelectItem>
                  <SelectItem value="last-semester">Last Semester</SelectItem>
                  <SelectItem value="academic-year">Academic Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall GPA</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-gpa">{institutionalStats.overallGPA}</div>
                <Progress value={institutionalStats.overallGPA * 25} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-green-600">+0.08</span> from last year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Graduation Rate</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-graduation">{institutionalStats.graduationRate}%</div>
                <Progress value={institutionalStats.graduationRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  4-year graduation rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-retention">{institutionalStats.retentionRate}%</div>
                <Progress value={institutionalStats.retentionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  First-year retention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faculty-Student Ratio</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-ratio">{institutionalStats.facultyStudentRatio}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Industry partnerships: {institutionalStats.industryPartnerships}
                </p>
                <p className="text-xs text-muted-foreground">
                  Research output: {institutionalStats.researchOutput} papers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enrollment Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={enrollmentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="undergraduate" stackId="1" stroke="#8884d8" fill="#8884d8" name="Undergraduate" />
                  <Area type="monotone" dataKey="graduate" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Graduate" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentPerformance.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{dept.department}</span>
                        <div className="flex gap-4 text-sm">
                          <span>GPA: {dept.gpa}</span>
                          <span>{dept.enrollment} students</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-xs">
                            <span>Graduation Rate</span>
                            <span>{dept.graduationRate}%</span>
                          </div>
                          <Progress value={dept.graduationRate} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs">
                            <span>Satisfaction</span>
                            <span>{dept.satisfaction}%</span>
                          </div>
                          <Progress value={dept.satisfaction} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Student Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">Employment Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">{studentOutcomes.employmentRate}%</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">Avg Starting Salary</span>
                    <span className="text-xl font-bold">${studentOutcomes.avgStartingSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">Graduate School Rate</span>
                    <span className="text-xl font-bold">{studentOutcomes.graduateSchoolRate}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">Avg Time to Employment</span>
                    <span className="text-xl font-bold">{studentOutcomes.avgTimeToEmployment} months</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Top Employers</p>
                    <div className="flex flex-wrap gap-2">
                      {studentOutcomes.topEmployers.map((employer) => (
                        <Badge key={employer} variant="outline">{employer}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="course" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="enrollment" fill="#8884d8" name="Enrollment" />
                  <Bar yAxisId="right" dataKey="completion" fill="#82ca9d" name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Competency Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Student Competency Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={competencyData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Current Year" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Radar name="Previous Year" dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Faculty Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Faculty Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Faculty</p>
                      <p className="text-2xl font-bold">{facultyMetrics.totalFaculty}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">PhD Holders</p>
                      <p className="text-2xl font-bold">{facultyMetrics.phDHolders}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Publications/Year</span>
                      <span className="font-bold">{facultyMetrics.avgPublications}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Teaching Score</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{facultyMetrics.avgTeachingScore}/5.0</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Award
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(facultyMetrics.avgTeachingScore)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Research Funding</span>
                      <span className="font-bold">${(facultyMetrics.researchFunding / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}