import { storage } from "./storage";
import type { InterviewSession, InsertInterviewSession } from "@shared/schema";

interface Question {
  id: string;
  type: 'technical' | 'behavioral' | 'system_design';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  category: string;
  followups: string[];
  rubric: {
    technical_accuracy: { weight: number; description: string };
    problem_solving: { weight: number; description: string };
    communication: { weight: number; description: string };
    code_quality: { weight: number; description: string };
  };
}

interface InterviewResponse {
  sessionId: string;
  question: Question;
  nextAction: 'continue' | 'followup' | 'complete';
  feedback?: string;
  score?: number;
}

interface InterviewAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallScore: number;
  categoryScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    systemDesign: number;
  };
}

export class AIInterviewSimulator {
  private questionBank: Question[] = [
    {
      id: 'tech-1',
      type: 'technical',
      difficulty: 'easy',
      question: 'Explain the difference between let, const, and var in JavaScript.',
      category: 'JavaScript Fundamentals',
      followups: [
        'Can you give an example of when you would use each one?',
        'What is hoisting and how does it affect these declarations?'
      ],
      rubric: {
        technical_accuracy: { weight: 0.4, description: 'Correct understanding of scope and hoisting' },
        problem_solving: { weight: 0.2, description: 'Ability to provide practical examples' },
        communication: { weight: 0.3, description: 'Clear explanation of concepts' },
        code_quality: { weight: 0.1, description: 'Best practice recommendations' }
      }
    },
    {
      id: 'tech-2',
      type: 'technical',
      difficulty: 'medium',
      question: 'Implement a function to reverse a linked list. Walk through your approach.',
      category: 'Data Structures',
      followups: [
        'What is the time and space complexity?',
        'Can you implement this recursively as well?',
        'How would you test this function?'
      ],
      rubric: {
        technical_accuracy: { weight: 0.5, description: 'Correct implementation of algorithm' },
        problem_solving: { weight: 0.3, description: 'Logical approach and edge case handling' },
        communication: { weight: 0.1, description: 'Clear explanation of steps' },
        code_quality: { weight: 0.1, description: 'Clean, readable code' }
      }
    },
    {
      id: 'behav-1',
      type: 'behavioral',
      difficulty: 'medium',
      question: 'Tell me about a time when you had to debug a particularly challenging problem. How did you approach it?',
      category: 'Problem Solving',
      followups: [
        'What tools did you use for debugging?',
        'How did you communicate the issue to your team?',
        'What would you do differently next time?'
      ],
      rubric: {
        technical_accuracy: { weight: 0.2, description: 'Technical depth of debugging approach' },
        problem_solving: { weight: 0.4, description: 'Systematic problem-solving methodology' },
        communication: { weight: 0.3, description: 'Clear storytelling and structure' },
        code_quality: { weight: 0.1, description: 'Mention of best practices' }
      }
    },
    {
      id: 'sys-1',
      type: 'system_design',
      difficulty: 'hard',
      question: 'Design a URL shortening service like bit.ly. What are the key components and how would you scale it?',
      category: 'System Design',
      followups: [
        'How would you handle 100 million URLs per day?',
        'What database would you choose and why?',
        'How would you handle analytics and tracking?'
      ],
      rubric: {
        technical_accuracy: { weight: 0.3, description: 'Understanding of scalability concepts' },
        problem_solving: { weight: 0.4, description: 'Systematic approach to design problems' },
        communication: { weight: 0.2, description: 'Clear articulation of design decisions' },
        code_quality: { weight: 0.1, description: 'Consideration of maintainability' }
      }
    }
  ];

  async startInterview(userId: number, type: 'technical' | 'behavioral' | 'mixed'): Promise<InterviewSession> {
    // Create new interview session
    const sessionData: InsertInterviewSession = {
      userId,
      type,
      status: 'in_progress',
      score: null,
      feedback: {
        questions: [],
        currentQuestionIndex: 0,
        startTime: new Date().toISOString(),
        type
      },
      duration: null
    };

    const session = await storage.createInterviewSession(sessionData);
    return session;
  }

  async getNextQuestion(sessionId: number, userResponse?: string): Promise<InterviewResponse> {
    const session = await storage.getInterviewSession(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    const feedback = session.feedback as any;
    const currentIndex = feedback.currentQuestionIndex || 0;
    
    // Process previous response if provided
    if (userResponse && currentIndex > 0) {
      await this.analyzeResponse(sessionId, userResponse, currentIndex - 1);
    }

    // Determine question type based on session type and progress
    const sessionType = session.type as 'technical' | 'behavioral' | 'mixed';
    let questionType: 'technical' | 'behavioral' | 'system_design';
    
    if (sessionType === 'mixed') {
      // Alternate between question types for mixed interviews
      const types: ('technical' | 'behavioral' | 'system_design')[] = ['technical', 'behavioral', 'system_design'];
      questionType = types[currentIndex % types.length];
    } else if (sessionType === 'technical') {
      questionType = currentIndex < 3 ? 'technical' : 'system_design';
    } else {
      questionType = 'behavioral';
    }

    // Select appropriate question
    const availableQuestions = this.questionBank.filter(q => q.type === questionType);
    const question = availableQuestions[Math.min(currentIndex, availableQuestions.length - 1)];

    // Update session progress
    await this.updateSessionProgress(sessionId, currentIndex + 1, question.id);

    // Determine if this should be the last question (max 5 questions)
    const nextAction = currentIndex >= 4 ? 'complete' : 'continue';

    return {
      sessionId: sessionId.toString(),
      question,
      nextAction,
    };
  }

  private async analyzeResponse(sessionId: number, response: string, questionIndex: number): Promise<void> {
    // Simple AI-like response analysis (in production, this would integrate with AI services)
    const session = await storage.getInterviewSession(sessionId);
    const feedback = session?.feedback as any;
    
    if (feedback?.questions) {
      const question = this.questionBank.find(q => q.id === feedback.questions[questionIndex]?.questionId);
      if (question) {
        // Basic response analysis
        const wordCount = response.split(' ').length;
        const hasCode = /```|function|def |class |import |#include/.test(response);
        const hasExamples = /example|for instance|such as/.test(response.toLowerCase());
        
        // Calculate scores based on simple heuristics
        const scores = {
          technical: Math.min(100, (hasCode ? 50 : 0) + (wordCount > 50 ? 30 : 10) + (hasExamples ? 20 : 0)),
          communication: Math.min(100, wordCount > 30 ? 80 : wordCount * 2),
          problemSolving: Math.min(100, (hasExamples ? 40 : 0) + (response.includes('because') ? 30 : 0) + (wordCount > 100 ? 30 : 10)),
          completeness: Math.min(100, wordCount > 80 ? 90 : wordCount)
        };

        // Update session with analysis
        feedback.questions[questionIndex] = {
          questionId: question.id,
          userResponse: response,
          scores,
          timestamp: new Date().toISOString()
        };

        await storage.updateInterviewSession(sessionId, { feedback });
      }
    }
  }

  private async updateSessionProgress(sessionId: number, questionIndex: number, questionId: string): Promise<void> {
    const session = await storage.getInterviewSession(sessionId);
    if (session) {
      const feedback = session.feedback as any;
      feedback.currentQuestionIndex = questionIndex;
      
      if (!feedback.questions) {
        feedback.questions = [];
      }
      
      // Add placeholder for current question
      if (!feedback.questions[questionIndex - 1]) {
        feedback.questions[questionIndex - 1] = {
          questionId,
          userResponse: null,
          scores: null,
          timestamp: new Date().toISOString()
        };
      }

      await storage.updateInterviewSession(sessionId, { feedback });
    }
  }

  async completeInterview(sessionId: number, finalResponse?: string): Promise<InterviewAnalysis> {
    const session = await storage.getInterviewSession(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    // Process final response
    if (finalResponse) {
      const feedback = session.feedback as any;
      const finalIndex = (feedback.questions || []).length - 1;
      if (finalIndex >= 0) {
        await this.analyzeResponse(sessionId, finalResponse, finalIndex);
      }
    }

    // Calculate overall performance
    const analysis = await this.generateInterviewAnalysis(sessionId);
    
    // Update session as completed
    await storage.updateInterviewSession(sessionId, {
      status: 'completed',
      score: analysis.overallScore,
      duration: this.calculateDuration(session),
      feedback: { 
        ...(session.feedback as any), 
        analysis,
        completedAt: new Date().toISOString()
      }
    });

    return analysis;
  }

  private async generateInterviewAnalysis(sessionId: number): Promise<InterviewAnalysis> {
    const session = await storage.getInterviewSession(sessionId);
    const feedback = session?.feedback as any;
    
    if (!feedback?.questions) {
      return this.getDefaultAnalysis();
    }

    // Calculate category averages
    const questions = feedback.questions.filter((q: any) => q.scores);
    const categoryScores = {
      technical: this.calculateAverage(questions.map((q: any) => q.scores?.technical || 0)),
      communication: this.calculateAverage(questions.map((q: any) => q.scores?.communication || 0)),
      problemSolving: this.calculateAverage(questions.map((q: any) => q.scores?.problemSolving || 0)),
      systemDesign: this.calculateAverage(questions.map((q: any) => q.scores?.completeness || 0))
    };

    const overallScore = Math.round(
      (categoryScores.technical + categoryScores.communication + 
       categoryScores.problemSolving + categoryScores.systemDesign) / 4
    );

    // Generate personalized feedback
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    if (categoryScores.technical >= 70) {
      strengths.push("Strong technical knowledge and implementation skills");
    } else {
      weaknesses.push("Technical implementation could be improved");
      recommendations.push("Practice more coding problems and review fundamental concepts");
    }

    if (categoryScores.communication >= 70) {
      strengths.push("Clear communication and explanation of concepts");
    } else {
      weaknesses.push("Communication and explanation clarity needs work");
      recommendations.push("Practice explaining technical concepts in simple terms");
    }

    if (categoryScores.problemSolving >= 70) {
      strengths.push("Good problem-solving approach and methodology");
    } else {
      weaknesses.push("Problem-solving approach could be more systematic");
      recommendations.push("Practice breaking down problems into smaller components");
    }

    return {
      strengths,
      weaknesses,
      recommendations,
      overallScore,
      categoryScores
    };
  }

  private calculateAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private calculateDuration(session: InterviewSession): number {
    const feedback = session.feedback as any;
    if (feedback?.startTime) {
      const startTime = new Date(feedback.startTime);
      const endTime = new Date();
      return Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes
    }
    return 30; // default duration
  }

  private getDefaultAnalysis(): InterviewAnalysis {
    return {
      strengths: ["Participated in interview simulation"],
      weaknesses: ["Limited response data available"],
      recommendations: ["Complete full interview sessions for better feedback"],
      overallScore: 50,
      categoryScores: {
        technical: 50,
        communication: 50,
        problemSolving: 50,
        systemDesign: 50
      }
    };
  }

  async getUserInterviewHistory(userId: number): Promise<InterviewSession[]> {
    return await storage.getUserInterviews(userId);
  }

  async getInterviewInsights(userId: number): Promise<{
    totalInterviews: number;
    averageScore: number;
    strengthAreas: string[];
    improvementAreas: string[];
    progressTrend: { date: string; score: number }[];
  }> {
    const interviews = await this.getUserInterviewHistory(userId);
    const completedInterviews = interviews.filter(i => i.status === 'completed' && i.score);

    if (completedInterviews.length === 0) {
      return {
        totalInterviews: 0,
        averageScore: 0,
        strengthAreas: [],
        improvementAreas: [],
        progressTrend: []
      };
    }

    const averageScore = Math.round(
      completedInterviews.reduce((sum, interview) => sum + (interview.score || 0), 0) / 
      completedInterviews.length
    );

    const progressTrend = completedInterviews
      .slice(-10) // Last 10 interviews
      .map(interview => ({
        date: interview.completedAt?.toISOString().split('T')[0] || '',
        score: interview.score || 0
      }));

    // Analyze common strengths and weaknesses across interviews
    const allFeedback = completedInterviews.map(i => i.feedback as any).filter(f => f?.analysis);
    const strengthAreas = [...new Set(allFeedback.flatMap((f: any) => f.analysis.strengths))];
    const improvementAreas = [...new Set(allFeedback.flatMap((f: any) => f.analysis.weaknesses))];

    return {
      totalInterviews: completedInterviews.length,
      averageScore,
      strengthAreas: strengthAreas.slice(0, 5),
      improvementAreas: improvementAreas.slice(0, 5),
      progressTrend
    };
  }
}

export const aiInterviewer = new AIInterviewSimulator();