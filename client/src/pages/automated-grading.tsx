import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Zap,
  Target,
  Award,
  TrendingUp,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Code,
  MessageSquare,
  Star,
  BarChart3,
  Users,
  BookOpen
} from "lucide-react";

interface GradingResult {
  id: string;
  submissionId: number;
  studentId: number;
  studentName: string;
  problemId: number;
  problemTitle: string;
  submittedAt: string;
  gradedAt: string;
  aiGrade: {
    score: number; // 0-100
    maxScore: number;
    breakdown: {
      correctness: number;
      efficiency: number;
      codeQuality: number;
      style: number;
      testCases: number;
    };
  };
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    codeReview: {
      line: number;
      message: string;
      type: 'error' | 'warning' | 'suggestion' | 'praise';
      severity: 'high' | 'medium' | 'low';
    }[];
  };
  humanReviewRequired: boolean;
  confidence: number; // 0-1
  processingTime: number; // in seconds
  status: 'pending' | 'completed' | 'review' | 'approved';
}

interface GradingTemplate {
  id: string;
  name: string;
  description: string;
  criteria: {
    name: string;
    weight: number;
    description: string;
    autoGradeable: boolean;
  }[];
  rubric: string;
  language: string;
  type: 'algorithm' | 'implementation' | 'debugging' | 'optimization';
}

interface GradingStats {
  totalSubmissions: number;
  gradedCount: number;
  averageScore: number;
  averageProcessingTime: number;
  humanReviewRate: number;
  accuracyRate: number;
  topIssues: {
    issue: string;
    frequency: number;
    category: string;
  }[];
}

export default function AutomatedGrading() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedResult, setSelectedResult] = useState<GradingResult | null>(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Fetch grading results
  const { data: gradingResults = [], isLoading } = useQuery<GradingResult[]>({
    queryKey: ['/api/ai/grading-results', user?.id, filterStatus],
    enabled: !!user?.id && (user?.role === 'professor' || user?.role === 'admin'),
  });

  // Fetch grading templates
  const { data: templates = [] } = useQuery<GradingTemplate[]>({
    queryKey: ['/api/ai/grading-templates'],
    enabled: !!user?.id,
  });

  // Fetch grading statistics
  const { data: stats } = useQuery<GradingStats>({
    queryKey: ['/api/ai/grading-stats', user?.id],
    enabled: !!user?.id,
  });

  // Auto-grade submission mutation
  const autoGradeMutation = useMutation({
    mutationFn: async (gradingParams: any) => {
      const response = await apiRequest("POST", "/api/ai/auto-grade", gradingParams);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Auto-Grading Started",
        description: "AI is now analyzing and grading the submissions.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/grading-results'] });
      setShowGradeDialog(false);
    },
    onError: () => {
      toast({
        title: "Grading Failed",
        description: "Failed to start auto-grading. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve grading mutation
  const approveGradingMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const response = await apiRequest("POST", `/api/ai/grading-results/${resultId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Grade Approved",
        description: "The AI grading has been approved and finalized.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/grading-results'] });
    },
  });

  // Request human review mutation
  const requestReviewMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const response = await apiRequest("POST", `/api/ai/grading-results/${resultId}/review`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Requested",
        description: "This submission has been flagged for human review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/grading-results'] });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReviewTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'suggestion': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'praise': return <Star className="w-4 h-4 text-green-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  if (user?.role !== 'professor' && user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">Automated grading tools are only available to professors and administrators.</p>
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
            <p className="mt-2 text-gray-600">Loading automated grading system...</p>
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
                <Bot className="w-7 h-7 mr-3 text-green-500" />
                Automated Grading & Feedback
              </h1>
              <p className="text-gray-600 mt-1">AI-powered code evaluation, feedback generation, and quality assessment</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Grading Settings
              </Button>
              <Button 
                onClick={() => setShowGradeDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Auto-Grade Submissions
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="results" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="results">Grading Results</TabsTrigger>
              <TabsTrigger value="templates">Grading Templates</TabsTrigger>
              <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
              <TabsTrigger value="analytics">Grading Analytics</TabsTrigger>
            </TabsList>

            {/* Grading Results Tab */}
            <TabsContent value="results" className="space-y-4">
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="review">Needs Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
              </div>

              {gradingResults.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Grading Results</h2>
                  <p className="text-gray-600 mb-6">Start auto-grading student submissions to see AI-powered results.</p>
                  <Button onClick={() => setShowGradeDialog(true)}>
                    <Zap className="w-4 h-4 mr-2" />
                    Auto-Grade Submissions
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {gradingResults.map((result) => (
                    <Card key={result.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{result.studentName}</h3>
                              <Badge className={getStatusColor(result.status)}>
                                {result.status}
                              </Badge>
                              {result.humanReviewRequired && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Review Needed
                                </Badge>
                              )}
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {result.processingTime}s processing
                              </div>
                            </div>
                            
                            <p className="text-gray-600 mb-3">
                              {result.problemTitle} • Submitted {new Date(result.submittedAt).toLocaleDateString()}
                            </p>

                            {/* Score Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${getScoreColor(result.aiGrade.score)}`}>
                                  {result.aiGrade.score}%
                                </div>
                                <div className="text-xs text-gray-500">Overall</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-600">
                                  {result.aiGrade.breakdown.correctness}%
                                </div>
                                <div className="text-xs text-gray-500">Correctness</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                  {result.aiGrade.breakdown.efficiency}%
                                </div>
                                <div className="text-xs text-gray-500">Efficiency</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-purple-600">
                                  {result.aiGrade.breakdown.codeQuality}%
                                </div>
                                <div className="text-xs text-gray-500">Quality</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-orange-600">
                                  {result.aiGrade.breakdown.style}%
                                </div>
                                <div className="text-xs text-gray-500">Style</div>
                              </div>
                            </div>

                            {/* AI Confidence */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">AI Confidence</span>
                                <span className="font-medium">{Math.round(result.confidence * 100)}%</span>
                              </div>
                              <Progress value={result.confidence * 100} className="h-2" />
                            </div>

                            {/* Feedback Preview */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700 line-clamp-2">{result.feedback.summary}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>{result.feedback.strengths.length} strengths</span>
                                <span>•</span>
                                <span>{result.feedback.improvements.length} improvements</span>
                                <span>•</span>
                                <span>{result.feedback.codeReview.length} code comments</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedResult(result)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {result.status === 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => approveGradingMutation.mutate(result.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            
                            {!result.humanReviewRequired && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => requestReviewMutation.mutate(result.id)}
                                className="border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Grading Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                        
                        <div className="flex items-center space-x-2 mb-3">
                          <Badge variant="outline">
                            {template.language}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            {template.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Grading Criteria:</h4>
                        {template.criteria.map((criterion, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{criterion.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{criterion.weight}%</span>
                              {criterion.autoGradeable && (
                                <Bot className="w-3 h-3 text-green-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setShowGradeDialog(true);
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* AI Feedback Tab */}
            <TabsContent value="feedback" className="space-y-4">
              {selectedResult ? (
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                        AI-Generated Feedback for {selectedResult.studentName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Summary */}
                      <div>
                        <h4 className="font-semibold mb-2">Overall Assessment</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedResult.feedback.summary}
                        </p>
                      </div>

                      {/* Strengths */}
                      <div>
                        <h4 className="font-semibold mb-2 text-green-700">Strengths</h4>
                        <div className="space-y-2">
                          {selectedResult.feedback.strengths.map((strength, index) => (
                            <div key={index} className="flex items-start space-x-2 bg-green-50 p-2 rounded">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                              <span className="text-green-800 text-sm">{strength}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Areas for Improvement */}
                      <div>
                        <h4 className="font-semibold mb-2 text-orange-700">Areas for Improvement</h4>
                        <div className="space-y-2">
                          {selectedResult.feedback.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-start space-x-2 bg-orange-50 p-2 rounded">
                              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                              <span className="text-orange-800 text-sm">{improvement}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Code Review Comments */}
                      <div>
                        <h4 className="font-semibold mb-2">Code Review</h4>
                        <div className="space-y-3">
                          {selectedResult.feedback.codeReview.map((review, index) => (
                            <div key={index} className="border-l-4 border-gray-200 pl-4 py-2">
                              <div className="flex items-center space-x-2 mb-1">
                                {getReviewTypeIcon(review.type)}
                                <span className="text-sm font-medium">Line {review.line}</span>
                                <Badge className={`text-xs ${
                                  review.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  review.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {review.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700">{review.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div>
                        <h4 className="font-semibold mb-2 text-blue-700">AI Suggestions</h4>
                        <div className="space-y-2">
                          {selectedResult.feedback.suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start space-x-2 bg-blue-50 p-2 rounded">
                              <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                              <span className="text-blue-800 text-sm">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Grading Result</h3>
                  <p className="text-gray-600">Choose a graded submission to view detailed AI feedback.</p>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Graded</p>
                        <p className="text-2xl font-bold text-blue-600">{stats?.gradedCount || 0}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold text-green-600">{stats?.averageScore.toFixed(1) || 0}%</p>
                      </div>
                      <Award className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                        <p className="text-2xl font-bold text-purple-600">{stats?.averageProcessingTime.toFixed(1) || 0}s</p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Review Rate</p>
                        <p className="text-2xl font-bold text-orange-600">{stats?.humanReviewRate.toFixed(1) || 0}%</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Issues */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.topIssues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{issue.issue}</p>
                          <p className="text-sm text-gray-600">{issue.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{issue.frequency}</p>
                          <p className="text-xs text-gray-500">occurrences</p>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Auto-Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-green-500" />
              Auto-Grade Submissions
            </DialogTitle>
            <DialogDescription>
              Configure AI grading parameters for student submissions
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const gradingParams = {
              problemIds: formData.get('problemIds')?.toString().split(',').map(id => parseInt(id.trim())),
              templateId: formData.get('templateId') || selectedTemplate,
              strictness: formData.get('strictness'),
              includeFeedback: formData.get('includeFeedback') === 'on',
              flagForReview: parseFloat(formData.get('reviewThreshold') as string) / 100,
            };
            autoGradeMutation.mutate(gradingParams);
          }} className="space-y-4">
            
            <div>
              <label className="text-sm font-medium">Problem IDs (comma-separated)</label>
              <Input 
                name="problemIds" 
                placeholder="e.g., 1, 2, 3" 
                required 
              />
            </div>

            <div>
              <label className="text-sm font-medium">Grading Template</label>
              <Select name="templateId" value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grading template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Grading Strictness</label>
              <Select name="strictness" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select strictness level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lenient">Lenient (Focus on correctness)</SelectItem>
                  <SelectItem value="standard">Standard (Balanced evaluation)</SelectItem>
                  <SelectItem value="strict">Strict (High code quality standards)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Review Threshold (%)</label>
              <Input 
                name="reviewThreshold" 
                type="number" 
                min="0" 
                max="100" 
                defaultValue="70" 
                placeholder="Flag submissions below this confidence for human review"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <label className="text-sm font-medium">Generate detailed AI feedback</label>
              <input type="checkbox" name="includeFeedback" defaultChecked />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowGradeDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={autoGradeMutation.isPending}
              >
                <Bot className="w-4 h-4 mr-2" />
                {autoGradeMutation.isPending ? "Starting..." : "Start Auto-Grading"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}