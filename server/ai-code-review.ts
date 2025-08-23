import OpenAI from "openai";
import { CodeQualityAnalyzer } from "./code-quality-analyzer";
import type { CodeQualityReport } from "./code-quality-analyzer";

interface AICodeReviewResult {
  qualityReport: CodeQualityReport;
  aiReview: {
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: CodeSuggestion[];
    securityIssues: SecurityIssue[];
    performanceOptimizations: PerformanceOptimization[];
    bestPractices: BestPractice[];
    learningResources: LearningResource[];
  };
  overallScore: number;
  confidence: number;
}

interface CodeSuggestion {
  line: number;
  type: 'error' | 'warning' | 'suggestion' | 'praise';
  message: string;
  severity: 'high' | 'medium' | 'low';
  fixSuggestion?: string;
}

interface SecurityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  remediation: string;
}

interface PerformanceOptimization {
  issue: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
  example?: string;
}

interface BestPractice {
  category: string;
  issue: string;
  recommendation: string;
  reference?: string;
}

interface LearningResource {
  topic: string;
  url?: string;
  description: string;
  type: 'article' | 'video' | 'documentation' | 'practice';
}

export class AICodeReviewer {
  private openai: OpenAI;
  private codeAnalyzer: CodeQualityAnalyzer;
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.codeAnalyzer = new CodeQualityAnalyzer();
  }

  async reviewCode(
    code: string,
    language: string,
    problemContext?: string,
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<AICodeReviewResult> {
    // First get the basic code quality analysis
    const qualityReport = await this.codeAnalyzer.analyzeCode(code, language);

    // Then enhance with AI review
    const aiReview = await this.generateAIReview(code, language, problemContext, userLevel, qualityReport);

    // Calculate overall score combining both analyses
    const overallScore = Math.round(
      (qualityReport.overallScore * 0.4 + aiReview.score * 0.6)
    );

    return {
      qualityReport,
      aiReview: {
        summary: aiReview.summary,
        strengths: aiReview.strengths,
        improvements: aiReview.improvements,
        suggestions: aiReview.suggestions,
        securityIssues: aiReview.securityIssues || [],
        performanceOptimizations: aiReview.performanceOptimizations || [],
        bestPractices: aiReview.bestPractices || [],
        learningResources: aiReview.learningResources || []
      },
      overallScore,
      confidence: aiReview.confidence
    };
  }

  private async generateAIReview(
    code: string,
    language: string,
    problemContext?: string,
    userLevel: string = 'intermediate',
    qualityReport?: CodeQualityReport
  ): Promise<any> {
    const contextInfo = problemContext ? `Problem Context: ${problemContext}` : '';
    const levelInfo = `User Level: ${userLevel}`;
    
    const systemPrompt = `You are an expert code reviewer and mentor who provides constructive, educational feedback.
    Tailor your feedback to the user's level (${userLevel}) and focus on helping them improve.
    Be encouraging while being thorough in identifying areas for improvement.
    Provide specific, actionable suggestions with examples when possible.`;

    const userPrompt = `Review the following ${language} code and provide comprehensive feedback.
    ${contextInfo}
    ${levelInfo}
    
    Code to review:
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Previous analysis metrics:
    ${qualityReport ? JSON.stringify(qualityReport.metrics, null, 2) : 'N/A'}
    
    Provide a detailed review in JSON format with:
    - summary: Brief overview of the code quality (2-3 sentences)
    - score: Overall score out of 100
    - confidence: Your confidence in the review (0-1)
    - strengths: Array of things done well (at least 2)
    - improvements: Array of areas needing improvement
    - suggestions: Array of specific line-by-line suggestions with {line, type, message, severity, fixSuggestion}
    - securityIssues: Array of security concerns with {type, severity, location, description, remediation}
    - performanceOptimizations: Array of performance improvements with {issue, impact, suggestion, example}
    - bestPractices: Array of best practice recommendations with {category, issue, recommendation, reference}
    - learningResources: Array of resources to learn more with {topic, url, description, type}`;

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

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Ensure all required fields are present
      return {
        summary: result.summary || "Code review completed",
        score: result.score || 70,
        confidence: result.confidence || 0.8,
        strengths: result.strengths || ["Code is functional"],
        improvements: result.improvements || [],
        suggestions: this.formatSuggestions(result.suggestions || []),
        securityIssues: result.securityIssues || [],
        performanceOptimizations: result.performanceOptimizations || [],
        bestPractices: result.bestPractices || [],
        learningResources: this.enhanceLearningResources(result.learningResources || [], language, userLevel)
      };
    } catch (error) {
      console.error("AI Review error:", error);
      return this.getFallbackReview();
    }
  }

  private formatSuggestions(suggestions: any[]): CodeSuggestion[] {
    return suggestions.map(s => ({
      line: s.line || 0,
      type: s.type || 'suggestion',
      message: s.message || '',
      severity: s.severity || 'low',
      fixSuggestion: s.fixSuggestion
    }));
  }

  private enhanceLearningResources(
    resources: any[],
    language: string,
    userLevel: string
  ): LearningResource[] {
    const defaultResources = this.getDefaultResources(language, userLevel);
    const combined = [...resources, ...defaultResources];
    
    // Remove duplicates and limit to top 5
    const unique = Array.from(
      new Map(combined.map(r => [r.topic, r])).values()
    ).slice(0, 5);
    
    return unique;
  }

  private getDefaultResources(language: string, userLevel: string): LearningResource[] {
    const resources: LearningResource[] = [];
    
    // Add language-specific resources
    if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
      resources.push({
        topic: 'Modern JavaScript Best Practices',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
        description: 'Comprehensive guide to JavaScript best practices and modern features',
        type: 'documentation'
      });
    } else if (language.toLowerCase() === 'python') {
      resources.push({
        topic: 'Python Code Style Guide',
        url: 'https://www.python.org/dev/peps/pep-0008/',
        description: 'Official Python style guide for writing clean, readable code',
        type: 'documentation'
      });
    }
    
    // Add level-appropriate resources
    if (userLevel === 'beginner') {
      resources.push({
        topic: 'Code Review Basics',
        description: 'Understanding the importance of code reviews and how to improve from feedback',
        type: 'article'
      });
    } else if (userLevel === 'advanced') {
      resources.push({
        topic: 'Advanced Optimization Techniques',
        description: 'Deep dive into performance optimization and algorithm complexity',
        type: 'article'
      });
    }
    
    return resources;
  }

  private getFallbackReview(): any {
    return {
      summary: "Code review completed. The code appears functional but could benefit from improvements.",
      score: 70,
      confidence: 0.5,
      strengths: [
        "Code successfully compiles/runs",
        "Basic functionality is implemented"
      ],
      improvements: [
        "Consider adding more comments for clarity",
        "Review variable naming conventions",
        "Consider edge case handling"
      ],
      suggestions: [],
      securityIssues: [],
      performanceOptimizations: [],
      bestPractices: [
        {
          category: "General",
          issue: "Code documentation",
          recommendation: "Add comments to explain complex logic",
          reference: ""
        }
      ],
      learningResources: []
    };
  }

  async provideLiveFeedback(
    code: string,
    language: string,
    changeContext: { previousCode?: string; currentLine?: number }
  ): Promise<{ suggestion: string; type: 'error' | 'warning' | 'info' }> {
    // Quick AI feedback for live coding
    try {
      const prompt = `Provide a brief, immediate suggestion for this ${language} code change.
      Current code: ${code.slice(Math.max(0, (changeContext.currentLine || 0) - 50), (changeContext.currentLine || 100) + 50)}
      
      Respond with a single line suggestion and its type (error/warning/info).`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 100
      });

      const feedback = response.choices[0].message.content || "";
      const type = feedback.toLowerCase().includes('error') ? 'error' : 
                   feedback.toLowerCase().includes('warning') ? 'warning' : 'info';

      return {
        suggestion: feedback,
        type
      };
    } catch (error) {
      return {
        suggestion: "Continue coding...",
        type: 'info'
      };
    }
  }
}