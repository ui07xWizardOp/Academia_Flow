import OpenAI from "openai";
import { storage } from "./storage";
import type { Problem, UserProgress, Submission } from "@shared/schema";

interface PersonalizedRecommendation {
  problems: RecommendedProblem[];
  learningPath: LearningPathItem[];
  focusAreas: FocusArea[];
  studyPlan: StudyPlan;
  careerGuidance: CareerGuidance;
  confidence: number;
}

interface RecommendedProblem {
  problemId: number;
  title: string;
  difficulty: string;
  topics: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // in minutes
  prerequisitesMet: boolean;
  relatedConcepts: string[];
}

interface LearningPathItem {
  week: number;
  topic: string;
  objectives: string[];
  problems: number[];
  resources: string[];
  milestones: string[];
}

interface FocusArea {
  area: string;
  currentLevel: 'weak' | 'developing' | 'proficient' | 'strong';
  importance: 'critical' | 'high' | 'medium' | 'low';
  improvementPlan: string;
  practiceProblems: number[];
}

interface StudyPlan {
  dailyGoals: {
    problems: number;
    timeCommitment: number; // minutes
    topics: string[];
  };
  weeklyTargets: {
    problemsToSolve: number;
    topicsToMaster: string[];
    assessments: string[];
  };
  monthlyObjectives: string[];
}

interface CareerGuidance {
  targetRoles: string[];
  skillGaps: string[];
  recommendedProjects: string[];
  interviewPreparation: {
    topic: string;
    readiness: number; // 0-100
    recommendedPractice: string;
  }[];
}

export class AIRecommendationEngine {
  private openai: OpenAI;
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generatePersonalizedRecommendations(userId: number): Promise<PersonalizedRecommendation> {
    // Fetch user data
    const [userProgress, submissions, problems] = await Promise.all([
      storage.getUserProgress(userId),
      storage.getUserSubmissions(userId),
      storage.getAllProblems()
    ]);

    // Analyze user's current state
    const userProfile = await this.analyzeUserProfile(userProgress, submissions, problems);
    
    // Generate AI recommendations
    const recommendations = await this.generateAIRecommendations(userProfile, problems);
    
    return recommendations;
  }

  private async analyzeUserProfile(
    progress: UserProgress[],
    submissions: Submission[],
    allProblems: Problem[]
  ) {
    const solvedProblems = progress.filter(p => p.completed).map(p => p.problemId);
    const attemptedProblems = submissions.map(s => s.problemId);
    
    // Calculate topic strengths
    const topicPerformance = new Map<string, { solved: number; attempted: number; avgAttempts: number }>();
    
    for (const prog of progress) {
      const problem = allProblems.find(p => p.id === prog.problemId);
      if (problem) {
        for (const topic of problem.topics) {
          const current = topicPerformance.get(topic) || { solved: 0, attempted: 0, avgAttempts: 0 };
          if (prog.completed) current.solved++;
          current.attempted++;
          topicPerformance.set(topic, current);
        }
      }
    }
    
    // Calculate difficulty progression
    const difficultyStats = {
      easy: { solved: 0, attempted: 0 },
      medium: { solved: 0, attempted: 0 },
      hard: { solved: 0, attempted: 0 }
    };
    
    for (const prog of progress) {
      const problem = allProblems.find(p => p.id === prog.problemId);
      if (problem) {
        const diff = problem.difficulty as keyof typeof difficultyStats;
        if (prog.completed) difficultyStats[diff].solved++;
        difficultyStats[diff].attempted++;
      }
    }
    
    // Recent activity patterns
    const recentSubmissions = submissions.slice(-20);
    const recentTopics = new Set<string>();
    const recentDifficulties: string[] = [];
    
    for (const sub of recentSubmissions) {
      const problem = allProblems.find(p => p.id === sub.problemId);
      if (problem) {
        problem.topics.forEach(t => recentTopics.add(t));
        recentDifficulties.push(problem.difficulty);
      }
    }
    
    return {
      solvedCount: solvedProblems.length,
      totalProblems: allProblems.length,
      topicPerformance: Object.fromEntries(topicPerformance),
      difficultyStats,
      recentActivity: {
        topics: Array.from(recentTopics),
        difficulties: recentDifficulties,
        submissionCount: recentSubmissions.length
      },
      strengths: this.identifyStrengths(topicPerformance),
      weaknesses: this.identifyWeaknesses(topicPerformance, allProblems)
    };
  }

  private identifyStrengths(topicPerformance: Map<string, any>): string[] {
    const strengths: string[] = [];
    for (const [topic, stats] of topicPerformance) {
      if (stats.solved > 0 && stats.solved / stats.attempted > 0.7) {
        strengths.push(topic);
      }
    }
    return strengths;
  }

  private identifyWeaknesses(topicPerformance: Map<string, any>, allProblems: Problem[]): string[] {
    const weaknesses: string[] = [];
    const allTopics = new Set<string>();
    
    allProblems.forEach(p => p.topics.forEach(t => allTopics.add(t)));
    
    for (const topic of allTopics) {
      const stats = topicPerformance.get(topic);
      if (!stats || stats.solved === 0 || (stats.attempted > 3 && stats.solved / stats.attempted < 0.3)) {
        weaknesses.push(topic);
      }
    }
    
    return weaknesses;
  }

  private async generateAIRecommendations(
    userProfile: any,
    allProblems: Problem[]
  ): Promise<PersonalizedRecommendation> {
    const systemPrompt = `You are an expert programming coach and career advisor. 
    Based on the user's performance data, create personalized learning recommendations that are:
    1. Achievable and appropriately challenging
    2. Aligned with common interview requirements
    3. Structured for systematic skill development
    4. Motivating and encouraging`;

    const userPrompt = `Analyze this user's profile and generate personalized recommendations:
    
    Profile:
    - Solved: ${userProfile.solvedCount}/${userProfile.totalProblems} problems
    - Strengths: ${userProfile.strengths.join(', ') || 'Still developing'}
    - Weaknesses: ${userProfile.weaknesses.slice(0, 5).join(', ') || 'None identified'}
    - Recent topics: ${userProfile.recentActivity.topics.join(', ')}
    - Difficulty distribution: ${JSON.stringify(userProfile.difficultyStats)}
    
    Available problems: ${allProblems.length} total across various topics and difficulties.
    
    Generate comprehensive recommendations in JSON format including:
    - recommendedProblems: Array of 5-7 problems with reasoning
    - learningPath: 4-week structured plan
    - focusAreas: Top 3 areas needing attention
    - studyPlan: Daily and weekly targets
    - careerGuidance: Role-specific preparation advice`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
      
      // Map AI recommendations to actual problems
      const recommendedProblems = this.mapRecommendedProblems(
        aiResponse.recommendedProblems || [],
        allProblems,
        userProfile
      );
      
      return {
        problems: recommendedProblems,
        learningPath: this.createLearningPath(aiResponse.learningPath || [], allProblems),
        focusAreas: this.createFocusAreas(aiResponse.focusAreas || [], userProfile, allProblems),
        studyPlan: this.createStudyPlan(aiResponse.studyPlan || {}, userProfile),
        careerGuidance: this.createCareerGuidance(aiResponse.careerGuidance || {}, userProfile),
        confidence: 0.85
      };
    } catch (error) {
      console.error("AI Recommendations error:", error);
      return this.getFallbackRecommendations(userProfile, allProblems);
    }
  }

  private mapRecommendedProblems(
    aiRecommendations: any[],
    allProblems: Problem[],
    userProfile: any
  ): RecommendedProblem[] {
    const recommendations: RecommendedProblem[] = [];
    const solvedIds = new Set(userProfile.solvedCount);
    
    // Get unsolved problems
    const unsolvedProblems = allProblems.filter(p => !solvedIds.has(p.id));
    
    // Categorize by difficulty and topic
    const easyProblems = unsolvedProblems.filter(p => p.difficulty === 'easy');
    const mediumProblems = unsolvedProblems.filter(p => p.difficulty === 'medium');
    const hardProblems = unsolvedProblems.filter(p => p.difficulty === 'hard');
    
    // Add variety of difficulties
    if (easyProblems.length > 0) {
      recommendations.push(this.createRecommendation(
        easyProblems[Math.floor(Math.random() * easyProblems.length)],
        'Build confidence with fundamental concepts',
        'high'
      ));
    }
    
    // Focus on medium problems for skill development
    const mediumCount = Math.min(3, mediumProblems.length);
    for (let i = 0; i < mediumCount; i++) {
      const problem = mediumProblems[Math.floor(Math.random() * mediumProblems.length)];
      recommendations.push(this.createRecommendation(
        problem,
        'Develop problem-solving skills',
        'high'
      ));
    }
    
    // Add challenging problems for growth
    if (hardProblems.length > 0 && userProfile.difficultyStats.medium.solved > 5) {
      recommendations.push(this.createRecommendation(
        hardProblems[Math.floor(Math.random() * hardProblems.length)],
        'Challenge yourself with advanced concepts',
        'medium'
      ));
    }
    
    return recommendations.slice(0, 7);
  }

  private createRecommendation(
    problem: Problem,
    reason: string,
    priority: 'high' | 'medium' | 'low'
  ): RecommendedProblem {
    return {
      problemId: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      topics: problem.topics,
      reason,
      priority,
      estimatedTime: problem.difficulty === 'easy' ? 20 : problem.difficulty === 'medium' ? 35 : 50,
      prerequisitesMet: true,
      relatedConcepts: problem.topics.slice(0, 3)
    };
  }

  private createLearningPath(aiPath: any[], allProblems: Problem[]): LearningPathItem[] {
    const defaultPath: LearningPathItem[] = [
      {
        week: 1,
        topic: "Arrays and Strings",
        objectives: ["Master array manipulation", "Understand string algorithms"],
        problems: allProblems.filter(p => p.topics.includes("Arrays")).slice(0, 5).map(p => p.id),
        resources: ["Array techniques guide", "String manipulation patterns"],
        milestones: ["Solve 10 array problems", "Complete string challenges"]
      },
      {
        week: 2,
        topic: "Data Structures",
        objectives: ["Implement core data structures", "Understand time complexity"],
        problems: allProblems.filter(p => p.topics.includes("Stack") || p.topics.includes("Queue")).slice(0, 5).map(p => p.id),
        resources: ["Data structure implementations", "Big O notation guide"],
        milestones: ["Build custom data structures", "Analyze complexity"]
      },
      {
        week: 3,
        topic: "Algorithms",
        objectives: ["Master sorting algorithms", "Learn searching techniques"],
        problems: allProblems.filter(p => p.topics.includes("Sorting") || p.topics.includes("Binary Search")).slice(0, 5).map(p => p.id),
        resources: ["Algorithm visualizations", "Optimization techniques"],
        milestones: ["Implement 5 sorting algorithms", "Solve binary search variants"]
      },
      {
        week: 4,
        topic: "Advanced Topics",
        objectives: ["Dynamic programming basics", "Graph algorithms"],
        problems: allProblems.filter(p => p.topics.includes("Dynamic Programming") || p.topics.includes("Graph")).slice(0, 5).map(p => p.id),
        resources: ["DP patterns", "Graph traversal guide"],
        milestones: ["Solve DP problems", "Implement graph algorithms"]
      }
    ];
    
    return aiPath.length > 0 ? aiPath : defaultPath;
  }

  private createFocusAreas(aiAreas: any[], userProfile: any, allProblems: Problem[]): FocusArea[] {
    const areas: FocusArea[] = [];
    
    // Identify weak areas from profile
    for (const weakness of userProfile.weaknesses.slice(0, 3)) {
      const relatedProblems = allProblems
        .filter(p => p.topics.includes(weakness))
        .slice(0, 5)
        .map(p => p.id);
      
      areas.push({
        area: weakness,
        currentLevel: 'weak',
        importance: 'high',
        improvementPlan: `Focus on understanding ${weakness} fundamentals through practice`,
        practiceProblems: relatedProblems
      });
    }
    
    return areas;
  }

  private createStudyPlan(aiPlan: any, userProfile: any): StudyPlan {
    const totalSolved = userProfile.solvedCount;
    const dailyGoal = totalSolved < 50 ? 2 : totalSolved < 150 ? 3 : 5;
    
    return {
      dailyGoals: {
        problems: dailyGoal,
        timeCommitment: dailyGoal * 30,
        topics: userProfile.weaknesses.slice(0, 2)
      },
      weeklyTargets: {
        problemsToSolve: dailyGoal * 5,
        topicsToMaster: userProfile.weaknesses.slice(0, 2),
        assessments: ["Weekly mock interview", "Timed problem set"]
      },
      monthlyObjectives: [
        "Complete 50+ problems",
        "Master 3 new topics",
        "Achieve 80% success rate",
        "Participate in 2 mock interviews"
      ]
    };
  }

  private createCareerGuidance(aiGuidance: any, userProfile: any): CareerGuidance {
    return {
      targetRoles: ["Software Engineer", "Full Stack Developer", "Backend Engineer"],
      skillGaps: userProfile.weaknesses.slice(0, 3),
      recommendedProjects: [
        "Build a RESTful API",
        "Create a full-stack web application",
        "Contribute to open source"
      ],
      interviewPreparation: [
        {
          topic: "Data Structures",
          readiness: Math.min(80, userProfile.solvedCount * 2),
          recommendedPractice: "Daily problem solving"
        },
        {
          topic: "System Design",
          readiness: userProfile.solvedCount > 100 ? 60 : 30,
          recommendedPractice: "Study system design patterns"
        },
        {
          topic: "Behavioral",
          readiness: 70,
          recommendedPractice: "Practice STAR method responses"
        }
      ]
    };
  }

  private getFallbackRecommendations(userProfile: any, allProblems: Problem[]): PersonalizedRecommendation {
    const unsolvedProblems = allProblems.slice(0, 5);
    
    return {
      problems: unsolvedProblems.map(p => this.createRecommendation(p, "Recommended for practice", "medium")),
      learningPath: this.createLearningPath([], allProblems),
      focusAreas: [],
      studyPlan: this.createStudyPlan({}, userProfile),
      careerGuidance: this.createCareerGuidance({}, userProfile),
      confidence: 0.5
    };
  }
}