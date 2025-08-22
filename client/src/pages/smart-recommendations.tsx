import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Target,
  TrendingUp,
  Star,
  Brain,
  BookOpen,
  Users,
  Award,
  Clock,
  Zap,
  Eye,
  Check,
  X,
  ArrowRight,
  Lightbulb,
  Route,
  Compass,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Database,
  Globe,
  Smartphone,
  Settings,
  RefreshCw
} from "lucide-react";

interface SmartRecommendation {
  id: string;
  type: 'course' | 'skill' | 'career' | 'project' | 'certification';
  title: string;
  description: string;
  reasoning: string;
  confidence: number; // 0-1
  priority: 'critical' | 'high' | 'medium' | 'low';
  difficulty: string;
  estimatedTime: {
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
  prerequisites: string[];
  outcomes: string[];
  marketDemand: number; // 0-100
  salaryImpact: {
    min: number;
    max: number;
    currency: string;
  };
  relatedJobs: string[];
  learningPath: {
    current: string;
    next: string[];
    final: string;
  };
  aiInsights: {
    personalFit: number; // 0-100
    marketTrend: 'rising' | 'stable' | 'declining';
    skillGap: number; // 0-100
    competitionLevel: 'low' | 'medium' | 'high';
  };
  status: 'new' | 'viewed' | 'bookmarked' | 'started' | 'completed' | 'dismissed';
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  currentRole: string;
  targetRole: string;
  progressPercentage: number;
  steps: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    estimatedDuration: string;
    skills: string[];
    resources: string[];
  }[];
  marketInsights: {
    averageSalary: number;
    jobGrowth: number;
    demandLevel: 'low' | 'medium' | 'high' | 'very-high';
    topCompanies: string[];
  };
  personalizedFeedback: {
    strengths: string[];
    gapsToAddress: string[];
    recommendedActions: string[];
    timelineEstimate: string;
  };
}

interface SkillRecommendation {
  id: string;
  skill: string;
  category: string;
  currentLevel: number; // 0-100
  targetLevel: number; // 0-100
  importance: number; // 0-100
  trendingScore: number; // 0-100
  learningResources: {
    type: 'course' | 'tutorial' | 'practice' | 'project';
    title: string;
    provider: string;
    duration: string;
    difficulty: string;
  }[];
  industryDemand: {
    level: number; // 0-100
    growth: number; // percentage
    averageSalary: number;
  };
}

export default function SmartRecommendations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filterType, setFilterType] = useState("all");

  // Fetch personalized recommendations
  const { data: recommendations = [], isLoading } = useQuery<SmartRecommendation[]>({
    queryKey: ['/api/ai/smart-recommendations', user?.id, filterType],
    enabled: !!user?.id,
  });

  // Fetch career paths
  const { data: careerPaths = [] } = useQuery<CareerPath[]>({
    queryKey: ['/api/ai/career-paths', user?.id],
    enabled: !!user?.id,
  });

  // Fetch skill recommendations
  const { data: skillRecommendations = [] } = useQuery<SkillRecommendation[]>({
    queryKey: ['/api/ai/skill-recommendations', user?.id],
    enabled: !!user?.id,
  });

  // Update recommendation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/ai/smart-recommendations/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/smart-recommendations'] });
    },
  });

  // Generate new recommendations
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/generate-recommendations");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recommendations Updated",
        description: "AI has generated new personalized recommendations for you!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/smart-recommendations'] });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'stable': return <Target className="w-4 h-4 text-blue-500" />;
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'skill': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'career': return <Briefcase className="w-5 h-5 text-purple-500" />;
      case 'project': return <Code className="w-5 h-5 text-green-500" />;
      case 'certification': return <Award className="w-5 h-5 text-orange-500" />;
      default: return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading smart recommendations...</p>
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
                <Target className="w-7 h-7 mr-3 text-indigo-500" />
                Smart Recommendations
              </h1>
              <p className="text-gray-600 mt-1">AI-powered personalized learning and career guidance</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Preferences
              </Button>
              <Button 
                onClick={() => generateRecommendationsMutation.mutate()}
                disabled={generateRecommendationsMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generateRecommendationsMutation.isPending ? 'animate-spin' : ''}`} />
                Generate New
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="recommendations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
              <TabsTrigger value="career-paths">Career Paths</TabsTrigger>
              <TabsTrigger value="skills">Skill Development</TabsTrigger>
              <TabsTrigger value="insights">Market Insights</TabsTrigger>
            </TabsList>

            {/* AI Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Yet</h2>
                  <p className="text-gray-600 mb-6">Let AI analyze your progress and generate personalized recommendations.</p>
                  <Button onClick={() => generateRecommendationsMutation.mutate()}>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Generate Recommendations
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              {getTypeIcon(rec.type)}
                              <h3 className="text-lg font-semibold">{rec.title}</h3>
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{Math.round(rec.confidence * 100)}% match</span>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 mb-4">{rec.description}</p>

                            {/* AI Reasoning */}
                            <div className="bg-blue-50 p-3 rounded-lg mb-4">
                              <div className="flex items-start space-x-2">
                                <Brain className="w-4 h-4 text-blue-500 mt-0.5" />
                                <div>
                                  <h4 className="text-sm font-medium text-blue-900">Why AI recommends this</h4>
                                  <p className="text-sm text-blue-700">{rec.reasoning}</p>
                                </div>
                              </div>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-green-600">
                                  {rec.aiInsights.personalFit}%
                                </div>
                                <div className="text-xs text-gray-500">Personal Fit</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-blue-600">
                                  {rec.marketDemand}%
                                </div>
                                <div className="text-xs text-gray-500">Market Demand</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded flex items-center justify-center">
                                {getTrendIcon(rec.aiInsights.marketTrend)}
                                <div className="ml-1 text-xs text-gray-500 capitalize">{rec.aiInsights.marketTrend}</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-purple-600">
                                  {rec.estimatedTime.value}{rec.estimatedTime.unit[0]}
                                </div>
                                <div className="text-xs text-gray-500">Time</div>
                              </div>
                            </div>

                            {/* Salary Impact */}
                            {rec.salaryImpact.min > 0 && (
                              <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-1">Potential Salary Impact</div>
                                <div className="text-lg font-semibold text-green-600">
                                  {rec.salaryImpact.currency}{rec.salaryImpact.min.toLocaleString()} - {rec.salaryImpact.currency}{rec.salaryImpact.max.toLocaleString()}
                                </div>
                              </div>
                            )}

                            {/* Prerequisites */}
                            {rec.prerequisites.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">Prerequisites</div>
                                <div className="flex flex-wrap gap-2">
                                  {rec.prerequisites.map((prereq, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {prereq}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Related Jobs */}
                            {rec.relatedJobs.length > 0 && (
                              <div className="mb-4">
                                <div className="text-sm font-medium text-gray-700 mb-2">Related Career Opportunities</div>
                                <div className="flex flex-wrap gap-2">
                                  {rec.relatedJobs.slice(0, 3).map((job, index) => (
                                    <Badge key={index} className="bg-purple-100 text-purple-800 text-xs">
                                      <Briefcase className="w-3 h-3 mr-1" />
                                      {job}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-center space-y-2 ml-6">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRecommendation(rec);
                                setShowDetailsDialog(true);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            
                            {rec.status === 'new' && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'bookmarked' })}
                                  className="px-2"
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'dismissed' })}
                                  className="px-2"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            
                            {rec.status === 'bookmarked' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'started' })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <ArrowRight className="w-4 h-4 mr-1" />
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Career Paths Tab */}
            <TabsContent value="career-paths" className="space-y-6">
              <div className="grid gap-6">
                {careerPaths.map((path) => (
                  <Card key={path.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-semibold">{path.title}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            {path.progressPercentage}% Complete
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4">{path.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>From: {path.currentRole}</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                          <div className="flex items-center">
                            <Briefcase className="w-4 h-4 mr-1" />
                            <span>To: {path.targetRole}</span>
                          </div>
                        </div>

                        <Progress value={path.progressPercentage} className="h-3 mb-4" />
                      </div>

                      {/* Market Insights */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            ${path.marketInsights.averageSalary.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Avg Salary</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            +{path.marketInsights.jobGrowth}%
                          </div>
                          <div className="text-xs text-gray-500">Job Growth</div>
                        </div>
                        <div className="text-center">
                          <Badge className={`${
                            path.marketInsights.demandLevel === 'very-high' ? 'bg-green-100 text-green-800' :
                            path.marketInsights.demandLevel === 'high' ? 'bg-blue-100 text-blue-800' :
                            path.marketInsights.demandLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {path.marketInsights.demandLevel.replace('-', ' ')}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">Demand</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-600">
                            {path.personalizedFeedback.timelineEstimate}
                          </div>
                          <div className="text-xs text-gray-500">Est. Timeline</div>
                        </div>
                      </div>

                      {/* Personalized Feedback */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium text-green-900 mb-2">Your Strengths</h4>
                          <div className="space-y-1">
                            {path.personalizedFeedback.strengths.map((strength, index) => (
                              <div key={index} className="flex items-center text-xs text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                {strength}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium text-orange-900 mb-2">Areas to Develop</h4>
                          <div className="space-y-1">
                            {path.personalizedFeedback.gapsToAddress.map((gap, index) => (
                              <div key={index} className="flex items-center text-xs text-orange-700">
                                <Target className="w-3 h-3 mr-1" />
                                {gap}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Career Steps */}
                      <div>
                        <h4 className="font-medium mb-3">Career Journey Steps</h4>
                        <div className="space-y-3">
                          {path.steps.slice(0, 3).map((step, index) => (
                            <div key={step.id} className="flex items-start space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                step.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5 className="font-medium text-sm">{step.title}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {step.estimatedDuration}
                                  </Badge>
                                  {step.completed && <Check className="w-4 h-4 text-green-500" />}
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                                <div className="flex flex-wrap gap-1">
                                  {step.skills.slice(0, 3).map((skill, skillIndex) => (
                                    <Badge key={skillIndex} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                          <Route className="w-4 h-4 mr-2" />
                          View Full Career Path
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Skills Development Tab */}
            <TabsContent value="skills" className="space-y-4">
              <div className="grid gap-6">
                {skillRecommendations.map((skill) => (
                  <Card key={skill.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{skill.skill}</h3>
                            <Badge className="bg-purple-100 text-purple-800">
                              {skill.category}
                            </Badge>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <TrendingUp className="w-3 h-3" />
                              <span>Trending {skill.trendingScore}/100</span>
                            </div>
                          </div>

                          {/* Skill Progress */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Current Level</span>
                                <span>{skill.currentLevel}%</span>
                              </div>
                              <Progress value={skill.currentLevel} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Target Level</span>
                                <span>{skill.targetLevel}%</span>
                              </div>
                              <Progress value={skill.targetLevel} className="h-2" />
                            </div>
                          </div>

                          {/* Industry Demand */}
                          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {skill.industryDemand.level}%
                              </div>
                              <div className="text-xs text-gray-500">Industry Demand</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                +{skill.industryDemand.growth}%
                              </div>
                              <div className="text-xs text-gray-500">Growth Rate</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">
                                ${skill.industryDemand.averageSalary.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">Avg Salary</div>
                            </div>
                          </div>

                          {/* Learning Resources */}
                          <div>
                            <h4 className="font-medium mb-3">Recommended Learning Resources</h4>
                            <div className="space-y-2">
                              {skill.learningResources.slice(0, 2).map((resource, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center space-x-2">
                                    {resource.type === 'course' && <BookOpen className="w-4 h-4 text-blue-500" />}
                                    {resource.type === 'tutorial' && <Eye className="w-4 h-4 text-green-500" />}
                                    {resource.type === 'practice' && <Code className="w-4 h-4 text-purple-500" />}
                                    {resource.type === 'project' && <Briefcase className="w-4 h-4 text-orange-500" />}
                                    <div>
                                      <div className="font-medium text-sm">{resource.title}</div>
                                      <div className="text-xs text-gray-500">
                                        {resource.provider} • {resource.duration} • {resource.difficulty}
                                      </div>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    Start
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                              {skill.importance}%
                            </div>
                            <div className="text-xs text-gray-500">Importance Score</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Market Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Recommendations</p>
                        <p className="text-2xl font-bold text-indigo-600">{recommendations.length}</p>
                      </div>
                      <Target className="h-8 w-8 text-indigo-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Career Paths</p>
                        <p className="text-2xl font-bold text-purple-600">{careerPaths.length}</p>
                      </div>
                      <Route className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Skills to Develop</p>
                        <p className="text-2xl font-bold text-yellow-600">{skillRecommendations.length}</p>
                      </div>
                      <Zap className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Match Score</p>
                        <p className="text-2xl font-bold text-green-600">
                          {recommendations.length > 0 
                            ? Math.round(recommendations.reduce((acc, rec) => acc + rec.confidence, 0) / recommendations.length * 100)
                            : 0}%
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Recommendation Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedRecommendation && getTypeIcon(selectedRecommendation.type)}
              <span className="ml-2">Recommendation Details</span>
            </DialogTitle>
            <DialogDescription>
              Comprehensive analysis and guidance for this recommendation
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecommendation && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedRecommendation.title}</h3>
                <p className="text-gray-600">{selectedRecommendation.description}</p>
              </div>

              {/* Learning Path Visualization */}
              <div>
                <h4 className="font-semibold mb-3">Learning Journey</h4>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge className="bg-blue-100 text-blue-800">{selectedRecommendation.learningPath.current}</Badge>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {selectedRecommendation.learningPath.next.map((step, index) => (
                      <Badge key={index} variant="outline">{step}</Badge>
                    ))}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <Badge className="bg-green-100 text-green-800">{selectedRecommendation.learningPath.final}</Badge>
                </div>
              </div>

              {/* Expected Outcomes */}
              <div>
                <h4 className="font-semibold mb-3">Expected Outcomes</h4>
                <div className="space-y-2">
                  {selectedRecommendation.outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm text-gray-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    updateStatusMutation.mutate({ 
                      id: selectedRecommendation.id, 
                      status: 'started' 
                    });
                    setShowDetailsDialog(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Start Learning
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}