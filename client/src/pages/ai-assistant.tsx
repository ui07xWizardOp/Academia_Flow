import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  Send,
  User,
  MessageSquare,
  Lightbulb,
  Code,
  BookOpen,
  Target,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Brain,
  Zap,
  AlertCircle
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    topic?: string;
    confidence?: number;
  };
}

interface ChatSession {
  sessionId: string;
  userId: number;
  messages: ChatMessage[];
  context: {
    currentTopic?: string;
    learningGoals?: string[];
    userLevel?: string;
  };
  startedAt: Date;
}

interface AssistantResponse {
  message: string;
  suggestions?: string[];
  resources?: any[];
  relatedProblems?: number[];
  followUpQuestions?: string[];
  actionItems?: any[];
}

export default function AIAssistant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start a new chat session
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/assistant/start");
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      queryClient.invalidateQueries({ queryKey: ['/api/ai/assistant/sessions'] });
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", `/api/ai/assistant/${currentSession?.sessionId}/message`, { message });
      return await response.json();
    },
    onSuccess: (response: AssistantResponse) => {
      if (currentSession) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };
        
        setCurrentSession({
          ...currentSession,
          messages: [...currentSession.messages, assistantMessage]
        });
      }
    }
  });

  // Get active sessions
  const { data: activeSessions = [] } = useQuery<ChatSession[]>({
    queryKey: ['/api/ai/assistant/sessions'],
    enabled: !!user?.id
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  // Start a new session on mount if none exists
  useEffect(() => {
    if (!currentSession && user?.id && activeSessions.length === 0) {
      startSessionMutation.mutate();
    }
  }, [user?.id]);

  const handleSendMessage = () => {
    if (!input.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setCurrentSession({
      ...currentSession,
      messages: [...currentSession.messages, userMessage]
    });

    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const quickActions = [
    { icon: HelpCircle, label: "Help with a problem", prompt: "I need help solving a coding problem" },
    { icon: BookOpen, label: "Explain a concept", prompt: "Can you explain how recursion works?" },
    { icon: Code, label: "Review my code", prompt: "Can you review my code and suggest improvements?" },
    { icon: Target, label: "Practice recommendations", prompt: "What problems should I practice next?" },
    { icon: Brain, label: "Interview prep", prompt: "Help me prepare for technical interviews" },
    { icon: Lightbulb, label: "Debug assistance", prompt: "I'm getting an error in my code" }
  ];

  const getIntentIcon = (intent?: string) => {
    switch (intent) {
      case 'problem-help': return <Code className="w-4 h-4" />;
      case 'concept-explanation': return <BookOpen className="w-4 h-4" />;
      case 'debugging': return <AlertCircle className="w-4 h-4" />;
      case 'career-advice': return <Target className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Learning Assistant</h1>
                <p className="text-purple-100">Your personal coding mentor, available 24/7</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Powered by GPT-4
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {currentSession ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="max-w-3xl mx-auto space-y-4">
                    {currentSession.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex space-x-3 max-w-[80%] ${
                            message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}
                        >
                          <div
                            className={`p-2 rounded-full ${
                              message.role === 'user'
                                ? 'bg-purple-100 text-purple-600'
                                : 'bg-orange-100 text-orange-600'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <User className="w-5 h-5" />
                            ) : (
                              <Bot className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <Card
                              className={`${
                                message.role === 'user'
                                  ? 'bg-purple-50 border-purple-200'
                                  : 'bg-white'
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="prose prose-sm max-w-none">
                                  {message.content.split('\n').map((line, i) => (
                                    <p key={i} className="mb-2">{line}</p>
                                  ))}
                                </div>
                                {message.metadata?.intent && (
                                  <div className="mt-3 flex items-center space-x-2">
                                    {getIntentIcon(message.metadata.intent)}
                                    <Badge variant="outline" className="text-xs">
                                      {message.metadata.intent.replace('-', ' ')}
                                    </Badge>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                            <span className="text-xs text-muted-foreground mt-1 px-2">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Suggestions */}
                {sendMessageMutation.data?.suggestions && (
                  <div className="px-6 py-3 border-t bg-gray-50">
                    <div className="max-w-3xl mx-auto">
                      <p className="text-sm text-muted-foreground mb-2">Suggested follow-ups:</p>
                      <div className="flex flex-wrap gap-2">
                        {sendMessageMutation.data.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs"
                          >
                            <ChevronRight className="w-3 h-3 mr-1" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-6 border-t bg-white">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex space-x-3">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask me anything about coding, algorithms, or interview prep..."
                        className="flex-1"
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || sendMessageMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-orange-500"
                      >
                        {sendMessageMutation.isPending ? (
                          <Zap className="w-4 h-4 animate-pulse" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Welcome Screen
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-2xl text-center">
                  <div className="mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Welcome to Your AI Learning Assistant</h2>
                    <p className="text-lg text-muted-foreground">
                      I'm here to help you master programming, solve problems, and ace your interviews.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {quickActions.map((action, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer hover:shadow-lg transition-shadow hover:border-purple-200"
                        onClick={() => {
                          if (!currentSession) {
                            startSessionMutation.mutate();
                          }
                          setInput(action.prompt);
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <action.icon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <p className="text-sm font-medium">{action.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-orange-500"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Start Chat Session
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Resources & Info */}
          <div className="w-80 border-l bg-gray-50 p-6 overflow-y-auto">
            <Tabs defaultValue="resources" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resources" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                      Quick Help
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      • Ask for step-by-step explanations
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Request code examples in any language
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Get personalized practice recommendations
                    </p>
                  </CardContent>
                </Card>

                {sendMessageMutation.data?.resources && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Suggested Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sendMessageMutation.data.resources.map((resource, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <BookOpen className="w-4 h-4 text-purple-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{resource.title}</p>
                            <p className="text-xs text-muted-foreground">{resource.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {sendMessageMutation.data?.actionItems && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Action Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sendMessageMutation.data.actionItems.map((item, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Target className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div>
                            <p className="text-sm">{item.description}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.priority} priority
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="tips" className="space-y-4">
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Pro Tip:</strong> Be specific in your questions to get more targeted help.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">How to Get the Most Help</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground mb-1">1. Share your code</p>
                      <p className="text-xs">When debugging, include the relevant code snippet</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">2. Describe the problem</p>
                      <p className="text-xs">Explain what you expect vs. what's happening</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">3. Ask for explanations</p>
                      <p className="text-xs">Request step-by-step breakdowns of concepts</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">4. Practice regularly</p>
                      <p className="text-xs">Ask for practice problems tailored to your level</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}