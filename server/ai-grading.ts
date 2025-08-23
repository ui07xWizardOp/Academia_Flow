import OpenAI from "openai";
import { CodeExecutor } from "./code-executor";
import { AICodeReviewer } from "./ai-code-review";
import type { Submission, Problem } from "@shared/schema";

interface GradingResult {
  submissionId: number;
  studentId: number;
  problemId: number;
  aiGrade: {
    score: number;
    maxScore: number;
    breakdown: {
      correctness: number;
      efficiency: number;
      codeQuality: number;
      style: number;
      testCases: number;
    };
  };
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    codeReview: {
      line: number;
      message: string;
      type: 'error' | 'warning' | 'suggestion' | 'praise';
      severity: 'high' | 'medium' | 'low';
    }[];
  };
  humanReviewRequired: boolean;
  confidence: number;
  processingTime: number;
  gradedAt: Date;
  rubricEvaluation?: RubricEvaluation;
}

interface RubricEvaluation {
  criteria: {
    name: string;
    weight: number;
    score: number;
    maxScore: number;
    feedback: string;
  }[];
  totalScore: number;
  totalMaxScore: number;
}

interface GradingCriteria {
  name: string;
  weight: number;
  description: string;
  autoGradeable: boolean;
}

interface GradingRubric {
  criteria: GradingCriteria[];
  passingScore: number;
  scalingMethod: 'linear' | 'curved' | 'percentile';
}

export class AIAutomatedGrader {
  private openai: OpenAI;
  private codeExecutor: CodeExecutor;
  private codeReviewer: AICodeReviewer;
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.codeExecutor = new CodeExecutor();
    this.codeReviewer = new AICodeReviewer();
  }

  async gradeSubmission(
    submission: Submission,
    problem: Problem,
    rubric?: GradingRubric
  ): Promise<GradingResult> {
    const startTime = Date.now();
    
    // Step 1: Execute code and run test cases
    const executionResults = await this.executeAndTestCode(submission, problem);
    
    // Step 2: Analyze code quality
    const codeReview = await this.codeReviewer.reviewCode(
      submission.code,
      submission.language,
      problem.description
    );
    
    // Step 3: AI-powered comprehensive grading
    const aiEvaluation = await this.performAIGrading(
      submission,
      problem,
      executionResults,
      codeReview,
      rubric
    );
    
    // Step 4: Compile final grading result
    const gradingResult = this.compileGradingResult(
      submission,
      executionResults,
      codeReview,
      aiEvaluation,
      rubric,
      startTime
    );
    
    return gradingResult;
  }

  private async executeAndTestCode(
    submission: Submission,
    problem: Problem
  ): Promise<any> {
    try {
      const result = await this.codeExecutor.runWithTestCases({
        code: submission.code,
        language: submission.language,
        testCases: problem.testCases || [],
        timeLimit: 5000,
        memoryLimit: 256
      });
      
      return {
        passed: result.passed,
        total: result.total,
        testResults: result.testResults,
        runtime: result.runtime,
        memory: result.memory,
        error: result.error
      };
    } catch (error) {
      return {
        passed: 0,
        total: Array.isArray(problem.testCases) ? problem.testCases.length : 0,
        error: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }

  private async performAIGrading(
    submission: Submission,
    problem: Problem,
    executionResults: any,
    codeReview: any,
    rubric?: GradingRubric
  ): Promise<any> {
    const systemPrompt = `You are an expert programming instructor and grader. 
    Evaluate student submissions fairly, constructively, and educationally.
    Focus on helping students learn from their mistakes while recognizing their achievements.
    Be specific in feedback and provide actionable suggestions for improvement.`;

    const rubricInfo = rubric ? `
    Grading Rubric:
    ${rubric.criteria.map(c => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')}
    Passing Score: ${rubric.passingScore}%` : '';

    const userPrompt = `Grade this student submission:
    
    Problem: ${problem.title}
    Description: ${problem.description}
    Difficulty: ${problem.difficulty}
    
    Student's Code:
    \`\`\`${submission.language}
    ${submission.code}
    \`\`\`
    
    Execution Results:
    - Test Cases Passed: ${executionResults.passed}/${executionResults.total}
    - Runtime: ${executionResults.runtime || 'N/A'}ms
    - Memory: ${executionResults.memory || 'N/A'}MB
    - Errors: ${executionResults.error || 'None'}
    
    Code Quality Analysis:
    - Overall Score: ${codeReview.overallScore}/100
    - Issues Found: ${codeReview.qualityReport.issues.length}
    
    ${rubricInfo}
    
    Provide a comprehensive grading evaluation in JSON format including:
    - score: Numerical score (0-100)
    - breakdown: Scores for correctness, efficiency, codeQuality, style, testCases (each 0-100)
    - summary: Overall assessment (2-3 sentences)
    - strengths: Array of specific things done well
    - improvements: Array of specific areas for improvement
    - suggestions: Array of actionable next steps
    - detailedFeedback: Paragraph explaining the grade
    - confidence: Your confidence in this grade (0-1)
    - requiresHumanReview: Boolean if edge case or unclear
    ${rubric ? '- rubricScores: Object with score for each rubric criterion' : ''}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent grading
        max_tokens: 2000
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("AI Grading error:", error);
      return this.getFallbackGrading(executionResults, codeReview);
    }
  }

  private compileGradingResult(
    submission: Submission,
    executionResults: any,
    codeReview: any,
    aiEvaluation: any,
    rubric: GradingRubric | undefined,
    startTime: number
  ): GradingResult {
    // Calculate weighted score
    const breakdown = {
      correctness: aiEvaluation.breakdown?.correctness || (executionResults.passed / executionResults.total) * 100,
      efficiency: aiEvaluation.breakdown?.efficiency || 70,
      codeQuality: aiEvaluation.breakdown?.codeQuality || codeReview.overallScore,
      style: aiEvaluation.breakdown?.style || 75,
      testCases: aiEvaluation.breakdown?.testCases || (executionResults.passed / executionResults.total) * 100
    };

    const score = aiEvaluation.score || this.calculateWeightedScore(breakdown);

    // Format code review feedback
    const codeReviewFeedback = codeReview.aiReview?.suggestions?.map((s: any) => ({
      line: s.line || 0,
      message: s.message,
      type: s.type,
      severity: s.severity
    })) || [];

    // Build rubric evaluation if rubric provided
    const rubricEvaluation = rubric ? this.evaluateRubric(rubric, aiEvaluation) : undefined;

    return {
      submissionId: submission.id,
      studentId: submission.userId,
      problemId: submission.problemId,
      aiGrade: {
        score: Math.round(score),
        maxScore: 100,
        breakdown
      },
      feedback: {
        summary: aiEvaluation.summary || this.generateSummary(score, executionResults),
        strengths: aiEvaluation.strengths || this.identifyStrengths(breakdown, codeReview),
        improvements: aiEvaluation.improvements || this.identifyImprovements(breakdown, codeReview),
        suggestions: aiEvaluation.suggestions || this.generateSuggestions(breakdown),
        codeReview: codeReviewFeedback
      },
      humanReviewRequired: aiEvaluation.requiresHumanReview || this.needsHumanReview(score, executionResults),
      confidence: aiEvaluation.confidence || 0.85,
      processingTime: (Date.now() - startTime) / 1000,
      gradedAt: new Date(),
      rubricEvaluation
    };
  }

  private calculateWeightedScore(breakdown: any): number {
    const weights = {
      correctness: 0.4,
      efficiency: 0.2,
      codeQuality: 0.2,
      style: 0.1,
      testCases: 0.1
    };

    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      totalScore += (breakdown[key] || 0) * weight;
    }

    return totalScore;
  }

  private evaluateRubric(rubric: GradingRubric, aiEvaluation: any): RubricEvaluation {
    const criteria = rubric.criteria.map(criterion => {
      const score = aiEvaluation.rubricScores?.[criterion.name] || 70;
      return {
        name: criterion.name,
        weight: criterion.weight,
        score: score,
        maxScore: 100,
        feedback: `${criterion.name}: ${this.getRubricFeedback(score)}`
      };
    });

    const totalScore = criteria.reduce((sum, c) => sum + (c.score * c.weight / 100), 0);

    return {
      criteria,
      totalScore,
      totalMaxScore: 100
    };
  }

  private getRubricFeedback(score: number): string {
    if (score >= 90) return "Excellent work!";
    if (score >= 80) return "Good understanding demonstrated";
    if (score >= 70) return "Satisfactory performance";
    if (score >= 60) return "Needs improvement";
    return "Significant gaps in understanding";
  }

  private generateSummary(score: number, executionResults: any): string {
    if (score >= 90) {
      return "Excellent submission! Your code is efficient, well-structured, and passes all test cases.";
    } else if (score >= 80) {
      return "Good work! Your solution is mostly correct with minor areas for improvement.";
    } else if (score >= 70) {
      return "Satisfactory submission. The core logic is correct but there are several areas that need refinement.";
    } else if (score >= 60) {
      return `Your solution passes ${executionResults.passed}/${executionResults.total} test cases. Focus on debugging and improving code structure.`;
    } else {
      return "Your submission needs significant improvement. Review the feedback and try again.";
    }
  }

  private identifyStrengths(breakdown: any, codeReview: any): string[] {
    const strengths = [];
    
    if (breakdown.correctness >= 80) {
      strengths.push("Solution correctly handles most test cases");
    }
    if (breakdown.efficiency >= 80) {
      strengths.push("Efficient algorithm choice and implementation");
    }
    if (breakdown.codeQuality >= 80) {
      strengths.push("Clean and well-organized code structure");
    }
    if (codeReview.qualityReport?.metrics?.linesOfCode < 50) {
      strengths.push("Concise implementation");
    }
    
    if (strengths.length === 0) {
      strengths.push("Attempted the problem");
    }
    
    return strengths;
  }

  private identifyImprovements(breakdown: any, codeReview: any): string[] {
    const improvements = [];
    
    if (breakdown.correctness < 70) {
      improvements.push("Fix failing test cases and handle edge cases");
    }
    if (breakdown.efficiency < 70) {
      improvements.push("Optimize algorithm for better time complexity");
    }
    if (breakdown.codeQuality < 70) {
      improvements.push("Improve code organization and readability");
    }
    if (breakdown.style < 70) {
      improvements.push("Follow language-specific style conventions");
    }
    
    return improvements;
  }

  private generateSuggestions(breakdown: any): string[] {
    const suggestions = [];
    
    if (breakdown.correctness < 100) {
      suggestions.push("Debug failing test cases step by step");
    }
    if (breakdown.efficiency < 80) {
      suggestions.push("Consider using more efficient data structures");
    }
    suggestions.push("Add comments to explain complex logic");
    suggestions.push("Practice similar problems to reinforce concepts");
    
    return suggestions.slice(0, 3);
  }

  private needsHumanReview(score: number, executionResults: any): boolean {
    // Flag for human review in edge cases
    if (score < 50 && executionResults.passed > executionResults.total * 0.7) {
      return true; // Score doesn't match test results
    }
    if (score > 90 && executionResults.passed < executionResults.total * 0.5) {
      return true; // Score doesn't match test results
    }
    if (executionResults.error && executionResults.error.includes('timeout')) {
      return true; // Timeout issues might need manual review
    }
    
    return false;
  }

  private getFallbackGrading(executionResults: any, codeReview: any): any {
    const testScore = (executionResults.passed / executionResults.total) * 100;
    const qualityScore = codeReview.overallScore || 70;
    const averageScore = (testScore + qualityScore) / 2;

    return {
      score: averageScore,
      breakdown: {
        correctness: testScore,
        efficiency: 70,
        codeQuality: qualityScore,
        style: 70,
        testCases: testScore
      },
      summary: "Automated grading completed",
      strengths: ["Code submitted successfully"],
      improvements: ["Review test case failures"],
      suggestions: ["Debug and resubmit"],
      confidence: 0.6,
      requiresHumanReview: false
    };
  }

  async gradeBatch(
    submissions: Submission[],
    problems: Map<number, Problem>,
    rubric?: GradingRubric
  ): Promise<GradingResult[]> {
    const results: GradingResult[] = [];
    
    for (const submission of submissions) {
      const problem = problems.get(submission.problemId);
      if (problem) {
        try {
          const result = await this.gradeSubmission(submission, problem, rubric);
          results.push(result);
        } catch (error) {
          console.error(`Failed to grade submission ${submission.id}:`, error);
        }
      }
    }
    
    return results;
  }
}