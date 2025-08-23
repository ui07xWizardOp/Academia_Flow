import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star,
  Target,
  TrendingUp,
  MessageSquare
} from "lucide-react";

interface Question {
  id: string;
  type: 'technical' | 'behavioral' | 'system_design';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  category: string;
}

interface AIMessage {
  sessionId: string;
  message: string;
  messageType: 'greeting' | 'question' | 'followup' | 'transition' | 'closing';
  nextAction: 'continue' | 'followup' | 'complete';
  metadata?: {
    questionData?: Question;
    conversationStage?: string;
    personalizedContext?: string;
  };
}

interface InterviewMessage {
  id: string;
  type: 'message';
  content: string;
  timestamp: string;
  author: 'ai' | 'user';
  messageType?: 'greeting' | 'question' | 'followup' | 'transition' | 'closing';
  metadata?: any;
}

interface InterviewAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallScore: number;
  categoryScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    systemDesign: number;
  };
}

export default function AIInterview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get interview type and session ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const interviewType = urlParams.get("type") || "technical";
  const sessionId = urlParams.get("session");

  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [conversationStage, setConversationStage] = useState('greeting');
  const [isCompleted, setIsCompleted] = useState(false);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const [startTime] = useState(new Date());
  const [isTyping, setIsTyping] = useState(false);

  // Start interview mutation
  const startInterviewMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await apiRequest("POST", "/api/interviews/ai/start", { type });
      return response.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session.id);
      toast({
        title: "Interview Started",
        description: `Your personalized ${interviewType} interview is ready. The AI is analyzing your coding background...`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to Start Interview",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  });

  // Get next message mutation
  const getMessageMutation = useMutation({
    mutationFn: async ({ sessionId, userResponse }: { sessionId: number; userResponse?: string }) => {
      setIsTyping(true);
      const response = await apiRequest("POST", `/api/interviews/ai/${sessionId}/question`, {
        userResponse
      });
      return response.json();
    },
    onSuccess: (data: AIMessage) => {
      setIsTyping(false);
      
      // Add AI message to conversation
      const aiMessage: InterviewMessage = {
        id: `ai-${Date.now()}`,
        type: 'message',
        content: data.message,
        timestamp: new Date().toISOString(),
        author: 'ai',
        messageType: data.messageType,
        metadata: data.metadata
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setConversationStage(data.metadata?.conversationStage || conversationStage);

      if (data.nextAction === 'complete') {
        setTimeout(() => {
          completeInterviewMutation.mutate({
            sessionId: currentSession!,
            finalResponse: currentResponse
          });
        }, 2000); // Give user time to read the closing message
      }
    },
    onError: () => {
      setIsTyping(false);
      toast({
        title: "Connection Issue",
        description: "Let me try that again...",
        variant: "destructive",
      });
    }
  });

  // Complete interview mutation
  const completeInterviewMutation = useMutation({
    mutationFn: async ({ sessionId, finalResponse }: { sessionId: number; finalResponse?: string }) => {
      const response = await apiRequest("POST", `/api/interviews/ai/${sessionId}/complete`, {
        finalResponse
      });
      return response.json();
    },
    onSuccess: (analysisData) => {
      setAnalysis(analysisData);
      setIsCompleted(true);
      toast({
        title: "Interview Completed!",
        description: "Check your detailed feedback and recommendations below.",
      });
    }
  });

  const getFirstMessage = (sessionId: number) => {
    getMessageMutation.mutate({ sessionId });
  };

  const handleSubmitResponse = () => {
    if (!currentResponse.trim() || !currentSession) return;

    // Add user response to messages
    const responseMessage: InterviewMessage = {
      id: `user-${Date.now()}`,
      type: 'message',
      content: currentResponse,
      timestamp: new Date().toISOString(),
      author: 'user'
    };

    setMessages(prev => [...prev, responseMessage]);

    // Get next AI message
    getMessageMutation.mutate({
      sessionId: currentSession,
      userResponse: currentResponse
    });

    setCurrentResponse("");
  };

  // Auto-start interview if session ID is provided, otherwise start new one
  useEffect(() => {
    if (sessionId) {
      setCurrentSession(parseInt(sessionId));
      getFirstMessage(parseInt(sessionId));
    } else {
      startInterviewMutation.mutate(interviewType);
    }
  }, []);

  // Update first message when session starts
  useEffect(() => {
    if (currentSession && !sessionId) {
      getFirstMessage(currentSession);
    }
  }, [currentSession]);

  const formatDuration = () => {
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
    return `${duration} min`;
  };

  const getInterviewTypeColor = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'behavioral': return 'bg-green-100 text-green-800';
      case 'system_design': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isCompleted && analysis) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/interviews")}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Interview Complete!</h1>
                  <p className="text-gray-600">Your performance analysis and recommendations</p>
                </div>
              </div>
              <Badge className={getInterviewTypeColor(interviewType)}>
                {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-green-600">
                  {analysis.overallScore}/100
                </CardTitle>
                <p className="text-gray-600">Overall Performance</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-blue-600">
                      {analysis.categoryScores.technical}
                    </div>
                    <p className="text-sm text-gray-600">Technical</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-600">
                      {analysis.categoryScores.communication}
                    </div>
                    <p className="text-sm text-gray-600">Communication</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-purple-600">
                      {analysis.categoryScores.problemSolving}
                    </div>
                    <p className="text-sm text-gray-600">Problem Solving</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-orange-600">
                      {analysis.categoryScores.systemDesign}
                    </div>
                    <p className="text-sm text-gray-600">System Design</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">
                        {index + 1}
                      </div>
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/interviews")}
              >
                View All Interviews
              </Button>
              <Button
                onClick={() => startInterviewMutation.mutate(interviewType)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Another Interview
              </Button>
            </div>
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
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/interviews")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Mock Interview</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="capitalize">{conversationStage.replace('_', ' ')}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration()}</span>
                  </div>
                  <span>•</span>
                  <span>{messages.length} exchanges</span>
                </div>
              </div>
            </div>
            <Badge className={getInterviewTypeColor(interviewType)}>
              {interviewType.charAt(0).toUpperCase() + interviewType.slice(1)}
            </Badge>
          </div>
          
          {/* Conversation Progress */}
          <div className="mt-4">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                conversationStage === 'greeting' ? 'bg-blue-500' : 'bg-gray-300'
              }`}></div>
              <span>Greeting</span>
              <div className={`w-2 h-2 rounded-full ${
                conversationStage === 'personal_intro' ? 'bg-blue-500' : 
                ['technical_questions', 'closing'].includes(conversationStage) ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span>Introduction</span>
              <div className={`w-2 h-2 rounded-full ${
                conversationStage === 'technical_questions' ? 'bg-blue-500' :
                conversationStage === 'closing' ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span>Discussion</span>
              <div className={`w-2 h-2 rounded-full ${
                conversationStage === 'closing' ? 'bg-blue-500' : 'bg-gray-300'
              }`}></div>
              <span>Wrap-up</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {startInterviewMutation.isPending && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Setting up your personalized interview...</p>
                  <p className="mt-1 text-sm text-gray-500">Analyzing your coding progress and preferences</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-3 max-w-3xl ${message.author === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={message.author === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}>
                      {message.author === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Card className={`${message.author === 'user' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                    <CardContent className="p-4">
                      {message.metadata && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {message.metadata.category}
                          </Badge>
                          <Badge 
                            className={`text-xs ${
                              message.metadata.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              message.metadata.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {message.metadata.difficulty}
                          </Badge>
                        </div>
                      )}
                      <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}

            {getQuestionMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                          <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                          <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                        </div>
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Response Input */}
          {!isCompleted && currentSession && (
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      conversationStage === 'greeting' ? "Hi there! Feel free to share how you're feeling about the interview..." :
                      conversationStage === 'personal_intro' ? "Tell me about your coding journey and what interests you..." :
                      conversationStage === 'technical_questions' ? "Take your time to think through and explain your approach..." :
                      "Share any final thoughts or questions you might have..."
                    }
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    rows={3}
                    className="resize-none border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSubmitResponse();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">Press Ctrl+Enter to submit</p>
                    <p className="text-xs text-gray-500">
                      {currentResponse.length} characters
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSubmitResponse}
                  disabled={!currentResponse.trim() || getMessageMutation.isPending || isTyping}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {conversationStage === 'greeting' ? 'Hi!' :
                   conversationStage === 'personal_intro' ? 'Share' :
                   conversationStage === 'technical_questions' ? 'Explain' :
                   'Finish'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}