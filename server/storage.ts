import { User, InsertUser, Problem, InsertProblem, TestCase, InsertTestCase, Submission, InsertSubmission, Progress, InsertProgress } from '../shared/schema.js';

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;

  // Problem operations
  createProblem(problem: InsertProblem): Promise<Problem>;
  getProblemById(id: string): Promise<Problem | null>;
  getProblems(filters?: { difficulty?: string; category?: string; tags?: string[] }): Promise<Problem[]>;
  updateProblem(id: string, updates: Partial<InsertProblem>): Promise<Problem | null>;
  deleteProblem(id: string): Promise<boolean>;

  // Test case operations
  createTestCase(testCase: InsertTestCase): Promise<TestCase>;
  getTestCasesByProblemId(problemId: string): Promise<TestCase[]>;
  updateTestCase(id: string, updates: Partial<InsertTestCase>): Promise<TestCase | null>;
  deleteTestCase(id: string): Promise<boolean>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionById(id: string): Promise<Submission | null>;
  getSubmissionsByUserId(userId: string): Promise<Submission[]>;
  getSubmissionsByProblemId(problemId: string): Promise<Submission[]>;
  updateSubmission(id: string, updates: Partial<InsertSubmission>): Promise<Submission | null>;

  // Progress operations
  createProgress(progress: InsertProgress): Promise<Progress>;
  getProgressByUserAndProblem(userId: string, problemId: string): Promise<Progress | null>;
  getProgressByUserId(userId: string): Promise<Progress[]>;
  updateProgress(id: string, updates: Partial<InsertProgress>): Promise<Progress | null>;
}

// In-memory storage implementation for Stage 1
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private problems: Map<string, Problem> = new Map();
  private testCases: Map<string, TestCase> = new Map();
  private submissions: Map<string, Submission> = new Map();
  private progress: Map<string, Progress> = new Map();

  constructor() {
    this.seedData();
  }

  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Problem operations
  async createProblem(problem: InsertProblem): Promise<Problem> {
    const id = crypto.randomUUID();
    const newProblem: Problem = {
      ...problem,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.problems.set(id, newProblem);
    return newProblem;
  }

  async getProblemById(id: string): Promise<Problem | null> {
    return this.problems.get(id) || null;
  }

  async getProblems(filters?: { difficulty?: string; category?: string; tags?: string[] }): Promise<Problem[]> {
    let problems = Array.from(this.problems.values());
    
    if (filters?.difficulty) {
      problems = problems.filter(p => p.difficulty === filters.difficulty);
    }
    if (filters?.category) {
      problems = problems.filter(p => p.category === filters.category);
    }
    if (filters?.tags) {
      problems = problems.filter(p => 
        filters.tags!.some(tag => p.tags.includes(tag))
      );
    }
    
    return problems;
  }

  async updateProblem(id: string, updates: Partial<InsertProblem>): Promise<Problem | null> {
    const problem = this.problems.get(id);
    if (!problem) return null;

    const updatedProblem = { ...problem, ...updates, updatedAt: new Date() };
    this.problems.set(id, updatedProblem);
    return updatedProblem;
  }

  async deleteProblem(id: string): Promise<boolean> {
    return this.problems.delete(id);
  }

  // Test case operations
  async createTestCase(testCase: InsertTestCase): Promise<TestCase> {
    const id = crypto.randomUUID();
    const newTestCase: TestCase = { ...testCase, id };
    this.testCases.set(id, newTestCase);
    return newTestCase;
  }

  async getTestCasesByProblemId(problemId: string): Promise<TestCase[]> {
    return Array.from(this.testCases.values()).filter(tc => tc.problemId === problemId);
  }

  async updateTestCase(id: string, updates: Partial<InsertTestCase>): Promise<TestCase | null> {
    const testCase = this.testCases.get(id);
    if (!testCase) return null;

    const updatedTestCase = { ...testCase, ...updates };
    this.testCases.set(id, updatedTestCase);
    return updatedTestCase;
  }

  async deleteTestCase(id: string): Promise<boolean> {
    return this.testCases.delete(id);
  }

  // Submission operations
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const id = crypto.randomUUID();
    const newSubmission: Submission = {
      ...submission,
      id,
      submittedAt: new Date(),
    };
    this.submissions.set(id, newSubmission);
    return newSubmission;
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    return this.submissions.get(id) || null;
  }

  async getSubmissionsByUserId(userId: string): Promise<Submission[]> {
    return Array.from(this.submissions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getSubmissionsByProblemId(problemId: string): Promise<Submission[]> {
    return Array.from(this.submissions.values())
      .filter(s => s.problemId === problemId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async updateSubmission(id: string, updates: Partial<InsertSubmission>): Promise<Submission | null> {
    const submission = this.submissions.get(id);
    if (!submission) return null;

    const updatedSubmission = { ...submission, ...updates };
    this.submissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  // Progress operations
  async createProgress(progress: InsertProgress): Promise<Progress> {
    const id = crypto.randomUUID();
    const newProgress: Progress = { ...progress, id };
    this.progress.set(id, newProgress);
    return newProgress;
  }

  async getProgressByUserAndProblem(userId: string, problemId: string): Promise<Progress | null> {
    for (const progress of this.progress.values()) {
      if (progress.userId === userId && progress.problemId === problemId) {
        return progress;
      }
    }
    return null;
  }

  async getProgressByUserId(userId: string): Promise<Progress[]> {
    return Array.from(this.progress.values()).filter(p => p.userId === userId);
  }

  async updateProgress(id: string, updates: Partial<InsertProgress>): Promise<Progress | null> {
    const progress = this.progress.get(id);
    if (!progress) return null;

    const updatedProgress = { ...progress, ...updates };
    this.progress.set(id, updatedProgress);
    return updatedProgress;
  }

  // Seed initial data
  private async seedData() {
    // Create admin user
    const adminUser = await this.createUser({
      email: 'admin@university.edu',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      university: 'Demo University',
      department: 'Computer Science',
    });

    // Create student user
    const studentUser = await this.createUser({
      email: 'student@university.edu',
      password: 'student123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
      university: 'Demo University',
      department: 'Computer Science',
    });

    // Create professor user
    const professorUser = await this.createUser({
      email: 'professor@university.edu',
      password: 'professor123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'professor',
      university: 'Demo University',
      department: 'Computer Science',
    });

    // Create sample problems
    const twoSumProblem = await this.createProblem({
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`,
      difficulty: 'easy',
      category: 'Arrays',
      tags: ['array', 'hash-table'],
      starterCode: {
        python: 'def two_sum(nums, target):\n    # Your code here\n    pass',
        javascript: 'function twoSum(nums, target) {\n    // Your code here\n}',
        java: 'public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return new int[2];\n}',
      },
      solution: {
        python: 'def two_sum(nums, target):\n    num_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in num_map:\n            return [num_map[complement], i]\n        num_map[num] = i\n    return []',
        javascript: 'function twoSum(nums, target) {\n    const numMap = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (numMap.has(complement)) {\n            return [numMap.get(complement), i];\n        }\n        numMap.set(nums[i], i);\n    }\n    return [];\n}',
        java: 'public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> numMap = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (numMap.containsKey(complement)) {\n            return new int[]{numMap.get(complement), i};\n        }\n        numMap.put(nums[i], i);\n    }\n    return new int[2];\n}',
      },
      timeLimit: 10,
      memoryLimit: 128,
      createdBy: professorUser.id,
    });

    // Create test cases for Two Sum
    await this.createTestCase({
      problemId: twoSumProblem.id,
      input: '[2,7,11,15]\n9',
      expectedOutput: '[0,1]',
      isHidden: false,
      explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
    });

    await this.createTestCase({
      problemId: twoSumProblem.id,
      input: '[3,2,4]\n6',
      expectedOutput: '[1,2]',
      isHidden: false,
      explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
    });

    await this.createTestCase({
      problemId: twoSumProblem.id,
      input: '[3,3]\n6',
      expectedOutput: '[0,1]',
      isHidden: true,
      explanation: 'nums[0] + nums[1] = 3 + 3 = 6',
    });
  }
}