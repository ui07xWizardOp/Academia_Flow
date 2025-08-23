import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Brain, 
  Send, 
  BookOpen, 
  ChevronRight, 
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle,
  Play,
  User,
  Bot
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TopicBreakdown {
  mainTopic: string;
  overview: string;
  subTopics: {
    title: string;
    description: string;
    keyPoints: string[];
    order: number;
  }[];
  suggestedPath: string;
  estimatedTime: string;
}

interface TutoringSession {
  id: number;
  topic: string;
  topicBreakdown: TopicBreakdown;
  currentSubtopic: number;
  status: string;
  startedAt: string;
  completedAt?: string;
}

interface TutoringMessage {
  id?: number;
  role: 'user' | 'tutor';
  content: string;
  metadata?: {
    messageType?: string;
    currentSubTopic?: string;
    subTopicIndex?: number;
    interactionPrompts?: string[];
  };
  timestamp: string;
}

export default function IntelligentTutoring() {
  const [topic, setTopic] = useState("");
  const [currentSession, setCurrentSession] = useState<TutoringSession | null>(null);
  const [messages, setMessages] = useState<TutoringMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's tutoring sessions
  const { data: sessions } = useQuery({
    queryKey: ['/api/tutoring/sessions'],
    enabled: true
  });

  // Start new tutoring session
  const startSessionMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest("POST", "/api/tutoring/start", { topic });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setMessages([data.message]);
      setTopic("");
      toast({
        title: "Learning Session Started",
        description: `Let's explore ${data.session.topic} together!`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to start session",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  // Send message to tutor
  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: number; message: string }) => {
      setIsTyping(true);
      const response = await apiRequest("POST", `/api/tutoring/${sessionId}/message`, { 
        message 
      });
      return response.json();
    },
    onSuccess: (tutorResponse: TutoringMessage) => {
      setIsTyping(false);
      setMessages(prev => [...prev, tutorResponse]);
      
      // Update current subtopic if changed
      if (tutorResponse.metadata?.subTopicIndex !== undefined && 
          currentSession && 
          tutorResponse.metadata.subTopicIndex !== currentSession.currentSubtopic) {
        setCurrentSession({
          ...currentSession,
          currentSubtopic: tutorResponse.metadata.subTopicIndex
        });
      }
    },
    onError: () => {
      setIsTyping(false);
      toast({
        title: "Connection issue",
        description: "Let me try that again...",
        variant: "destructive"
      });
    }
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, feedback }: { sessionId: number; feedback?: string }) => {
      const response = await apiRequest("POST", `/api/tutoring/${sessionId}/complete`, { 
        feedback 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Completed",
        description: "Great job! Your learning progress has been saved.",
      });
      setCurrentSession(null);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['/api/tutoring/sessions'] });
    }
  });

  // Load messages for resumed session
  const loadSessionMessages = async (sessionId: number) => {
    try {
      const response = await apiRequest("GET", `/api/tutoring/${sessionId}/messages`);
      const data = await response.json();
      setMessages(data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
        timestamp: msg.timestamp
      })));
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  // Handle sending user message
  const handleSendMessage = () => {
    if (!userInput.trim() || !currentSession) return;

    // Add user message to UI
    const userMessage: TutoringMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to backend
    sendMessageMutation.mutate({
      sessionId: currentSession.id,
      message: userInput
    });

    setUserInput("");
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-7 h-7 mr-3 text-purple-600" />
                Intelligent Tutoring System
              </h1>
              <p className="text-gray-600 mt-1">
                Learn any topic with our AI tutor that breaks down complex concepts into digestible parts
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Panel - Topic Input & Sessions */}
            <div className="space-y-6 overflow-y-auto">
              {/* New Topic Input */}
              {!currentSession && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Start Learning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          What would you like to learn today?
                        </label>
                        <Input
                          placeholder="e.g., Machine Learning, React Hooks, Data Structures..."
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && topic.trim()) {
                              startSessionMutation.mutate(topic);
                            }
                          }}
                          className="mb-3"
                          data-testid="input-topic"
                        />
                        <Button 
                          onClick={() => topic.trim() && startSessionMutation.mutate(topic)}
                          disabled={!topic.trim() || startSessionMutation.isPending}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          data-testid="button-start-learning"
                        >
                          {startSessionMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Preparing your learning path...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start Learning
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Popular topics:</p>
                        <div className="flex flex-wrap gap-2">
                          {['Python Basics', 'React Components', 'SQL Joins', 'REST APIs'].map((suggestion) => (
                            <Badge
                              key={suggestion}
                              variant="outline"
                              className="cursor-pointer hover:bg-purple-50"
                              onClick={() => setTopic(suggestion)}
                              data-testid={`badge-suggestion-${suggestion.toLowerCase().replace(' ', '-')}`}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Session Breakdown */}
              {currentSession && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {currentSession.topicBreakdown.mainTopic}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentSession.topicBreakdown.estimatedTime}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {currentSession.topicBreakdown.subTopics.map((subtopic, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border transition-all ${
                              index === currentSession.currentSubtopic
                                ? 'bg-purple-50 border-purple-300'
                                : index < currentSession.currentSubtopic
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                            data-testid={`subtopic-${index}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-1">
                                {index < currentSession.currentSubtopic ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : index === currentSession.currentSubtopic ? (
                                  <ChevronRight className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{subtopic.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{subtopic.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Separator className="my-3" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => completeSessionMutation.mutate({ 
                        sessionId: currentSession.id 
                      })}
                      data-testid="button-end-session"
                    >
                      End Session
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Recent Sessions */}
              {!currentSession && sessions && sessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Recent Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sessions.slice(0, 3).map((session: any) => (
                        <div
                          key={session.id}
                          className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            const parsedSession = {
                              ...session,
                              topicBreakdown: typeof session.topicBreakdown === 'string' 
                                ? JSON.parse(session.topicBreakdown) 
                                : session.topicBreakdown
                            };
                            setCurrentSession(parsedSession);
                            loadSessionMessages(session.id);
                          }}
                          data-testid={`session-${session.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{session.topic}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(session.startedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="lg:col-span-2">
              {currentSession ? (
                <Card className="h-full flex flex-col">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-purple-100 text-purple-600">
                            <Brain className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">AI Tutor</CardTitle>
                          <p className="text-sm text-gray-600">
                            Learning: {currentSession.topicBreakdown.subTopics[currentSession.currentSubtopic]?.title || currentSession.topic}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700">
                        Interactive Learning
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full p-4">
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            data-testid={`message-${index}`}
                          >
                            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className={message.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}>
                                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Card className={`${
                                  message.role === 'user' 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-white border-gray-200'
                                }`}>
                                  <CardContent className="p-3">
                                    {message.metadata?.messageType && message.role === 'tutor' && (
                                      <Badge variant="outline" className="mb-2 text-xs">
                                        {message.metadata.messageType === 'breakdown' && '📋 Overview'}
                                        {message.metadata.messageType === 'explanation' && '💡 Explanation'}
                                        {message.metadata.messageType === 'example' && '📝 Example'}
                                        {message.metadata.messageType === 'summary' && '📊 Summary'}
                                        {message.metadata.messageType === 'clarification' && '🔍 Clarification'}
                                      </Badge>
                                    )}
                                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                    {message.metadata?.interactionPrompts && message.role === 'tutor' && (
                                      <div className="mt-3 space-y-1">
                                        <p className="text-xs text-gray-500">Quick responses:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {message.metadata.interactionPrompts.map((prompt, i) => (
                                            <Badge
                                              key={i}
                                              variant="outline"
                                              className="cursor-pointer hover:bg-purple-50 text-xs"
                                              onClick={() => setUserInput(prompt)}
                                              data-testid={`prompt-${i}`}
                                            >
                                              {prompt}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%]">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-purple-100 text-purple-600">
                                  <Bot className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <Card className="bg-white border-purple-200">
                                <CardContent className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                    <span className="text-sm text-gray-500">Tutor is thinking...</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask a question or type your response..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        rows={2}
                        className="resize-none"
                        disabled={sendMessageMutation.isPending || isTyping}
                        data-testid="textarea-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || sendMessageMutation.isPending || isTyping}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="button-send"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                    <h3 className="text-xl font-semibold mb-2">Ready to Learn?</h3>
                    <p className="text-gray-600 mb-4">
                      Enter any topic you'd like to explore and I'll break it down into manageable parts
                    </p>
                    <p className="text-sm text-gray-500">
                      Our AI tutor will guide you step-by-step through each concept
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}