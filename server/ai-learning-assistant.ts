import OpenAI from "openai";
import { storage } from "./storage";
import { AIRecommendationEngine } from "./ai-recommendations";
import { IntelligentTutor } from "./intelligent-tutor";
import type { User, Problem, UserProgress } from "@shared/schema";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    topic?: string;
    confidence?: number;
    sources?: string[];
    suggestions?: string[];
  };
}

interface ChatSession {
  sessionId: string;
  userId: number;
  messages: ChatMessage[];
  context: {
    currentTopic?: string;
    learningGoals?: string[];
    recentProblems?: number[];
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
    sessionType?: 'general' | 'problem-help' | 'concept-explanation' | 'career-advice' | 'debugging';
  };
  startedAt: Date;
  lastActivityAt: Date;
}

interface AssistantResponse {
  message: string;
  suggestions?: string[];
  resources?: Resource[];
  relatedProblems?: number[];
  followUpQuestions?: string[];
  actionItems?: ActionItem[];
}

interface Resource {
  type: 'article' | 'video' | 'documentation' | 'problem' | 'tutorial';
  title: string;
  url?: string;
  description?: string;
}

interface ActionItem {
  type: 'practice' | 'study' | 'review' | 'implement';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export class AILearningAssistant {
  private static instance: AILearningAssistant;
  private openai: OpenAI | null;
  private sessions: Map<string, ChatSession> = new Map();
  private recommendationEngine: AIRecommendationEngine;
  private intelligentTutor: IntelligentTutor;
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  constructor() {
    // Initialize OpenAI only if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
      console.log('[AILearningAssistant] OpenAI API key not configured, using fallback responses');
    }
    this.recommendationEngine = new AIRecommendationEngine();
    this.intelligentTutor = new IntelligentTutor();
  }

  static getInstance(): AILearningAssistant {
    if (!AILearningAssistant.instance) {
      AILearningAssistant.instance = new AILearningAssistant();
    }
    return AILearningAssistant.instance;
  }

  async startSession(userId: number): Promise<ChatSession> {
    const sessionId = `session-${userId}-${Date.now()}`;
    const user = await storage.getUser(userId);
    const userProgress = await storage.getUserProgress(userId);
    
    const context = await this.buildUserContext(user, userProgress);
    
    const session: ChatSession = {
      sessionId,
      userId,
      messages: [],
      context,
      startedAt: new Date(),
      lastActivityAt: new Date()
    };
    
    this.sessions.set(sessionId, session);
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: this.generateWelcomeMessage(user, context),
      timestamp: new Date(),
      metadata: {
        intent: 'greeting',
        confidence: 1
      }
    };
    
    session.messages.push(welcomeMessage);
    
    return session;
  }

  async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<AssistantResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Add user message to session
    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    session.messages.push(userMsg);
    
    // Detect intent and context
    const intent = await this.detectIntent(userMessage, session.context);
    
    // Generate appropriate response based on intent
    const response = await this.generateResponse(userMessage, intent, session);
    
    // Add assistant response to session
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
      metadata: {
        intent: intent.type,
        topic: intent.topic,
        confidence: intent.confidence
      }
    };
    session.messages.push(assistantMsg);
    
    // Update session activity
    session.lastActivityAt = new Date();
    if (intent.topic) {
      session.context.currentTopic = intent.topic;
    }
    
    return response;
  }

  private async buildUserContext(user: User | undefined, progress: any[]): Promise<any> {
    const completedCount = progress.filter(p => p.completed).length;
    const totalAttempts = progress.length;
    
    let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (completedCount > 50) level = 'advanced';
    else if (completedCount > 20) level = 'intermediate';
    
    const recentProblems = progress
      .sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime())
      .slice(0, 5)
      .map(p => p.problemId);
    
    return {
      userLevel: level,
      recentProblems,
      learningGoals: [
        "Master data structures and algorithms",
        "Prepare for technical interviews",
        "Improve problem-solving skills"
      ]
    };
  }

  private generateWelcomeMessage(user: User | undefined, context: any): string {
    const name = user?.name || "there";
    const level = context.userLevel;
    
    const greetings: Record<string, string> = {
      beginner: `Hi ${name}! I'm your AI learning assistant. I'm here to help you master programming concepts, solve problems, and prepare for technical interviews. What would you like to work on today?`,
      intermediate: `Welcome back, ${name}! Ready to tackle some challenging problems? I can help you with algorithms, debugging, or explain complex concepts. What's on your mind?`,
      advanced: `Hello ${name}! Great to see you continuing your journey. Whether you need help with advanced algorithms, system design, or interview prep, I'm here to assist. What challenge are you facing today?`
    };
    
    return greetings[level] || greetings.beginner;
  }

  private async detectIntent(message: string, context: any): Promise<any> {
    const systemPrompt = `You are an intent detection system for a programming education platform.
    Analyze the user's message and determine their intent and needs.
    Consider the user's level: ${context.userLevel}`;

    const userPrompt = `Analyze this message and determine the user's intent:
    "${message}"
    
    Respond in JSON format with:
    - type: One of ['problem-help', 'concept-explanation', 'debugging', 'career-advice', 'general-question', 'code-review', 'practice-request']
    - topic: The main technical topic if identifiable (e.g., 'arrays', 'recursion', 'dynamic programming')
    - confidence: Your confidence level (0-1)
    - keywords: Array of key terms from the message
    - needsCode: Boolean indicating if user might need code examples`;

    try {
      if (!this.openai) {
        // Provide fallback intent detection
        const lowerMessage = message.toLowerCase();
        return {
          type: lowerMessage.includes('help') ? 'problem-help' :
                lowerMessage.includes('explain') ? 'concept-explanation' :
                lowerMessage.includes('debug') || lowerMessage.includes('error') ? 'debugging' :
                lowerMessage.includes('career') || lowerMessage.includes('job') ? 'career-advice' :
                lowerMessage.includes('review') ? 'code-review' :
                lowerMessage.includes('practice') ? 'practice-request' : 'general-question',
          topic: 'General Programming',
          confidence: 0.7,
          keywords: message.split(' ').filter(w => w.length > 3),
          needsCode: lowerMessage.includes('code') || lowerMessage.includes('example')
        };
      }
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 200
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      return {
        type: 'general-question',
        confidence: 0.5
      };
    }
  }

  private async generateResponse(
    userMessage: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    switch (intent.type) {
      case 'problem-help':
        return await this.provideProblemHelp(userMessage, intent, session);
      case 'concept-explanation':
        return await this.explainConcept(userMessage, intent, session);
      case 'debugging':
        return await this.helpDebug(userMessage, intent, session);
      case 'career-advice':
        return await this.provideCareerAdvice(userMessage, intent, session);
      case 'code-review':
        return await this.reviewCode(userMessage, intent, session);
      case 'practice-request':
        return await this.suggestPractice(userMessage, intent, session);
      default:
        return await this.handleGeneralQuestion(userMessage, intent, session);
    }
  }

  private async provideProblemHelp(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const systemPrompt = `You are a helpful programming tutor assisting a ${session.context.userLevel} level student.
    Help them understand and solve programming problems without giving away the complete solution.
    Guide them to discover the solution themselves through hints and questions.`;

    const conversationHistory = session.messages.slice(-5).map(m => ({
      role: m.role,
      content: m.content
    }));

    let assistantMessage: string;
    
    if (!this.openai) {
      // Provide helpful fallback response
      assistantMessage = "I can help you with this problem! Let's break it down:\n\n" +
        "1. First, understand what the problem is asking\n" +
        "2. Identify the input and expected output\n" +
        "3. Think about which algorithm or data structure might help\n" +
        "4. Start with a simple approach, then optimize\n\n" +
        "What specific part are you struggling with?";
    } else {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      assistantMessage = response.choices[0].message.content || "";  
    }

    // Get related problems for practice
    const problems = await storage.getAllProblems();
    const relatedProblems = problems
      .filter(p => intent.topic && p.topics.includes(intent.topic))
      .slice(0, 3)
      .map(p => p.id);

    return {
      message: assistantMessage,
      suggestions: [
        "Would you like me to break down the problem further?",
        "Should we work through a simpler example first?",
        "Do you want to see the algorithm step-by-step?"
      ],
      relatedProblems,
      followUpQuestions: [
        "What approach have you tried so far?",
        "What part is most confusing?",
        "Can you identify the pattern in the examples?"
      ]
    };
  }

  private async explainConcept(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const systemPrompt = `You are an expert computer science educator explaining concepts to a ${session.context.userLevel} student.
    Provide clear, comprehensive explanations with examples and analogies.
    Use progressive disclosure - start simple and build complexity.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Explain: ${message}` }
      ],
      temperature: 0.6,
      max_tokens: 1000
    });

    const explanation = response.choices[0].message.content || "";

    const resources: Resource[] = [
      {
        type: 'documentation',
        title: `${intent.topic || 'Programming'} Documentation`,
        description: 'Official documentation and guides'
      },
      {
        type: 'tutorial',
        title: `Interactive ${intent.topic || 'Coding'} Tutorial`,
        description: 'Practice with hands-on examples'
      }
    ];

    const actionItems: ActionItem[] = [
      {
        type: 'practice',
        description: `Solve 3 ${intent.topic || 'related'} problems`,
        priority: 'high'
      },
      {
        type: 'study',
        description: 'Review the concept explanation',
        priority: 'medium'
      }
    ];

    return {
      message: explanation,
      resources,
      actionItems,
      followUpQuestions: [
        "Would you like to see more examples?",
        "Should we practice with some problems?",
        "Any specific part you'd like me to clarify?"
      ]
    };
  }

  private async helpDebug(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const systemPrompt = `You are a debugging expert helping a ${session.context.userLevel} programmer.
    Guide them through systematic debugging without fixing the code for them.
    Teach debugging strategies and help them understand the root cause.`;

    let debugMessage: string;
    
    if (!this.openai) {
      debugMessage = "Let's debug this step by step:\n\n" +
        "1. Check the exact error message - what line is it pointing to?\n" +
        "2. Verify your variable values before the error\n" +
        "3. Test with simpler input to isolate the issue\n" +
        "4. Add console.log statements to trace execution\n\n" +
        "What specific error are you encountering?";
    } else {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Help debug: ${message}` }
        ],
        temperature: 0.5,
        max_tokens: 800
      });
      debugMessage = response.choices[0].message.content || "";
    }

    return {
      message: debugMessage,
      suggestions: [
        "Add print statements to track variable values",
        "Check edge cases and boundary conditions",
        "Verify your assumptions about the input",
        "Use a debugger to step through the code"
      ],
      followUpQuestions: [
        "What error message are you seeing?",
        "What input causes the issue?",
        "What output did you expect?"
      ]
    };
  }

  private async provideCareerAdvice(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const recommendations = await this.recommendationEngine.generatePersonalizedRecommendations(session.userId);
    
    const systemPrompt = `You are a career advisor for aspiring software engineers.
    Provide practical, actionable advice based on the user's current skill level: ${session.context.userLevel}.
    Be encouraging but realistic about the journey ahead.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const actionItems: ActionItem[] = recommendations.careerGuidance.recommendedProjects.map(project => ({
      type: 'implement' as const,
      description: project,
      priority: 'high' as const
    }));

    return {
      message: response.choices[0].message.content || "",
      actionItems,
      resources: [
        {
          type: 'article',
          title: 'Interview Preparation Guide',
          description: 'Comprehensive guide for technical interviews'
        }
      ],
      followUpQuestions: [
        "What specific role are you targeting?",
        "What's your timeline for job searching?",
        "Which companies interest you most?"
      ]
    };
  }

  private async reviewCode(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const systemPrompt = `You are a code reviewer providing constructive feedback to a ${session.context.userLevel} programmer.
    Focus on code quality, best practices, and learning opportunities.
    Be encouraging while pointing out improvements.`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Review this code: ${message}` }
      ],
      temperature: 0.6,
      max_tokens: 800
    });

    return {
      message: response.choices[0].message.content || "",
      suggestions: [
        "Consider edge cases",
        "Optimize for readability",
        "Add meaningful comments",
        "Follow language conventions"
      ],
      actionItems: [
        {
          type: 'review',
          description: 'Refactor based on feedback',
          priority: 'high'
        }
      ]
    };
  }

  private async suggestPractice(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const recommendations = await this.recommendationEngine.generatePersonalizedRecommendations(session.userId);
    
    const problemIds = recommendations.problems.map(p => p.problemId);
    const problems = await storage.getAllProblems();
    const suggestedProblems = problems.filter(p => problemIds.includes(p.id));

    const practiceMessage = `Based on your current level and progress, here are some problems I recommend:

${suggestedProblems.slice(0, 3).map((p, i) => 
  `${i + 1}. **${p.title}** (${p.difficulty})
   Topics: ${p.topics.join(', ')}
   Why: ${recommendations.problems[i]?.reason || 'Good for practice'}`
).join('\n\n')}

These problems are selected to help you progressively build your skills. Start with the first one and work your way through!`;

    return {
      message: practiceMessage,
      relatedProblems: problemIds.slice(0, 5),
      suggestions: [
        "Would you like hints for any of these problems?",
        "Should I explain the concepts you'll need?",
        "Do you want a different difficulty level?"
      ],
      actionItems: recommendations.problems.slice(0, 3).map(p => ({
        type: 'practice' as const,
        description: `Solve: ${p.title}`,
        priority: p.priority
      }))
    };
  }

  private async handleGeneralQuestion(
    message: string,
    intent: any,
    session: ChatSession
  ): Promise<AssistantResponse> {
    const systemPrompt = `You are a friendly and knowledgeable AI learning assistant for a programming education platform.
    The user is at ${session.context.userLevel} level.
    Provide helpful, accurate, and encouraging responses.
    If the question is outside programming/computer science, politely redirect to relevant topics.`;

    const conversationHistory = session.messages.slice(-5).map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return {
      message: response.choices[0].message.content || "I'm here to help! Could you please rephrase your question?",
      suggestions: [
        "Ask about specific programming concepts",
        "Get help with problem-solving",
        "Request practice recommendations",
        "Discuss career preparation"
      ]
    };
  }

  async getSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Could save session to database here for persistence
      this.sessions.delete(sessionId);
    }
  }

  async getActiveSessions(userId: number): Promise<ChatSession[]> {
    const userSessions: ChatSession[] = [];
    const sessions = Array.from(this.sessions.values());
    for (const session of sessions) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    return userSessions;
  }
}