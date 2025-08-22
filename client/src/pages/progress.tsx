import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { UserProgress, Submission, Problem } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export default function ProgressPage() {
  const { user } = useAuth();

  const { data: userProgress = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: userSubmissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ['/api/submissions/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: problems = [] } = useQuery<Problem[]>({
    queryKey: ['/api/problems'],
  });

  if (progressLoading || submissionsLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading progress...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const completedProblems = userProgress.filter((p) => p.completed);
  const easyCompleted = completedProblems.filter((p) => {
    const problem = problems.find((prob) => prob.id === p.problemId);
    return problem?.difficulty === 'easy';
  }).length;
  
  const mediumCompleted = completedProblems.filter((p) => {
    const problem = problems.find((prob) => prob.id === p.problemId);
    return problem?.difficulty === 'medium';
  }).length;
  
  const hardCompleted = completedProblems.filter((p) => {
    const problem = problems.find((prob) => prob.id === p.problemId);
    return problem?.difficulty === 'hard';
  }).length;

  // Calculate skill breakdown
  const topicStats = new Map<string, { completed: number; total: number }>();
  userProgress.forEach((progress) => {
    const problem = problems.find((p) => p.id === progress.problemId);
    if (problem && progress.completed) {
      problem.topics.forEach((topic: string) => {
        const current = topicStats.get(topic) || { completed: 0, total: 0 };
        current.completed += 1;
        topicStats.set(topic, current);
      });
    }
  });

  problems.forEach((problem) => {
    problem.topics.forEach((topic: string) => {
      const current = topicStats.get(topic) || { completed: 0, total: 0 };
      current.total += 1;
      topicStats.set(topic, current);
    });
  });

  const recentSubmissions = userSubmissions.slice(0, 10);

  // Calculate interview readiness score (mock calculation)
  const totalProblems = problems.length;
  const completedCount = completedProblems.length;
  const readinessScore = totalProblems > 0 ? Math.round((completedCount / totalProblems) * 100) : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Progress Analytics</h1>
          <p className="text-gray-600 mt-1">Track your learning journey and identify areas for improvement.</p>
        </div>

        {/* Progress Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skill Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(topicStats.entries()).slice(0, 5).map(([topic, stats]: [string, any]) => {
                    const percentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
                    return (
                      <div key={topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{topic}</span>
                          <span>{Math.round(percentage)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                  {topicStats.size === 0 && (
                    <div className="text-center py-4">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No progress data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success-600" data-testid="easy-problems-count">
                      {easyCompleted}
                    </div>
                    <div className="text-sm text-gray-600">Easy Problems</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning-600" data-testid="medium-problems-count">
                      {mediumCompleted}
                    </div>
                    <div className="text-sm text-gray-600">Medium Problems</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600" data-testid="hard-problems-count">
                      {hardCompleted}
                    </div>
                    <div className="text-sm text-gray-600">Hard Problems</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interview Readiness */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 40 40">
                      <circle 
                        cx="20" 
                        cy="20" 
                        r="16" 
                        stroke="#e5e7eb" 
                        strokeWidth="3" 
                        fill="none" 
                      />
                      <circle 
                        cx="20" 
                        cy="20" 
                        r="16" 
                        stroke="#059669" 
                        strokeWidth="3" 
                        fill="none"
                        strokeDasharray={`${(readinessScore / 100) * 100} 100`}
                        strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-success-600" data-testid="readiness-score">
                        {readinessScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {readinessScore >= 75 ? "Ready for senior positions" :
                     readinessScore >= 50 ? "Ready for junior positions" :
                     "Keep practicing!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No submissions yet</p>
                  <p className="text-sm text-gray-500">Start solving problems to see your progress here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">Problem</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">Language</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">Runtime</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentSubmissions.map((submission: any) => {
                        const problem = problems.find((p: any) => p.id === submission.problemId);
                        return (
                          <tr key={submission.id}>
                            <td className="py-4 px-6 font-medium text-gray-900" data-testid={`submission-problem-${submission.id}`}>
                              {problem?.title || `Problem #${submission.problemId}`}
                            </td>
                            <td className="py-4 px-6">
                              <Badge 
                                className={
                                  submission.status === 'accepted' ? 'bg-success-100 text-success-800' :
                                  submission.status === 'wrong_answer' ? 'bg-red-100 text-red-800' :
                                  'bg-warning-100 text-warning-800'
                                }
                              >
                                {submission.status === 'accepted' ? 'Accepted' : 
                                 submission.status === 'wrong_answer' ? 'Wrong Answer' : 
                                 submission.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-gray-600 capitalize">
                              {submission.language}
                            </td>
                            <td className="py-4 px-6 text-gray-600">
                              {submission.runtime ? `${submission.runtime}ms` : '-'}
                            </td>
                            <td className="py-4 px-6 text-gray-600">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
