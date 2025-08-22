import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Trophy, 
  Brain, 
  Code, 
  AlertTriangle,
  CheckCircle,
  Star,
  Calendar,
  Activity
} from "lucide-react";

interface LearningAnalytics {
  userId: number;
  overallPerformance: {
    totalProblems: number;
    solvedProblems: number;
    successRate: number;
    averageAttempts: number;
    totalTime: number;
    streak: number;
  };
  categoryBreakdown: {
    [category: string]: {
      attempted: number;
      solved: number;
      averageScore: number;
      timeSpent: number;
    };
  };
  difficultyProgression: {
    easy: { solved: number; total: number; averageTime: number };
    medium: { solved: number; total: number; averageTime: number };
    hard: { solved: number; total: number; averageTime: number };
  };
  learningVelocity: {
    daily: { date: string; problemsSolved: number; timeSpent: number }[];
    weekly: { week: string; problemsSolved: number; averageScore: number }[];
    monthly: { month: string; problemsSolved: number; improvement: number }[];
  };
  competencyMap: {
    [skill: string]: {
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      confidence: number;
      recentPerformance: number[];
      recommendedActions: string[];
    };
  };
  predictionModel: {
    nextProblemDifficulty: 'easy' | 'medium' | 'hard';
    estimatedSuccessRate: number;
    suggestedTopics: string[];
    learningPathOptimization: string[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Analytics() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const { data: analytics, isLoading } = useQuery<LearningAnalytics>({
    queryKey: ['/api/analytics/user', user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h2>
              <p className="text-gray-600">Start solving problems to see your learning analytics!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const difficultyData = [
    {
      name: 'Easy',
      solved: analytics.difficultyProgression.easy.solved,
      total: analytics.difficultyProgression.easy.total,
      percentage: (analytics.difficultyProgression.easy.solved / analytics.difficultyProgression.easy.total) * 100
    },
    {
      name: 'Medium',
      solved: analytics.difficultyProgression.medium.solved,
      total: analytics.difficultyProgression.medium.total,
      percentage: (analytics.difficultyProgression.medium.solved / analytics.difficultyProgression.medium.total) * 100
    },
    {
      name: 'Hard',
      solved: analytics.difficultyProgression.hard.solved,
      total: analytics.difficultyProgression.hard.total,
      percentage: (analytics.difficultyProgression.hard.solved / analytics.difficultyProgression.hard.total) * 100
    }
  ];

  const categoryData = Object.entries(analytics.categoryBreakdown).map(([name, data]) => ({
    name,
    attempted: data.attempted,
    solved: data.solved,
    score: data.averageScore,
    timeSpent: data.timeSpent
  }));

  const competencyRadarData = Object.entries(analytics.competencyMap).map(([skill, data]) => ({
    skill: skill.replace(/ /g, '\n'),
    confidence: data.confidence,
    fullMark: 100
  }));

  const levelColors = {
    beginner: 'bg-red-100 text-red-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-blue-100 text-blue-800',
    expert: 'bg-green-100 text-green-800'
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Learning Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights into your learning journey</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-100 text-blue-800">
                {analytics.overallPerformance.streak} day streak
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                {analytics.overallPerformance.successRate}% success rate
              </Badge>
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="predictions">Insights</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Problems Solved</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analytics.overallPerformance.solvedProblems}
                        </p>
                        <p className="text-xs text-gray-500">
                          of {analytics.overallPerformance.totalProblems} total
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {analytics.overallPerformance.successRate}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {analytics.overallPerformance.averageAttempts.toFixed(1)} avg attempts
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Practice Time</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.floor(analytics.overallPerformance.totalTime / 60)}h
                        </p>
                        <p className="text-xs text-gray-500">
                          {analytics.overallPerformance.totalTime % 60}m total
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Current Streak</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {analytics.overallPerformance.streak}
                        </p>
                        <p className="text-xs text-gray-500">days active</p>
                      </div>
                      <Trophy className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Learning Velocity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Learning Velocity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.learningVelocity.daily.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="problemsSolved" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="Problems Solved"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="timeSpent" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          name="Time Spent (min)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Difficulty Progression */}
              <Card>
                <CardHeader>
                  <CardTitle>Difficulty Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {difficultyData.map((item, index) => (
                      <div key={item.name} className="flex items-center space-x-4">
                        <div className="w-16">
                          <Badge className={
                            item.name === 'Easy' ? 'bg-green-100 text-green-800' :
                            item.name === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {item.name}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">{item.solved}/{item.total} solved</span>
                            <span className="text-sm font-semibold">{item.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="solved" fill="#8884d8" name="Solved" />
                        <Bar dataKey="attempted" fill="#82ca9d" name="Attempted" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Progress Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.learningVelocity.weekly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="problemsSolved" 
                          stroke="#8884d8" 
                          name="Problems Solved"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="averageScore" 
                          stroke="#82ca9d" 
                          name="Average Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-6">
              {/* Competency Radar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Skill Competency Map</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={competencyRadarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]} 
                          tick={{ fontSize: 10 }}
                        />
                        <Radar
                          name="Confidence"
                          dataKey="confidence"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Skill Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(analytics.competencyMap).map(([skill, data]) => (
                  <Card key={skill}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{skill}</CardTitle>
                        <Badge className={levelColors[data.level]}>
                          {data.level.charAt(0).toUpperCase() + data.level.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Confidence</span>
                            <span className="text-sm font-semibold">{data.confidence}%</span>
                          </div>
                          <Progress value={data.confidence} className="h-2" />
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                          <ul className="space-y-1">
                            {data.recommendedActions.slice(0, 2).map((action, index) => (
                              <li key={index} className="text-xs text-gray-600 flex items-center space-x-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-6">
              {/* AI Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>AI Learning Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Next Recommended Difficulty</h4>
                      <div className="flex items-center space-x-3 mb-4">
                        <Badge className={
                          analytics.predictionModel.nextProblemDifficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          analytics.predictionModel.nextProblemDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {analytics.predictionModel.nextProblemDifficulty.charAt(0).toUpperCase() + 
                           analytics.predictionModel.nextProblemDifficulty.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {analytics.predictionModel.estimatedSuccessRate}% estimated success rate
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 mb-3">Suggested Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {analytics.predictionModel.suggestedTopics.map((topic, index) => (
                          <Badge key={index} variant="outline">{topic}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Learning Path Optimization</h4>
                      <ul className="space-y-2">
                        {analytics.predictionModel.learningPathOptimization.map((recommendation, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-700">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Trajectory */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trajectory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.learningVelocity.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="problemsSolved" 
                          stroke="#8884d8" 
                          strokeWidth={3}
                          name="Problems Solved"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="improvement" 
                          stroke="#82ca9d" 
                          strokeWidth={3}
                          name="Improvement %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}