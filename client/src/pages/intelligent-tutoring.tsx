import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  MessageCircle, 
  Target, 
  TrendingUp,
  BookOpen,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  Zap,
  User,
  Bot,
  Send,
  RefreshCw,
  Settings,
  Star,
  ArrowRight,
  Play,
  Pause,
  SkipForward
} from "lucide-react";

interface LearningPath {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  estimatedTime: number; // in hours
  prerequisites: string[];
  topics: {
    id: string;
    name: string;
    completed: boolean;
    locked: boolean;
    concepts: string[];
    problems: number;
    masteryLevel: number; // 0-100
  }[];
  progress: number;
  aiRecommended: boolean;
  adaptiveAdjustments: string[];
}

interface TutoringSession {
  id: string;
  studentId: number;
  topic: string;
  startTime: string;
  endTime?: string;
  messages: {
    id: string;
    sender: 'student' | 'ai-tutor';
    message: string;
    timestamp: string;
    type: 'text' | 'code' | 'explanation' | 'hint';
    metadata?: {
      codeLanguage?: string;
      problemId?: string;
      hintLevel?: number;
    };
  }[];
  currentProblem?: {
    id: string;
    title: string;
    difficulty: string;
    progress: number;
  };
  learningObjectives: string[];
  masteryAssessment: {
    score: number;
    strengths: string[];
    areasForImprovement: string[];
    nextSteps: string[];
  };
  status: 'active' | 'paused' | 'completed';
}

interface PersonalizedRecommendation {
  id: string;
  type: 'problem' | 'concept' | 'review' | 'practice';
  title: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: string;
  estimatedTime: number;
  prerequisites: string[];
  learningStyle: 'visual' | 'hands-on' | 'theoretical' | 'collaborative';
  aiConfidence: number; // 0-1
}

export default function IntelligentTutoring() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<TutoringSession | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");

  // Fetch personalized learning paths
  const { data: learningPaths = [], isLoading: pathsLoading } = useQuery<LearningPath[]>({
    queryKey: ['/api/ai/learning-paths', user?.id],
    enabled: !!user?.id,
  });

  // Fetch active tutoring session
  const { data: currentSession } = useQuery<TutoringSession | null>({
    queryKey: ['/api/ai/tutoring-session', user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000, // Refresh every 5 seconds during active session
  });

  // Fetch personalized recommendations
  const { data: recommendations = [] } = useQuery<PersonalizedRecommendation[]>({
    queryKey: ['/api/ai/recommendations', user?.id],
    enabled: !!user?.id,
  });

  // Start tutoring session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (sessionData: { topic: string; learningObjectives: string[] }) => {
      const response = await apiRequest("POST", "/api/ai/tutoring-session", sessionData);
      return response.json();
    },
    onSuccess: (session) => {
      setActiveSession(session);
      queryClient.invalidateQueries({ queryKey: ['/api/ai/tutoring-session'] });
      toast({
        title: "Tutoring Session Started",
        description: "Your AI tutor is ready to help you learn!",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message, type }: { sessionId: string; message: string; type: string }) => {
      const response = await apiRequest("POST", `/api/ai/tutoring-session/${sessionId}/message`, {
        message,
        type
      });
      return response.json();
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/ai/tutoring-session'] });
    },
  });

  // Update learning path progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ pathId, topicId, progress }: { pathId: string; topicId: string; progress: number }) => {
      const response = await apiRequest("POST", `/api/ai/learning-paths/${pathId}/progress`, {
        topicId,
        progress
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/learning-paths'] });
    },
  });

  useEffect(() => {
    if (currentSession && currentSession.id !== activeSession?.id) {
      setActiveSession(currentSession);
    }
  }, [currentSession, activeSession]);

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !activeSession) return;
    
    sendMessageMutation.mutate({
      sessionId: activeSession.id,
      message: chatMessage,
      type: 'text'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (pathsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading intelligent tutoring system...</p>
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
                <Brain className="w-7 h-7 mr-3 text-blue-500" />
                Intelligent Tutoring
              </h1>
              <p className="text-gray-600 mt-1">AI-powered personalized learning with adaptive guidance</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Learning Preferences
              </Button>
              {!activeSession ? (
                <Button 
                  onClick={() => setShowSessionDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Tutoring Session
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setActiveSession(null)}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeSession ? (
            /* Active Tutoring Session View */
            <div className="flex h-full">
              {/* Chat Interface */}
              <div className="flex-1 flex flex-col">
                <div className="bg-blue-50 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-blue-900">Active Session: {activeSession.topic}</h2>
                      <p className="text-sm text-blue-700">
                        Started {new Date(activeSession.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                    {activeSession.currentProblem && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-900">
                          {activeSession.currentProblem.title}
                        </p>
                        <Progress value={activeSession.currentProblem.progress} className="w-32 h-2" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeSession.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'student' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center space-x-2 mb-1">
                          {message.sender === 'student' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-xs opacity-75">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {message.type === 'code' ? (
                          <pre className="text-sm font-mono bg-gray-800 text-green-400 p-2 rounded">
                            {message.message}
                          </pre>
                        ) : (
                          <p className="text-sm">{message.message}</p>
                        )}
                        
                        {message.type === 'hint' && (
                          <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            Hint Level {message.metadata?.hintLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Ask your AI tutor anything..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Session Sidebar */}
              <div className="w-80 border-l bg-gray-50 p-4">
                <h3 className="font-semibold mb-4">Learning Objectives</h3>
                <div className="space-y-2 mb-6">
                  {activeSession.learningObjectives.map((objective, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{objective}</span>
                    </div>
                  ))}
                </div>

                {activeSession.masteryAssessment.score > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4">Progress Assessment</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Current Score</span>
                          <span className="font-semibold">{activeSession.masteryAssessment.score}%</span>
                        </div>
                        <Progress value={activeSession.masteryAssessment.score} />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-1">Strengths</h4>
                        <div className="space-y-1">
                          {activeSession.masteryAssessment.strengths.map((strength, index) => (
                            <div key={index} className="text-xs text-green-600">{strength}</div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-orange-700 mb-1">Areas to Improve</h4>
                        <div className="space-y-1">
                          {activeSession.masteryAssessment.areasForImprovement.map((area, index) => (
                            <div key={index} className="text-xs text-orange-600">{area}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Learning Paths and Recommendations View */
            <div className="p-6">
              <Tabs defaultValue="paths" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="paths">Learning Paths</TabsTrigger>
                  <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
                  <TabsTrigger value="progress">Progress Analytics</TabsTrigger>
                </TabsList>

                {/* Learning Paths Tab */}
                <TabsContent value="paths" className="space-y-6">
                  <div className="grid gap-6">
                    {learningPaths.map((path) => (
                      <Card key={path.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold">{path.name}</h3>
                                <Badge className={getDifficultyColor(path.difficulty)}>
                                  {path.difficulty}
                                </Badge>
                                {path.aiRecommended && (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    <Brain className="w-3 h-3 mr-1" />
                                    AI Recommended
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-4">{path.description}</p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>{path.estimatedTime} hours</span>
                                </div>
                                <div className="flex items-center">
                                  <Target className="w-4 h-4 mr-1" />
                                  <span>{path.topics.length} topics</span>
                                </div>
                                <div className="flex items-center">
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  <span>{path.progress}% complete</span>
                                </div>
                              </div>

                              <div className="mb-4">
                                <Progress value={path.progress} className="h-2" />
                              </div>

                              {path.adaptiveAdjustments.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium text-blue-700 mb-2">
                                    Recent AI Adjustments
                                  </h4>
                                  <div className="space-y-1">
                                    {path.adaptiveAdjustments.map((adjustment, index) => (
                                      <div key={index} className="text-xs text-blue-600 flex items-center">
                                        <Zap className="w-3 h-3 mr-1" />
                                        {adjustment}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="ml-6">
                              <Button 
                                onClick={() => {
                                  setSelectedTopic(path.name);
                                  setShowSessionDialog(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Continue Learning
                              </Button>
                            </div>
                          </div>

                          {/* Topic Progress */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {path.topics.slice(0, 6).map((topic) => (
                              <div 
                                key={topic.id} 
                                className={`p-3 rounded-lg border-2 ${
                                  topic.completed ? 'border-green-200 bg-green-50' :
                                  topic.locked ? 'border-gray-200 bg-gray-50' :
                                  'border-blue-200 bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">{topic.name}</span>
                                  {topic.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : topic.locked ? (
                                    <AlertCircle className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-blue-400 rounded-full" />
                                  )}
                                </div>
                                <Progress value={topic.masteryLevel} className="h-1 mb-2" />
                                <div className="text-xs text-gray-600">
                                  {topic.problems} problems • {topic.masteryLevel}% mastery
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-6">
                  <div className="grid gap-4">
                    {recommendations.map((rec) => (
                      <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold">{rec.title}</h3>
                                <Badge className={getPriorityColor(rec.priority)}>
                                  {rec.priority} priority
                                </Badge>
                                <Badge className={getDifficultyColor(rec.difficulty)}>
                                  {rec.difficulty}
                                </Badge>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  {Math.round(rec.aiConfidence * 100)}% confidence
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-3">{rec.description}</p>
                              
                              <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                <div className="flex items-start space-x-2">
                                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />
                                  <div>
                                    <h4 className="text-sm font-medium text-blue-900">AI Reasoning</h4>
                                    <p className="text-sm text-blue-700">{rec.reasoning}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  <span>{rec.estimatedTime} min</span>
                                </div>
                                <div className="flex items-center">
                                  <BookOpen className="w-4 h-4 mr-1" />
                                  <span>{rec.learningStyle}</span>
                                </div>
                              </div>
                            </div>

                            <Button className="ml-6 bg-purple-600 hover:bg-purple-700">
                              <ArrowRight className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Progress Analytics Tab */}
                <TabsContent value="progress" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Learning Paths</p>
                            <p className="text-2xl font-bold text-blue-600">{learningPaths.length}</p>
                          </div>
                          <Target className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                            <p className="text-2xl font-bold text-green-600">
                              {Math.round(learningPaths.reduce((acc, path) => acc + path.progress, 0) / learningPaths.length || 0)}%
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">AI Recommendations</p>
                            <p className="text-2xl font-bold text-purple-600">{recommendations.length}</p>
                          </div>
                          <Brain className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Tutoring Hours</p>
                            <p className="text-2xl font-bold text-orange-600">24.5</p>
                          </div>
                          <Clock className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Start Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-blue-500" />
              Start AI Tutoring Session
            </DialogTitle>
            <DialogDescription>
              Begin a personalized learning session with your AI tutor
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const sessionData = {
              topic: formData.get('topic') as string || selectedTopic,
              learningObjectives: (formData.get('objectives') as string).split('\n').filter(Boolean),
            };
            startSessionMutation.mutate(sessionData);
            setShowSessionDialog(false);
          }} className="space-y-4">
            
            <div>
              <label className="text-sm font-medium">Topic/Subject</label>
              <Input 
                name="topic" 
                placeholder="e.g., Binary Trees, Dynamic Programming" 
                defaultValue={selectedTopic}
                required 
              />
            </div>

            <div>
              <label className="text-sm font-medium">Learning Objectives (one per line)</label>
              <Textarea 
                name="objectives"
                placeholder={`Understand tree traversal algorithms\nImplement binary search tree operations\nSolve tree-based coding problems`}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowSessionDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={startSessionMutation.isPending}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {startSessionMutation.isPending ? "Starting..." : "Start Session"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}