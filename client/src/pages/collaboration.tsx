import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { CodeEditor } from "@/components/code/code-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Users, 
  Play, 
  MessageSquare, 
  Copy, 
  Share, 
  Settings,
  Send,
  UserPlus,
  Wifi,
  WifiOff
} from "lucide-react";
import io, { Socket } from 'socket.io-client';

interface Participant {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
}

interface ChatMessage {
  id: string;
  author: {
    id: string;
    name: string;
    color: string;
  };
  message: string;
  timestamp: string;
}

interface ExecutionResult {
  executor: { id: string; name: string };
  result: {
    stdout: string;
    stderr: string;
    exitCode: number;
    runtime: number;
    memory: number;
  };
  timestamp: string;
}

export default function Collaboration() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get room and problem from URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("room");
  const problemId = parseInt(urlParams.get("problem") || "1");

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [showChat, setShowChat] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !user) return;

    const token = localStorage.getItem('auth-token');
    const newSocket = io({
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
      
      // Join the collaboration room
      newSocket.emit('join_room', { roomId, problemId });
      
      toast({
        title: "Connected",
        description: "You're now connected to the collaboration session!",
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Lost connection to collaboration session",
        variant: "destructive"
      });
    });

    newSocket.on('room_joined', (data) => {
      setCode(data.code);
      setLanguage(data.language);
      setParticipants(data.participants);
    });

    newSocket.on('user_joined', (data) => {
      setParticipants(prev => [...prev, data.user]);
      toast({
        title: "User Joined",
        description: `${data.user.name} joined the session`,
      });
    });

    newSocket.on('user_left', (data) => {
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
      toast({
        title: "User Left",
        description: `${data.userName} left the session`,
      });
    });

    newSocket.on('code_updated', (data) => {
      if (data.author.id !== user.id) {
        setCode(data.code);
        setLanguage(data.language);
      }
    });

    newSocket.on('cursor_updated', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId 
          ? { ...p, cursor: { line: data.line, column: data.column } }
          : p
      ));
    });

    newSocket.on('chat_message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    newSocket.on('execution_result', (result: ExecutionResult) => {
      setExecutionResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    });

    newSocket.on('connect_error', (error) => {
      toast({
        title: "Connection Error",
        description: "Failed to connect to collaboration server",
        variant: "destructive"
      });
    });

    return () => {
      newSocket.close();
    };
  }, [roomId, user]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (socket && isConnected) {
      socket.emit('code_change', {
        roomId,
        code: newCode,
        language
      });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (socket && isConnected) {
      socket.emit('code_change', {
        roomId,
        code,
        language: newLanguage
      });
    }
  };

  const handleRunCode = () => {
    if (socket && isConnected) {
      socket.emit('request_code_execution', {
        roomId,
        code,
        language
      });
      toast({
        title: "Executing Code",
        description: "Running code for all participants...",
      });
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim() && socket && isConnected) {
      socket.emit('chat_message', {
        roomId,
        message: chatInput.trim()
      });
      setChatInput("");
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/collaboration?room=${roomId}&problem=${problemId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Collaboration room link copied to clipboard!",
    });
  };

  if (!roomId) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Room</h2>
              <p className="text-gray-600 mb-4">No collaboration room ID provided.</p>
              <Button onClick={() => setLocation("/problems")}>
                Back to Problems
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/problems")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-white">Collaborative Coding</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    {isConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-red-500" />
                        <span>Disconnected</span>
                      </>
                    )}
                  </div>
                  <span>•</span>
                  <span>Room: {roomId?.slice(-8)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Participants */}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{participants.length}</span>
                <div className="flex -space-x-2">
                  {participants.slice(0, 5).map(participant => (
                    <Avatar 
                      key={participant.id} 
                      className="w-8 h-8 border-2 border-gray-700"
                      style={{ borderColor: participant.color }}
                    >
                      <AvatarFallback 
                        style={{ backgroundColor: participant.color + '20', color: participant.color }}
                      >
                        {participant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {participants.length > 5 && (
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600">
                      <span className="text-xs text-gray-300">+{participants.length - 5}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomLink}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                <Share className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Coding Area */}
          <div className="flex-1 flex flex-col">
            {/* Code Editor Controls */}
            <div className="bg-gray-800 border-b border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-gray-700 text-white text-sm rounded px-3 py-1 border border-gray-600"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunCode}
                    disabled={!isConnected}
                    className="bg-green-600 text-white border-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run for All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChat(!showChat)}
                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1">
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                language={language}
                height="100%"
              />
            </div>

            {/* Execution Results */}
            {executionResults.length > 0 && (
              <div className="h-48 bg-gray-800 border-t border-gray-700 overflow-auto">
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-3">Execution Results</h3>
                  {executionResults.map((result, index) => (
                    <Card key={index} className="mb-3 bg-gray-700 border-gray-600">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-300">
                            Executed by {result.executor.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {result.result.stdout && (
                          <div className="mb-2">
                            <div className="text-xs text-green-400 mb-1">Output:</div>
                            <pre className="text-sm bg-gray-900 p-2 rounded text-gray-300 overflow-x-auto">
                              {result.result.stdout}
                            </pre>
                          </div>
                        )}
                        {result.result.stderr && (
                          <div className="mb-2">
                            <div className="text-xs text-red-400 mb-1">Error:</div>
                            <pre className="text-sm bg-red-900/20 p-2 rounded text-red-300 overflow-x-auto">
                              {result.result.stderr}
                            </pre>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Runtime: {result.result.runtime}ms | Memory: {Math.round(result.result.memory / 1024)}KB
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Team Chat</h3>
              </div>
              
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex space-x-3">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback 
                          style={{ 
                            backgroundColor: message.author.color + '20', 
                            color: message.author.color 
                          }}
                          className="text-xs"
                        >
                          {message.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span 
                            className="text-sm font-semibold"
                            style={{ color: message.author.color }}
                          >
                            {message.author.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={!isConnected}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || !isConnected}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}