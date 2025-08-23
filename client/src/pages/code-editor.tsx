import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { CodeEditor } from "@/components/code/code-editor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Send, CheckCircle, XCircle, BarChart3, Users, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Problem } from "@shared/schema";

const defaultCode = {
  python: `def solution(nums, target):
    # Write your solution here
    pass`,
  javascript: `function solution(nums, target) {
    // Write your solution here
}`,
  java: `public class Solution {
    public int[] solution(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
  cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};`,
};

export default function CodeEditorPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode.python);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("console");
  const [qualityReport, setQualityReport] = useState<any>(null);

  // Get problem ID from route params or query string (for backward compatibility)
  const problemIdFromRoute = params?.id;
  const urlParams = new URLSearchParams(window.location.search);
  const problemIdFromQuery = urlParams.get("problem");
  const problemId = problemIdFromRoute || problemIdFromQuery;

  const { data: problem, isLoading: problemLoading } = useQuery<Problem>({
    queryKey: ['/api/problems', problemId],
    enabled: !!problemId,
  });

  // Run code mutation
  const runCodeMutation = useMutation({
    mutationFn: async ({ code, language, problemId }: { code: string; language: string; problemId: string }) => {
      const response = await apiRequest("POST", "/api/code/execute", {
        code,
        language,
        problemId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setTestResults(data);
      setActiveTab("console");
    },
    onError: () => {
      toast({
        title: "Execution failed",
        description: "There was an error running your code.",
        variant: "destructive",
      });
    },
  });

  // Submit code mutation
  const submitCodeMutation = useMutation({
    mutationFn: async ({ code, language, problemId }: { code: string; language: string; problemId: string }) => {
      const response = await apiRequest("POST", "/api/submissions", {
        code,
        language,
        problemId: parseInt(problemId),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "accepted") {
        toast({
          title: "Submission accepted!",
          description: "Congratulations! Your solution is correct.",
        });
      } else {
        toast({
          title: "Submission failed",
          description: `Your solution failed with status: ${data.status}`,
          variant: "destructive",
        });
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/submissions/user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/user', user?.id] });
      
      // Auto-analyze code quality after successful submission
      if (data.status === "accepted") {
        analyzeCodeQuality();
      }
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your code.",
        variant: "destructive",
      });
    },
  });

  // Code quality analysis mutation
  const analyzeCodeMutation = useMutation({
    mutationFn: async ({ code, language, problemId }: { code: string; language: string; problemId?: string }) => {
      const response = await apiRequest("POST", "/api/code/analyze", {
        code,
        language,
        problemId: problemId ? parseInt(problemId) : undefined,
      });
      return response.json();
    },
    onSuccess: (report) => {
      setQualityReport(report);
      setActiveTab("quality");
      toast({
        title: "Code Analysis Complete",
        description: `Quality Score: ${report.overallScore}/100 (Grade ${report.grade})`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze code quality.",
        variant: "destructive",
      });
    },
  });

  const analyzeCodeQuality = () => {
    analyzeCodeMutation.mutate({ code, language, problemId: problemId || undefined });
  };

  useEffect(() => {
    if (problem && problem.starterCode) {
      const starterCode = problem.starterCode as Record<string, string>;
      if (starterCode[language]) {
        setCode(starterCode[language]);
      } else {
        setCode(defaultCode[language as keyof typeof defaultCode] || defaultCode.python);
      }
    } else {
      setCode(defaultCode[language as keyof typeof defaultCode] || defaultCode.python);
    }
  }, [language, problem]);

  const handleRunCode = () => {
    if (!problemId) {
      toast({
        title: "No problem selected",
        description: "Please select a problem first.",
        variant: "destructive",
      });
      return;
    }
    
    runCodeMutation.mutate({ code, language, problemId });
  };

  const handleSubmitCode = () => {
    if (!problemId) {
      toast({
        title: "No problem selected",
        description: "Please select a problem first.",
        variant: "destructive",
      });
      return;
    }
    
    submitCodeMutation.mutate({ code, language, problemId });
  };

  if (!problemId) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Problem Selected</h2>
                <p className="text-gray-600 mb-4">Please select a problem from the problem library.</p>
                <Button onClick={() => setLocation("/problems")} data-testid="button-go-to-problems">
                  Go to Problems
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (problemLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading problem...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Problem Not Found</h2>
                <p className="text-gray-600 mb-4">The requested problem could not be found.</p>
                <Button onClick={() => setLocation("/problems")} data-testid="button-back-to-problems">
                  Back to Problems
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Problem Statement */}
        <div className="w-1/2 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/problems")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900" data-testid="problem-title">
                {problem.title}
              </h1>
              <Badge 
                className={
                  problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }
              >
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="statement" className="flex-1 flex flex-col">
            <TabsList className="justify-start rounded-none bg-gray-50 border-b">
              <TabsTrigger value="statement" className="rounded-none">Statement</TabsTrigger>
              <TabsTrigger value="submissions" className="rounded-none">Submissions</TabsTrigger>
              <TabsTrigger value="help" className="rounded-none">AI Help</TabsTrigger>
            </TabsList>
            
            <TabsContent value="statement" className="flex-1 p-6 overflow-auto">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: problem.description }}
                data-testid="problem-description"
              />
              
              {/* Topic Tags */}
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {problem.topics.map((topic, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="submissions" className="flex-1 p-6">
              <p className="text-sm text-gray-500">Your submission history will appear here.</p>
            </TabsContent>
            
            <TabsContent value="help" className="flex-1 p-6">
              <p className="text-sm text-gray-500">AI assistance features coming soon.</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col bg-gray-900">
          {/* Language Selector */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Language:</span>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-28 h-8 text-sm bg-gray-700 border-gray-600 text-white" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="python" className="text-white hover:bg-gray-600">Python</SelectItem>
                  <SelectItem value="javascript" className="text-white hover:bg-gray-600">JavaScript</SelectItem>
                  <SelectItem value="java" className="text-white hover:bg-gray-600">Java</SelectItem>
                  <SelectItem value="cpp" className="text-white hover:bg-gray-600">C++</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-gray-400">
              Ctrl+Enter to run
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="100%"
            />
          </div>

          {/* Test Results Area */}
          <div className="h-48 bg-gray-800 border-t border-gray-700">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <TabsList className="bg-gray-700">
                  <TabsTrigger value="console" className="text-xs" data-testid="tab-console">Console</TabsTrigger>
                  <TabsTrigger value="test-cases" className="text-xs" data-testid="tab-test-cases">Test Cases</TabsTrigger>
                  <TabsTrigger value="quality" className="text-xs" data-testid="tab-quality">Quality Analysis</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-auto">
                <TabsContent value="console" className="h-full p-3">
                  {testResults ? (
                    <div className="space-y-2 text-xs" data-testid="test-results">
                      {testResults.stdout && (
                        <div>
                          <p className="font-medium text-green-400">Output:</p>
                          <pre className="bg-gray-900 p-2 rounded text-gray-300 overflow-x-auto">{testResults.stdout}</pre>
                        </div>
                      )}
                      {testResults.stderr && (
                        <div>
                          <p className="font-medium text-red-400">Error:</p>
                          <pre className="bg-red-900/20 p-2 rounded text-red-300 overflow-x-auto">{testResults.stderr}</pre>
                        </div>
                      )}
                      <div className="text-gray-400">
                        <p>Runtime: {testResults.runtime}ms | Memory: {(testResults.memory / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Run your code to see results here.</p>
                  )}
                </TabsContent>
                
                <TabsContent value="test-cases" className="h-full p-3">
                  {problem.testCases ? (
                    <div className="space-y-1">
                      {(problem.testCases as any[]).slice(0, 3).map((testCase, index: number) => (
                        <div key={index} className="flex items-center space-x-2 text-xs text-gray-300">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span>Test case {index + 1}: Ready</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No test cases available.</p>
                  )}
                </TabsContent>

                <TabsContent value="quality" className="h-full p-3 overflow-auto">
                  {qualityReport ? (
                    <div className="space-y-3">
                      {/* Quality Score Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`text-lg font-bold ${
                            qualityReport.grade === 'A' ? 'text-green-400' :
                            qualityReport.grade === 'B' ? 'text-blue-400' :
                            qualityReport.grade === 'C' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            Grade {qualityReport.grade}
                          </div>
                          <div className="text-sm text-gray-400">
                            {qualityReport.overallScore}/100
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={analyzeCodeQuality}
                          disabled={analyzeCodeMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-6"
                        >
                          {analyzeCodeMutation.isPending ? "Analyzing..." : "Re-analyze"}
                        </Button>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-gray-400">Lines of Code</div>
                          <div className="text-white">{qualityReport.metrics?.linesOfCode || 0}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Complexity</div>
                          <div className="text-white">{qualityReport.metrics?.cyclomaticComplexity || 0}</div>
                        </div>
                      </div>

                      {/* Issues */}
                      {qualityReport.issues && qualityReport.issues.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-300 mb-2">Issues Found:</div>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {qualityReport.issues.slice(0, 5).map((issue: any, index: number) => (
                              <div key={index} className={`text-xs flex items-center space-x-2 ${
                                issue.severity === 'high' ? 'text-red-400' :
                                issue.severity === 'medium' ? 'text-yellow-400' :
                                'text-blue-400'
                              }`}>
                                {issue.severity === 'high' ? <XCircle className="w-3 h-3" /> :
                                 issue.severity === 'medium' ? <CheckCircle className="w-3 h-3" /> :
                                 <Lightbulb className="w-3 h-3" />}
                                <span>{issue.message}</span>
                                {issue.line && <span className="text-gray-500">:{issue.line}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths */}
                      {qualityReport.strengths && qualityReport.strengths.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-green-400 mb-1">Strengths:</div>
                          <div className="text-xs text-gray-300">
                            {qualityReport.strengths.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {qualityReport.recommendations && qualityReport.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-blue-400 mb-1">Tips:</div>
                          <div className="text-xs text-gray-300">
                            {qualityReport.recommendations.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Comparison */}
                      {qualityReport.comparison && (
                        <div className="text-xs text-gray-400">
                          Better than {qualityReport.comparison.betterThan}% of submissions
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <BarChart3 className="w-8 h-8 text-gray-500 mb-2" />
                      <p className="text-xs text-gray-500 mb-3">No quality analysis yet</p>
                      <Button
                        size="sm"
                        onClick={analyzeCodeQuality}
                        disabled={analyzeCodeMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        {analyzeCodeMutation.isPending ? "Analyzing..." : "Analyze Code Quality"}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Action Buttons - Bottom */}
          <div className="flex items-center justify-end space-x-2 p-3 bg-gray-800 border-t border-gray-700">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCode}
              disabled={runCodeMutation.isPending}
              className="bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600"
              data-testid="button-run-code"
            >
              <Play className="w-3 h-3 mr-1" />
              {runCodeMutation.isPending ? "Running..." : "Run"}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitCode}
              disabled={submitCodeMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-submit-code"
            >
              <Send className="w-3 h-3 mr-1" />
              {submitCodeMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
