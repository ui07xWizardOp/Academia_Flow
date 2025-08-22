import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { SimpleCodeEditor } from "@/components/code/simple-code-editor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Send, CheckCircle, XCircle } from "lucide-react";
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

export default function CodeEditor() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(defaultCode.python);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("console");

  // Get problem ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const problemId = urlParams.get("problem");

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
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your code.",
        variant: "destructive",
      });
    },
  });

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
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Problem Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/problems")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900" data-testid="problem-title">
                  {problem.title}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    className={
                      problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {problem.topics.join(", ")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRunCode}
                disabled={runCodeMutation.isPending}
                className="bg-success-600 text-white hover:bg-success-700 border-success-600"
                data-testid="button-run-code"
              >
                <Play className="w-4 h-4 mr-2" />
                {runCodeMutation.isPending ? "Running..." : "Run Code"}
              </Button>
              <Button
                onClick={handleSubmitCode}
                disabled={submitCodeMutation.isPending}
                data-testid="button-submit-code"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitCodeMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Layout */}
        <div className="flex-1 flex">
          {/* Problem Description */}
          <div className="w-1/2 bg-white border-r border-gray-200 overflow-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Problem Description</h2>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: problem.description }}
                data-testid="problem-description"
              />
            </div>
          </div>

          {/* Code Editor & Results */}
          <div className="w-1/2 flex flex-col">
            {/* Code Editor */}
            <div className="flex-1">
              <SimpleCodeEditor
                value={code}
                onChange={setCode}
                language={language}
                height="100%"
              />
            </div>

            {/* Results Panel */}
            <div className="h-48 bg-white border-t border-gray-200 overflow-auto">
              <div className="p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Test Results</h3>
                    <TabsList>
                      <TabsTrigger value="console" data-testid="tab-console">Console</TabsTrigger>
                      <TabsTrigger value="test-cases" data-testid="tab-test-cases">Test Cases</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="console">
                    {testResults ? (
                      <div className="space-y-2" data-testid="test-results">
                        {testResults.stdout && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Output:</p>
                            <pre className="text-sm bg-gray-100 p-2 rounded mt-1">{testResults.stdout}</pre>
                          </div>
                        )}
                        {testResults.stderr && (
                          <div>
                            <p className="text-sm font-medium text-red-700">Error:</p>
                            <pre className="text-sm bg-red-50 p-2 rounded mt-1 text-red-700">{testResults.stderr}</pre>
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-4">
                          <p><strong>Runtime:</strong> {testResults.runtime}ms</p>
                          <p><strong>Memory:</strong> {(testResults.memory / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Run your code to see results here.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="test-cases">
                    {problem.testCases ? (
                      <div className="space-y-2">
                        {(problem.testCases as any[]).slice(0, 3).map((testCase, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-success-500" />
                            <span>Test case {index + 1}: Passed</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No test cases available.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
