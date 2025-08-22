import { storage } from "./storage";
import type { User, Problem, Submission, UserProgress } from "@shared/schema";

interface LearningAnalytics {
  userId: number;
  overallPerformance: {
    totalProblems: number;
    solvedProblems: number;
    successRate: number;
    averageAttempts: number;
    totalTime: number; // minutes
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
      confidence: number; // 0-100
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

interface ClassInsights {
  classId: string;
  overallMetrics: {
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    completionRate: number;
  };
  performanceDistribution: {
    topPerformers: { userId: number; name: string; score: number }[];
    strugglingStudents: { userId: number; name: string; issues: string[] }[];
    averageByDifficulty: { easy: number; medium: number; hard: number };
  };
  engagementMetrics: {
    dailyActiveUsers: { date: string; count: number }[];
    peakUsageTimes: { hour: number; userCount: number }[];
    sessionDurations: { average: number; median: number };
  };
  contentEffectiveness: {
    problemRankings: { problemId: number; title: string; successRate: number; avgAttempts: number }[];
    topicDifficulty: { topic: string; successRate: number; avgTimeSpent: number }[];
  };
}

export class AdvancedAnalyticsEngine {
  async generateUserAnalytics(userId: number): Promise<LearningAnalytics> {
    const [user, submissions, progress, problems] = await Promise.all([
      storage.getUser(userId),
      storage.getUserSubmissions(userId),
      storage.getUserProgress(userId),
      storage.getAllProblems()
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate overall performance
    const solvedProblems = progress.filter(p => p.completed).length;
    const totalAttempts = submissions.length;
    const successRate = totalAttempts > 0 ? (solvedProblems / totalAttempts) * 100 : 0;
    const averageAttempts = solvedProblems > 0 ? totalAttempts / solvedProblems : 0;
    const totalTime = progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);

    // Calculate current streak
    const streak = this.calculateStreak(submissions);

    // Category breakdown
    const categoryBreakdown = this.analyzeCategoryPerformance(problems, submissions, progress);

    // Difficulty progression
    const difficultyProgression = this.analyzeDifficultyProgression(problems, submissions, progress);

    // Learning velocity
    const learningVelocity = this.calculateLearningVelocity(submissions, progress);

    // Competency mapping
    const competencyMap = this.buildCompetencyMap(problems, submissions, progress);

    // Prediction model
    const predictionModel = this.generatePredictions(submissions, progress, problems);

    return {
      userId,
      overallPerformance: {
        totalProblems: problems.length,
        solvedProblems,
        successRate,
        averageAttempts,
        totalTime,
        streak
      },
      categoryBreakdown,
      difficultyProgression,
      learningVelocity,
      competencyMap,
      predictionModel
    };
  }

  async generateClassInsights(professorId: number): Promise<ClassInsights> {
    // In a real implementation, this would get students enrolled in professor's classes
    const allUsers = await storage.getAllUsers();
    const students = allUsers.filter(u => u.role === 'student').slice(0, 50); // Mock class limitation
    const problems = await storage.getAllProblems();

    // Calculate class-wide metrics
    const totalStudents = students.length;
    const recentActivity = 7; // days
    const activeStudents = Math.floor(totalStudents * 0.7); // Mock: 70% active

    // Performance analysis
    const studentAnalytics = await Promise.all(
      students.slice(0, 10).map(student => // Limit for performance
        this.generateUserAnalytics(student.id).catch(() => null)
      )
    );

    const validAnalytics = studentAnalytics.filter(Boolean) as LearningAnalytics[];
    const averageProgress = validAnalytics.length > 0 
      ? validAnalytics.reduce((sum, a) => sum + a.overallPerformance.successRate, 0) / validAnalytics.length 
      : 0;

    // Top performers and struggling students
    const topPerformers = validAnalytics
      .sort((a, b) => b.overallPerformance.successRate - a.overallPerformance.successRate)
      .slice(0, 5)
      .map((analytics, index) => ({
        userId: analytics.userId,
        name: `Student ${analytics.userId}`,
        score: Math.round(analytics.overallPerformance.successRate)
      }));

    const strugglingStudents = validAnalytics
      .filter(a => a.overallPerformance.successRate < 50)
      .slice(0, 5)
      .map(analytics => ({
        userId: analytics.userId,
        name: `Student ${analytics.userId}`,
        issues: this.identifyStudentIssues(analytics)
      }));

    // Generate mock engagement data
    const engagementMetrics = this.generateEngagementMetrics();

    // Analyze content effectiveness
    const contentEffectiveness = await this.analyzeContentEffectiveness(problems);

    return {
      classId: `prof-${professorId}-class`,
      overallMetrics: {
        totalStudents,
        activeStudents,
        averageProgress: Math.round(averageProgress),
        completionRate: Math.round((averageProgress / 100) * 80) // Mock completion rate
      },
      performanceDistribution: {
        topPerformers,
        strugglingStudents,
        averageByDifficulty: {
          easy: Math.round(averageProgress * 1.2),
          medium: Math.round(averageProgress),
          hard: Math.round(averageProgress * 0.7)
        }
      },
      engagementMetrics,
      contentEffectiveness
    };
  }

  private calculateStreak(submissions: Submission[]): number {
    const sortedSubmissions = submissions
      .filter(s => s.status === 'accepted')
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const submission of sortedSubmissions) {
      const submissionDate = new Date(submission.submittedAt);
      submissionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  private analyzeCategoryPerformance(problems: Problem[], submissions: Submission[], progress: UserProgress[]) {
    const categoryBreakdown: { [category: string]: any } = {};

    problems.forEach(problem => {
      problem.topics.forEach((topic: string) => {
        if (!categoryBreakdown[topic]) {
          categoryBreakdown[topic] = {
            attempted: 0,
            solved: 0,
            averageScore: 0,
            timeSpent: 0
          };
        }

        const problemSubmissions = submissions.filter(s => s.problemId === problem.id);
        const problemProgress = progress.find(p => p.problemId === problem.id);

        if (problemSubmissions.length > 0) {
          categoryBreakdown[topic].attempted++;
          
          if (problemProgress?.completed) {
            categoryBreakdown[topic].solved++;
          }

          const scores = problemSubmissions
            .filter(s => s.testsPassed && s.totalTests)
            .map(s => (s.testsPassed! / s.totalTests!) * 100);
          
          if (scores.length > 0) {
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            categoryBreakdown[topic].averageScore = avgScore;
          }

          categoryBreakdown[topic].timeSpent += problemProgress?.timeSpent || 0;
        }
      });
    });

    return categoryBreakdown;
  }

  private analyzeDifficultyProgression(problems: Problem[], submissions: Submission[], progress: UserProgress[]) {
    const difficulties = ['easy', 'medium', 'hard'] as const;
    const result: any = {};

    difficulties.forEach(difficulty => {
      const difficultyProblems = problems.filter(p => p.difficulty === difficulty);
      const solvedCount = difficultyProblems.filter(p => 
        progress.some(prog => prog.problemId === p.id && prog.completed)
      ).length;

      const avgTime = this.calculateAverageTime(difficultyProblems, submissions, progress);

      result[difficulty] = {
        solved: solvedCount,
        total: difficultyProblems.length,
        averageTime: avgTime
      };
    });

    return result;
  }

  private calculateAverageTime(problems: Problem[], submissions: Submission[], progress: UserProgress[]): number {
    const times = problems
      .map(p => progress.find(prog => prog.problemId === p.id)?.timeSpent || 0)
      .filter(time => time > 0);

    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  private calculateLearningVelocity(submissions: Submission[], progress: UserProgress[]) {
    // Generate mock learning velocity data
    const now = new Date();
    const daily = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        problemsSolved: Math.floor(Math.random() * 3),
        timeSpent: Math.floor(Math.random() * 120) + 30
      };
    }).reverse();

    const weekly = Array.from({ length: 12 }, (_, i) => {
      const week = `Week ${12 - i}`;
      return {
        week,
        problemsSolved: Math.floor(Math.random() * 10) + 1,
        averageScore: Math.floor(Math.random() * 30) + 60
      };
    });

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      return {
        month: month.toLocaleString('default', { month: 'long', year: 'numeric' }),
        problemsSolved: Math.floor(Math.random() * 25) + 5,
        improvement: Math.floor(Math.random() * 20) - 10
      };
    }).reverse();

    return { daily, weekly, monthly };
  }

  private buildCompetencyMap(problems: Problem[], submissions: Submission[], progress: UserProgress[]) {
    const skills = [
      'Algorithms', 'Data Structures', 'Dynamic Programming', 'Graph Theory',
      'String Manipulation', 'Mathematical Problems', 'System Design'
    ];

    const competencyMap: any = {};

    skills.forEach(skill => {
      const skillProblems = problems.filter(p => 
        p.topics.some(topic => topic.toLowerCase().includes(skill.toLowerCase().split(' ')[0]))
      );

      const skillSubmissions = skillProblems.flatMap(p => 
        submissions.filter(s => s.problemId === p.id)
      );

      const successRate = skillSubmissions.length > 0 
        ? (skillSubmissions.filter(s => s.status === 'accepted').length / skillSubmissions.length) * 100
        : 0;

      let level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      if (successRate >= 90) level = 'expert';
      else if (successRate >= 75) level = 'advanced';
      else if (successRate >= 50) level = 'intermediate';
      else level = 'beginner';

      competencyMap[skill] = {
        level,
        confidence: Math.round(successRate),
        recentPerformance: skillSubmissions.slice(-5).map(s => 
          s.status === 'accepted' ? 100 : 0
        ),
        recommendedActions: this.getRecommendedActions(level, skill)
      };
    });

    return competencyMap;
  }

  private generatePredictions(submissions: Submission[], progress: UserProgress[], problems: Problem[]) {
    const recentSuccessRate = this.calculateRecentSuccessRate(submissions);
    const preferredTopics = this.identifyPreferredTopics(problems, progress);

    let nextDifficulty: 'easy' | 'medium' | 'hard';
    if (recentSuccessRate >= 80) nextDifficulty = 'hard';
    else if (recentSuccessRate >= 60) nextDifficulty = 'medium';
    else nextDifficulty = 'easy';

    return {
      nextProblemDifficulty: nextDifficulty,
      estimatedSuccessRate: Math.round(recentSuccessRate),
      suggestedTopics: preferredTopics.slice(0, 3),
      learningPathOptimization: [
        'Focus on weak areas identified in competency map',
        'Practice more problems in preferred topics',
        'Gradually increase difficulty level',
        'Review and strengthen fundamental concepts'
      ]
    };
  }

  private calculateRecentSuccessRate(submissions: Submission[]): number {
    const recentSubmissions = submissions
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      .slice(0, 10);

    if (recentSubmissions.length === 0) return 0;

    const successCount = recentSubmissions.filter(s => s.status === 'accepted').length;
    return (successCount / recentSubmissions.length) * 100;
  }

  private identifyPreferredTopics(problems: Problem[], progress: UserProgress[]): string[] {
    const topicCounts: { [topic: string]: number } = {};

    problems.forEach(problem => {
      const isCompleted = progress.some(p => p.problemId === problem.id && p.completed);
      if (isCompleted) {
        problem.topics.forEach((topic: string) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic);
  }

  private identifyStudentIssues(analytics: LearningAnalytics): string[] {
    const issues = [];

    if (analytics.overallPerformance.successRate < 30) {
      issues.push('Very low success rate - needs fundamental review');
    }
    if (analytics.overallPerformance.averageAttempts > 5) {
      issues.push('High attempt count - may need debugging practice');
    }
    if (analytics.overallPerformance.streak === 0) {
      issues.push('No recent activity - engagement concern');
    }

    return issues.length > 0 ? issues : ['General performance improvement needed'];
  }

  private generateEngagementMetrics() {
    const now = new Date();
    
    return {
      dailyActiveUsers: Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 20) + 10
        };
      }).reverse(),
      peakUsageTimes: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        userCount: Math.floor(Math.random() * 15) + (hour >= 9 && hour <= 17 ? 10 : 2)
      })),
      sessionDurations: {
        average: 45, // minutes
        median: 38
      }
    };
  }

  private async analyzeContentEffectiveness(problems: Problem[]) {
    return {
      problemRankings: problems.slice(0, 10).map(problem => ({
        problemId: problem.id,
        title: problem.title,
        successRate: Math.floor(Math.random() * 40) + 40,
        avgAttempts: Math.floor(Math.random() * 3) + 1.5
      })),
      topicDifficulty: [
        { topic: 'Arrays', successRate: 78, avgTimeSpent: 25 },
        { topic: 'Dynamic Programming', successRate: 45, avgTimeSpent: 65 },
        { topic: 'Graph Theory', successRate: 52, avgTimeSpent: 55 },
        { topic: 'String Manipulation', successRate: 71, avgTimeSpent: 30 }
      ]
    };
  }

  private getRecommendedActions(level: string, skill: string): string[] {
    const actions = {
      beginner: [
        `Study ${skill} fundamentals`,
        `Practice easy ${skill} problems`,
        `Watch tutorial videos`
      ],
      intermediate: [
        `Solve medium ${skill} problems`,
        `Study advanced ${skill} patterns`,
        `Time yourself on problems`
      ],
      advanced: [
        `Tackle hard ${skill} problems`,
        `Optimize for time complexity`,
        `Teach others ${skill} concepts`
      ],
      expert: [
        `Create ${skill} content`,
        `Mentor other students`,
        `Explore cutting-edge ${skill} research`
      ]
    };

    return actions[level as keyof typeof actions] || actions.beginner;
  }

  async getAllUsers(): Promise<User[]> {
    // This method should be added to storage - for now return empty array
    return [];
  }
}

export const analyticsEngine = new AdvancedAnalyticsEngine();