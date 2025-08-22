import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileCheck, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Play,
  Pause,
  Settings,
  Users,
  BarChart3,
  Timer,
  Lock,
  Unlock,
  Copy,
  Zap,
  Target,
  Award
} from "lucide-react";

interface Assessment {
  id: number;
  title: string;
  description: string;
  type: 'exam' | 'quiz' | 'assignment' | 'project';
  courseId: number;
  courseName: string;
  duration: number; // minutes
  maxAttempts: number;
  startTime: string;
  endTime: string;
  isProctored: boolean;
  plagiarismDetection: boolean;
  randomizeQuestions: boolean;
  showResultsImmediately: boolean;
  status: 'draft' | 'published' | 'active' | 'completed';
  totalQuestions: number;
  maxScore: number;
  attempts: number;
  averageScore: number;
  completionRate: number;
}

interface PlagiarismReport {
  submissionId: number;
  studentName: string;
  similarityScore: number;
  matchedSources: string[];
  status: 'clean' | 'suspicious' | 'flagged';
  reviewRequired: boolean;
}

interface ProctorAlert {
  id: number;
  studentId: number;
  studentName: string;
  assessmentId: number;
  type: 'tab_switch' | 'window_focus_lost' | 'copy_paste' | 'multiple_faces' | 'no_face';
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export default function AdvancedAssessment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [showPlagiarismReport, setShowPlagiarismReport] = useState(false);
  const [showProctorDashboard, setShowProctorDashboard] = useState(false);

  // Fetch assessments
  const { data: assessments = [], isLoading } = useQuery<Assessment[]>({
    queryKey: ['/api/assessments/instructor', user?.id],
    enabled: !!user?.id && user?.role === 'professor',
  });

  // Fetch plagiarism reports
  const { data: plagiarismReports = [] } = useQuery<PlagiarismReport[]>({
    queryKey: ['/api/assessments/plagiarism', selectedAssessment?.id],
    enabled: !!selectedAssessment?.id,
  });

  // Fetch proctor alerts
  const { data: proctorAlerts = [] } = useQuery<ProctorAlert[]>({
    queryKey: ['/api/assessments/proctor-alerts', selectedAssessment?.id],
    enabled: !!selectedAssessment?.id && selectedAssessment?.isProctored,
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      const response = await apiRequest("POST", "/api/assessments", assessmentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment Created",
        description: "New assessment has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assessments/instructor'] });
      setShowCreateAssessment(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update assessment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/assessments/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assessments/instructor'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (user?.role !== 'professor') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">Advanced assessment tools are only available to professors.</p>
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
            <p className="mt-2 text-gray-600">Loading assessments...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Advanced Assessment Tools</h1>
              <p className="text-gray-600 mt-1">Secure testing with proctoring, plagiarism detection, and analytics</p>
            </div>
            <Button 
              onClick={() => setShowCreateAssessment(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="assessments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="plagiarism">Plagiarism Detection</TabsTrigger>
              <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Assessments Tab */}
            <TabsContent value="assessments" className="space-y-4">
              {assessments.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Assessments</h2>
                  <p className="text-gray-600 mb-6">Create your first secure assessment to get started.</p>
                  <Button onClick={() => setShowCreateAssessment(true)}>
                    Create Assessment
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {assessments.map((assessment) => (
                    <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold">{assessment.title}</h3>
                              <Badge className={getStatusColor(assessment.status)}>
                                {assessment.status}
                              </Badge>
                              {assessment.isProctored && (
                                <Badge className="bg-red-100 text-red-800">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Proctored
                                </Badge>
                              )}
                              {assessment.plagiarismDetection && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Plagiarism Check
                                </Badge>
                              )}
                            </div>

                            <p className="text-gray-600 mb-4">{assessment.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="flex items-center text-sm text-gray-600">
                                <Timer className="w-4 h-4 mr-2" />
                                <span>{assessment.duration} minutes</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="w-4 h-4 mr-2" />
                                <span>{assessment.attempts} attempts</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Award className="w-4 h-4 mr-2" />
                                <span>{assessment.averageScore.toFixed(1)}% avg</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Target className="w-4 h-4 mr-2" />
                                <span>{assessment.completionRate}% complete</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(assessment.startTime).toLocaleDateString()} - {' '}
                                {new Date(assessment.endTime).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAssessment(assessment)}
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                            
                            {assessment.status === 'draft' ? (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ 
                                  id: assessment.id, 
                                  status: 'published' 
                                })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Publish
                              </Button>
                            ) : assessment.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ 
                                  id: assessment.id, 
                                  status: 'completed' 
                                })}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                End
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {assessment.status === 'active' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{assessment.completionRate}% completed</span>
                            </div>
                            <Progress value={assessment.completionRate} className="mt-2" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Plagiarism Detection Tab */}
            <TabsContent value="plagiarism" className="space-y-4">
              {selectedAssessment ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Plagiarism Report</h3>
                      <p className="text-gray-600">{selectedAssessment.title}</p>
                    </div>
                    <Button onClick={() => setShowPlagiarismReport(true)}>
                      <Zap className="w-4 h-4 mr-2" />
                      Run Full Scan
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {plagiarismReports.filter(r => r.status === 'clean').length}
                        </div>
                        <p className="text-sm text-gray-600">Clean Submissions</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-yellow-600 mb-2">
                          {plagiarismReports.filter(r => r.status === 'suspicious').length}
                        </div>
                        <p className="text-sm text-gray-600">Suspicious</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-red-600 mb-2">
                          {plagiarismReports.filter(r => r.status === 'flagged').length}
                        </div>
                        <p className="text-sm text-gray-600">Flagged</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {plagiarismReports.map((report, index) => (
                          <div 
                            key={index} 
                            className={`p-4 border rounded-lg ${
                              report.status === 'flagged' ? 'border-red-200 bg-red-50' :
                              report.status === 'suspicious' ? 'border-yellow-200 bg-yellow-50' :
                              'border-green-200 bg-green-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{report.studentName}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge className={
                                  report.status === 'flagged' ? 'bg-red-600 text-white' :
                                  report.status === 'suspicious' ? 'bg-yellow-600 text-white' :
                                  'bg-green-600 text-white'
                                }>
                                  {report.similarityScore}% similarity
                                </Badge>
                                <Badge variant="outline">{report.status}</Badge>
                              </div>
                            </div>
                            
                            {report.matchedSources.length > 0 && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Matched sources:</span> {' '}
                                {report.matchedSources.join(', ')}
                              </div>
                            )}
                            
                            {report.reviewRequired && (
                              <div className="mt-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review Submission
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select an Assessment</h3>
                  <p className="text-gray-600">Choose an assessment to view plagiarism detection results.</p>
                </div>
              )}
            </TabsContent>

            {/* Proctoring Tab */}
            <TabsContent value="proctoring" className="space-y-4">
              {selectedAssessment?.isProctored ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Proctoring Dashboard</h3>
                      <p className="text-gray-600">{selectedAssessment.title}</p>
                    </div>
                    <Button onClick={() => setShowProctorDashboard(true)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Live Monitor
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {proctorAlerts.length}
                        </div>
                        <p className="text-sm text-gray-600">Total Alerts</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-red-600 mb-2">
                          {proctorAlerts.filter(a => a.severity === 'high').length}
                        </div>
                        <p className="text-sm text-gray-600">High Priority</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-yellow-600 mb-2">
                          {proctorAlerts.filter(a => a.severity === 'medium').length}
                        </div>
                        <p className="text-sm text-gray-600">Medium Priority</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {Math.floor(selectedAssessment.attempts * 0.85)}
                        </div>
                        <p className="text-sm text-gray-600">Clean Sessions</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Proctoring Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {proctorAlerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {alert.severity === 'high' ? (
                                  <AlertTriangle className="w-5 h-5 text-red-500" />
                                ) : alert.severity === 'medium' ? (
                                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                ) : (
                                  <CheckCircle className="w-5 h-5 text-blue-500" />
                                )}
                                <div>
                                  <p className="font-medium">{alert.studentName}</p>
                                  <p className="text-sm opacity-75">{alert.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={
                                  alert.severity === 'high' ? 'bg-red-600 text-white' :
                                  alert.severity === 'medium' ? 'bg-yellow-600 text-white' :
                                  'bg-blue-600 text-white'
                                }>
                                  {alert.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <p className="text-xs opacity-75 mt-1">
                                  {new Date(alert.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Proctored Assessment</h3>
                  <p className="text-gray-600">Select a proctored assessment to view monitoring data.</p>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                        <p className="text-2xl font-bold text-blue-600">{assessments.length}</p>
                      </div>
                      <FileCheck className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Now</p>
                        <p className="text-2xl font-bold text-green-600">
                          {assessments.filter(a => a.status === 'active').length}
                        </p>
                      </div>
                      <Play className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {assessments.length > 0 
                            ? (assessments.reduce((sum, a) => sum + a.averageScore, 0) / assessments.length).toFixed(1)
                            : '0'
                          }%
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {assessments.length > 0 
                            ? (assessments.reduce((sum, a) => sum + a.completionRate, 0) / assessments.length).toFixed(1)
                            : '0'
                          }%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Assessment Dialog */}
      <Dialog open={showCreateAssessment} onOpenChange={setShowCreateAssessment}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Advanced Assessment</DialogTitle>
            <DialogDescription>
              Set up a secure assessment with proctoring and plagiarism detection
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const assessmentData = {
              title: formData.get('title'),
              description: formData.get('description'),
              type: formData.get('type'),
              duration: parseInt(formData.get('duration') as string),
              maxAttempts: parseInt(formData.get('maxAttempts') as string),
              startTime: formData.get('startTime'),
              endTime: formData.get('endTime'),
              isProctored: formData.get('isProctored') === 'on',
              plagiarismDetection: formData.get('plagiarismDetection') === 'on',
              randomizeQuestions: formData.get('randomizeQuestions') === 'on',
              showResultsImmediately: formData.get('showResultsImmediately') === 'on',
              maxScore: parseInt(formData.get('maxScore') as string),
              status: 'draft'
            };
            createAssessmentMutation.mutate(assessmentData);
          }} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Assessment Title</label>
                <Input name="title" placeholder="Final Exam - Data Structures" required />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                name="description" 
                placeholder="Comprehensive assessment covering all course materials..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input name="duration" type="number" placeholder="120" required />
              </div>
              <div>
                <label className="text-sm font-medium">Max Attempts</label>
                <Input name="maxAttempts" type="number" placeholder="1" defaultValue="1" required />
              </div>
              <div>
                <label className="text-sm font-medium">Max Score</label>
                <Input name="maxScore" type="number" placeholder="100" defaultValue="100" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input name="startTime" type="datetime-local" required />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input name="endTime" type="datetime-local" required />
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-gray-900">Security Settings</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Proctoring</label>
                  <p className="text-xs text-gray-500">Monitor students during the assessment</p>
                </div>
                <Switch name="isProctored" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Plagiarism Detection</label>
                  <p className="text-xs text-gray-500">Automatically check for copied content</p>
                </div>
                <Switch name="plagiarismDetection" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Randomize Questions</label>
                  <p className="text-xs text-gray-500">Present questions in random order</p>
                </div>
                <Switch name="randomizeQuestions" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Show Results Immediately</label>
                  <p className="text-xs text-gray-500">Display results after submission</p>
                </div>
                <Switch name="showResultsImmediately" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateAssessment(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAssessmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createAssessmentMutation.isPending ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}