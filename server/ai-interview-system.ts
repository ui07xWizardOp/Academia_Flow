import OpenAI from 'openai';
import { storage } from './storage';
import { progressAnalytics } from './progress-analytics';
import type { User, InterviewSession, Problem } from '@shared/schema';

export interface InterviewQuestion {
  id: string;
  type: 'technical' | 'behavioral' | 'system-design' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  expectedTopics?: string[];
  followUpQuestions?: string[];
  evaluationCriteria?: string[];
  timeLimit?: number;
  category?: string;
}

export interface InterviewResponse {
  questionId: string;
  userAnswer: string;
  audioTranscript?: string;
  videoUrl?: string;
  codeSubmitted?: string;
  timestamp: Date;
  duration: number;
}

export interface InterviewEvaluation {
  questionId: string;
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  technicalAccuracy: number;
  communicationSkills: number;
  problemSolving: number;
  codeQuality?: number;
}

export interface InterviewSessionData {
  sessionId: number;
  userId: number;
  type: 'technical' | 'behavioral' | 'full-stack' | 'system-design';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  evaluations: InterviewEvaluation[];
  overallScore: number;
  feedback: {
    overall: string;
    technical: string;
    behavioral: string;
    recommendations: string[];
  };
  recording?: {
    audioUrl?: string;
    videoUrl?: string;
    transcript?: string;
  };
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export class AIInterviewSystem {
  private openai: OpenAI | null = null;
  private sessionCache: Map<number, InterviewSessionData> = new Map();
  private questionBank: Map<string, InterviewQuestion[]> = new Map();
  
  constructor() {
    this.initializeOpenAI();
    this.initializeQuestionBank();
  }

  /**
   * Initialize OpenAI client
   */
  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.openai = new OpenAI({ apiKey });
        console.log('[AI Interview] OpenAI client initialized');
      } catch (error) {
        console.error('[AI Interview] Failed to initialize OpenAI:', error);
        this.openai = null;
      }
    } else {
      console.warn('[AI Interview] OpenAI API key not found - AI features will be limited');
    }
  }

  /**
   * Validate OpenAI API key
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const testClient = new OpenAI({ apiKey });
      await testClient.models.list();
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid API key' 
      };
    }
  }

  /**
   * Initialize question bank with default questions
   */
  private initializeQuestionBank() {
    // Technical questions
    this.questionBank.set('technical', [
      {
        id: 'tech-1',
        type: 'technical',
        difficulty: 'easy',
        question: 'Explain the difference between let, const, and var in JavaScript.',
        expectedTopics: ['javascript', 'scope', 'hoisting'],
        evaluationCriteria: ['Understanding of scope', 'Knowledge of hoisting', 'Best practices'],
        timeLimit: 3
      },
      {
        id: 'tech-2',
        type: 'technical',
        difficulty: 'medium',
        question: 'How would you optimize a React application that is experiencing performance issues?',
        expectedTopics: ['react', 'performance', 'optimization'],
        followUpQuestions: [
          'What tools would you use to identify performance bottlenecks?',
          'How does React.memo help with performance?'
        ],
        evaluationCriteria: ['Knowledge of React optimization techniques', 'Understanding of rendering behavior', 'Practical solutions'],
        timeLimit: 5
      },
      {
        id: 'tech-3',
        type: 'technical',
        difficulty: 'hard',
        question: 'Design a distributed caching system for a high-traffic e-commerce website.',
        expectedTopics: ['system-design', 'caching', 'distributed-systems'],
        followUpQuestions: [
          'How would you handle cache invalidation?',
          'What consistency guarantees would you provide?',
          'How would you handle hot keys?'
        ],
        evaluationCriteria: ['System design skills', 'Scalability considerations', 'Trade-off analysis'],
        timeLimit: 10
      }
    ]);

    // Behavioral questions
    this.questionBank.set('behavioral', [
      {
        id: 'beh-1',
        type: 'behavioral',
        difficulty: 'easy',
        question: 'Tell me about a time when you had to work with a difficult team member.',
        expectedTopics: ['teamwork', 'conflict-resolution', 'communication'],
        evaluationCriteria: ['STAR method usage', 'Conflict resolution skills', 'Professional handling'],
        timeLimit: 5
      },
      {
        id: 'beh-2',
        type: 'behavioral',
        difficulty: 'medium',
        question: 'Describe a situation where you had to learn a new technology quickly to complete a project.',
        expectedTopics: ['learning', 'adaptability', 'problem-solving'],
        followUpQuestions: [
          'What resources did you use to learn?',
          'How did you manage your time?'
        ],
        evaluationCriteria: ['Learning ability', 'Time management', 'Initiative'],
        timeLimit: 5
      }
    ]);

    // Coding questions
    this.questionBank.set('coding', [
      {
        id: 'code-1',
        type: 'coding',
        difficulty: 'easy',
        question: 'Write a function to reverse a string without using built-in reverse methods.',
        expectedTopics: ['algorithms', 'strings', 'problem-solving'],
        evaluationCriteria: ['Code correctness', 'Edge case handling', 'Code efficiency'],
        timeLimit: 15
      },
      {
        id: 'code-2',
        type: 'coding',
        difficulty: 'medium',
        question: 'Implement a function to find the longest common subsequence of two strings.',
        expectedTopics: ['dynamic-programming', 'algorithms'],
        evaluationCriteria: ['Algorithm choice', 'Code correctness', 'Time/space complexity'],
        timeLimit: 30
      }
    ]);
  }

  /**
   * Start a new interview session
   */
  async startInterviewSession(
    userId: number,
    type: 'technical' | 'behavioral' | 'full-stack' | 'system-design'
  ): Promise<InterviewSessionData> {
    // Create session in database
    const session = await storage.createInterviewSession({
      userId,
      type,
      status: 'in_progress'
    });

    // Generate questions based on user profile
    const questions = await this.generateInterviewQuestions(userId, type);

    // Create session data
    const sessionData: InterviewSessionData = {
      sessionId: session.id,
      userId,
      type,
      status: 'in-progress',
      questions,
      responses: [],
      evaluations: [],
      overallScore: 0,
      feedback: {
        overall: '',
        technical: '',
        behavioral: '',
        recommendations: []
      },
      startTime: new Date()
    };

    // Cache session
    this.sessionCache.set(session.id, sessionData);

    return sessionData;
  }

  /**
   * Generate interview questions based on user profile
   */
  private async generateInterviewQuestions(
    userId: number,
    type: string
  ): Promise<InterviewQuestion[]> {
    const userStats = await progressAnalytics.getUserStats(userId);
    const questions: InterviewQuestion[] = [];

    // Determine difficulty based on user skill level
    const difficultyDistribution = this.getDifficultyDistribution(userStats.skillLevel);

    // Select questions based on type
    switch (type) {
      case 'technical':
        questions.push(...this.selectQuestions('technical', difficultyDistribution));
        questions.push(...this.selectQuestions('coding', { easy: 1, medium: 1, hard: 0 }));
        break;
      case 'behavioral':
        questions.push(...this.selectQuestions('behavioral', { easy: 2, medium: 2, hard: 1 }));
        break;
      case 'full-stack':
        questions.push(...this.selectQuestions('technical', difficultyDistribution));
        questions.push(...this.selectQuestions('behavioral', { easy: 1, medium: 1, hard: 0 }));
        questions.push(...this.selectQuestions('coding', { easy: 1, medium: 1, hard: 0 }));
        break;
      case 'system-design':
        questions.push(...this.selectQuestions('technical', { easy: 0, medium: 1, hard: 2 }));
        break;
    }

    // Add AI-generated personalized questions if OpenAI is available
    if (this.openai) {
      try {
        const personalizedQuestions = await this.generatePersonalizedQuestions(
          userId,
          type,
          userStats
        );
        questions.push(...personalizedQuestions);
      } catch (error) {
        console.error('[AI Interview] Failed to generate personalized questions:', error);
      }
    }

    return questions;
  }

  /**
   * Get difficulty distribution based on skill level
   */
  private getDifficultyDistribution(skillLevel: string): Record<string, number> {
    switch (skillLevel) {
      case 'beginner':
        return { easy: 3, medium: 1, hard: 0 };
      case 'intermediate':
        return { easy: 1, medium: 2, hard: 1 };
      case 'advanced':
        return { easy: 0, medium: 2, hard: 2 };
      case 'expert':
        return { easy: 0, medium: 1, hard: 3 };
      default:
        return { easy: 2, medium: 1, hard: 1 };
    }
  }

  /**
   * Select questions from question bank
   */
  private selectQuestions(
    category: string,
    distribution: Record<string, number>
  ): InterviewQuestion[] {
    const questions: InterviewQuestion[] = [];
    const categoryQuestions = this.questionBank.get(category) || [];

    for (const [difficulty, count] of Object.entries(distribution)) {
      const difficultyQuestions = categoryQuestions.filter(q => q.difficulty === difficulty);
      const selected = this.shuffleArray(difficultyQuestions).slice(0, count);
      questions.push(...selected);
    }

    return questions;
  }

  /**
   * Generate personalized questions using AI
   */
  private async generatePersonalizedQuestions(
    userId: number,
    type: string,
    userStats: any
  ): Promise<InterviewQuestion[]> {
    if (!this.openai) return [];

    try {
      // Identify weak areas from user stats
      const weakTopics = Object.entries(userStats.topicPerformance)
        .filter(([_, perf]: [string, any]) => perf.successRate < 50)
        .map(([topic]) => topic)
        .slice(0, 3);

      const prompt = `Generate 2 interview questions for a ${userStats.skillLevel} level developer.
Focus on these topics: ${weakTopics.join(', ')}.
Interview type: ${type}.
Format each question as JSON with fields: question, difficulty, expectedTopics, evaluationCriteria.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer. Generate relevant interview questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return parsed.map((q: any, index: number) => ({
            id: `ai-${Date.now()}-${index}`,
            type: type as any,
            difficulty: q.difficulty || 'medium',
            question: q.question,
            expectedTopics: q.expectedTopics || [],
            evaluationCriteria: q.evaluationCriteria || [],
            timeLimit: 5
          }));
        } catch {
          // If parsing fails, create a simple question from the response
          return [{
            id: `ai-${Date.now()}`,
            type: type as any,
            difficulty: 'medium',
            question: content.substring(0, 200),
            expectedTopics: weakTopics,
            evaluationCriteria: ['Domain knowledge', 'Problem solving'],
            timeLimit: 5
          }];
        }
      }
    } catch (error) {
      console.error('[AI Interview] Error generating personalized questions:', error);
    }

    return [];
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(
    sessionId: number,
    questionId: string,
    answer: string,
    audioTranscript?: string,
    codeSubmitted?: string
  ): Promise<InterviewEvaluation> {
    const session = this.sessionCache.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Record response
    const response: InterviewResponse = {
      questionId,
      userAnswer: answer,
      audioTranscript,
      codeSubmitted,
      timestamp: new Date(),
      duration: Date.now() - session.startTime.getTime()
    };

    session.responses.push(response);

    // Evaluate answer
    const evaluation = await this.evaluateAnswer(question, response, session.userId);
    session.evaluations.push(evaluation);

    // Update cache
    this.sessionCache.set(sessionId, session);

    return evaluation;
  }

  /**
   * Evaluate an answer using AI
   */
  private async evaluateAnswer(
    question: InterviewQuestion,
    response: InterviewResponse,
    userId: number
  ): Promise<InterviewEvaluation> {
    // Default evaluation
    let evaluation: InterviewEvaluation = {
      questionId: question.id,
      score: 70,
      feedback: 'Answer recorded successfully.',
      strengths: ['Clear communication'],
      improvements: ['Consider providing more specific examples'],
      technicalAccuracy: 70,
      communicationSkills: 75,
      problemSolving: 70
    };

    if (this.openai) {
      try {
        const prompt = `Evaluate this interview answer:
Question: ${question.question}
Answer: ${response.userAnswer}
${response.codeSubmitted ? `Code: ${response.codeSubmitted}` : ''}

Evaluation criteria: ${question.evaluationCriteria?.join(', ')}
Expected topics: ${question.expectedTopics?.join(', ')}

Provide evaluation as JSON with:
- score (0-100)
- feedback (constructive feedback)
- strengths (array of strengths)
- improvements (array of areas to improve)
- technicalAccuracy (0-100)
- communicationSkills (0-100)
- problemSolving (0-100)
${response.codeSubmitted ? '- codeQuality (0-100)' : ''}`;

        const aiResponse = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert technical interviewer. Provide constructive and encouraging feedback.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        });

        const content = aiResponse.choices[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            evaluation = {
              questionId: question.id,
              score: parsed.score || 70,
              feedback: parsed.feedback || evaluation.feedback,
              strengths: parsed.strengths || evaluation.strengths,
              improvements: parsed.improvements || evaluation.improvements,
              technicalAccuracy: parsed.technicalAccuracy || 70,
              communicationSkills: parsed.communicationSkills || 70,
              problemSolving: parsed.problemSolving || 70,
              codeQuality: parsed.codeQuality
            };
          } catch (error) {
            console.error('[AI Interview] Failed to parse AI evaluation:', error);
          }
        }
      } catch (error) {
        console.error('[AI Interview] Error evaluating answer:', error);
      }
    }

    return evaluation;
  }

  /**
   * Complete interview session
   */
  async completeInterviewSession(sessionId: number): Promise<InterviewSessionData> {
    const session = this.sessionCache.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    // Calculate overall score
    const totalScore = session.evaluations.reduce((sum, e) => sum + e.score, 0);
    session.overallScore = session.evaluations.length > 0 
      ? Math.round(totalScore / session.evaluations.length)
      : 0;

    // Generate comprehensive feedback
    session.feedback = await this.generateComprehensiveFeedback(session);

    // Update database
    await storage.updateInterviewSession(sessionId, {
      status: 'completed',
      score: session.overallScore,
      feedback: session.feedback,
      completedAt: session.endTime,
      duration: Math.round(session.duration / 60000) // Convert to minutes
    });

    // Clear from cache
    this.sessionCache.delete(sessionId);

    return session;
  }

  /**
   * Generate comprehensive feedback for the interview
   */
  private async generateComprehensiveFeedback(
    session: InterviewSessionData
  ): Promise<InterviewSessionData['feedback']> {
    const technicalEvals = session.evaluations.filter(e => 
      session.questions.find(q => q.id === e.questionId)?.type === 'technical'
    );
    const behavioralEvals = session.evaluations.filter(e => 
      session.questions.find(q => q.id === e.questionId)?.type === 'behavioral'
    );

    // Calculate average scores
    const avgTechnical = technicalEvals.length > 0
      ? technicalEvals.reduce((sum, e) => sum + e.technicalAccuracy, 0) / technicalEvals.length
      : 0;
    const avgCommunication = session.evaluations.length > 0
      ? session.evaluations.reduce((sum, e) => sum + e.communicationSkills, 0) / session.evaluations.length
      : 0;
    const avgProblemSolving = session.evaluations.length > 0
      ? session.evaluations.reduce((sum, e) => sum + e.problemSolving, 0) / session.evaluations.length
      : 0;

    // Collect all strengths and improvements
    const allStrengths = session.evaluations.flatMap(e => e.strengths);
    const allImprovements = session.evaluations.flatMap(e => e.improvements);

    // Generate feedback
    let feedback: InterviewSessionData['feedback'] = {
      overall: this.generateOverallFeedback(session.overallScore, avgCommunication),
      technical: this.generateTechnicalFeedback(avgTechnical, avgProblemSolving),
      behavioral: this.generateBehavioralFeedback(behavioralEvals),
      recommendations: this.generateRecommendations(session, allImprovements)
    };

    // Enhance with AI if available
    if (this.openai) {
      try {
        const prompt = `Generate comprehensive interview feedback:
Overall Score: ${session.overallScore}/100
Technical Accuracy: ${avgTechnical}/100
Communication: ${avgCommunication}/100
Problem Solving: ${avgProblemSolving}/100
Strengths: ${allStrengths.slice(0, 5).join(', ')}
Areas to Improve: ${allImprovements.slice(0, 5).join(', ')}

Provide encouraging and constructive feedback with specific recommendations.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a supportive interview coach providing constructive feedback.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        const aiContent = response.choices[0]?.message?.content;
        if (aiContent) {
          feedback.overall = aiContent.substring(0, 300);
        }
      } catch (error) {
        console.error('[AI Interview] Error generating AI feedback:', error);
      }
    }

    return feedback;
  }

  /**
   * Generate overall feedback
   */
  private generateOverallFeedback(score: number, communication: number): string {
    if (score >= 85) {
      return `Excellent performance! You demonstrated strong technical knowledge and ${
        communication >= 80 ? 'outstanding' : 'good'
      } communication skills. You're well-prepared for technical interviews.`;
    } else if (score >= 70) {
      return `Good job! You showed solid understanding of key concepts. ${
        communication < 70 
          ? 'Focus on articulating your thoughts more clearly.' 
          : 'Keep practicing to refine your responses.'
      }`;
    } else if (score >= 50) {
      return `You have a foundation to build on. Practice more problems and ${
        communication < 60
          ? 'work on explaining your thought process clearly.'
          : 'deepen your technical knowledge.'
      }`;
    } else {
      return 'This interview highlighted areas for improvement. Don\'t be discouraged - with focused practice, you can significantly improve your performance.';
    }
  }

  /**
   * Generate technical feedback
   */
  private generateTechnicalFeedback(technical: number, problemSolving: number): string {
    const techLevel = technical >= 80 ? 'strong' : technical >= 60 ? 'adequate' : 'developing';
    const psLevel = problemSolving >= 80 ? 'excellent' : problemSolving >= 60 ? 'good' : 'emerging';
    
    return `Your technical knowledge is ${techLevel}, and you showed ${psLevel} problem-solving skills. ${
      technical < 70 
        ? 'Review core concepts and practice more coding problems.' 
        : 'Continue building on your solid foundation.'
    }`;
  }

  /**
   * Generate behavioral feedback
   */
  private generateBehavioralFeedback(behavioralEvals: InterviewEvaluation[]): string {
    if (behavioralEvals.length === 0) {
      return 'No behavioral questions were included in this interview.';
    }
    
    const avgScore = behavioralEvals.reduce((sum, e) => sum + e.score, 0) / behavioralEvals.length;
    
    if (avgScore >= 80) {
      return 'You provided excellent examples and demonstrated strong soft skills. Your use of the STAR method was effective.';
    } else if (avgScore >= 60) {
      return 'Your behavioral responses were good. Consider using more specific examples and the STAR method to structure your answers.';
    } else {
      return 'Practice behavioral questions using the STAR method (Situation, Task, Action, Result) to provide more structured responses.';
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    session: InterviewSessionData,
    improvements: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Based on score
    if (session.overallScore < 60) {
      recommendations.push('Practice fundamental concepts daily');
      recommendations.push('Solve at least 2 coding problems per day');
    } else if (session.overallScore < 80) {
      recommendations.push('Focus on medium and hard difficulty problems');
      recommendations.push('Practice explaining your solutions out loud');
    }
    
    // Based on specific weaknesses
    if (improvements.includes('time management')) {
      recommendations.push('Practice with timed coding challenges');
    }
    if (improvements.includes('communication')) {
      recommendations.push('Record yourself explaining solutions and review');
    }
    
    // Add top 3 unique improvements as recommendations
    const uniqueImprovements = Array.from(new Set(improvements)).slice(0, 3);
    uniqueImprovements.forEach(imp => {
      recommendations.push(`Work on: ${imp}`);
    });
    
    return recommendations.slice(0, 5);
  }

  /**
   * Get interview history for a user
   */
  async getUserInterviewHistory(userId: number): Promise<InterviewSession[]> {
    return await storage.getUserInterviews(userId);
  }

  /**
   * Generate interview preparation plan
   */
  async generatePreparationPlan(
    userId: number,
    targetCompany?: string,
    targetRole?: string
  ): Promise<{
    plan: {
      week: number;
      focus: string;
      topics: string[];
      problems: number[];
      mockInterviews: number;
    }[];
    estimatedReadiness: number;
    currentLevel: string;
    targetLevel: string;
  }> {
    const userStats = await progressAnalytics.getUserStats(userId);
    const currentLevel = userStats.skillLevel;
    const targetLevel = this.determineTargetLevel(targetRole);
    
    // Create 4-week preparation plan
    const plan = [
      {
        week: 1,
        focus: 'Foundation and Easy Problems',
        topics: ['arrays', 'strings', 'hash-tables'],
        problems: await this.getRecommendedProblemIds(userId, 'easy', 20),
        mockInterviews: 1
      },
      {
        week: 2,
        focus: 'Data Structures and Medium Problems',
        topics: ['trees', 'graphs', 'linked-lists'],
        problems: await this.getRecommendedProblemIds(userId, 'medium', 15),
        mockInterviews: 2
      },
      {
        week: 3,
        focus: 'Algorithms and Hard Problems',
        topics: ['dynamic-programming', 'backtracking', 'greedy'],
        problems: await this.getRecommendedProblemIds(userId, 'hard', 10),
        mockInterviews: 2
      },
      {
        week: 4,
        focus: 'System Design and Behavioral',
        topics: ['system-design', 'behavioral', 'company-specific'],
        problems: await this.getRecommendedProblemIds(userId, 'mixed', 10),
        mockInterviews: 3
      }
    ];
    
    // Estimate readiness based on current progress
    const estimatedReadiness = this.estimateReadiness(userStats, targetLevel);
    
    return {
      plan,
      estimatedReadiness,
      currentLevel,
      targetLevel
    };
  }

  /**
   * Determine target level based on role
   */
  private determineTargetLevel(role?: string): string {
    if (!role) return 'intermediate';
    
    const seniorRoles = ['senior', 'staff', 'principal', 'architect'];
    const juniorRoles = ['junior', 'intern', 'entry'];
    
    const roleLower = role.toLowerCase();
    
    if (seniorRoles.some(r => roleLower.includes(r))) {
      return 'expert';
    } else if (juniorRoles.some(r => roleLower.includes(r))) {
      return 'beginner';
    } else {
      return 'intermediate';
    }
  }

  /**
   * Estimate readiness percentage
   */
  private estimateReadiness(userStats: any, targetLevel: string): number {
    const levelScores = {
      'beginner': 25,
      'intermediate': 50,
      'advanced': 75,
      'expert': 100
    };
    
    const currentScore = levelScores[userStats.skillLevel as keyof typeof levelScores] || 0;
    const targetScore = levelScores[targetLevel as keyof typeof levelScores] || 50;
    
    // Adjust based on solved problems and acceptance rate
    const problemBonus = Math.min(userStats.solvedProblems / 200 * 20, 20);
    const acceptanceBonus = (userStats.acceptanceRate / 100) * 10;
    
    const readiness = Math.min(
      100,
      (currentScore / targetScore) * 70 + problemBonus + acceptanceBonus
    );
    
    return Math.round(readiness);
  }

  /**
   * Get recommended problem IDs
   */
  private async getRecommendedProblemIds(
    userId: number,
    difficulty: string,
    count: number
  ): Promise<number[]> {
    const problems = await storage.getAllProblems();
    const userProgress = await storage.getUserProgress(userId);
    const solvedIds = new Set(userProgress.filter(p => p.completed).map(p => p.problemId));
    
    let filtered = problems.filter(p => !solvedIds.has(p.id));
    
    if (difficulty !== 'mixed') {
      filtered = filtered.filter(p => p.difficulty === difficulty);
    }
    
    return this.shuffleArray(filtered)
      .slice(0, count)
      .map(p => p.id);
  }

  /**
   * Utility: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const aiInterviewSystem = new AIInterviewSystem();