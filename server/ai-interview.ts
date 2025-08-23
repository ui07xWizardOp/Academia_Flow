import { storage } from "./storage";
import type { InterviewSession, InsertInterviewSession } from "@shared/schema";
import OpenAI from "openai";

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
  message: string;
  messageType: 'greeting' | 'question' | 'followup' | 'transition' | 'closing';
  nextAction: 'continue' | 'followup' | 'complete';
  feedback?: string;
  score?: number;
  metadata?: {
    questionData?: Question;
    conversationStage?: string;
    personalizedContext?: string;
  };
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

interface UserProfile {
  problemsSolved: number;
  topicsCovered: string[];
  companyQuestionsSolved: { [company: string]: number };
  recentSubmissions: any[];
  strongAreas: string[];
  weakAreas: string[];
  codingStyle: string;
  progressTrend: string;
}

export class AIInterviewSimulator {
  private openai: OpenAI | null;
  private conversationMemory: Map<number, any[]> = new Map();

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
      console.log('[AIInterviewSimulator] OpenAI API key not configured, using fallback mode');
    }
  }
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
    // Gather user profile for personalization
    const userProfile = await this.gatherUserProfile(userId);
    
    // Create new interview session with enhanced feedback structure
    const sessionData: InsertInterviewSession = {
      userId,
      type,
      status: 'in_progress',
      score: null,
      feedback: {
        questions: [],
        currentQuestionIndex: 0,
        startTime: new Date().toISOString(),
        type,
        userProfile,
        conversationStage: 'greeting',
        conversation: []
      },
      duration: null
    };

    const session = await storage.createInterviewSession(sessionData);
    
    // Initialize conversation memory
    this.conversationMemory.set(session.id, []);
    
    return session;
  }

  async getNextQuestion(sessionId: number, userResponse?: string): Promise<InterviewResponse> {
    const session = await storage.getInterviewSession(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    const feedback = session.feedback as any;
    const currentIndex = feedback.currentQuestionIndex || 0;
    const conversationStage = feedback.conversationStage || 'greeting';
    const userProfile = feedback.userProfile;
    
    // Add user response to conversation memory
    if (userResponse) {
      await this.addToConversation(sessionId, 'user', userResponse);
      if (currentIndex > 0 || conversationStage !== 'greeting') {
        await this.analyzeResponse(sessionId, userResponse, currentIndex - 1);
      }
    }

    // Handle conversation flow based on stage
    let response: InterviewResponse;
    
    switch (conversationStage) {
      case 'greeting':
        response = await this.generateGreeting(sessionId, userProfile);
        await this.updateConversationStage(sessionId, 'personal_intro');
        break;
        
      case 'personal_intro':
        response = await this.generatePersonalIntro(sessionId, userProfile, userResponse);
        await this.updateConversationStage(sessionId, 'technical_questions');
        break;
        
      case 'technical_questions':
        response = await this.generatePersonalizedQuestion(sessionId, userProfile, currentIndex);
        if (currentIndex >= 4) {
          await this.updateConversationStage(sessionId, 'closing');
        }
        break;
        
      case 'closing':
        response = await this.generateClosing(sessionId, userProfile);
        break;
        
      default:
        response = await this.generatePersonalizedQuestion(sessionId, userProfile, currentIndex);
    }

    // Add AI response to conversation memory
    await this.addToConversation(sessionId, 'ai', response.message);
    
    return response;
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
    if (questions.length === 0) {
      return this.getDefaultAnalysis();
    }

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

    try {
      // Use OpenAI to generate comprehensive analysis
      const analysisPrompt = `
Generate a comprehensive interview analysis based on the following data:

Overall Score: ${overallScore}/100
Category Scores:
- Technical: ${categoryScores.technical}/100
- Communication: ${categoryScores.communication}/100
- Problem Solving: ${categoryScores.problemSolving}/100
- System Design: ${categoryScores.systemDesign}/100

Individual Question Analysis:
${questions.map((q: any, i: number) => `
Question ${i + 1}:
- Response: ${q.userResponse?.substring(0, 200)}...
- Scores: Technical ${q.scores?.technical}, Communication ${q.scores?.communication}, Problem Solving ${q.scores?.problemSolving}, Completeness ${q.scores?.completeness}
- Feedback: ${q.feedback}`).join('')}

Provide a detailed analysis with specific strengths, weaknesses, and actionable recommendations. Respond in JSON format:
{
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"]
}`;

      if (!this.openai) {
        return this.getDefaultAnalysis();
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer and career coach. Provide specific, actionable feedback to help candidates improve their interview performance."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        strengths: analysis.strengths || ['Completed the interview'],
        weaknesses: analysis.weaknesses || ['Areas for improvement identified'],
        recommendations: analysis.recommendations || ['Continue practicing interview skills'],
        overallScore,
        categoryScores
      };
      
    } catch (error) {
      console.error('Error generating analysis with OpenAI:', error);
      // Fallback to basic analysis
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
  }

  private async generateQuestion(type: 'technical' | 'behavioral' | 'system_design', questionIndex: number, feedback: any): Promise<Question> {
    try {
      // Build context string safely
      let contextString = 'No previous questions';
      if (feedback?.questions && Array.isArray(feedback.questions)) {
        contextString = feedback.questions.map((q: any, i: number) => {
          const questionText = 'Previous question';
          const scoreText = q.scores ? 'Average score available' : 'No score yet';
          return `Q${i + 1}: ${questionText} - ${scoreText}`;
        }).join('\n');
      }

      // Use OpenAI to generate dynamic questions based on context
      const questionPrompt = `Generate a ${type} interview question for a software engineering interview.

Question Context:
- Question Type: ${type}
- Question Number: ${questionIndex + 1}
- Difficulty Level: ${questionIndex < 2 ? 'easy' : questionIndex < 4 ? 'medium' : 'hard'}

Previous questions context:
${contextString}

Generate a unique, relevant question that builds upon the conversation. Include follow-up questions and evaluation criteria.

Respond in JSON format:
{
  "question": "The main interview question",
  "category": "Specific category (e.g., 'Data Structures', 'System Design', 'Leadership')",
  "followups": ["follow-up question 1", "follow-up question 2"],
  "rubric": {
    "technical_accuracy": {"weight": 0.4, "description": "Technical correctness criteria"},
    "problem_solving": {"weight": 0.3, "description": "Problem-solving approach criteria"},
    "communication": {"weight": 0.2, "description": "Communication clarity criteria"},
    "code_quality": {"weight": 0.1, "description": "Code quality criteria"}
  }
}`;

      if (!this.openai) {
        // Return a simple fallback followup
        return {
          sessionId: session?.id?.toString() || '',
          message: "That's an interesting approach! Can you tell me more about your thought process?",
          messageType: 'followup' as const,
          nextAction: 'continue' as const
        };
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Generate challenging, relevant questions that assess different aspects of software engineering skills."
          },
          {
            role: "user",
            content: questionPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const generatedQuestion = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        id: `${type}-${questionIndex}-${Date.now()}`,
        type,
        difficulty: questionIndex < 2 ? 'easy' : questionIndex < 4 ? 'medium' : 'hard',
        question: generatedQuestion.question || this.getFallbackQuestion(type, questionIndex),
        category: generatedQuestion.category || type.charAt(0).toUpperCase() + type.slice(1),
        followups: generatedQuestion.followups || ["Can you explain your reasoning?", "How would you test this?"],
        rubric: generatedQuestion.rubric || {
          technical_accuracy: { weight: 0.4, description: 'Technical correctness and depth' },
          problem_solving: { weight: 0.3, description: 'Problem-solving approach' },
          communication: { weight: 0.2, description: 'Clear explanation' },
          code_quality: { weight: 0.1, description: 'Code quality and best practices' }
        }
      };
      
    } catch (error) {
      console.error('Error generating question with OpenAI:', error);
      // Fallback to question bank
      const availableQuestions = this.questionBank.filter(q => q.type === type);
      return availableQuestions[Math.min(questionIndex, availableQuestions.length - 1)] || this.getFallbackQuestion(type, questionIndex);
    }
  }

  private getFallbackQuestion(type: 'technical' | 'behavioral' | 'system_design', questionIndex: number): Question {
    const fallbackQuestions = {
      technical: {
        id: `tech-fallback-${questionIndex}`,
        type: 'technical' as const,
        difficulty: 'medium' as const,
        question: 'Explain a challenging technical problem you solved recently. Walk through your approach.',
        category: 'Problem Solving',
        followups: ['What made this problem challenging?', 'How did you debug issues?'],
        rubric: {
          technical_accuracy: { weight: 0.4, description: 'Technical depth and accuracy' },
          problem_solving: { weight: 0.3, description: 'Problem-solving methodology' },
          communication: { weight: 0.2, description: 'Clear explanation of solution' },
          code_quality: { weight: 0.1, description: 'Consideration of best practices' }
        }
      },
      behavioral: {
        id: `behav-fallback-${questionIndex}`,
        type: 'behavioral' as const,
        difficulty: 'medium' as const,
        question: 'Tell me about a time when you had to work with a difficult team member. How did you handle it?',
        category: 'Teamwork',
        followups: ['What was the outcome?', 'What would you do differently?'],
        rubric: {
          technical_accuracy: { weight: 0.1, description: 'Understanding of team dynamics' },
          problem_solving: { weight: 0.4, description: 'Conflict resolution approach' },
          communication: { weight: 0.4, description: 'Clear storytelling and structure' },
          code_quality: { weight: 0.1, description: 'Professional conduct mention' }
        }
      },
      system_design: {
        id: `sys-fallback-${questionIndex}`,
        type: 'system_design' as const,
        difficulty: 'hard' as const,
        question: 'Design a chat application that can handle 1 million concurrent users. What are the key components?',
        category: 'System Design',
        followups: ['How would you handle message persistence?', 'What about scaling the database?'],
        rubric: {
          technical_accuracy: { weight: 0.4, description: 'Understanding of scalability concepts' },
          problem_solving: { weight: 0.3, description: 'Systematic design approach' },
          communication: { weight: 0.2, description: 'Clear articulation of design' },
          code_quality: { weight: 0.1, description: 'Consideration of maintainability' }
        }
      }
    };

    return fallbackQuestions[type];
  }

  private calculateAverage(scores: number[]): number {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  private async gatherUserProfile(userId: number): Promise<UserProfile> {
    try {
      // Get user's problem-solving history
      const submissions = await storage.getUserSubmissions(userId);
      const progress = await storage.getUserProgress(userId);
      
      // Analyze topics covered
      const topicsSet = new Set(progress.map((p: any) => {
        // Extract topic from problem (simplified)
        const problemId = p.problemId;
        // In a real system, you'd map problem IDs to topics
        if (problemId <= 5) return 'Arrays & Strings';
        if (problemId <= 10) return 'Linked Lists';
        if (problemId <= 15) return 'Trees & Graphs';
        if (problemId <= 20) return 'Dynamic Programming';
        return 'Advanced Algorithms';
      }));
      const topicsCovered = Array.from(topicsSet);
      
      // Analyze company questions (simplified)
      const companyQuestions: { [company: string]: number } = {};
      progress.forEach((p: any) => {
        const problemId = p.problemId;
        // Simulate company mapping
        if (problemId % 5 === 0) companyQuestions['Google'] = (companyQuestions['Google'] || 0) + 1;
        if (problemId % 3 === 0) companyQuestions['Amazon'] = (companyQuestions['Amazon'] || 0) + 1;
        if (problemId % 7 === 0) companyQuestions['Microsoft'] = (companyQuestions['Microsoft'] || 0) + 1;
      });
      
      // Determine strong and weak areas based on completion status
      const completedProblems = progress.filter((p: any) => p.status === 'completed');
      const struggledProblems = progress.filter((p: any) => p.status === 'attempted');
      
      const strongAreas = topicsCovered.filter(topic => {
        // If more than 60% of problems in this topic are completed
        return Math.random() > 0.4; // Simplified
      });
      
      const weakAreas = topicsCovered.filter(topic => !strongAreas.includes(topic));
      
      return {
        problemsSolved: completedProblems.length,
        topicsCovered,
        companyQuestionsSolved: companyQuestions,
        recentSubmissions: submissions.slice(-5),
        strongAreas,
        weakAreas,
        codingStyle: submissions.length > 0 ? 'analytical' : 'beginner',
        progressTrend: completedProblems.length > submissions.length * 0.7 ? 'improving' : 'steady'
      };
    } catch (error) {
      console.error('Error gathering user profile:', error);
      return {
        problemsSolved: 0,
        topicsCovered: [],
        companyQuestionsSolved: {},
        recentSubmissions: [],
        strongAreas: [],
        weakAreas: [],
        codingStyle: 'beginner',
        progressTrend: 'starting'
      };
    }
  }

  private async addToConversation(sessionId: number, author: 'ai' | 'user', message: string): Promise<void> {
    const session = await storage.getInterviewSession(sessionId);
    if (session) {
      const feedback = session.feedback as any;
      if (!feedback.conversation) {
        feedback.conversation = [];
      }
      
      feedback.conversation.push({
        author,
        message,
        timestamp: new Date().toISOString()
      });
      
      await storage.updateInterviewSession(sessionId, { feedback });
    }
  }

  private async updateConversationStage(sessionId: number, stage: string): Promise<void> {
    const session = await storage.getInterviewSession(sessionId);
    if (session) {
      const feedback = session.feedback as any;
      feedback.conversationStage = stage;
      await storage.updateInterviewSession(sessionId, { feedback });
    }
  }

  private async generateGreeting(sessionId: number, userProfile: UserProfile): Promise<InterviewResponse> {
    try {
      const greetingPrompt = `You are conducting a friendly, realistic technical interview. Start with a warm, natural greeting. 

Candidate Profile:
- Problems solved: ${userProfile.problemsSolved}
- Strong areas: ${userProfile.strongAreas.join(', ') || 'Getting started'}
- Companies practiced: ${Object.keys(userProfile.companyQuestionsSolved).join(', ') || 'None yet'}

Generate a natural, welcoming greeting that:
1. Introduces yourself as the interviewer
2. Thanks them for their time
3. Briefly mentions the interview structure
4. Asks how they're feeling or if they're ready

Keep it conversational and friendly, like a real human interviewer. Don't mention their specific stats yet.`;

      if (!this.openai) {
        return {
          sessionId: sessionId.toString(),
          message: "Welcome to your interview! I'm excited to learn about your background and experience. Let's start with a simple introduction - can you tell me about yourself and what brings you to this interview today?",
          messageType: 'greeting' as const,
          nextAction: 'continue' as const
        };
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a friendly, experienced technical interviewer at a top tech company. You conduct interviews in a conversational, natural way that puts candidates at ease while maintaining professionalism."
          },
          {
            role: "user",
            content: greetingPrompt
          }
        ],
        temperature: 0.8
      });

      return {
        sessionId: sessionId.toString(),
        message: completion.choices[0].message.content || "Hello! Thanks for joining me today. I'm excited to learn more about your technical background. How are you feeling about today's interview?",
        messageType: 'greeting',
        nextAction: 'continue',
        metadata: {
          conversationStage: 'greeting',
          personalizedContext: 'Initial greeting based on user experience level'
        }
      };
    } catch (error) {
      return {
        sessionId: sessionId.toString(),
        message: "Hello! Thanks for joining me today. I'm excited to learn more about your technical background and discuss some interesting problems together. How are you feeling about today's interview?",
        messageType: 'greeting',
        nextAction: 'continue'
      };
    }
  }

  private async generatePersonalIntro(sessionId: number, userProfile: UserProfile, userResponse?: string): Promise<InterviewResponse> {
    try {
      const introPrompt = `Based on the candidate's response: "${userResponse}"

Candidate Profile:
- Problems solved: ${userProfile.problemsSolved}
- Strong areas: ${userProfile.strongAreas.join(', ') || 'Getting started'}
- Recent activity: ${userProfile.progressTrend}
- Company questions practiced: ${Object.keys(userProfile.companyQuestionsSolved).join(', ') || 'None yet'}

Generate a natural response that:
1. Acknowledges their previous response warmly
2. Mentions you've noticed their practice on the platform (be specific about their strengths)
3. Asks them to tell you a bit about their coding background or recent projects
4. Transitions naturally toward technical discussion

Be conversational and show genuine interest in their journey.`;

      if (!this.openai) {
        return {
          sessionId: sessionId.toString(),
          message: "That's a great answer! Can you elaborate on how you approached this problem and what alternatives you considered?",
          messageType: 'followup' as const,
          nextAction: 'continue' as const
        };
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a friendly technical interviewer who reviews candidates' coding practice and shows genuine interest in their learning journey."
          },
          {
            role: "user",
            content: introPrompt
          }
        ],
        temperature: 0.7
      });

      return {
        sessionId: sessionId.toString(),
        message: completion.choices[0].message.content || "That's great to hear! I can see you've been actively practicing on our platform. I'd love to hear more about your coding journey and any recent projects you've been working on. What areas of programming do you find most interesting?",
        messageType: 'transition',
        nextAction: 'continue',
        metadata: {
          conversationStage: 'personal_intro',
          personalizedContext: `User has solved ${userProfile.problemsSolved} problems, strong in ${userProfile.strongAreas.join(', ')}`
        }
      };
    } catch (error) {
      return {
        sessionId: sessionId.toString(),
        message: "That's wonderful! I can see you've been practicing coding problems. I'd love to hear more about your programming background and what you've been working on recently.",
        messageType: 'transition',
        nextAction: 'continue'
      };
    }
  }

  private async generatePersonalizedQuestion(sessionId: number, userProfile: UserProfile, questionIndex: number): Promise<InterviewResponse> {
    try {
      const session = await storage.getInterviewSession(sessionId);
      const sessionType = session?.type as 'technical' | 'behavioral' | 'mixed';
      
      // Get conversation history for context
      const feedback = session?.feedback as any;
      const conversation = feedback?.conversation || [];
      const recentMessages = conversation.slice(-6).map((c: any) => `${c.author}: ${c.message}`).join('\n');
      
      const questionPrompt = `You are conducting a personalized technical interview. Generate the next question based on:

Candidate Profile:
- Problems solved: ${userProfile.problemsSolved}
- Strong areas: ${userProfile.strongAreas.join(', ') || 'Getting started'}
- Weak areas: ${userProfile.weakAreas.join(', ') || 'Still exploring'}
- Company practice: ${Object.keys(userProfile.companyQuestionsSolved).join(', ') || 'None yet'}
- Progress trend: ${userProfile.progressTrend}

Interview type: ${sessionType}
Question number: ${questionIndex + 1}
Recent conversation:
${recentMessages}

Generate a natural question that:
1. References their specific background or interests when relevant
2. Starts with a conversational transition
3. Builds appropriately on the conversation
4. Matches their experience level
5. Feels like a natural progression

For technical questions, choose topics they've practiced or need to improve.
For behavioral questions, relate to their coding journey.

Format as a natural conversation, not a formal question.`;

      if (!this.openai) {
        const nextQuestion = await this.getNextQuestion(session?.feedback as any);
        return {
          sessionId: sessionId.toString(),
          message: `Great! Let's move on to the next question: ${nextQuestion.question}`,
          messageType: 'question' as const,
          nextAction: 'continue' as const,
          metadata: { questionData: nextQuestion }
        };
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer who personalizes questions based on candidates' backgrounds and creates natural conversation flow."
          },
          {
            role: "user",
            content: questionPrompt
          }
        ],
        temperature: 0.7
      });

      // Update progress
      await this.updateSessionProgress(sessionId, questionIndex + 1, `personalized-${questionIndex}`);
      
      return {
        sessionId: sessionId.toString(),
        message: completion.choices[0].message.content || "Let's dive into a technical problem. Can you walk me through your approach to solving a classic array problem?",
        messageType: 'question',
        nextAction: questionIndex >= 4 ? 'complete' : 'continue',
        metadata: {
          conversationStage: 'technical_questions',
          personalizedContext: `Question ${questionIndex + 1} tailored to user's ${userProfile.strongAreas.join(', ')} experience`
        }
      };
    } catch (error) {
      return {
        sessionId: sessionId.toString(),
        message: "Let's discuss a technical problem. Can you tell me about a challenging coding problem you've solved recently and walk me through your approach?",
        messageType: 'question',
        nextAction: questionIndex >= 4 ? 'complete' : 'continue'
      };
    }
  }

  private async generateClosing(sessionId: number, userProfile: UserProfile): Promise<InterviewResponse> {
    try {
      const closingPrompt = `Generate a natural, encouraging closing for the interview based on:

Candidate Profile:
- Problems solved: ${userProfile.problemsSolved}
- Strong areas: ${userProfile.strongAreas.join(', ')}
- Areas to improve: ${userProfile.weakAreas.join(', ')}

Create a warm closing that:
1. Thanks them for their time
2. Acknowledges their preparation and effort
3. Gives encouragement about their coding journey
4. Mentions they'll receive detailed feedback
5. Ends on a positive, motivating note

Be genuine and supportive.`;

      if (!this.openai) {
        return {
          sessionId: sessionId.toString(),
          message: "Thank you for participating in this interview! You demonstrated good problem-solving skills and clear communication. We'll provide detailed feedback shortly.",
          messageType: 'closing' as const,
          nextAction: 'complete' as const
        };
      }
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a supportive technical interviewer wrapping up an interview with genuine encouragement."
          },
          {
            role: "user",
            content: closingPrompt
          }
        ],
        temperature: 0.8
      });

      return {
        sessionId: sessionId.toString(),
        message: completion.choices[0].message.content || "Thank you so much for your time today! I can see you've been putting in great effort with your coding practice. You'll receive detailed feedback shortly that will help guide your continued learning. Keep up the excellent work!",
        messageType: 'closing',
        nextAction: 'complete',
        metadata: {
          conversationStage: 'closing',
          personalizedContext: 'Personalized encouragement based on user progress'
        }
      };
    } catch (error) {
      return {
        sessionId: sessionId.toString(),
        message: "Thank you for your time today! You've shown great thoughtfulness in your responses. You'll receive detailed feedback to help with your continued growth as a developer.",
        messageType: 'closing',
        nextAction: 'complete'
      };
    }
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
    const strengthAreas = Array.from(new Set(allFeedback.flatMap((f: any) => f.analysis.strengths)));
    const improvementAreas = Array.from(new Set(allFeedback.flatMap((f: any) => f.analysis.weaknesses)));

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