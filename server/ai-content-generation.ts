import OpenAI from "openai";
import { storage } from "./storage";
import type { Problem, InsertProblem } from "@shared/schema";

interface GeneratedContent {
  problem: GeneratedProblem;
  testCases: TestCase[];
  solution: Solution;
  hints: string[];
  explanation: string;
  metadata: {
    estimatedTime: number;
    requiredKnowledge: string[];
    learningObjectives: string[];
    commonMistakes: string[];
  };
}

interface GeneratedProblem {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  companies: string[];
  constraints: string[];
  examples: Example[];
}

interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
  isHidden: boolean;
  weight?: number;
}

interface Solution {
  approach: string;
  code: {
    python: string;
    javascript: string;
    java?: string;
    cpp?: string;
  };
  timeComplexity: string;
  spaceComplexity: string;
  alternativeApproaches?: string[];
}

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface ContentGenerationOptions {
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  concepts?: string[];
  style?: 'interview' | 'educational' | 'competitive';
  company?: string;
  similarTo?: number; // Problem ID to base generation on
}

export class AIContentGenerator {
  private openai: OpenAI;
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private model = "gpt-4o";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateProblem(options: ContentGenerationOptions): Promise<GeneratedContent> {
    const prompt = this.buildGenerationPrompt(options);
    const generatedData = await this.callOpenAI(prompt);
    
    // Enhance and validate the generated content
    const enhancedContent = await this.enhanceContent(generatedData, options);
    
    return enhancedContent;
  }

  private buildGenerationPrompt(options: ContentGenerationOptions): string {
    const topic = options.topic || "Data Structures and Algorithms";
    const difficulty = options.difficulty || "medium";
    const style = options.style || "interview";
    const concepts = options.concepts?.join(", ") || "general programming";
    
    return `Create a high-quality ${difficulty} ${style}-style programming problem about ${topic}.
    Focus on concepts: ${concepts}.
    ${options.company ? `In the style of ${options.company} interview questions.` : ''}
    
    Generate a comprehensive problem with:
    1. Engaging title (concise and descriptive)
    2. Clear problem description with real-world context
    3. Detailed constraints
    4. 3-4 examples with explanations
    5. 5-10 test cases (mix of visible and hidden)
    6. Complete solution with multiple approaches
    7. Time/space complexity analysis
    8. Common pitfalls and hints
    9. Learning objectives
    
    Ensure the problem is:
    - Original and interesting
    - Appropriately challenging for ${difficulty} level
    - Well-structured and unambiguous
    - Educational and practical`;
  }

  private async callOpenAI(prompt: string): Promise<any> {
    const systemPrompt = `You are an expert programming problem designer who creates high-quality, 
    educational coding challenges similar to those used in technical interviews at top tech companies.
    Focus on creating problems that test algorithmic thinking, not just syntax knowledge.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt + "\n\nProvide the response in JSON format." }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 3000
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("OpenAI generation error:", error);
      throw new Error("Failed to generate content");
    }
  }

  private async enhanceContent(
    generatedData: any,
    options: ContentGenerationOptions
  ): Promise<GeneratedContent> {
    // Ensure all required fields are present and properly formatted
    const problem: GeneratedProblem = {
      title: generatedData.title || this.generateDefaultTitle(options),
      description: generatedData.description || this.generateDefaultDescription(options),
      difficulty: options.difficulty || 'medium',
      topics: this.extractTopics(generatedData, options),
      companies: options.company ? [options.company] : this.suggestCompanies(options),
      constraints: generatedData.constraints || this.generateConstraints(options.difficulty),
      examples: this.formatExamples(generatedData.examples || [])
    };

    const testCases = this.generateTestCases(generatedData.testCases || [], problem);
    const solution = await this.generateSolution(problem, generatedData.solution);
    const hints = this.generateHints(problem, solution);

    return {
      problem,
      testCases,
      solution,
      hints,
      explanation: generatedData.explanation || this.generateExplanation(problem, solution),
      metadata: {
        estimatedTime: this.estimateTime(problem.difficulty),
        requiredKnowledge: this.identifyRequiredKnowledge(problem, solution),
        learningObjectives: this.defineLearningObjectives(problem),
        commonMistakes: this.identifyCommonMistakes(problem)
      }
    };
  }

  private generateDefaultTitle(options: ContentGenerationOptions): string {
    const topicTitles: { [key: string]: string[] } = {
      'Arrays': ['Array Manipulation', 'Subarray Sum', 'Array Rotation'],
      'Strings': ['String Transformation', 'Pattern Matching', 'String Compression'],
      'Trees': ['Binary Tree Traversal', 'Tree Path Sum', 'Tree Reconstruction'],
      'Graphs': ['Graph Traversal', 'Shortest Path', 'Connected Components'],
      'Dynamic Programming': ['Optimal Solution', 'Subsequence Problem', 'Grid Paths']
    };

    const topic = options.topic || 'Arrays';
    const titles = topicTitles[topic] || ['Algorithm Challenge'];
    return titles[Math.floor(Math.random() * titles.length)] + ` ${Date.now()}`;
  }

  private generateDefaultDescription(options: ContentGenerationOptions): string {
    return `Given a ${options.topic || 'data structure'} problem, implement an efficient solution that satisfies the given constraints.
    This problem tests your understanding of ${options.concepts?.join(', ') || 'algorithmic thinking'}.`;
  }

  private extractTopics(generatedData: any, options: ContentGenerationOptions): string[] {
    const topics = new Set<string>();
    
    if (options.topic) topics.add(options.topic);
    if (options.concepts) options.concepts.forEach(c => topics.add(c));
    if (generatedData.topics) {
      if (Array.isArray(generatedData.topics)) {
        generatedData.topics.forEach((t: string) => topics.add(t));
      }
    }
    
    return Array.from(topics).slice(0, 5);
  }

  private suggestCompanies(options: ContentGenerationOptions): string[] {
    const topicCompanies: { [key: string]: string[] } = {
      'Arrays': ['Google', 'Amazon', 'Microsoft'],
      'Dynamic Programming': ['Google', 'Uber', 'Airbnb'],
      'Graphs': ['Meta', 'Google', 'LinkedIn'],
      'System Design': ['Amazon', 'Netflix', 'Uber']
    };

    return topicCompanies[options.topic || ''] || ['Google', 'Amazon'];
  }

  private generateConstraints(difficulty?: string): string[] {
    const constraints = [
      '1 <= array.length <= 10^5',
      '-10^9 <= array[i] <= 10^9'
    ];

    if (difficulty === 'easy') {
      constraints.push('Array elements are positive integers');
      constraints.push('1 <= n <= 1000');
    } else if (difficulty === 'hard') {
      constraints.push('Time complexity must be O(n log n) or better');
      constraints.push('Space complexity must be O(1)');
    }

    return constraints;
  }

  private formatExamples(examples: any[]): Example[] {
    if (!examples || examples.length === 0) {
      return [
        {
          input: "array = [1, 2, 3, 4, 5]",
          output: "15",
          explanation: "The sum of all elements is 1 + 2 + 3 + 4 + 5 = 15"
        },
        {
          input: "array = [0]",
          output: "0",
          explanation: "Single element array returns the element itself"
        }
      ];
    }

    return examples.map(ex => ({
      input: ex.input || "",
      output: ex.output || "",
      explanation: ex.explanation
    }));
  }

  private generateTestCases(testCases: any[], problem: GeneratedProblem): TestCase[] {
    const cases: TestCase[] = [];
    
    // Add provided test cases
    if (testCases && testCases.length > 0) {
      testCases.forEach((tc, index) => {
        cases.push({
          input: tc.input || "",
          expectedOutput: tc.expectedOutput || tc.output || "",
          explanation: tc.explanation,
          isHidden: index >= 3, // First 3 visible, rest hidden
          weight: tc.weight || 1
        });
      });
    }

    // Ensure minimum test cases
    while (cases.length < 5) {
      cases.push(this.generateDefaultTestCase(problem, cases.length));
    }

    return cases;
  }

  private generateDefaultTestCase(problem: GeneratedProblem, index: number): TestCase {
    const testInputs = [
      "[1, 2, 3]",
      "[]",
      "[0]",
      "[-1, -2, -3]",
      "[1000000]"
    ];

    return {
      input: testInputs[index] || "[]",
      expectedOutput: "result",
      isHidden: index >= 2,
      weight: 1
    };
  }

  private async generateSolution(problem: GeneratedProblem, solutionData?: any): Promise<Solution> {
    const pythonCode = solutionData?.python || this.generateDefaultPythonSolution(problem);
    const jsCode = solutionData?.javascript || this.generateDefaultJSSolution(problem);

    return {
      approach: solutionData?.approach || `Use an efficient algorithm to solve the ${problem.title} problem.`,
      code: {
        python: pythonCode,
        javascript: jsCode,
        java: solutionData?.java,
        cpp: solutionData?.cpp
      },
      timeComplexity: solutionData?.timeComplexity || "O(n)",
      spaceComplexity: solutionData?.spaceComplexity || "O(1)",
      alternativeApproaches: solutionData?.alternativeApproaches || [
        "Brute force approach",
        "Optimized approach using hash tables"
      ]
    };
  }

  private generateDefaultPythonSolution(problem: GeneratedProblem): string {
    return `def solution(arr):
    """
    Solve ${problem.title}
    
    Time: O(n)
    Space: O(1)
    """
    # TODO: Implement solution
    result = 0
    for num in arr:
        result += num
    return result`;
  }

  private generateDefaultJSSolution(problem: GeneratedProblem): string {
    return `function solution(arr) {
  /**
   * Solve ${problem.title}
   * 
   * Time: O(n)
   * Space: O(1)
   */
  // TODO: Implement solution
  let result = 0;
  for (const num of arr) {
    result += num;
  }
  return result;
}`;
  }

  private generateHints(problem: GeneratedProblem, solution: Solution): string[] {
    const hints = [
      `Consider the ${problem.difficulty} difficulty level when choosing your approach`,
      `Think about the time complexity requirements`,
      `Look for patterns in the examples`
    ];

    if (problem.topics.includes('Dynamic Programming')) {
      hints.push("Can you break this into subproblems?");
    }
    if (problem.topics.includes('Graph')) {
      hints.push("Consider using BFS or DFS");
    }

    return hints;
  }

  private generateExplanation(problem: GeneratedProblem, solution: Solution): string {
    return `This problem tests your understanding of ${problem.topics.join(', ')}.
    The optimal solution has a time complexity of ${solution.timeComplexity} and space complexity of ${solution.spaceComplexity}.
    Key insights include recognizing the pattern and applying the appropriate algorithm.`;
  }

  private estimateTime(difficulty?: string): number {
    switch (difficulty) {
      case 'easy': return 15;
      case 'medium': return 30;
      case 'hard': return 45;
      default: return 30;
    }
  }

  private identifyRequiredKnowledge(problem: GeneratedProblem, solution: Solution): string[] {
    const knowledge = new Set<string>();
    
    problem.topics.forEach(t => knowledge.add(t));
    
    if (solution.timeComplexity.includes('log')) {
      knowledge.add('Logarithmic algorithms');
    }
    if (solution.code.python.includes('def') || solution.code.javascript.includes('function')) {
      knowledge.add('Function implementation');
    }
    
    return Array.from(knowledge);
  }

  private defineLearningObjectives(problem: GeneratedProblem): string[] {
    return [
      `Understand ${problem.topics[0]} concepts`,
      `Implement efficient algorithms`,
      `Analyze time and space complexity`,
      `Handle edge cases properly`
    ];
  }

  private identifyCommonMistakes(problem: GeneratedProblem): string[] {
    const mistakes = [
      "Not handling empty input",
      "Off-by-one errors in loops",
      "Not considering negative numbers"
    ];

    if (problem.difficulty === 'hard') {
      mistakes.push("Inefficient algorithm choice");
      mistakes.push("Excessive memory usage");
    }

    return mistakes;
  }

  async generateBulkProblems(
    count: number,
    options: ContentGenerationOptions
  ): Promise<GeneratedContent[]> {
    const problems: GeneratedContent[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const problem = await this.generateProblem({
          ...options,
          topic: this.varyTopic(options.topic, i)
        });
        problems.push(problem);
      } catch (error) {
        console.error(`Failed to generate problem ${i + 1}:`, error);
      }
    }
    
    return problems;
  }

  private varyTopic(baseTopic?: string, index: number): string {
    const topics = [
      'Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs',
      'Dynamic Programming', 'Greedy', 'Backtracking', 'Sorting', 'Searching'
    ];
    
    if (!baseTopic) {
      return topics[index % topics.length];
    }
    
    return baseTopic;
  }
}