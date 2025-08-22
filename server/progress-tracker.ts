import { storage } from "./storage";
import type { Submission, UserProgress, Problem } from "@shared/schema";

export class ProgressTracker {
  /**
   * Calculate comprehensive user progress across all problems
   */
  async calculateUserProgress(userId: number) {
    const [userProgress, userSubmissions] = await Promise.all([
      storage.getUserProgress(userId),
      storage.getUserSubmissions(userId)
    ]);

    const allProblems = await storage.getAllProblems();
    const problemStats = new Map();

    // Initialize stats for all problems
    allProblems.forEach(problem => {
      problemStats.set(problem.id, {
        problemId: problem.id,
        difficulty: problem.difficulty,
        topics: problem.topics,
        completed: false,
        attempts: 0,
        bestScore: 0,
        timeSpent: 0,
        lastAttempt: null
      });
    });

    // Process user submissions
    userSubmissions.forEach(submission => {
      const stats = problemStats.get(submission.problemId);
      if (stats) {
        stats.attempts++;
        stats.lastAttempt = submission.submittedAt;
        
        // Calculate score based on test cases passed
        const totalTests = submission.totalTests || 0;
        const testsPassed = submission.testsPassed || 0;
        const score = totalTests > 0 
          ? Math.round((testsPassed / totalTests) * 100)
          : (submission.status === 'accepted' ? 100 : 0);
        
        stats.bestScore = Math.max(stats.bestScore, score);
        stats.completed = submission.status === 'accepted';
        
        // Estimate time spent (simple heuristic based on attempts)
        const runtime = submission.runtime || 1000;
        stats.timeSpent += Math.max(5, Math.min(60, runtime / 100));
      }
    });

    // Calculate overall statistics
    const progressStats = Array.from(problemStats.values());
    const totalProblems = progressStats.length;
    const completedProblems = progressStats.filter(p => p.completed).length;
    const totalAttempts = progressStats.reduce((sum, p) => sum + p.attempts, 0);
    const totalTimeSpent = progressStats.reduce((sum, p) => sum + p.timeSpent, 0);

    // Calculate difficulty breakdown
    const difficultyBreakdown = {
      easy: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      hard: { total: 0, completed: 0 }
    };

    progressStats.forEach(stat => {
      const difficulty = stat.difficulty as keyof typeof difficultyBreakdown;
      if (difficulty in difficultyBreakdown) {
        difficultyBreakdown[difficulty].total++;
        if (stat.completed) {
          difficultyBreakdown[difficulty].completed++;
        }
      }
    });

    // Calculate topic proficiency
    const topicProficiency = new Map();
    progressStats.forEach(stat => {
      (stat.topics as string[]).forEach((topic: string) => {
        if (!topicProficiency.has(topic)) {
          topicProficiency.set(topic, { total: 0, completed: 0, avgScore: 0 });
        }
        const topicStats = topicProficiency.get(topic)!;
        topicStats.total++;
        if (stat.completed) {
          topicStats.completed++;
        }
        topicStats.avgScore = (topicStats.avgScore + stat.bestScore) / 2;
      });
    });

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentActivity = userSubmissions
      .filter(s => new Date(s.submittedAt) > thirtyDaysAgo)
      .length;

    // Calculate streak
    const streak = this.calculateStreak(userSubmissions);

    return {
      overview: {
        totalProblems,
        completedProblems,
        completionRate: totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0,
        totalAttempts,
        totalTimeSpent: Math.round(totalTimeSpent),
        averageScore: progressStats.length > 0 
          ? Math.round(progressStats.reduce((sum, p) => sum + p.bestScore, 0) / progressStats.length)
          : 0,
        currentStreak: streak,
        recentActivity
      },
      difficultyBreakdown,
      topicProficiency: Object.fromEntries(topicProficiency),
      problemProgress: progressStats,
      recentSubmissions: userSubmissions
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 10)
    };
  }

  private calculateStreak(submissions: Submission[]): number {
    if (submissions.length === 0) return 0;

    // Group submissions by date
    const submissionsByDate = new Map();
    submissions.forEach(submission => {
      const date = new Date(submission.submittedAt).toDateString();
      if (!submissionsByDate.has(date)) {
        submissionsByDate.set(date, []);
      }
      submissionsByDate.get(date).push(submission);
    });

    // Check for consecutive days with successful submissions
    const dates = Array.from(submissionsByDate.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const daysDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        // Check if there's at least one successful submission on this date
        const daySubmissions = submissionsByDate.get(dateStr);
        const hasSuccess = daySubmissions.some((s: Submission) => s.status === 'accepted');
        
        if (hasSuccess) {
          streak++;
        } else {
          break;
        }
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Get user ranking among all users
   */
  async getUserRanking(userId: number) {
    // This would require getting all users' progress and comparing
    // For now, return a simple ranking based on completed problems
    const userProgress = await this.calculateUserProgress(userId);
    
    // TODO: Implement proper ranking system
    return {
      rank: 1, // Placeholder
      totalUsers: 1,
      percentile: 100,
      points: userProgress.overview.completedProblems * 10 + 
              userProgress.overview.totalAttempts * 2
    };
  }

  /**
   * Get learning path recommendations
   */
  async getRecommendations(userId: number) {
    const progress = await this.calculateUserProgress(userId);
    const recommendations = [];

    // Find topics that need improvement
    Object.entries(progress.topicProficiency).forEach(([topic, stats]) => {
      const proficiency = stats as { total: number; completed: number; avgScore: number };
      if (proficiency.completed < proficiency.total * 0.7) {
        recommendations.push({
          type: 'topic',
          title: `Improve ${topic} skills`,
          description: `You've completed ${proficiency.completed}/${proficiency.total} ${topic} problems`,
          priority: 'medium'
        });
      }
    });

    // Recommend next difficulty level
    const { easy, medium, hard } = progress.difficultyBreakdown;
    if (easy.completed >= easy.total * 0.8 && medium.completed < medium.total * 0.5) {
      recommendations.push({
        type: 'difficulty',
        title: 'Try Medium Problems',
        description: 'You\'ve mastered easy problems. Time to level up!',
        priority: 'high'
      });
    }

    // Daily practice reminder
    if (progress.overview.recentActivity < 7) {
      recommendations.push({
        type: 'practice',
        title: 'Daily Practice',
        description: 'Try to solve at least one problem daily to maintain your streak',
        priority: 'low'
      });
    }

    return recommendations;
  }
}

export const progressTracker = new ProgressTracker();