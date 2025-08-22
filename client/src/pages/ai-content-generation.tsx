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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Brain, 
  Code, 
  FileText,
  Wand2,
  RefreshCw,
  Save,
  Eye,
  Play,
  Settings,
  BookOpen,
  Target,
  Lightbulb,
  Zap,
  Cpu,
  Database,
  Globe,
  Lock
} from "lucide-react";

interface GeneratedProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  constraints: string[];
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  solution: {
    code: string;
    language: string;
    explanation: string;
    timeComplexity: string;
    spaceComplexity: string;
  };
  testCases: {
    input: string;
    expectedOutput: string;
  }[];
  hints: string[];
  relatedConcepts: string[];
  generatedAt: string;
  status: 'draft' | 'review' | 'published';
}

interface ContentTemplate {
  id: string;
  name: string;
  type: 'algorithm' | 'data-structure' | 'system-design' | 'debugging' | 'optimization';
  description: string;
  difficulty: string;
  topics: string[];
  estimatedTime: number;
}

export default function AIContentGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<GeneratedProblem | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch generated problems
  const { data: generatedProblems = [], isLoading } = useQuery<GeneratedProblem[]>({
    queryKey: ['/api/ai/generated-problems'],
    enabled: !!user?.id && (user?.role === 'professor' || user?.role === 'admin'),
  });

  // Fetch content templates
  const { data: templates = [] } = useQuery<ContentTemplate[]>({
    queryKey: ['/api/ai/content-templates'],
    enabled: !!user?.id,
  });

  // Generate problem mutation
  const generateProblemMutation = useMutation({
    mutationFn: async (generationParams: any) => {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Simulate progressive generation steps
      const steps = [
        'Analyzing requirements...',
        'Generating problem concept...',
        'Creating examples and test cases...',
        'Developing solution...',
        'Writing explanation...',
        'Finalizing content...'
      ];
      
      for (let i = 0; i < steps.length; i++) {
        setGenerationProgress((i + 1) * 16.67);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await apiRequest("POST", "/api/ai/generate-problem", generationParams);
      setIsGenerating(false);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Problem Generated Successfully!",
        description: "AI has created a new coding problem with solution and test cases.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/generated-problems'] });
      setShowGenerateDialog(false);
      setGenerationProgress(0);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate problem. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setGenerationProgress(0);
    },
  });

  // Publish problem mutation
  const publishProblemMutation = useMutation({
    mutationFn: async (problemId: string) => {
      const response = await apiRequest("POST", `/api/ai/generated-problems/${problemId}/publish`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Problem Published",
        description: "The generated problem is now available to students!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/generated-problems'] });
    },
  });

  // Generate explanation mutation
  const generateExplanationMutation = useMutation({
    mutationFn: async ({ code, problemContext }: { code: string; problemContext: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate-explanation", {
        code,
        problemContext
      });
      return response.json();
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (user?.role !== 'professor' && user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">AI content generation is only available to professors and administrators.</p>
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
            <p className="mt-2 text-gray-600">Loading AI content generation...</p>
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
                <Sparkles className="w-7 h-7 mr-3 text-purple-500" />
                AI Content Generation
              </h1>
              <p className="text-gray-600 mt-1">Create coding problems, explanations, and challenges using artificial intelligence</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                AI Settings
              </Button>
              <Button 
                onClick={() => setShowGenerateDialog(true)}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isGenerating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Content
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="problems" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="problems">Generated Problems</TabsTrigger>
              <TabsTrigger value="templates">Content Templates</TabsTrigger>
              <TabsTrigger value="explanations">AI Explanations</TabsTrigger>
              <TabsTrigger value="analytics">Generation Analytics</TabsTrigger>
            </TabsList>

            {/* Generated Problems Tab */}
            <TabsContent value="problems" className="space-y-4">
              {generatedProblems.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Generated Content</h2>
                  <p className="text-gray-600 mb-6">Use AI to automatically generate coding problems and challenges.</p>
                  <Button onClick={() => setShowGenerateDialog(true)}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Your First Problem
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {generatedProblems.map((problem) => (
                    <Card key={problem.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold">{problem.title}</h3>
                              <Badge className={getDifficultyColor(problem.difficulty)}>
                                {problem.difficulty}
                              </Badge>
                              <Badge className={getStatusColor(problem.status)}>
                                {problem.status}
                              </Badge>
                            </div>
                            
                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {problem.description}
                            </p>

                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                              <span>Topics: {problem.topics.join(', ')}</span>
                              <span>•</span>
                              <span>{problem.testCases.length} test cases</span>
                              <span>•</span>
                              <span>Generated {new Date(problem.generatedAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {problem.relatedConcepts.slice(0, 3).map((concept, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProblem(problem)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {problem.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => publishProblemMutation.mutate(problem.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Publish
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Problem Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Solution Complexity</h4>
                            <p className="text-xs text-gray-600">Time: {problem.solution.timeComplexity}</p>
                            <p className="text-xs text-gray-600">Space: {problem.solution.spaceComplexity}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Examples</h4>
                            <p className="text-xs text-gray-600">{problem.examples.length} examples provided</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Hints Available</h4>
                            <p className="text-xs text-gray-600">{problem.hints.length} hints generated</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Content Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                          <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <Badge className={getDifficultyColor(template.difficulty)}>
                              {template.difficulty}
                            </Badge>
                            <Badge variant="outline">
                              {template.type.replace('-', ' ')}
                            </Badge>
                          </div>

                          <div className="text-xs text-gray-500 mb-3">
                            Topics: {template.topics.join(', ')}
                          </div>

                          <div className="flex items-center text-xs text-gray-500">
                            <Target className="w-3 h-3 mr-1" />
                            <span>Est. {template.estimatedTime} min generation</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          setShowGenerateDialog(true);
                          // Pre-fill form with template data
                        }}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* AI Explanations Tab */}
            <TabsContent value="explanations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    AI Code Explanation Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Code to Explain</label>
                    <Textarea 
                      placeholder="Paste your code here and AI will generate a detailed explanation..."
                      rows={8}
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Problem Context (Optional)</label>
                    <Input placeholder="e.g., Two Sum problem, Binary Search implementation" />
                  </div>

                  <Button 
                    className="bg-yellow-600 hover:bg-yellow-700"
                    disabled={generateExplanationMutation.isPending}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {generateExplanationMutation.isPending ? "Generating..." : "Generate Explanation"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Problems Generated</p>
                        <p className="text-2xl font-bold text-purple-600">{generatedProblems.length}</p>
                      </div>
                      <Cpu className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Published</p>
                        <p className="text-2xl font-bold text-green-600">
                          {generatedProblems.filter(p => p.status === 'published').length}
                        </p>
                      </div>
                      <Globe className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">In Review</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {generatedProblems.filter(p => p.status === 'review').length}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Quality Score</p>
                        <p className="text-2xl font-bold text-orange-600">8.7/10</p>
                      </div>
                      <Zap className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Generate Content Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wand2 className="w-5 h-5 mr-2 text-purple-500" />
              Generate AI Content
            </DialogTitle>
            <DialogDescription>
              Configure parameters for AI to generate high-quality coding problems and solutions
            </DialogDescription>
          </DialogHeader>
          
          {isGenerating ? (
            <div className="space-y-4 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Generating Content...</h3>
                <p className="text-gray-600 mb-4">AI is creating your coding problem</p>
                <Progress value={generationProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-gray-500 mt-2">{Math.round(generationProgress)}% complete</p>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const generationParams = {
                topic: formData.get('topic'),
                difficulty: formData.get('difficulty'),
                problemType: formData.get('problemType'),
                concepts: formData.get('concepts')?.toString().split(',').map(s => s.trim()).filter(Boolean),
                includeHints: formData.get('includeHints') === 'on',
                includeSolution: formData.get('includeSolution') === 'on',
                testCaseCount: parseInt(formData.get('testCaseCount') as string),
                language: formData.get('language'),
              };
              generateProblemMutation.mutate(generationParams);
            }} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Topic/Subject</label>
                  <Select name="topic" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arrays">Arrays & Strings</SelectItem>
                      <SelectItem value="trees">Trees & Graphs</SelectItem>
                      <SelectItem value="algorithms">Sorting & Searching</SelectItem>
                      <SelectItem value="dp">Dynamic Programming</SelectItem>
                      <SelectItem value="system-design">System Design</SelectItem>
                      <SelectItem value="databases">Database Design</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Difficulty Level</label>
                  <Select name="difficulty" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Problem Type</label>
                <Select name="problemType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select problem type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="algorithmic">Algorithmic Challenge</SelectItem>
                    <SelectItem value="debugging">Code Debugging</SelectItem>
                    <SelectItem value="optimization">Code Optimization</SelectItem>
                    <SelectItem value="implementation">Implementation Problem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Specific Concepts (comma-separated)</label>
                <Input 
                  name="concepts" 
                  placeholder="e.g., recursion, binary search, hashmap" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Programming Language</label>
                  <Select name="language" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Test Cases</label>
                  <Input 
                    name="testCaseCount" 
                    type="number" 
                    min="3" 
                    max="20" 
                    defaultValue="5" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 border rounded-lg">
                <h4 className="font-medium">Generation Options</h4>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Include solution with explanation</label>
                  <input type="checkbox" name="includeSolution" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Generate progressive hints</label>
                  <input type="checkbox" name="includeHints" defaultChecked />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowGenerateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}