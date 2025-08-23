import { storage } from "./storage";
import { problemManager } from "./problem-manager";
import type { User, UserProgress, Submission, Problem } from "@shared/schema";

export interface UserStats {
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  acceptanceRate: number;
  totalSubmissions: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  totalTimeSpent: number; // in minutes
  averageTimePerProblem: number;
  difficultyBreakdown: {
    easy: { attempted: number; solved: number };
    medium: { attempted: number; solved: number };
    hard: { attempted: number; solved: number };
  };
  topicPerformance: Record<string, {
    attempted: number;
    solved: number;
    successRate: number;
    averageTime: number;
  }>;
  recentActivity: {
    date: Date;
    type: 'submission' | 'solved' | 'attempted';
    problemId: number;
    problemTitle: string;
    status: string;
  }[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  rank: number;
  percentile: number;
  badges: Badge[];
  recommendations: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'achievement' | 'milestone' | 'special';
}

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  score: number;
  solvedProblems: number;
  streak: number;
  rank: number;
  change: number; // rank change from previous period
}

export interface ProgressTrend {
  date: Date;
  problemsSolved: number;
  submissionCount: number;
  successRate: number;
  timeSpent: number;
}

export class ProgressAnalytics {
  private statsCache: Map<number, { stats: UserStats; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive user statistics
   */
  async getUserStats(userId: number): Promise<UserStats> {
    // Check cache
    const cached = this.statsCache.get(userId);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
      return cached.stats;
    }

    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const userProgress = await storage.getUserProgress(userId);
    const submissions = await storage.getUserSubmissions(userId);
    const allProblems = await storage.getAllProblems();

    // Calculate basic stats
    const solvedProblems = userProgress.filter(p => p.completed).length;
    const attemptedProblems = userProgress.length;
    const totalSubmissions = submissions.length;
    const acceptedSubmissions = submissions.filter(s => s.status === 'accepted').length;
    const acceptanceRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    // Calculate time spent
    const totalTimeSpent = userProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const averageTimePerProblem = solvedProblems > 0 ? totalTimeSpent / solvedProblems : 0;

    // Calculate difficulty breakdown
    const difficultyBreakdown = await this.calculateDifficultyBreakdown(userProgress, allProblems);

    // Calculate topic performance
    const topicPerformance = await this.calculateTopicPerformance(userProgress, allProblems);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(userId, submissions, allProblems);

    // Determine skill level
    const skillLevel = this.determineSkillLevel(solvedProblems, difficultyBreakdown);

    // Calculate rank and percentile
    const { rank, percentile } = await this.calculateRankAndPercentile(userId);

    // Get badges
    const badges = await this.getUserBadges(userId, {
      solvedProblems,
      currentStreak,
      longestStreak,
      totalSubmissions,
      difficultyBreakdown
    });

    // Generate recommendations
    const recommendations = await this.generateRecommendations(userId, {
      solvedProblems,
      difficultyBreakdown,
      topicPerformance,
      skillLevel
    });

    // Get last active date
    const lastActiveDate = submissions.length > 0 
      ? new Date(Math.max(...submissions.map(s => new Date(s.submittedAt).getTime())))
      : null;

    const stats: UserStats = {
      totalProblems: allProblems.length,
      solvedProblems,
      attemptedProblems,
      acceptanceRate,
      totalSubmissions,
      currentStreak,
      longestStreak,
      lastActiveDate,
      totalTimeSpent,
      averageTimePerProblem,
      difficultyBreakdown,
      topicPerformance,
      recentActivity,
      skillLevel,
      rank,
      percentile,
      badges,
      recommendations
    };

    // Cache the stats
    this.statsCache.set(userId, { stats, timestamp: new Date() });

    return stats;
  }

  /**
   * Calculate user's streak (consecutive days of solving problems)
   */
  private async calculateStreaks(userId: number): Promise<{ currentStreak: number; longestStreak: number }> {
    const submissions = await storage.getUserSubmissions(userId);
    const acceptedSubmissions = submissions
      .filter(s => s.status === 'accepted')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    if (acceptedSubmissions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Get unique days with accepted submissions
    const uniqueDays = new Set<string>();
    acceptedSubmissions.forEach(s => {
      const date = new Date(s.submittedAt);
      uniqueDays.add(date.toDateString());
    });

    const sortedDays = Array.from(uniqueDays)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastSubmissionDate = new Date(sortedDays[0]);
    lastSubmissionDate.setHours(0, 0, 0, 0);
    
    if (lastSubmissionDate.getTime() === today.getTime() || 
        lastSubmissionDate.getTime() === yesterday.getTime()) {
      currentStreak = 1;
      
      for (let i = 1; i < sortedDays.length; i++) {
        const currentDay = new Date(sortedDays[i - 1]);
        const previousDay = new Date(sortedDays[i]);
        
        const dayDiff = Math.floor((currentDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    
    for (let i = 1; i < sortedDays.length; i++) {
      const currentDay = new Date(sortedDays[i - 1]);
      const previousDay = new Date(sortedDays[i]);
      
      const dayDiff = Math.floor((currentDay.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate difficulty breakdown
   */
  private async calculateDifficultyBreakdown(
    userProgress: UserProgress[],
    allProblems: Problem[]
  ): Promise<UserStats['difficultyBreakdown']> {
    const breakdown = {
      easy: { attempted: 0, solved: 0 },
      medium: { attempted: 0, solved: 0 },
      hard: { attempted: 0, solved: 0 }
    };

    for (const progress of userProgress) {
      const problem = allProblems.find(p => p.id === progress.problemId);
      if (problem) {
        const difficulty = problem.difficulty as keyof typeof breakdown;
        breakdown[difficulty].attempted++;
        if (progress.completed) {
          breakdown[difficulty].solved++;
        }
      }
    }

    return breakdown;
  }

  /**
   * Calculate topic performance
   */
  private async calculateTopicPerformance(
    userProgress: UserProgress[],
    allProblems: Problem[]
  ): Promise<UserStats['topicPerformance']> {
    const topicStats: Record<string, {
      attempted: number;
      solved: number;
      totalTime: number;
      count: number;
    }> = {};

    for (const progress of userProgress) {
      const problem = allProblems.find(p => p.id === progress.problemId);
      if (problem && problem.topics) {
        for (const topic of problem.topics) {
          if (!topicStats[topic]) {
            topicStats[topic] = {
              attempted: 0,
              solved: 0,
              totalTime: 0,
              count: 0
            };
          }
          
          topicStats[topic].attempted++;
          topicStats[topic].totalTime += progress.timeSpent || 0;
          topicStats[topic].count++;
          
          if (progress.completed) {
            topicStats[topic].solved++;
          }
        }
      }
    }

    const topicPerformance: UserStats['topicPerformance'] = {};
    
    for (const [topic, stats] of Object.entries(topicStats)) {
      topicPerformance[topic] = {
        attempted: stats.attempted,
        solved: stats.solved,
        successRate: stats.attempted > 0 ? (stats.solved / stats.attempted) * 100 : 0,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
      };
    }

    return topicPerformance;
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(
    userId: number,
    submissions: Submission[],
    allProblems: Problem[]
  ): Promise<UserStats['recentActivity']> {
    const recentSubmissions = submissions
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 10);

    const activity: UserStats['recentActivity'] = [];
    const seenProblems = new Set<number>();

    for (const submission of recentSubmissions) {
      const problem = allProblems.find(p => p.id === submission.problemId);
      if (problem) {
        let type: 'submission' | 'solved' | 'attempted' = 'submission';
        
        if (submission.status === 'accepted') {
          type = 'solved';
        } else if (!seenProblems.has(submission.problemId)) {
          type = 'attempted';
        }
        
        activity.push({
          date: new Date(submission.submittedAt),
          type,
          problemId: problem.id,
          problemTitle: problem.title,
          status: submission.status
        });
        
        seenProblems.add(submission.problemId);
      }
    }

    return activity;
  }

  /**
   * Determine user's skill level
   */
  private determineSkillLevel(
    solvedProblems: number,
    difficultyBreakdown: UserStats['difficultyBreakdown']
  ): UserStats['skillLevel'] {
    const easyRate = difficultyBreakdown.easy.attempted > 0
      ? difficultyBreakdown.easy.solved / difficultyBreakdown.easy.attempted
      : 0;
    const mediumRate = difficultyBreakdown.medium.attempted > 0
      ? difficultyBreakdown.medium.solved / difficultyBreakdown.medium.attempted
      : 0;
    const hardRate = difficultyBreakdown.hard.attempted > 0
      ? difficultyBreakdown.hard.solved / difficultyBreakdown.hard.attempted
      : 0;

    if (solvedProblems >= 200 && hardRate > 0.5) {
      return 'expert';
    } else if (solvedProblems >= 100 && mediumRate > 0.6) {
      return 'advanced';
    } else if (solvedProblems >= 50 && easyRate > 0.7) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Calculate user's rank and percentile
   */
  private async calculateRankAndPercentile(
    userId: number
  ): Promise<{ rank: number; percentile: number }> {
    const allUsers = await storage.getAllUsers();
    const userScores: { userId: number; score: number }[] = [];

    for (const user of allUsers) {
      const progress = await storage.getUserProgress(user.id);
      const solvedCount = progress.filter(p => p.completed).length;
      
      // Calculate score based on problems solved and difficulty
      let score = 0;
      for (const prog of progress) {
        if (prog.completed) {
          const problem = await storage.getProblem(prog.problemId);
          if (problem) {
            const difficultyMultiplier = 
              problem.difficulty === 'easy' ? 1 :
              problem.difficulty === 'medium' ? 2 : 3;
            score += difficultyMultiplier;
          }
        }
      }
      
      userScores.push({ userId: user.id, score });
    }

    userScores.sort((a, b) => b.score - a.score);
    
    const userIndex = userScores.findIndex(us => us.userId === userId);
    const rank = userIndex + 1;
    const percentile = ((allUsers.length - rank) / allUsers.length) * 100;

    return { rank, percentile };
  }

  /**
   * Get user badges based on achievements
   */
  private async getUserBadges(
    userId: number,
    stats: {
      solvedProblems: number;
      currentStreak: number;
      longestStreak: number;
      totalSubmissions: number;
      difficultyBreakdown: UserStats['difficultyBreakdown'];
    }
  ): Promise<Badge[]> {
    const badges: Badge[] = [];
    const now = new Date();

    // Problem solving milestones
    if (stats.solvedProblems >= 1) {
      badges.push({
        id: 'first-solve',
        name: 'First Steps',
        description: 'Solved your first problem',
        icon: '🎯',
        earnedAt: now,
        category: 'milestone'
      });
    }

    if (stats.solvedProblems >= 10) {
      badges.push({
        id: 'ten-solver',
        name: 'Problem Solver',
        description: 'Solved 10 problems',
        icon: '🌟',
        earnedAt: now,
        category: 'milestone'
      });
    }

    if (stats.solvedProblems >= 50) {
      badges.push({
        id: 'fifty-solver',
        name: 'Code Warrior',
        description: 'Solved 50 problems',
        icon: '⚔️',
        earnedAt: now,
        category: 'milestone'
      });
    }

    if (stats.solvedProblems >= 100) {
      badges.push({
        id: 'hundred-solver',
        name: 'Century Club',
        description: 'Solved 100 problems',
        icon: '💯',
        earnedAt: now,
        category: 'milestone'
      });
    }

    // Streak badges
    if (stats.currentStreak >= 7) {
      badges.push({
        id: 'week-streak',
        name: 'Week Warrior',
        description: '7-day solving streak',
        icon: '🔥',
        earnedAt: now,
        category: 'achievement'
      });
    }

    if (stats.longestStreak >= 30) {
      badges.push({
        id: 'month-streak',
        name: 'Dedicated',
        description: '30-day solving streak',
        icon: '🏆',
        earnedAt: now,
        category: 'achievement'
      });
    }

    // Difficulty badges
    if (stats.difficultyBreakdown.hard.solved >= 10) {
      badges.push({
        id: 'hard-solver',
        name: 'Challenge Accepted',
        description: 'Solved 10 hard problems',
        icon: '💪',
        earnedAt: now,
        category: 'achievement'
      });
    }

    // Speed badges
    if (stats.totalSubmissions > 0 && stats.solvedProblems / stats.totalSubmissions > 0.8) {
      badges.push({
        id: 'efficient',
        name: 'Efficient Coder',
        description: '80% acceptance rate',
        icon: '⚡',
        earnedAt: now,
        category: 'special'
      });
    }

    return badges;
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(
    userId: number,
    stats: {
      solvedProblems: number;
      difficultyBreakdown: UserStats['difficultyBreakdown'];
      topicPerformance: UserStats['topicPerformance'];
      skillLevel: UserStats['skillLevel'];
    }
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Difficulty recommendations
    if (stats.skillLevel === 'beginner' && stats.difficultyBreakdown.easy.solved < 20) {
      recommendations.push('Focus on solving more easy problems to build a strong foundation');
    } else if (stats.skillLevel === 'intermediate' && stats.difficultyBreakdown.medium.solved < 30) {
      recommendations.push('Challenge yourself with more medium difficulty problems');
    } else if (stats.skillLevel === 'advanced' && stats.difficultyBreakdown.hard.solved < 20) {
      recommendations.push('Try tackling more hard problems to reach expert level');
    }

    // Topic recommendations
    const weakTopics = Object.entries(stats.topicPerformance)
      .filter(([_, perf]) => perf.attempted >= 3 && perf.successRate < 50)
      .map(([topic]) => topic);
    
    if (weakTopics.length > 0) {
      recommendations.push(`Practice more problems in: ${weakTopics.slice(0, 3).join(', ')}`);
    }

    // General recommendations
    if (stats.solvedProblems < 10) {
      recommendations.push('Build consistency by solving at least one problem daily');
    }

    // Get specific problem recommendations
    const recommendedProblems = await problemManager.getRecommendedProblems(userId, 3);
    if (recommendedProblems.length > 0) {
      recommendations.push(
        `Recommended problems: ${recommendedProblems.map(p => p.title).join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const allUsers = await storage.getAllUsers();
    const entries: LeaderboardEntry[] = [];
    
    // Calculate time boundary
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    for (const user of allUsers) {
      const submissions = await storage.getUserSubmissions(user.id);
      const progress = await storage.getUserProgress(user.id);
      
      // Filter submissions by period
      const periodSubmissions = submissions.filter(s => 
        new Date(s.submittedAt) >= startDate
      );
      
      // Calculate score for the period
      let score = 0;
      const solvedInPeriod = new Set<number>();
      
      for (const submission of periodSubmissions) {
        if (submission.status === 'accepted' && !solvedInPeriod.has(submission.problemId)) {
          const problem = await storage.getProblem(submission.problemId);
          if (problem) {
            const difficultyScore = 
              problem.difficulty === 'easy' ? 10 :
              problem.difficulty === 'medium' ? 20 : 30;
            score += difficultyScore;
            solvedInPeriod.add(submission.problemId);
          }
        }
      }
      
      // Get streak
      const { currentStreak } = await this.calculateStreaks(user.id);
      
      entries.push({
        userId: user.id,
        userName: user.name,
        score,
        solvedProblems: progress.filter(p => p.completed).length,
        streak: currentStreak,
        rank: 0,
        change: 0
      });
    }

    // Sort by score
    entries.sort((a, b) => b.score - a.score);
    
    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries.slice(0, limit);
  }

  /**
   * Get progress trends over time
   */
  async getProgressTrends(
    userId: number,
    days: number = 30
  ): Promise<ProgressTrend[]> {
    const submissions = await storage.getUserSubmissions(userId);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const trends: ProgressTrend[] = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      
      const daySubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.submittedAt);
        return submissionDate >= currentDate && submissionDate < nextDate;
      });
      
      const problemsSolved = new Set(
        daySubmissions
          .filter(s => s.status === 'accepted')
          .map(s => s.problemId)
      ).size;
      
      const submissionCount = daySubmissions.length;
      const acceptedCount = daySubmissions.filter(s => s.status === 'accepted').length;
      const successRate = submissionCount > 0 ? (acceptedCount / submissionCount) * 100 : 0;
      
      // Estimate time spent (based on average submission time)
      const timeSpent = submissionCount * 15; // Assume 15 minutes per submission
      
      trends.push({
        date: currentDate,
        problemsSolved,
        submissionCount,
        successRate,
        timeSpent
      });
    }
    
    return trends;
  }

  /**
   * Get comparative analysis between users
   */
  async compareUsers(userId1: number, userId2: number): Promise<{
    user1Stats: UserStats;
    user2Stats: UserStats;
    comparison: {
      metric: string;
      user1Value: number;
      user2Value: number;
      winner: number;
    }[];
  }> {
    const user1Stats = await this.getUserStats(userId1);
    const user2Stats = await this.getUserStats(userId2);
    
    const comparison = [
      {
        metric: 'Problems Solved',
        user1Value: user1Stats.solvedProblems,
        user2Value: user2Stats.solvedProblems,
        winner: user1Stats.solvedProblems > user2Stats.solvedProblems ? userId1 : userId2
      },
      {
        metric: 'Acceptance Rate',
        user1Value: user1Stats.acceptanceRate,
        user2Value: user2Stats.acceptanceRate,
        winner: user1Stats.acceptanceRate > user2Stats.acceptanceRate ? userId1 : userId2
      },
      {
        metric: 'Current Streak',
        user1Value: user1Stats.currentStreak,
        user2Value: user2Stats.currentStreak,
        winner: user1Stats.currentStreak > user2Stats.currentStreak ? userId1 : userId2
      },
      {
        metric: 'Rank',
        user1Value: user1Stats.rank,
        user2Value: user2Stats.rank,
        winner: user1Stats.rank < user2Stats.rank ? userId1 : userId2
      }
    ];
    
    return {
      user1Stats,
      user2Stats,
      comparison
    };
  }
}

export const progressAnalytics = new ProgressAnalytics();