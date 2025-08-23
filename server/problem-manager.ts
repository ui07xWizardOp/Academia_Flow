import { storage } from "./storage";
import { testCaseManager } from "./test-case-manager";
import type { Problem, InsertProblem, User } from "@shared/schema";
import { secureCodeExecutor } from "./code-executor-secure";

export interface ProblemMetadata {
  totalSubmissions: number;
  acceptanceRate: number;
  averageRuntime: number;
  averageMemory: number;
  difficultyScore: number; // Calculated based on actual performance
  topics: string[];
  companies: string[];
  relatedProblems: number[];
}

export interface ProblemImportResult {
  successful: number;
  failed: number;
  errors: string[];
  problems: Problem[];
}

export interface DifficultyCalibration {
  actualDifficulty: 'easy' | 'medium' | 'hard';
  confidenceScore: number;
  metrics: {
    averageAttempts: number;
    successRate: number;
    averageTimeToSolve: number;
    expertSuccessRate: number;
  };
  recommendation: string;
}

export class ProblemManager {
  private problemCache: Map<number, Problem> = new Map();
  private metadataCache: Map<number, ProblemMetadata> = new Map();

  /**
   * Create a new problem with validation and test case generation
   */
  async createProblem(
    problemData: Omit<InsertProblem, 'id' | 'createdAt'>,
    userId: number,
    generateTestCases: boolean = true
  ): Promise<Problem> {
    // Validate problem data
    const validation = this.validateProblemData(problemData);
    if (!validation.valid) {
      throw new Error(`Invalid problem data: ${validation.errors.join(', ')}`);
    }

    // Add creator information
    const problemWithCreator = {
      ...problemData,
      createdBy: userId,
      createdAt: new Date()
    };

    // Create problem in database
    const problem = await storage.createProblem(problemWithCreator);

    // Generate test cases if requested
    if (generateTestCases && problem) {
      const testCases = await testCaseManager.generateTestCases(problem, 10);
      
      // Update problem with generated test cases
      await storage.updateProblemTestCases(problem.id, testCases);
      problem.testCases = testCases as any;
    }

    // Clear cache
    this.problemCache.delete(problem.id);
    
    return problem;
  }

  /**
   * Update an existing problem
   */
  async updateProblem(
    problemId: number,
    updates: Partial<Problem>,
    userId: number
  ): Promise<Problem> {
    // Check permissions
    const canEdit = await this.checkEditPermission(problemId, userId);
    if (!canEdit) {
      throw new Error('Unauthorized to edit this problem');
    }

    // Validate updates
    const validation = this.validateProblemData(updates as any);
    if (!validation.valid) {
      throw new Error(`Invalid update data: ${validation.errors.join(', ')}`);
    }

    // Update in database
    const updated = await storage.updateProblem(problemId, updates);
    
    // Clear cache
    this.problemCache.delete(problemId);
    this.metadataCache.delete(problemId);
    
    return updated;
  }

  /**
   * Delete a problem (soft delete)
   */
  async deleteProblem(problemId: number, userId: number): Promise<void> {
    const canDelete = await this.checkEditPermission(problemId, userId);
    if (!canDelete) {
      throw new Error('Unauthorized to delete this problem');
    }

    await storage.softDeleteProblem(problemId);
    
    // Clear cache
    this.problemCache.delete(problemId);
    this.metadataCache.delete(problemId);
  }

  /**
   * Import problems from JSON
   */
  async importProblemsFromJSON(
    jsonData: string,
    userId: number
  ): Promise<ProblemImportResult> {
    const result: ProblemImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      problems: []
    };

    try {
      const problemsData = JSON.parse(jsonData);
      
      if (!Array.isArray(problemsData)) {
        throw new Error('JSON data must be an array of problems');
      }

      for (const problemData of problemsData) {
        try {
          // Validate and transform problem data
          const transformedData = this.transformImportedProblem(problemData);
          
          // Create problem
          const problem = await this.createProblem(transformedData, userId, true);
          
          result.successful++;
          result.problems.push(problem);
        } catch (error) {
          result.failed++;
          result.errors.push(
            `Failed to import problem "${problemData.title || 'Unknown'}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return result;
  }

  /**
   * Import problems from CSV
   */
  async importProblemsFromCSV(
    csvData: string,
    userId: number
  ): Promise<ProblemImportResult> {
    const result: ProblemImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      problems: []
    };

    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate required headers
    const requiredHeaders = ['title', 'description', 'difficulty'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      return result;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      const problemData: any = {};
      
      headers.forEach((header, index) => {
        problemData[header] = values[index];
      });
      
      try {
        // Transform CSV row to problem data
        const transformedData = this.transformCSVProblem(problemData);
        
        // Create problem
        const problem = await this.createProblem(transformedData, userId, true);
        
        result.successful++;
        result.problems.push(problem);
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to import row ${i + 1}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return result;
  }

  /**
   * Import problems from LeetCode
   */
  async importFromLeetCode(
    leetcodeIds: number[],
    userId: number
  ): Promise<ProblemImportResult> {
    const result: ProblemImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      problems: []
    };

    for (const leetcodeId of leetcodeIds) {
      try {
        const problemData = await this.fetchLeetCodeProblem(leetcodeId);
        const problem = await this.createProblem(problemData, userId, true);
        
        result.successful++;
        result.problems.push(problem);
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Failed to import LeetCode problem ${leetcodeId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return result;
  }

  /**
   * Calibrate problem difficulty based on actual user performance
   */
  async calibrateDifficulty(problemId: number): Promise<DifficultyCalibration> {
    const problem = await storage.getProblem(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    // Get all submissions for this problem
    const submissions = await storage.getSubmissionsByProblem(problemId);
    const userProgress = await storage.getProgressByProblem(problemId);
    
    // Calculate metrics
    const totalAttempts = submissions.length;
    const successfulSubmissions = submissions.filter((s: Submission) => s.status === 'accepted').length;
    const successRate = totalAttempts > 0 ? successfulSubmissions / totalAttempts : 0;
    
    const averageAttempts = userProgress.length > 0
      ? userProgress.reduce((sum: number, p: UserProgress) => sum + (p.attempts || 0), 0) / userProgress.length
      : 0;
    
    const solvedUsers = userProgress.filter((p: UserProgress) => p.completed).length;
    const averageTimeToSolve = solvedUsers > 0
      ? userProgress
          .filter((p: UserProgress) => p.completed)
          .reduce((sum: number, p: UserProgress) => sum + (p.timeSpent || 0), 0) / solvedUsers
      : 0;
    
    // Get expert success rate (users with many solved problems)
    const expertUsers = await this.getExpertUsers();
    const expertSubmissions = submissions.filter((s: Submission) => 
      expertUsers.some((u: User) => u.id === s.userId)
    );
    const expertSuccessRate = expertSubmissions.length > 0
      ? expertSubmissions.filter((s: Submission) => s.status === 'accepted').length / expertSubmissions.length
      : 0;
    
    // Determine actual difficulty based on metrics
    let actualDifficulty: 'easy' | 'medium' | 'hard';
    let confidenceScore = 0;
    
    if (totalAttempts < 10) {
      // Not enough data, use original difficulty
      actualDifficulty = problem.difficulty as any;
      confidenceScore = 0.2;
    } else {
      // Calculate difficulty score
      const difficultyScore = 
        (1 - successRate) * 0.3 +
        Math.min(averageAttempts / 10, 1) * 0.3 +
        Math.min(averageTimeToSolve / 60, 1) * 0.2 +
        (1 - expertSuccessRate) * 0.2;
      
      if (difficultyScore < 0.33) {
        actualDifficulty = 'easy';
      } else if (difficultyScore < 0.66) {
        actualDifficulty = 'medium';
      } else {
        actualDifficulty = 'hard';
      }
      
      // Calculate confidence based on sample size
      confidenceScore = Math.min(totalAttempts / 100, 1);
    }
    
    // Generate recommendation
    let recommendation = '';
    if (actualDifficulty !== problem.difficulty && confidenceScore > 0.7) {
      recommendation = `Consider updating difficulty from ${problem.difficulty} to ${actualDifficulty} based on user performance data.`;
      
      // Auto-update if confidence is very high
      if (confidenceScore > 0.9) {
        await this.updateProblem(problemId, { difficulty: actualDifficulty }, 0);
        recommendation += ' Difficulty has been automatically updated.';
      }
    } else if (confidenceScore < 0.5) {
      recommendation = 'More data needed for accurate difficulty calibration.';
    } else {
      recommendation = 'Current difficulty rating appears accurate.';
    }
    
    return {
      actualDifficulty,
      confidenceScore,
      metrics: {
        averageAttempts,
        successRate,
        averageTimeToSolve,
        expertSuccessRate
      },
      recommendation
    };
  }

  /**
   * Get problem metadata and statistics
   */
  async getProblemMetadata(problemId: number): Promise<ProblemMetadata> {
    // Check cache
    const cached = this.metadataCache.get(problemId);
    if (cached) return cached;
    
    const problem = await storage.getProblem(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    const submissions = await storage.getSubmissionsByProblem(problemId);
    const acceptedSubmissions = submissions.filter((s: Submission) => s.status === 'accepted');
    
    const metadata: ProblemMetadata = {
      totalSubmissions: submissions.length,
      acceptanceRate: submissions.length > 0
        ? (acceptedSubmissions.length / submissions.length) * 100
        : 0,
      averageRuntime: acceptedSubmissions.length > 0
        ? acceptedSubmissions.reduce((sum: number, s: Submission) => sum + (s.runtime || 0), 0) / acceptedSubmissions.length
        : 0,
      averageMemory: acceptedSubmissions.length > 0
        ? acceptedSubmissions.reduce((sum: number, s: Submission) => sum + (s.memory || 0), 0) / acceptedSubmissions.length
        : 0,
      difficultyScore: await this.calculateDifficultyScore(problemId),
      topics: problem.topics || [],
      companies: problem.companies || [],
      relatedProblems: await this.findRelatedProblems(problemId)
    };
    
    // Cache metadata
    this.metadataCache.set(problemId, metadata);
    
    return metadata;
  }

  /**
   * Search problems with filters
   */
  async searchProblems(filters: {
    query?: string;
    difficulty?: string[];
    topics?: string[];
    companies?: string[];
    solved?: boolean;
    userId?: number;
  }): Promise<Problem[]> {
    let problems = await storage.getAllProblems();
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      problems = problems.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }
    
    if (filters.difficulty && filters.difficulty.length > 0) {
      problems = problems.filter(p => 
        filters.difficulty!.includes(p.difficulty)
      );
    }
    
    if (filters.topics && filters.topics.length > 0) {
      problems = problems.filter(p => 
        p.topics.some(t => filters.topics!.includes(t))
      );
    }
    
    if (filters.companies && filters.companies.length > 0) {
      problems = problems.filter(p => 
        p.companies?.some(c => filters.companies!.includes(c))
      );
    }
    
    if (filters.solved !== undefined && filters.userId) {
      const userProgress = await storage.getUserProgress(filters.userId);
      const solvedProblemIds = userProgress
        .filter(p => p.completed === filters.solved)
        .map(p => p.problemId);
      
      problems = problems.filter(p => 
        solvedProblemIds.includes(p.id)
      );
    }
    
    return problems;
  }

  /**
   * Get recommended problems for a user
   */
  async getRecommendedProblems(
    userId: number,
    count: number = 10
  ): Promise<Problem[]> {
    const userProgress = await storage.getUserProgress(userId);
    const solvedProblemIds = userProgress
      .filter(p => p.completed)
      .map(p => p.problemId);
    
    const allProblems = await storage.getAllProblems();
    const unsolvedProblems = allProblems.filter(p => 
      !solvedProblemIds.includes(p.id)
    );
    
    // Get user's skill level
    const userSkillLevel = await this.calculateUserSkillLevel(userId);
    
    // Score problems based on relevance
    const scoredProblems = unsolvedProblems.map(problem => {
      let score = 0;
      
      // Difficulty matching
      if (userSkillLevel.recommendedDifficulty === problem.difficulty) {
        score += 3;
      } else if (
        (userSkillLevel.recommendedDifficulty === 'medium' && problem.difficulty === 'easy') ||
        (userSkillLevel.recommendedDifficulty === 'hard' && problem.difficulty === 'medium')
      ) {
        score += 1;
      }
      
      // Topic relevance
      const userTopics = userSkillLevel.strongTopics.concat(userSkillLevel.weakTopics);
      const matchingTopics = problem.topics.filter(t => userTopics.includes(t));
      score += matchingTopics.length * 2;
      
      // Prioritize weak topics
      const weakTopicMatches = problem.topics.filter(t => 
        userSkillLevel.weakTopics.includes(t)
      );
      score += weakTopicMatches.length * 3;
      
      // Company relevance
      if (problem.companies && problem.companies.length > 0) {
        score += 1;
      }
      
      return { problem, score };
    });
    
    // Sort by score and return top N
    scoredProblems.sort((a, b) => b.score - a.score);
    
    return scoredProblems.slice(0, count).map(sp => sp.problem);
  }

  /**
   * Validate problem data
   */
  private validateProblemData(data: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }
    
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }
    
    if (data.topics && !Array.isArray(data.topics)) {
      errors.push('Topics must be an array');
    }
    
    if (data.testCases) {
      if (!Array.isArray(data.testCases)) {
        errors.push('Test cases must be an array');
      } else if (data.testCases.length === 0) {
        errors.push('At least one test case is required');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user has permission to edit a problem
   */
  private async checkEditPermission(
    problemId: number,
    userId: number
  ): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;
    
    // Admins can edit any problem
    if (user.role === 'admin') return true;
    
    // Professors can edit their own problems
    if (user.role === 'professor') {
      const problem = await storage.getProblem(problemId);
      return problem?.createdBy === userId;
    }
    
    return false;
  }

  /**
   * Transform imported problem data to match schema
   */
  private transformImportedProblem(data: any): Omit<InsertProblem, 'id' | 'createdAt'> {
    return {
      title: data.title || 'Untitled Problem',
      description: data.description || '',
      difficulty: data.difficulty || 'medium',
      topics: Array.isArray(data.topics) ? data.topics : 
              typeof data.topics === 'string' ? data.topics.split(',').map((t: string) => t.trim()) : 
              [],
      starterCode: data.starterCode || {
        python: 'def solution():\n    pass',
        javascript: 'function solution() {\n    // Your code here\n}',
        java: 'class Solution {\n    public void solution() {\n        // Your code here\n    }\n}',
        cpp: '#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    // Your code here\n}'
      },
      testCases: data.testCases || [],
      solution: data.solution || null,
      leetcodeId: data.leetcodeId || null,
      companies: Array.isArray(data.companies) ? data.companies :
                typeof data.companies === 'string' ? data.companies.split(',').map((c: string) => c.trim()) :
                [],
      acceptanceRate: data.acceptanceRate || 0,
      premium: data.premium || false,
      examples: data.examples || [],
      constraints: Array.isArray(data.constraints) ? data.constraints :
                  typeof data.constraints === 'string' ? data.constraints.split('\n').map((c: string) => c.trim()) :
                  []
    };
  }

  /**
   * Transform CSV row to problem data
   */
  private transformCSVProblem(row: any): Omit<InsertProblem, 'id' | 'createdAt'> {
    return {
      title: row.title,
      description: row.description,
      difficulty: row.difficulty?.toLowerCase() || 'medium',
      topics: row.topics ? row.topics.split(';').map((t: string) => t.trim()) : [],
      starterCode: row.starterCode ? JSON.parse(row.starterCode) : {
        python: 'def solution():\n    pass',
        javascript: 'function solution() {\n    // Your code here\n}',
        java: 'class Solution {\n    public void solution() {\n        // Your code here\n    }\n}',
        cpp: '#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    // Your code here\n}'
      },
      testCases: row.testCases ? JSON.parse(row.testCases) : [],
      solution: row.solution ? JSON.parse(row.solution) : null,
      leetcodeId: row.leetcodeId ? parseInt(row.leetcodeId) : null,
      companies: row.companies ? row.companies.split(';').map((c: string) => c.trim()) : [],
      acceptanceRate: row.acceptanceRate ? parseInt(row.acceptanceRate) : 0,
      premium: row.premium === 'true',
      examples: row.examples ? JSON.parse(row.examples) : [],
      constraints: row.constraints ? row.constraints.split(';').map((c: string) => c.trim()) : []
    };
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Fetch problem from LeetCode (placeholder)
   */
  private async fetchLeetCodeProblem(leetcodeId: number): Promise<any> {
    // This would integrate with LeetCode API
    // For now, return a placeholder
    return {
      title: `LeetCode Problem ${leetcodeId}`,
      description: `Problem imported from LeetCode (ID: ${leetcodeId})`,
      difficulty: 'medium',
      topics: ['algorithms'],
      leetcodeId
    };
  }

  /**
   * Get expert users (those who have solved many problems)
   */
  private async getExpertUsers(): Promise<User[]> {
    const allUsers = await storage.getAllUsers();
    const expertThreshold = 50; // Users who have solved 50+ problems
    
    const expertUsers: User[] = [];
    
    for (const user of allUsers) {
      const progress = await storage.getUserProgress(user.id);
      const solvedCount = progress.filter(p => p.completed).length;
      
      if (solvedCount >= expertThreshold) {
        expertUsers.push(user);
      }
    }
    
    return expertUsers;
  }

  /**
   * Calculate difficulty score for a problem
   */
  private async calculateDifficultyScore(problemId: number): Promise<number> {
    const calibration = await this.calibrateDifficulty(problemId);
    
    const difficultyMap = {
      'easy': 1,
      'medium': 2,
      'hard': 3
    };
    
    return difficultyMap[calibration.actualDifficulty] + 
           (1 - calibration.metrics.successRate) * 0.5;
  }

  /**
   * Find related problems based on topics and difficulty
   */
  private async findRelatedProblems(problemId: number): Promise<number[]> {
    const problem = await storage.getProblem(problemId);
    if (!problem) return [];
    
    const allProblems = await storage.getAllProblems();
    
    const related = allProblems
      .filter(p => p.id !== problemId)
      .map(p => {
        let score = 0;
        
        // Topic similarity
        const commonTopics = p.topics.filter(t => problem.topics.includes(t));
        score += commonTopics.length * 2;
        
        // Difficulty similarity
        if (p.difficulty === problem.difficulty) {
          score += 1;
        }
        
        // Company overlap
        const commonCompanies = p.companies?.filter(c => 
          problem.companies?.includes(c)
        ) || [];
        score += commonCompanies.length;
        
        return { id: p.id, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => p.id);
    
    return related;
  }

  /**
   * Calculate user skill level based on their progress
   */
  private async calculateUserSkillLevel(userId: number): Promise<{
    level: 'beginner' | 'intermediate' | 'advanced';
    recommendedDifficulty: 'easy' | 'medium' | 'hard';
    strongTopics: string[];
    weakTopics: string[];
  }> {
    const progress = await storage.getUserProgress(userId);
    const submissions = await storage.getUserSubmissions(userId);
    
    const solvedProblems = progress.filter(p => p.completed);
    const totalSolved = solvedProblems.length;
    
    // Calculate success rate by difficulty
    const difficultyStats: Record<string, { attempted: number; solved: number }> = {
      easy: { attempted: 0, solved: 0 },
      medium: { attempted: 0, solved: 0 },
      hard: { attempted: 0, solved: 0 }
    };
    
    for (const prog of progress) {
      const problem = await storage.getProblem(prog.problemId);
      if (problem) {
        difficultyStats[problem.difficulty].attempted++;
        if (prog.completed) {
          difficultyStats[problem.difficulty].solved++;
        }
      }
    }
    
    // Calculate topic performance
    const topicStats: Record<string, { attempted: number; solved: number }> = {};
    
    for (const prog of progress) {
      const problem = await storage.getProblem(prog.problemId);
      if (problem) {
        for (const topic of problem.topics) {
          if (!topicStats[topic]) {
            topicStats[topic] = { attempted: 0, solved: 0 };
          }
          topicStats[topic].attempted++;
          if (prog.completed) {
            topicStats[topic].solved++;
          }
        }
      }
    }
    
    // Determine skill level
    let level: 'beginner' | 'intermediate' | 'advanced';
    let recommendedDifficulty: 'easy' | 'medium' | 'hard';
    
    if (totalSolved < 20) {
      level = 'beginner';
      recommendedDifficulty = 'easy';
    } else if (totalSolved < 50) {
      level = 'intermediate';
      const easySuccessRate = difficultyStats.easy.attempted > 0
        ? difficultyStats.easy.solved / difficultyStats.easy.attempted
        : 0;
      recommendedDifficulty = easySuccessRate > 0.8 ? 'medium' : 'easy';
    } else {
      level = 'advanced';
      const mediumSuccessRate = difficultyStats.medium.attempted > 0
        ? difficultyStats.medium.solved / difficultyStats.medium.attempted
        : 0;
      recommendedDifficulty = mediumSuccessRate > 0.7 ? 'hard' : 'medium';
    }
    
    // Identify strong and weak topics
    const topics = Object.entries(topicStats)
      .filter(([_, stats]) => stats.attempted >= 3)
      .map(([topic, stats]) => ({
        topic,
        successRate: stats.solved / stats.attempted
      }))
      .sort((a, b) => b.successRate - a.successRate);
    
    const strongTopics = topics
      .filter(t => t.successRate >= 0.7)
      .slice(0, 5)
      .map(t => t.topic);
    
    const weakTopics = topics
      .filter(t => t.successRate < 0.5)
      .slice(0, 5)
      .map(t => t.topic);
    
    return {
      level,
      recommendedDifficulty,
      strongTopics,
      weakTopics
    };
  }

  /**
   * Generate problem report for analytics
   */
  async generateProblemReport(problemId: number): Promise<{
    problem: Problem;
    metadata: ProblemMetadata;
    calibration: DifficultyCalibration;
    topPerformers: { userId: number; runtime: number; memory: number }[];
    commonMistakes: string[];
  }> {
    const problem = await storage.getProblem(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }
    
    const metadata = await this.getProblemMetadata(problemId);
    const calibration = await this.calibrateDifficulty(problemId);
    
    // Get top performers
    const submissions = await storage.getSubmissionsByProblem(problemId);
    const acceptedSubmissions = submissions
      .filter((s: Submission) => s.status === 'accepted')
      .sort((a: Submission, b: Submission) => (a.runtime || 0) - (b.runtime || 0))
      .slice(0, 10);
    
    const topPerformers = acceptedSubmissions.map((s: Submission) => ({
      userId: s.userId,
      runtime: s.runtime || 0,
      memory: s.memory || 0
    }));
    
    // Analyze common mistakes
    const failedSubmissions = submissions.filter((s: Submission) => s.status !== 'accepted');
    const commonMistakes = this.analyzeCommonMistakes(failedSubmissions);
    
    return {
      problem,
      metadata,
      calibration,
      topPerformers,
      commonMistakes
    };
  }

  /**
   * Analyze common mistakes from failed submissions
   */
  private analyzeCommonMistakes(submissions: any[]): string[] {
    const mistakes: Record<string, number> = {};
    
    for (const submission of submissions) {
      if (submission.status === 'wrong_answer') {
        mistakes['Incorrect algorithm or logic'] = (mistakes['Incorrect algorithm or logic'] || 0) + 1;
      } else if (submission.status === 'time_limit_exceeded') {
        mistakes['Inefficient algorithm (too slow)'] = (mistakes['Inefficient algorithm (too slow)'] || 0) + 1;
      } else if (submission.status === 'runtime_error') {
        mistakes['Runtime errors (null pointer, array bounds, etc.)'] = 
          (mistakes['Runtime errors (null pointer, array bounds, etc.)'] || 0) + 1;
      } else if (submission.status === 'compilation_error') {
        mistakes['Syntax or compilation errors'] = (mistakes['Syntax or compilation errors'] || 0) + 1;
      }
    }
    
    return Object.entries(mistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mistake]) => mistake);
  }
}

export const problemManager = new ProblemManager();