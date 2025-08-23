import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import MonacoEditor from "@monaco-editor/react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Code, 
  Calendar,
  Timer,
  Cpu,
  GitCompare,
  Eye,
  Download,
  Filter,
  TrendingUp
} from "lucide-react";
import type { Submission } from "@shared/schema";

interface EnhancedSubmission extends Omit<Submission, 'memory'> {
  problemTitle?: string;
  problemDifficulty?: string;
  executionTime?: number;
  memory?: number | null | string;
  output?: string;
  error?: string;
}

export default function Submissions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubmission, setSelectedSubmission] = useState<EnhancedSubmission | null>(null);
  const [diffView, setDiffView] = useState(false);
  const [compareSubmission, setCompareSubmission] = useState<EnhancedSubmission | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");

  // Fetch user submissions
  const { data: submissions = [], isLoading } = useQuery<EnhancedSubmission[]>({
    queryKey: ['/api/submissions/user', user?.id],
    enabled: !!user?.id,
  });

  // Calculate statistics
  const stats = {
    total: submissions.length,
    accepted: submissions.filter(s => s.status === 'accepted').length,
    failed: submissions.filter(s => s.status === 'failed').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    acceptanceRate: submissions.length > 0 
      ? Math.round((submissions.filter(s => s.status === 'accepted').length / submissions.length) * 100)
      : 0
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(submission => {
    const matchesStatus = filterStatus === "all" || submission.status === filterStatus;
    const matchesLanguage = filterLanguage === "all" || submission.language === filterLanguage;
    return matchesStatus && matchesLanguage;
  });

  // Get unique languages from submissions
  const languages = Array.from(new Set(submissions.map(s => s.language)));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const getDiffContent = () => {
    if (!selectedSubmission || !compareSubmission) return '';
    
    const lines1 = selectedSubmission.code.split('\n');
    const lines2 = compareSubmission.code.split('\n');
    let diff = '';
    
    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
      if (lines1[i] !== lines2[i]) {
        if (lines1[i]) diff += `- ${lines1[i]}\n`;
        if (lines2[i]) diff += `+ ${lines2[i]}\n`;
      } else if (lines1[i]) {
        diff += `  ${lines1[i]}\n`;
      }
    }
    
    return diff;
  };

  const handleViewProblem = (problemId: number) => {
    setLocation(`/app/problems/${problemId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-2">Submission History</h1>
            <p className="text-purple-100">Track your progress and review past solutions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Submissions</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Code className="w-8 h-8 text-gray-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Accepted</p>
                    <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Acceptance Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.acceptanceRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-language">
                    <SelectValue placeholder="Filter by language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submissions List */}
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredSubmissions.map((submission) => (
                      <Card 
                        key={submission.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedSubmission?.id === submission.id 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'hover:border-purple-200'
                        }`}
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setDiffView(false);
                          setCompareSubmission(null);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(submission.status)}
                              <span className="font-medium">
                                Problem #{submission.problemId}
                              </span>
                              {getStatusBadge(submission.status)}
                            </div>
                            <Badge variant="outline">{submission.language}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(submission.submittedAt).toLocaleString()}
                            </div>
                            {submission.executionTime && (
                              <div className="flex items-center gap-2">
                                <Timer className="w-3 h-3" />
                                {submission.executionTime}ms
                              </div>
                            )}
                            {submission.memory && (
                              <div className="flex items-center gap-2">
                                <Cpu className="w-3 h-3" />
                                {typeof submission.memory === 'number' ? `${submission.memory} MB` : submission.memory}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProblem(submission.problemId);
                              }}
                              data-testid={`button-view-problem-${submission.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Problem
                            </Button>
                            {selectedSubmission && selectedSubmission.id !== submission.id && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompareSubmission(submission);
                                  setDiffView(true);
                                }}
                                data-testid={`button-compare-${submission.id}`}
                              >
                                <GitCompare className="w-3 h-3 mr-1" />
                                Compare
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Code Viewer */}
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Code View</span>
                  {selectedSubmission && (
                    <div className="flex gap-2">
                      {diffView && compareSubmission && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDiffView(false)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Normal View
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSubmission ? (
                  <Tabs defaultValue="code" className="h-[500px]">
                    <TabsList>
                      <TabsTrigger value="code">Submitted Code</TabsTrigger>
                      {selectedSubmission.output && (
                        <TabsTrigger value="output">Output</TabsTrigger>
                      )}
                      {selectedSubmission.error && (
                        <TabsTrigger value="error">Error</TabsTrigger>
                      )}
                      {diffView && compareSubmission && (
                        <TabsTrigger value="diff">Diff View</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="code" className="h-[450px]">
                      <MonacoEditor
                        height="100%"
                        language={selectedSubmission.language.toLowerCase()}
                        value={selectedSubmission.code}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: "on",
                          scrollBeyondLastLine: false
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="output" className="h-[450px]">
                      <ScrollArea className="h-full">
                        <pre className="p-4 bg-gray-900 text-green-400 rounded font-mono text-sm">
                          {selectedSubmission.output || 'No output available'}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="error" className="h-[450px]">
                      <ScrollArea className="h-full">
                        <pre className="p-4 bg-gray-900 text-red-400 rounded font-mono text-sm">
                          {selectedSubmission.error || 'No errors'}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="diff" className="h-[450px]">
                      <MonacoEditor
                        height="100%"
                        language="diff"
                        value={getDiffContent()}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: "on",
                          scrollBeyondLastLine: false
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center h-[500px] text-gray-500">
                    <div className="text-center">
                      <Code className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select a submission to view the code</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}