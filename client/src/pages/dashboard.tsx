import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { UserProgress, Submission, InterviewSession } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { 
  CheckCircle, 
  Trophy, 
  Clock, 
  Star, 
  Plus, 
  Mic,
  Book,
  AlertCircle,
  Brain,
  Target,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user progress and statistics
  const { data: userProgress = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: userSubmissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ['/api/submissions/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: userInterviews = [], isLoading: interviewsLoading } = useQuery<InterviewSession[]>({
    queryKey: ['/api/interviews/user', user?.id],
    enabled: !!user?.id,
  });

  // Fetch AI-powered recommendations
  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery<any[]>({
    queryKey: ['/api/recommendations/user', user?.id],
    enabled: !!user?.id,
  });

  // Calculate statistics
  const completedProblems = userProgress.filter(p => p.completed).length;
  const totalAttempts = userProgress.reduce((sum, p) => sum + (p.attempts || 0), 0);
  const successRate = totalAttempts > 0 ? Math.round((completedProblems / totalAttempts) * 100) : 0;
  const totalPracticeTime = userProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
  const currentStreak = 7; // This would be calculated based on daily activity

  const recentSubmissions = userSubmissions.slice(0, 3);

  if (progressLoading || submissionsLoading || interviewsLoading || recommendationsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's your learning progress.</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => setLocation("/problems")}
                data-testid="button-start-coding"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Coding
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/interviews")}
                className="bg-success-600 text-white hover:bg-success-700 border-success-600"
                data-testid="button-practice-interview"
              >
                <Mic className="w-4 h-4 mr-2" />
                Practice Interview
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Problems Solved"
              value={completedProblems}
              icon={CheckCircle}
              bgColor="bg-primary/10"
              iconColor="text-primary"
            />
            <StatsCard
              title="Success Rate"
              value={`${successRate}%`}
              icon={Trophy}
              bgColor="bg-success-500/10"
              iconColor="text-success-600"
            />
            <StatsCard
              title="Practice Hours"
              value={totalPracticeTime}
              icon={Clock}
              bgColor="bg-warning-500/10"
              iconColor="text-warning-600"
            />
            <StatsCard
              title="Current Streak"
              value={`${currentStreak} days`}
              icon={Star}
              bgColor="bg-purple-100"
              iconColor="text-purple-600"
            />
          </div>

          {/* Recent Activity & Progress Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Problems */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Problems</CardTitle>
              </CardHeader>
              <CardContent>
                {recentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent submissions</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setLocation("/problems")}
                      data-testid="button-start-first-problem"
                    >
                      Start your first problem
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSubmissions.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            submission.status === 'accepted' ? 'bg-success-500' : 
                            submission.status === 'wrong_answer' ? 'bg-red-500' : 'bg-warning-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`problem-${submission.id}`}>
                              Problem #{submission.problemId}
                            </p>
                            <p className="text-sm text-gray-500">{submission.language}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={submission.status === 'accepted' ? 'default' : 'destructive'}
                          className={submission.status === 'accepted' ? 'bg-success-100 text-success-800' : ''}
                        >
                          {submission.status === 'accepted' ? 'Solved' : 'Failed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    const problems = Math.floor(Math.random() * 8) + 1; // Mock data
                    const percentage = (problems / 8) * 100;
                    
                    return (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 w-8">{day}</span>
                        <div className="flex-1 mx-3">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-16">
                          {problems} problems
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Book className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Data Structures Homework 3</h3>
                      <p className="text-sm text-gray-500">Professor Johnson • Due March 15</p>
                      <Badge variant="outline" className="mt-1 bg-warning-100 text-warning-800">
                        3 of 5 problems
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setLocation("/problems")}
                    data-testid="button-continue-assignment"
                  >
                    Continue
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-success-500/10 rounded-lg flex items-center justify-center">
                      <Mic className="text-success-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Mock Interview Practice</h3>
                      <p className="text-sm text-gray-500">Career Services • Recommended</p>
                      <Badge variant="outline" className="mt-1 bg-blue-100 text-blue-800">
                        New
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/interviews")}
                    className="bg-success-600 text-white hover:bg-success-700 border-success-600"
                    data-testid="button-start-mock-interview"
                  >
                    Start
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI-Powered Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span>AI-Powered Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={
                              rec.type === 'problem' ? 'bg-blue-100 text-blue-800' :
                              rec.type === 'topic' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }>
                              {rec.type === 'problem' ? 'Problem' : 
                               rec.type === 'topic' ? 'Topic' : 'Skill'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.difficulty}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{rec.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <div className="flex items-center space-x-1">
                              <Target className="w-3 h-3" />
                              <span>Success Rate: {rec.expectedSuccessRate}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>Skill Growth: +{rec.skillGrowth}%</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (rec.type === 'problem') {
                              setLocation(`/code-editor?problem=${rec.id}`);
                            } else {
                              setLocation(`/problems?filter=${rec.category}`);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white ml-4"
                        >
                          {rec.type === 'problem' ? 'Solve' : 'Explore'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation('/analytics')}
                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                      View Detailed Analytics
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Complete more problems to get personalized AI recommendations!</p>
                  <Button onClick={() => setLocation('/problems')} className="bg-purple-600 hover:bg-purple-700">
                    Start Solving Problems
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
