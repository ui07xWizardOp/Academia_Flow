import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Target,
  Users,
  BookOpen,
  Award,
  Zap,
  Eye,
  Bell,
  Settings,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Calendar,
  Lightbulb,
  Shield,
  ArrowRight,
  AlertCircle
} from "lucide-react";

interface StudentPrediction {
  studentId: number;
  studentName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  successProbability: number; // 0-100
  courseGrade: number; // 0-100
  engagementScore: number; // 0-100
  predictions: {
    finalGrade: number;
    completionLikelihood: number;
    timeToComplete: number; // days
    strugglingConcepts: string[];
  };
  riskFactors: {
    factor: string;
    impact: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
    description: string;
  }[];
  recommendations: {
    type: 'intervention' | 'support' | 'acceleration';
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: number;
    timeline: string;
  }[];
  historicalData: {
    date: string;
    successProbability: number;
    engagementScore: number;
  }[];
  lastUpdated: string;
}

interface CourseAnalytics {
  courseId: number;
  courseName: string;
  totalStudents: number;
  predictions: {
    averageSuccessRate: number;
    expectedDropoutRate: number;
    completionTimeEstimate: number;
    difficultyRating: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trendingConcepts: {
    concept: string;
    difficultyScore: number;
    strugglingStudents: number;
    averageTimeSpent: number;
  }[];
  interventionOpportunities: {
    type: string;
    affectedStudents: number;
    potentialImpact: number;
    urgency: 'low' | 'medium' | 'high';
  }[];
}

interface SystemInsights {
  totalStudents: number;
  atRiskStudents: number;
  successfulInterventions: number;
  modelAccuracy: number;
  topRiskFactors: {
    factor: string;
    frequency: number;
    averageImpact: number;
  }[];
  trendAnalysis: {
    period: string;
    successRateChange: number;
    engagementChange: number;
    interventionEffectiveness: number;
  };
  seasonalPatterns: {
    month: string;
    riskLevel: number;
    engagementLevel: number;
  }[];
}

export default function PredictiveAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<StudentPrediction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("30d");

  // Fetch student predictions
  const { data: studentPredictions = [], isLoading } = useQuery<StudentPrediction[]>({
    queryKey: ['/api/ai/student-predictions', selectedCourse, timeRange],
    enabled: !!user?.id && (user?.role === 'professor' || user?.role === 'admin'),
  });

  // Fetch course analytics
  const { data: courseAnalytics = [] } = useQuery<CourseAnalytics[]>({
    queryKey: ['/api/ai/course-analytics', timeRange],
    enabled: !!user?.id,
  });

  // Fetch system insights
  const { data: systemInsights } = useQuery<SystemInsights>({
    queryKey: ['/api/ai/system-insights', timeRange],
    enabled: !!user?.id,
  });

  // Trigger intervention
  const triggerInterventionMutation = useMutation({
    mutationFn: async ({ studentId, interventionType }: { studentId: number; interventionType: string }) => {
      const response = await apiRequest("POST", `/api/ai/interventions`, {
        studentId,
        type: interventionType
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Intervention Triggered",
        description: "Support intervention has been initiated for the student.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/student-predictions'] });
    },
  });

  // Update prediction model
  const updateModelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/update-predictions");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model Updated",
        description: "Predictive analytics model has been retrained with latest data.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/student-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/course-analytics'] });
    },
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'stable': return <Target className="w-4 h-4 text-blue-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  if (user?.role !== 'professor' && user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">Predictive analytics are only available to professors and administrators.</p>
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
            <p className="mt-2 text-gray-600">Loading predictive analytics...</p>
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-7 h-7 mr-3 text-indigo-500" />
                Predictive Analytics
              </h1>
              <p className="text-gray-600 mt-1">AI-powered student success prediction and early intervention system</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Model Settings
              </Button>
              <Button 
                onClick={() => updateModelMutation.mutate()}
                disabled={updateModelMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${updateModelMutation.isPending ? 'animate-spin' : ''}`} />
                Update Model
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="students" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="students">Student Predictions</TabsTrigger>
              <TabsTrigger value="courses">Course Analytics</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="insights">System Insights</TabsTrigger>
            </TabsList>

            {/* Student Predictions Tab */}
            <TabsContent value="students" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courseAnalytics.map(course => (
                      <SelectItem key={course.courseId} value={course.courseId.toString()}>
                        {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Bell className="w-4 h-4 mr-2" />
                  Set Alerts
                </Button>
              </div>

              {/* Risk Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Low Risk</p>
                        <p className="text-2xl font-bold text-green-600">
                          {studentPredictions.filter(s => s.riskLevel === 'low').length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Medium Risk</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {studentPredictions.filter(s => s.riskLevel === 'medium').length}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">High Risk</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {studentPredictions.filter(s => s.riskLevel === 'high').length}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Critical Risk</p>
                        <p className="text-2xl font-bold text-red-600">
                          {studentPredictions.filter(s => s.riskLevel === 'critical').length}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Student List */}
              <div className="grid gap-4">
                {studentPredictions
                  .sort((a, b) => {
                    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
                  })
                  .map((student) => (
                  <Card key={student.studentId} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold">{student.studentName}</h3>
                            <Badge className={getRiskColor(student.riskLevel)}>
                              <div className="flex items-center space-x-1">
                                {getRiskIcon(student.riskLevel)}
                                <span className="capitalize">{student.riskLevel} Risk</span>
                              </div>
                            </Badge>
                            <div className="text-sm text-gray-500">
                              Updated {new Date(student.lastUpdated).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-600">
                                {student.successProbability}%
                              </div>
                              <div className="text-xs text-gray-500">Success Rate</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">
                                {student.predictions.finalGrade}%
                              </div>
                              <div className="text-xs text-gray-500">Predicted Grade</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-lg font-bold text-purple-600">
                                {student.engagementScore}%
                              </div>
                              <div className="text-xs text-gray-500">Engagement</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-bold text-orange-600">
                                {student.predictions.timeToComplete}d
                              </div>
                              <div className="text-xs text-gray-500">Est. Completion</div>
                            </div>
                          </div>

                          {/* Risk Factors */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Top Risk Factors</h4>
                            <div className="space-y-2">
                              {student.riskFactors.slice(0, 2).map((factor, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center space-x-2">
                                    {getTrendIcon(factor.trend)}
                                    <span className="text-sm font-medium">{factor.factor}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={factor.impact} className="w-16 h-2" />
                                    <span className="text-xs text-gray-500">{factor.impact}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Struggling Concepts */}
                          {student.predictions.strugglingConcepts.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Struggling With</h4>
                              <div className="flex flex-wrap gap-2">
                                {student.predictions.strugglingConcepts.map((concept, index) => (
                                  <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                                    {concept}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommendations Preview */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">AI Recommendations</h4>
                            <div className="space-y-1">
                              {student.recommendations.slice(0, 2).map((rec, index) => (
                                <div key={index} className="text-sm text-gray-600 flex items-center">
                                  <Lightbulb className="w-3 h-3 mr-1 text-yellow-500" />
                                  {rec.action}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-6">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailsDialog(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          
                          {(student.riskLevel === 'high' || student.riskLevel === 'critical') && (
                            <Button
                              size="sm"
                              onClick={() => triggerInterventionMutation.mutate({
                                studentId: student.studentId,
                                interventionType: 'support'
                              })}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              Intervene
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Course Analytics Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="grid gap-6">
                {courseAnalytics.map((course) => (
                  <Card key={course.courseId} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-semibold">{course.courseName}</h3>
                          <Badge className="bg-blue-100 text-blue-800">
                            {course.totalStudents} students
                          </Badge>
                        </div>

                        {/* Course Predictions */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {course.predictions.averageSuccessRate}%
                            </div>
                            <div className="text-xs text-gray-500">Success Rate</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-lg font-bold text-red-600">
                              {course.predictions.expectedDropoutRate}%
                            </div>
                            <div className="text-xs text-gray-500">Dropout Risk</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {course.predictions.completionTimeEstimate}d
                            </div>
                            <div className="text-xs text-gray-500">Avg Completion</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {course.predictions.difficultyRating}/10
                            </div>
                            <div className="text-xs text-gray-500">Difficulty</div>
                          </div>
                        </div>

                        {/* Risk Distribution */}
                        <div className="mb-6">
                          <h4 className="font-medium mb-3">Risk Distribution</h4>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2 bg-green-100 rounded">
                              <div className="font-bold text-green-800">{course.riskDistribution.low}</div>
                              <div className="text-xs text-green-600">Low</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-100 rounded">
                              <div className="font-bold text-yellow-800">{course.riskDistribution.medium}</div>
                              <div className="text-xs text-yellow-600">Medium</div>
                            </div>
                            <div className="text-center p-2 bg-orange-100 rounded">
                              <div className="font-bold text-orange-800">{course.riskDistribution.high}</div>
                              <div className="text-xs text-orange-600">High</div>
                            </div>
                            <div className="text-center p-2 bg-red-100 rounded">
                              <div className="font-bold text-red-800">{course.riskDistribution.critical}</div>
                              <div className="text-xs text-red-600">Critical</div>
                            </div>
                          </div>
                        </div>

                        {/* Trending Concepts */}
                        <div className="mb-6">
                          <h4 className="font-medium mb-3">Challenging Concepts</h4>
                          <div className="space-y-2">
                            {course.trendingConcepts.slice(0, 3).map((concept, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                <div>
                                  <div className="font-medium text-orange-900">{concept.concept}</div>
                                  <div className="text-sm text-orange-700">
                                    {concept.strugglingStudents} students struggling • {concept.averageTimeSpent}h avg time
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-orange-600">
                                    {concept.difficultyScore}/10
                                  </div>
                                  <div className="text-xs text-gray-500">Difficulty</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Intervention Opportunities */}
                        <div>
                          <h4 className="font-medium mb-3">Intervention Opportunities</h4>
                          <div className="space-y-2">
                            {course.interventionOpportunities.map((opportunity, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <div className="font-medium">{opportunity.type}</div>
                                  <div className="text-sm text-gray-600">
                                    {opportunity.affectedStudents} students • {opportunity.potentialImpact}% impact
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={`${
                                    opportunity.urgency === 'high' ? 'bg-red-100 text-red-800' :
                                    opportunity.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {opportunity.urgency} urgency
                                  </Badge>
                                  <Button size="sm">
                                    <ArrowRight className="w-4 h-4 mr-1" />
                                    Act
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Intervention Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {systemInsights?.successfulInterventions || 0}
                      </div>
                      <div className="text-gray-600">Successful This Month</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 mb-2">
                        {studentPredictions.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length}
                      </div>
                      <div className="text-gray-600">Students Needing Help</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {systemInsights?.trendAnalysis.interventionEffectiveness || 0}%
                      </div>
                      <div className="text-gray-600">Effectiveness Rate</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Recommended Interventions</h4>
                    {studentPredictions
                      .filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical')
                      .slice(0, 5)
                      .map((student) => (
                      <div key={student.studentId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h5 className="font-medium">{student.studentName}</h5>
                            <Badge className={getRiskColor(student.riskLevel)}>
                              {student.riskLevel} risk
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => triggerInterventionMutation.mutate({
                              studentId: student.studentId,
                              interventionType: student.recommendations[0]?.type || 'support'
                            })}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Trigger
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {student.recommendations.slice(0, 2).map((rec, index) => (
                            <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                              <div className="font-medium">{rec.action}</div>
                              <div className="text-gray-600">
                                Priority: {rec.priority} • Expected impact: {rec.expectedImpact}% • Timeline: {rec.timeline}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {systemInsights?.totalStudents || 0}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">At Risk Students</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {systemInsights?.atRiskStudents || 0}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Model Accuracy</p>
                        <p className="text-2xl font-bold text-green-600">
                          {systemInsights?.modelAccuracy || 0}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate Change</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(systemInsights?.trendAnalysis?.successRateChange || 0) > 0 ? '+' : ''}
                          {systemInsights?.trendAnalysis?.successRateChange || 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Risk Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemInsights?.topRiskFactors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{factor.factor}</div>
                          <div className="text-sm text-gray-600">
                            Frequency: {factor.frequency} • Avg Impact: {factor.averageImpact}%
                          </div>
                        </div>
                        <Progress value={factor.averageImpact} className="w-24 h-2" />
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-indigo-500" />
              Detailed Analytics: {selectedStudent?.studentName}
            </DialogTitle>
            <DialogDescription>
              Comprehensive predictive analysis and intervention recommendations
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Risk Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedStudent.successProbability}%
                  </div>
                  <div className="text-sm text-gray-500">Success Probability</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedStudent.predictions.finalGrade}%
                  </div>
                  <div className="text-sm text-gray-500">Predicted Final Grade</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedStudent.engagementScore}%
                  </div>
                  <div className="text-sm text-gray-500">Engagement Score</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedStudent.predictions.completionLikelihood}%
                  </div>
                  <div className="text-sm text-gray-500">Completion Likelihood</div>
                </div>
              </div>

              {/* Risk Factors Details */}
              <div>
                <h4 className="font-semibold mb-3">Risk Factor Analysis</h4>
                <div className="space-y-3">
                  {selectedStudent.riskFactors.map((factor, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(factor.trend)}
                          <span className="font-medium">{factor.factor}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={factor.impact} className="w-20 h-2" />
                          <span className="text-sm text-gray-500">{factor.impact}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">AI Recommendations</h4>
                <div className="space-y-3">
                  {selectedStudent.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={`${
                            rec.type === 'intervention' ? 'bg-red-100 text-red-800' :
                            rec.type === 'support' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {rec.type}
                          </Badge>
                          <Badge className={`${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          Expected Impact: {rec.expectedImpact}%
                        </span>
                      </div>
                      <div className="font-medium mb-1">{rec.action}</div>
                      <div className="text-sm text-gray-600">Timeline: {rec.timeline}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    triggerInterventionMutation.mutate({
                      studentId: selectedStudent.studentId,
                      interventionType: selectedStudent.recommendations[0]?.type || 'support'
                    });
                    setShowDetailsDialog(false);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Trigger Intervention
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}