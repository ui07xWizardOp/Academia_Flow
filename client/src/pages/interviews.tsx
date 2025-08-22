import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { InterviewSession } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Code, MessageCircle, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function Interviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: userInterviews = [], isLoading } = useQuery<InterviewSession[]>({
    queryKey: ['/api/interviews/user', user?.id],
    enabled: !!user?.id,
  });

  const createInterviewMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await apiRequest("POST", "/api/interviews", {
        type,
        status: "in_progress",
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Interview session started",
        description: `Your ${data.type} interview has begun. Good luck!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interviews/user', user?.id] });
    },
    onError: () => {
      toast({
        title: "Failed to start interview",
        description: "There was an error starting your interview session.",
        variant: "destructive",
      });
    },
  });

  const handleStartInterview = (type: string) => {
    setSelectedType(type);
    createInterviewMutation.mutate(type);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading interviews...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Mock Interview Practice</h1>
          <p className="text-gray-600 mt-1">Practice technical and behavioral interviews with AI feedback.</p>
        </div>

        {/* Interview Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Interview Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Code className="text-primary text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Technical Interview</h3>
                    <p className="text-gray-600">Practice coding problems with real-time feedback</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>45-60 minutes</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedType("technical")}
                        data-testid="button-start-technical"
                      >
                        Start Interview
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Technical Interview</DialogTitle>
                        <DialogDescription>
                          Practice coding problems with real-time AI feedback and evaluation.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          This technical interview will include coding challenges and algorithm questions. 
                          The AI will evaluate your problem-solving approach, code quality, and communication.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">What to expect:</h4>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• 2-3 coding problems of varying difficulty</li>
                            <li>• Real-time code execution and testing</li>
                            <li>• AI feedback on your approach and solutions</li>
                            <li>• Performance scoring and recommendations</li>
                          </ul>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleStartInterview("technical")}
                            disabled={createInterviewMutation.isPending}
                            data-testid="button-confirm-technical"
                          >
                            {createInterviewMutation.isPending ? "Starting..." : "Begin Interview"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-success-500/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="text-success-600 text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Behavioral Interview</h3>
                    <p className="text-gray-600">Practice soft skills and communication</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>30-45 minutes</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedType("behavioral")}
                        className="bg-success-600 text-white hover:bg-success-700 border-success-600"
                        data-testid="button-start-behavioral"
                      >
                        Start Interview
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Start Behavioral Interview</DialogTitle>
                        <DialogDescription>
                          Practice behavioral questions and improve your interview communication skills.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          This behavioral interview focuses on your communication skills, teamwork, 
                          and problem-solving mindset. The AI will ask situational questions.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">What to expect:</h4>
                          <ul className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• STAR method situational questions</li>
                            <li>• Leadership and teamwork scenarios</li>
                            <li>• Communication clarity assessment</li>
                            <li>• Personalized improvement suggestions</li>
                          </ul>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleStartInterview("behavioral")}
                            disabled={createInterviewMutation.isPending}
                            className="bg-success-600 text-white hover:bg-success-700"
                            data-testid="button-confirm-behavioral"
                          >
                            {createInterviewMutation.isPending ? "Starting..." : "Begin Interview"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Interview Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Interview Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {userInterviews.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No interview sessions yet</p>
                  <p className="text-sm text-gray-500">Start your first mock interview to see your progress here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userInterviews.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          session.type === 'technical' ? 'bg-primary/10' : 'bg-success-500/10'
                        }`}>
                          {session.type === 'technical' ? 
                            <Code className={session.type === 'technical' ? 'text-primary' : 'text-success-600'} /> :
                            <MessageCircle className="text-success-600" />
                          }
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900" data-testid={`session-title-${session.id}`}>
                            {session.type === 'technical' ? 'Technical Interview' : 'Behavioral Interview'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(session.startedAt).toLocaleDateString()} • 
                            {session.duration ? ` ${session.duration} minutes` : ' In progress'}
                          </p>
                          {session.score && (
                            <Badge 
                              className={
                                session.score >= 80 ? 'bg-success-100 text-success-800' :
                                session.score >= 60 ? 'bg-warning-100 text-warning-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              Score: {session.score}/100
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {session.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-success-500" />
                        ) : session.status === 'cancelled' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-warning-500" />
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={session.status !== 'completed'}
                          data-testid={`button-view-feedback-${session.id}`}
                        >
                          View Feedback
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Feedback Summary */}
          {userInterviews.some((s) => s.status === 'completed') && (
            <Card>
              <CardHeader>
                <CardTitle>AI Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Strengths</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-success-500" />
                        <span>Clear problem-solving approach</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-success-500" />
                        <span>Good time complexity analysis</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-success-500" />
                        <span>Confident communication style</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Areas for Improvement</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-warning-500" />
                        <span>Practice edge case handling</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-warning-500" />
                        <span>Improve code organization</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-warning-500" />
                        <span>Ask clarifying questions earlier</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
