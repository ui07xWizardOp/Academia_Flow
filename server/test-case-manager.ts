import { storage } from "./storage";
import { secureCodeExecutor } from "./code-executor-secure";
import type { Problem } from "@shared/schema";

export interface EnhancedTestCase {
  id: number;
  input: string;
  expectedOutput: string;
  description?: string;
  weight: number;
  hidden: boolean;
  timeLimit?: number;
  memoryLimit?: number;
  category?: 'basic' | 'edge' | 'performance' | 'stress';
  tags?: string[];
}

export interface TestResult {
  testCaseId: number;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  runtime: number;
  memory: number;
  points: number;
  maxPoints: number;
  feedback?: string;
  error?: string;
}

export interface EvaluationReport {
  problemId: number;
  userId: number;
  code: string;
  language: string;
  totalScore: number;
  maxScore: number;
  testResults: TestResult[];
  performance: {
    averageRuntime: number;
    maxRuntime: number;
    averageMemory: number;
    maxMemory: number;
  };
  feedback: {
    overall: string;
    strengths: string[];
    improvements: string[];
  };
  partialCredit: {
    correctnessScore: number;
    efficiencyScore: number;
    edgeCaseScore: number;
    codeQualityScore: number;
  };
  timestamp: Date;
}

export class TestCaseManager {
  private testCaseCache: Map<number, EnhancedTestCase[]> = new Map();

  /**
   * Generate test cases for a problem based on its constraints
   */
  async generateTestCases(
    problem: Problem,
    count: number = 10
  ): Promise<EnhancedTestCase[]> {
    const testCases: EnhancedTestCase[] = [];
    const constraints = problem.constraints || [];
    
    // Generate basic test cases
    for (let i = 0; i < Math.min(count * 0.3, 3); i++) {
      testCases.push(await this.generateBasicTestCase(problem, i));
    }
    
    // Generate edge cases
    for (let i = 0; i < Math.min(count * 0.3, 3); i++) {
      testCases.push(await this.generateEdgeTestCase(problem, i));
    }
    
    // Generate performance test cases
    for (let i = 0; i < Math.min(count * 0.2, 2); i++) {
      testCases.push(await this.generatePerformanceTestCase(problem, i));
    }
    
    // Generate stress test cases
    for (let i = 0; i < Math.min(count * 0.2, 2); i++) {
      testCases.push(await this.generateStressTestCase(problem, i));
    }
    
    return testCases;
  }

  private async generateBasicTestCase(problem: Problem, index: number): Promise<EnhancedTestCase> {
    // Generate basic test cases based on problem type
    const problemType = this.detectProblemType(problem);
    
    switch (problemType) {
      case 'array':
        return this.generateArrayTestCase(problem, 'basic', index);
      case 'string':
        return this.generateStringTestCase(problem, 'basic', index);
      case 'tree':
        return this.generateTreeTestCase(problem, 'basic', index);
      case 'graph':
        return this.generateGraphTestCase(problem, 'basic', index);
      case 'math':
        return this.generateMathTestCase(problem, 'basic', index);
      default:
        return this.generateGenericTestCase(problem, 'basic', index);
    }
  }

  private async generateEdgeTestCase(problem: Problem, index: number): Promise<EnhancedTestCase> {
    const problemType = this.detectProblemType(problem);
    
    const edgeCases = {
      array: [
        { input: '[]', description: 'Empty array' },
        { input: '[1]', description: 'Single element' },
        { input: '[-1, -2, -3]', description: 'All negative numbers' },
        { input: '[0, 0, 0]', description: 'All zeros' },
      ],
      string: [
        { input: '""', description: 'Empty string' },
        { input: '"a"', description: 'Single character' },
        { input: '"   "', description: 'Only spaces' },
        { input: '"!@#$%"', description: 'Special characters' },
      ],
      number: [
        { input: '0', description: 'Zero' },
        { input: '-1', description: 'Negative number' },
        { input: '2147483647', description: 'Max integer' },
        { input: '-2147483648', description: 'Min integer' },
      ]
    };
    
    const relevantEdgeCases = edgeCases[problemType as keyof typeof edgeCases] || [];
    const edgeCase = relevantEdgeCases[index % relevantEdgeCases.length];
    
    return {
      id: 1000 + index,
      input: edgeCase?.input || '[]',
      expectedOutput: await this.computeExpectedOutput(problem, edgeCase?.input || '[]'),
      description: edgeCase?.description || 'Edge case',
      weight: 1.5,
      hidden: false,
      category: 'edge'
    };
  }

  private async generatePerformanceTestCase(problem: Problem, index: number): Promise<EnhancedTestCase> {
    const sizes = [100, 1000, 10000];
    const size = sizes[index % sizes.length];
    
    const input = this.generateLargeInput(problem, size);
    
    return {
      id: 2000 + index,
      input,
      expectedOutput: await this.computeExpectedOutput(problem, input),
      description: `Performance test with ${size} elements`,
      weight: 2,
      hidden: true,
      category: 'performance',
      timeLimit: 2000,
      memoryLimit: 256
    };
  }

  private async generateStressTestCase(problem: Problem, index: number): Promise<EnhancedTestCase> {
    const input = this.generateStressInput(problem);
    
    return {
      id: 3000 + index,
      input,
      expectedOutput: await this.computeExpectedOutput(problem, input),
      description: 'Stress test with maximum constraints',
      weight: 3,
      hidden: true,
      category: 'stress',
      timeLimit: 5000,
      memoryLimit: 512
    };
  }

  private detectProblemType(problem: Problem): string {
    const description = problem.description.toLowerCase();
    const title = problem.title.toLowerCase();
    
    if (description.includes('array') || title.includes('array')) return 'array';
    if (description.includes('string') || title.includes('string')) return 'string';
    if (description.includes('tree') || title.includes('tree')) return 'tree';
    if (description.includes('graph') || title.includes('graph')) return 'graph';
    if (description.includes('math') || description.includes('number')) return 'math';
    
    return 'generic';
  }

  private generateArrayTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    const arrays = {
      basic: [
        '[1, 2, 3, 4, 5]',
        '[5, 4, 3, 2, 1]',
        '[1, 3, 2, 5, 4]',
      ],
      edge: [
        '[]',
        '[1]',
        '[1, 1, 1, 1]',
      ]
    };
    
    const input = arrays[category as keyof typeof arrays]?.[index] || '[1, 2, 3]';
    
    return {
      id: index,
      input,
      expectedOutput: this.computeArrayOutput(problem, input),
      description: `${category} array test case`,
      weight: category === 'edge' ? 1.5 : 1,
      hidden: false,
      category: category as any
    };
  }

  private generateStringTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    const strings = {
      basic: [
        '"hello"',
        '"world"',
        '"hello world"',
      ],
      edge: [
        '""',
        '"a"',
        '"   "',
      ]
    };
    
    const input = strings[category as keyof typeof strings]?.[index] || '"test"';
    
    return {
      id: index,
      input,
      expectedOutput: this.computeStringOutput(problem, input),
      description: `${category} string test case`,
      weight: category === 'edge' ? 1.5 : 1,
      hidden: false,
      category: category as any
    };
  }

  private generateTreeTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    // Simplified tree test case generation
    const input = '[1, 2, 3, null, null, 4, 5]';
    
    return {
      id: index,
      input,
      expectedOutput: '7', // Placeholder
      description: `${category} tree test case`,
      weight: 2,
      hidden: false,
      category: category as any
    };
  }

  private generateGraphTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    // Simplified graph test case generation
    const input = '[[0,1],[1,2],[2,0]]';
    
    return {
      id: index,
      input,
      expectedOutput: 'true', // Placeholder
      description: `${category} graph test case`,
      weight: 2,
      hidden: false,
      category: category as any
    };
  }

  private generateMathTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    const numbers = {
      basic: ['5', '10', '100'],
      edge: ['0', '-1', '2147483647']
    };
    
    const input = numbers[category as keyof typeof numbers]?.[index] || '42';
    
    return {
      id: index,
      input,
      expectedOutput: this.computeMathOutput(problem, input),
      description: `${category} math test case`,
      weight: 1,
      hidden: false,
      category: category as any
    };
  }

  private generateGenericTestCase(problem: Problem, category: string, index: number): EnhancedTestCase {
    return {
      id: index,
      input: '1',
      expectedOutput: '1',
      description: `${category} test case`,
      weight: 1,
      hidden: false,
      category: category as any
    };
  }

  private generateLargeInput(problem: Problem, size: number): string {
    const problemType = this.detectProblemType(problem);
    
    switch (problemType) {
      case 'array':
        return `[${Array.from({ length: size }, (_, i) => i).join(', ')}]`;
      case 'string':
        return `"${'a'.repeat(size)}"`;
      default:
        return String(size);
    }
  }

  private generateStressInput(problem: Problem): string {
    const problemType = this.detectProblemType(problem);
    const maxSize = 100000;
    
    switch (problemType) {
      case 'array':
        return `[${Array.from({ length: maxSize }, () => Math.floor(Math.random() * 1000000)).join(', ')}]`;
      case 'string':
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let str = '';
        for (let i = 0; i < maxSize; i++) {
          str += chars[Math.floor(Math.random() * chars.length)];
        }
        return `"${str}"`;
      default:
        return '2147483647';
    }
  }

  private async computeExpectedOutput(problem: Problem, input: string): Promise<string> {
    // This would ideally run a reference solution
    // For now, return placeholder values
    return 'expected_output';
  }

  private computeArrayOutput(problem: Problem, input: string): string {
    // Placeholder for array problem solutions
    try {
      const arr = JSON.parse(input);
      if (problem.title.toLowerCase().includes('sum')) {
        return String(arr.reduce((a: number, b: number) => a + b, 0));
      }
      if (problem.title.toLowerCase().includes('max')) {
        return String(Math.max(...arr));
      }
      return String(arr.length);
    } catch {
      return '0';
    }
  }

  private computeStringOutput(problem: Problem, input: string): string {
    // Placeholder for string problem solutions
    try {
      const str = JSON.parse(input);
      if (problem.title.toLowerCase().includes('length')) {
        return String(str.length);
      }
      if (problem.title.toLowerCase().includes('reverse')) {
        return `"${str.split('').reverse().join('')}"`;
      }
      return `"${str}"`;
    } catch {
      return '""';
    }
  }

  private computeMathOutput(problem: Problem, input: string): string {
    // Placeholder for math problem solutions
    const num = parseInt(input);
    if (problem.title.toLowerCase().includes('factorial')) {
      let result = 1;
      for (let i = 2; i <= num; i++) result *= i;
      return String(result);
    }
    if (problem.title.toLowerCase().includes('prime')) {
      if (num < 2) return 'false';
      for (let i = 2; i * i <= num; i++) {
        if (num % i === 0) return 'false';
      }
      return 'true';
    }
    return String(num);
  }

  /**
   * Evaluate user code with comprehensive testing and partial credit
   */
  async evaluateSubmission(
    userId: number,
    problemId: number,
    code: string,
    language: string
  ): Promise<EvaluationReport> {
    const problem = await storage.getProblem(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    // Get or generate test cases
    let testCases = this.testCaseCache.get(problemId);
    if (!testCases) {
      const dbTestCases = problem.testCases as any[] || [];
      testCases = dbTestCases.map((tc, index) => ({
        id: index,
        input: tc.input,
        expectedOutput: tc.expectedOutput || tc.expected,
        description: tc.description,
        weight: tc.weight || 1,
        hidden: tc.hidden || false,
        category: tc.category || 'basic'
      }));
      this.testCaseCache.set(problemId, testCases);
    }

    // Execute code with all test cases
    const executionResult = await secureCodeExecutor.executeWithTestCases({
      code,
      language,
      testCases: testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        description: tc.description,
        weight: tc.weight,
        hidden: tc.hidden
      })),
      timeLimit: 5000,
      memoryLimit: 256,
      userId: String(userId),
      problemId
    });

    // Calculate detailed scores
    const testResults: TestResult[] = executionResult.results.map((result, index) => {
      const testCase = testCases![index];
      return {
        testCaseId: testCase.id,
        passed: result.passed,
        actualOutput: result.actualOutput,
        expectedOutput: result.expectedOutput,
        runtime: result.runtime,
        memory: result.memory,
        points: result.points,
        maxPoints: result.maxPoints,
        feedback: this.generateTestFeedback(result, testCase),
        error: result.error
      };
    });

    // Calculate performance metrics
    const performance = {
      averageRuntime: testResults.reduce((sum, r) => sum + r.runtime, 0) / testResults.length,
      maxRuntime: Math.max(...testResults.map(r => r.runtime)),
      averageMemory: testResults.reduce((sum, r) => sum + r.memory, 0) / testResults.length,
      maxMemory: Math.max(...testResults.map(r => r.memory))
    };

    // Calculate partial credit scores
    const partialCredit = this.calculatePartialCredit(testResults, testCases!);

    // Generate comprehensive feedback
    const feedback = this.generateComprehensiveFeedback(
      testResults,
      performance,
      partialCredit,
      problem
    );

    const totalScore = executionResult.score;
    const maxScore = 100;

    const report: EvaluationReport = {
      problemId,
      userId,
      code,
      language,
      totalScore,
      maxScore,
      testResults,
      performance,
      feedback,
      partialCredit,
      timestamp: new Date()
    };

    // Store evaluation report
    await this.storeEvaluationReport(report);

    return report;
  }

  private generateTestFeedback(result: any, testCase: EnhancedTestCase): string {
    if (result.passed) {
      return `✓ Test passed (${testCase.category})`;
    }

    if (result.error?.includes('Time limit')) {
      return `⚠ Time limit exceeded. Consider optimizing your algorithm.`;
    }

    if (result.error?.includes('Memory')) {
      return `⚠ Memory limit exceeded. Check for memory leaks or inefficient data structures.`;
    }

    if (result.error) {
      return `✗ Runtime error: ${result.error}`;
    }

    // Provide specific feedback based on output comparison
    const similarity = this.calculateOutputSimilarity(result.actualOutput, result.expectedOutput);
    
    if (similarity > 0.8) {
      return `✗ Close! Your output is ${Math.round(similarity * 100)}% similar to expected.`;
    } else if (similarity > 0.5) {
      return `✗ Partial match. Review your logic for ${testCase.category} cases.`;
    } else {
      return `✗ Incorrect output. Expected: ${result.expectedOutput.substring(0, 50)}...`;
    }
  }

  private calculateOutputSimilarity(actual: string, expected: string): number {
    if (actual === expected) return 1;
    
    // Levenshtein distance normalized
    const distance = this.levenshteinDistance(actual, expected);
    const maxLen = Math.max(actual.length, expected.length);
    
    if (maxLen === 0) return 1;
    return 1 - (distance / maxLen);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculatePartialCredit(
    testResults: TestResult[],
    testCases: EnhancedTestCase[]
  ): {
    correctnessScore: number;
    efficiencyScore: number;
    edgeCaseScore: number;
    codeQualityScore: number;
  } {
    // Correctness score based on passed tests
    const correctnessScore = (testResults.filter(r => r.passed).length / testResults.length) * 100;

    // Efficiency score based on performance tests
    const performanceTests = testResults.filter((_, i) => 
      testCases[i].category === 'performance' || testCases[i].category === 'stress'
    );
    const efficiencyScore = performanceTests.length > 0
      ? (performanceTests.filter(r => r.passed).length / performanceTests.length) * 100
      : 100;

    // Edge case score
    const edgeTests = testResults.filter((_, i) => testCases[i].category === 'edge');
    const edgeCaseScore = edgeTests.length > 0
      ? (edgeTests.filter(r => r.passed).length / edgeTests.length) * 100
      : 100;

    // Code quality score (placeholder - would need static analysis)
    const codeQualityScore = 80;

    return {
      correctnessScore,
      efficiencyScore,
      edgeCaseScore,
      codeQualityScore
    };
  }

  private generateComprehensiveFeedback(
    testResults: TestResult[],
    performance: any,
    partialCredit: any,
    problem: Problem
  ): {
    overall: string;
    strengths: string[];
    improvements: string[];
  } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    
    // Analyze strengths
    if (partialCredit.correctnessScore === 100) {
      strengths.push('Perfect correctness - all test cases passed!');
    } else if (partialCredit.correctnessScore >= 80) {
      strengths.push('Strong correctness - most test cases passed');
    }

    if (partialCredit.efficiencyScore >= 90) {
      strengths.push('Excellent performance on large inputs');
    }

    if (partialCredit.edgeCaseScore >= 90) {
      strengths.push('Good handling of edge cases');
    }

    if (performance.averageRuntime < 100) {
      strengths.push('Very fast execution time');
    }

    // Analyze areas for improvement
    if (partialCredit.correctnessScore < 100) {
      const failedCount = testResults.filter(r => !r.passed).length;
      improvements.push(`Fix ${failedCount} failing test case(s)`);
    }

    if (partialCredit.efficiencyScore < 70) {
      improvements.push('Optimize algorithm for better performance on large inputs');
    }

    if (partialCredit.edgeCaseScore < 70) {
      improvements.push('Consider more edge cases (empty inputs, boundary values)');
    }

    if (performance.maxRuntime > 1000) {
      improvements.push('Reduce time complexity - current solution may be too slow');
    }

    if (performance.maxMemory > 100) {
      improvements.push('Optimize memory usage - consider more efficient data structures');
    }

    // Generate overall feedback
    let overall = '';
    if (partialCredit.correctnessScore === 100) {
      overall = 'Excellent work! Your solution correctly handles all test cases. ';
    } else if (partialCredit.correctnessScore >= 80) {
      overall = 'Good job! Your solution is mostly correct with some minor issues. ';
    } else if (partialCredit.correctnessScore >= 60) {
      overall = 'Decent attempt! Your solution shows understanding but needs refinement. ';
    } else {
      overall = 'Keep working on it! Review the problem requirements and test cases. ';
    }

    overall += `Score: ${Math.round(partialCredit.correctnessScore)}%`;

    return {
      overall,
      strengths: strengths.length > 0 ? strengths : ['Keep practicing!'],
      improvements: improvements.length > 0 ? improvements : ['Consider code optimization']
    };
  }

  private async storeEvaluationReport(report: EvaluationReport) {
    // Store in database for analytics
    // This would integrate with the storage layer
    console.log('Evaluation report stored:', {
      problemId: report.problemId,
      userId: report.userId,
      score: report.totalScore,
      timestamp: report.timestamp
    });
  }

  /**
   * Validate test cases for consistency and correctness
   */
  async validateTestCases(testCases: EnhancedTestCase[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    for (const testCase of testCases) {
      // Check input format
      try {
        JSON.parse(testCase.input);
      } catch {
        errors.push(`Invalid input format for test case ${testCase.id}`);
      }

      // Check expected output format
      if (!testCase.expectedOutput || testCase.expectedOutput.trim() === '') {
        errors.push(`Missing expected output for test case ${testCase.id}`);
      }

      // Check weight validity
      if (testCase.weight <= 0) {
        errors.push(`Invalid weight for test case ${testCase.id}`);
      }

      // Check for duplicate test cases
      const duplicates = testCases.filter(tc => 
        tc.id !== testCase.id && 
        tc.input === testCase.input
      );
      if (duplicates.length > 0) {
        errors.push(`Duplicate input found for test case ${testCase.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Import test cases from various formats
   */
  async importTestCases(
    problemId: number,
    format: 'json' | 'csv' | 'yaml',
    data: string
  ): Promise<EnhancedTestCase[]> {
    let testCases: EnhancedTestCase[] = [];

    switch (format) {
      case 'json':
        testCases = JSON.parse(data);
        break;
      case 'csv':
        testCases = this.parseCSVTestCases(data);
        break;
      case 'yaml':
        // Would need a YAML parser
        throw new Error('YAML format not yet supported');
    }

    // Validate imported test cases
    const validation = await this.validateTestCases(testCases);
    if (!validation.valid) {
      throw new Error(`Invalid test cases: ${validation.errors.join(', ')}`);
    }

    // Store in database
    await this.storeTestCases(problemId, testCases);

    return testCases;
  }

  private parseCSVTestCases(csv: string): EnhancedTestCase[] {
    const lines = csv.split('\n');
    const testCases: EnhancedTestCase[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const [id, input, expectedOutput, weight, hidden, category] = lines[i].split(',');
      if (id && input && expectedOutput) {
        testCases.push({
          id: parseInt(id),
          input: input.trim(),
          expectedOutput: expectedOutput.trim(),
          weight: parseFloat(weight) || 1,
          hidden: hidden === 'true',
          category: (category?.trim() as any) || 'basic'
        });
      }
    }
    
    return testCases;
  }

  private async storeTestCases(problemId: number, testCases: EnhancedTestCase[]) {
    // Store test cases directly in the problem
    // This would be implemented in the storage layer
    // For now, just update the cache
    this.testCaseCache.set(problemId, testCases);
    
    // In a real implementation, this would update the database
    console.log(`Storing ${testCases.length} test cases for problem ${problemId}`);
  }

  /**
   * Get test execution statistics for analytics
   */
  async getTestExecutionStats(problemId: number): Promise<{
    totalExecutions: number;
    averageScore: number;
    passRate: number;
    commonErrors: { error: string; count: number }[];
    performanceStats: {
      averageRuntime: number;
      averageMemory: number;
    };
  }> {
    // This would query stored evaluation reports
    return {
      totalExecutions: 0,
      averageScore: 0,
      passRate: 0,
      commonErrors: [],
      performanceStats: {
        averageRuntime: 0,
        averageMemory: 0
      }
    };
  }
}

export const testCaseManager = new TestCaseManager();