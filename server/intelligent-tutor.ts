import OpenAI from "openai";
import { db } from "./db";
import { intelligentTutoringSessions, intelligentTutoringMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TopicBreakdown {
  mainTopic: string;
  overview: string;
  subTopics: {
    title: string;
    description: string;
    keyPoints: string[];
    order: number;
  }[];
  suggestedPath: string;
  estimatedTime: string;
}

interface TutoringMessage {
  role: 'user' | 'tutor';
  content: string;
  metadata?: {
    messageType?: 'breakdown' | 'explanation' | 'question' | 'clarification' | 'example' | 'summary';
    currentSubTopic?: string;
    subTopicIndex?: number;
    interactionPrompts?: string[];
  };
}

export class IntelligentTutor {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  async startTutoringSession(userId: number, topic: string): Promise<any> {
    // Create a new tutoring session
    const [session] = await db.insert(intelligentTutoringSessions)
      .values({
        userId,
        topic,
        status: 'active',
        startedAt: new Date(),
        topicBreakdown: null,
        currentSubtopic: 0
      })
      .returning();

    // Generate topic breakdown
    const breakdown = await this.generateTopicBreakdown(topic);
    
    // Update session with breakdown
    await db.update(intelligentTutoringSessions)
      .set({ 
        topicBreakdown: JSON.stringify(breakdown)
      })
      .where(eq(intelligentTutoringSessions.id, session.id));

    // Create initial tutor message
    const initialMessage = await this.createInitialMessage(topic, breakdown);
    
    // Save initial message
    await db.insert(intelligentTutoringMessages)
      .values({
        sessionId: session.id,
        role: 'tutor',
        content: initialMessage.content,
        metadata: JSON.stringify(initialMessage.metadata),
        timestamp: new Date()
      });

    return {
      session: { ...session, topicBreakdown: breakdown },
      message: initialMessage
    };
  }

  private async generateTopicBreakdown(topic: string): Promise<TopicBreakdown> {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `You are an expert educator who breaks down complex topics into digestible, structured learning paths. 
          Create a comprehensive breakdown that's suitable for interactive learning.
          Focus on logical progression and ensure each subtopic builds on previous knowledge.
          Make it engaging and appropriate for a conversational tutoring session.`
        },
        {
          role: "user",
          content: `Break down the topic "${topic}" into a structured learning path. 
          Provide a JSON response with:
          - mainTopic: refined topic name
          - overview: brief engaging overview (2-3 sentences)
          - subTopics: array of 3-7 subtopics with title, description, keyPoints (3-5 points each), and order
          - suggestedPath: brief learning approach recommendation
          - estimatedTime: rough estimate for covering all subtopics`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  private async createInitialMessage(topic: string, breakdown: TopicBreakdown): Promise<TutoringMessage> {
    const content = `Hello! I'm excited to help you learn about **${breakdown.mainTopic}**! 🎯

${breakdown.overview}

I've structured this topic into ${breakdown.subTopics.length} key areas that we'll explore together:

${breakdown.subTopics.map((st, i) => `${i + 1}. **${st.title}** - ${st.description}`).join('\n')}

${breakdown.suggestedPath}

**How would you like to proceed?**
- Type "start" to begin with the first subtopic
- Type a number (1-${breakdown.subTopics.length}) to jump to a specific area
- Or ask me any question about ${topic} to start our discussion!

This should take approximately ${breakdown.estimatedTime} to cover thoroughly, but we can go at your pace. Ready to begin? 🚀`;

    return {
      role: 'tutor',
      content,
      metadata: {
        messageType: 'breakdown',
        interactionPrompts: [
          'start',
          'Tell me more about the overview',
          `What's most important about ${topic}?`,
          'Can you give me a real-world example?'
        ]
      }
    };
  }

  async continueSession(
    sessionId: number,
    userMessage: string
  ): Promise<TutoringMessage> {
    // Get session and conversation history
    const [session] = await db.select()
      .from(intelligentTutoringSessions)
      .where(eq(intelligentTutoringSessions.id, sessionId));

    if (!session) {
      throw new Error("Session not found");
    }

    const messages = await db.select()
      .from(intelligentTutoringMessages)
      .where(eq(intelligentTutoringMessages.sessionId, sessionId))
      .orderBy(intelligentTutoringMessages.timestamp);

    // Save user message
    await db.insert(intelligentTutoringMessages)
      .values({
        sessionId,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

    const breakdown: TopicBreakdown = JSON.parse(session.topicBreakdown as string);
    
    // Generate contextual response
    const tutorResponse = await this.generateTutorResponse(
      userMessage,
      messages,
      breakdown,
      session.currentSubtopic || 0
    );

    // Save tutor response
    await db.insert(intelligentTutoringMessages)
      .values({
        sessionId,
        role: 'tutor',
        content: tutorResponse.content,
        metadata: JSON.stringify(tutorResponse.metadata),
        timestamp: new Date()
      });

    // Update current subtopic if needed
    if (tutorResponse.metadata?.subTopicIndex !== undefined && 
        tutorResponse.metadata.subTopicIndex !== session.currentSubtopic) {
      await db.update(intelligentTutoringSessions)
        .set({ currentSubtopic: tutorResponse.metadata.subTopicIndex })
        .where(eq(intelligentTutoringSessions.id, sessionId));
    }

    return tutorResponse;
  }

  private async generateTutorResponse(
    userMessage: string,
    conversationHistory: any[],
    breakdown: TopicBreakdown,
    currentSubtopicIndex: number
  ): Promise<TutoringMessage> {
    // Determine user intent
    const intent = this.determineIntent(userMessage, breakdown);
    
    // Build conversation context
    const recentHistory = conversationHistory.slice(-6).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemPrompt = this.buildSystemPrompt(intent, breakdown, currentSubtopicIndex);

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0].message.content || "";
    
    // Determine metadata based on response
    const metadata = this.generateResponseMetadata(intent, breakdown, currentSubtopicIndex);

    return {
      role: 'tutor',
      content,
      metadata
    };
  }

  private determineIntent(userMessage: string, breakdown: TopicBreakdown): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage === 'start' || lowerMessage.includes('begin')) {
      return 'start_learning';
    }
    
    // Check if user wants to jump to specific subtopic
    const numberMatch = userMessage.match(/^(\d+)$/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num >= 1 && num <= breakdown.subTopics.length) {
        return `jump_to_${num - 1}`;
      }
    }
    
    if (lowerMessage.includes('example')) return 'request_example';
    if (lowerMessage.includes('explain') || lowerMessage.includes('clarify')) return 'request_clarification';
    if (lowerMessage.includes('next') || lowerMessage.includes('continue')) return 'next_subtopic';
    if (lowerMessage.includes('summary') || lowerMessage.includes('recap')) return 'request_summary';
    if (lowerMessage.includes('?')) return 'question';
    
    return 'general_discussion';
  }

  private buildSystemPrompt(intent: string, breakdown: TopicBreakdown, currentIndex: number): string {
    const currentSubtopic = breakdown.subTopics[currentIndex];
    
    let basePrompt = `You are an expert, friendly tutor helping a student learn about "${breakdown.mainTopic}".
    You're currently focused on: "${currentSubtopic?.title || breakdown.mainTopic}".
    
    Key teaching principles:
    - Be conversational and encouraging
    - Use analogies and real-world examples
    - Break complex ideas into simple steps
    - Ask follow-up questions to ensure understanding
    - Provide interactive prompts to keep the student engaged
    - Use emojis sparingly to maintain a friendly tone
    `;

    const intentPrompts: Record<string, string> = {
      'start_learning': `Begin teaching the first subtopic "${breakdown.subTopics[0].title}". 
        Start with a brief introduction, then cover the key points one by one.
        Make it interactive by asking if they understand or want examples.`,
      
      'request_example': `Provide a clear, practical example related to the current topic.
        Make it relevant and easy to understand. Then ask if they'd like another example or to move on.`,
      
      'request_clarification': `Clarify the concept the student is asking about.
        Use simpler terms and perhaps an analogy. Check their understanding.`,
      
      'next_subtopic': `Move to the next subtopic in the sequence.
        Briefly recap what was just learned, then introduce the new topic.`,
      
      'request_summary': `Provide a concise summary of what has been covered so far.
        Highlight key takeaways and ask what they'd like to explore further.`,
      
      'question': `Answer the student's question thoroughly but concisely.
        Relate it back to the current learning topic if possible.`,
      
      'general_discussion': `Engage with the student's comment or question naturally.
        Keep the discussion educational and guide them back to structured learning when appropriate.`
    };

    if (intent.startsWith('jump_to_')) {
      const targetIndex = parseInt(intent.split('_')[2]);
      const targetSubtopic = breakdown.subTopics[targetIndex];
      return basePrompt + `\nThe student wants to jump to subtopic ${targetIndex + 1}: "${targetSubtopic.title}".
        Acknowledge their choice and begin teaching this subtopic.`;
    }

    return basePrompt + (intentPrompts[intent] || intentPrompts['general_discussion']);
  }

  private generateResponseMetadata(intent: string, breakdown: TopicBreakdown, currentIndex: number): any {
    const metadata: any = {
      messageType: 'explanation',
      currentSubTopic: breakdown.subTopics[currentIndex]?.title,
      subTopicIndex: currentIndex
    };

    // Add interaction prompts based on context
    if (intent === 'start_learning' || intent.startsWith('jump_to_')) {
      metadata.messageType = 'explanation';
      metadata.interactionPrompts = [
        'Can you give me an example?',
        'I understand, continue',
        'Can you explain that differently?',
        'What\'s next?'
      ];
    } else if (intent === 'request_example') {
      metadata.messageType = 'example';
      metadata.interactionPrompts = [
        'Another example please',
        'That makes sense, continue',
        'How does this relate to real world?'
      ];
    } else if (intent === 'request_summary') {
      metadata.messageType = 'summary';
      metadata.interactionPrompts = [
        'Let\'s continue learning',
        'Can we review a specific part?',
        'What should I focus on most?'
      ];
    }

    return metadata;
  }

  async getUserSessions(userId: number): Promise<any[]> {
    const sessions = await db.select()
      .from(intelligentTutoringSessions)
      .where(eq(intelligentTutoringSessions.userId, userId))
      .orderBy(desc(intelligentTutoringSessions.startedAt));
    
    return sessions;
  }

  async getSessionMessages(sessionId: number): Promise<any[]> {
    const messages = await db.select()
      .from(intelligentTutoringMessages)
      .where(eq(intelligentTutoringMessages.sessionId, sessionId))
      .orderBy(intelligentTutoringMessages.timestamp);
    
    return messages;
  }

  async completeSession(sessionId: number, feedback?: string): Promise<void> {
    await db.update(intelligentTutoringSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        feedback
      })
      .where(eq(intelligentTutoringSessions.id, sessionId));
  }
}

export const intelligentTutor = new IntelligentTutor();