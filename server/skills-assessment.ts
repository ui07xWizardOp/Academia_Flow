import { Router } from "express";
import { storage } from "./storage";
import { codeExecutor } from "./code-executor";
import OpenAI from "openai";

const router = Router();

// Skills Assessment Engine
export class SkillsAssessmentEngine {
  private openai: OpenAI | null;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.openai = null;
    }
  }

  async generateAssessment(skill: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<any> {
    const questions = [];
    
    // Generate different types of questions based on skill and level
    if (skill.toLowerCase().includes('javascript') || skill.toLowerCase().includes('python')) {
      // Programming assessment
      questions.push(...this.generateProgrammingQuestions(skill, level));
    } else if (skill.toLowerCase().includes('sql') || skill.toLowerCase().includes('database')) {
      // Database assessment
      questions.push(...this.generateDatabaseQuestions(skill, level));
    } else {
      // General technical assessment
      questions.push(...this.generateTechnicalQuestions(skill, level));
    }
    
    return {
      skill,
      level,
      questions,
      timeLimit: level === 'beginner' ? 30 : level === 'intermediate' ? 45 : 60,
      passingScore: level === 'beginner' ? 60 : level === 'intermediate' ? 70 : 80
    };
  }

  private generateProgrammingQuestions(skill: string, level: string): any[] {
    const questions = [];
    
    if (level === 'beginner') {
      questions.push({
        type: 'coding',
        question: 'Write a function that returns the sum of two numbers',
        testCases: [
          { input: '1, 2', output: '3' },
          { input: '5, 10', output: '15' }
        ],
        points: 10
      });
      questions.push({
        type: 'multiple-choice',
        question: 'What is the output of console.log(typeof [])?',
        options: ['array', 'object', 'undefined', 'null'],
        correct: 1,
        points: 5
      });
    } else if (level === 'intermediate') {
      questions.push({
        type: 'coding',
        question: 'Write a function to find the longest common prefix in an array of strings',
        testCases: [
          { input: '["flower", "flow", "flight"]', output: '"fl"' },
          { input: '["dog", "racecar", "car"]', output: '""' }
        ],
        points: 20
      });
      questions.push({
        type: 'debugging',
        question: 'Fix the following code that should reverse a string',
        code: 'function reverse(str) { return str.split().reverse().join() }',
        expectedOutput: 'function reverse(str) { return str.split("").reverse().join("") }',
        points: 15
      });
    } else {
      questions.push({
        type: 'coding',
        question: 'Implement a binary search tree with insert and search methods',
        testCases: [
          { 
            input: 'BST with values [5,3,7,1,9], search(3)', 
            output: 'true' 
          }
        ],
        points: 30
      });
      questions.push({
        type: 'system-design',
        question: 'Design a URL shortening service like bit.ly',
        rubric: {
          'Database design': 10,
          'API design': 10,
          'Scalability considerations': 10,
          'Performance optimization': 10
        },
        points: 40
      });
    }
    
    return questions;
  }

  private generateDatabaseQuestions(skill: string, level: string): any[] {
    const questions = [];
    
    if (level === 'beginner') {
      questions.push({
        type: 'sql',
        question: 'Write a query to select all users with age greater than 18',
        expectedQuery: 'SELECT * FROM users WHERE age > 18',
        points: 10
      });
    } else if (level === 'intermediate') {
      questions.push({
        type: 'sql',
        question: 'Write a query to find the average salary by department',
        expectedQuery: 'SELECT department, AVG(salary) FROM employees GROUP BY department',
        points: 15
      });
    } else {
      questions.push({
        type: 'sql',
        question: 'Write a query to find employees who earn more than their manager',
        expectedQuery: `SELECT e.name FROM employees e 
                       JOIN employees m ON e.manager_id = m.id 
                       WHERE e.salary > m.salary`,
        points: 25
      });
    }
    
    return questions;
  }

  private generateTechnicalQuestions(skill: string, level: string): any[] {
    return [
      {
        type: 'multiple-choice',
        question: `What is a key concept in ${skill}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0,
        points: 10
      },
      {
        type: 'short-answer',
        question: `Explain the main use case for ${skill}`,
        keywords: [skill.toLowerCase(), 'application', 'benefit'],
        points: 10
      }
    ];
  }

  async evaluateSubmission(assessmentId: number, userId: number, answers: any[]): Promise<any> {
    let totalScore = 0;
    const results = [];
    
    // Get assessment details
    const assessment = await storage.getSkillsAssessment(assessmentId);
    if (!assessment) throw new Error('Assessment not found');
    
    // Evaluate each answer
    for (let i = 0; i < answers.length; i++) {
      const question = assessment.questions[i];
      const answer = answers[i];
      let score = 0;
      let feedback = '';
      
      switch (question.type) {
        case 'coding':
          const codeResult = await this.evaluateCodingAnswer(question, answer);
          score = codeResult.score;
          feedback = codeResult.feedback;
          break;
          
        case 'multiple-choice':
          score = answer === question.correct ? question.points : 0;
          feedback = score > 0 ? 'Correct!' : `Incorrect. The correct answer was option ${question.correct + 1}`;
          break;
          
        case 'sql':
          score = this.evaluateSQLAnswer(question, answer);
          feedback = score > 0 ? 'Query is correct!' : 'Query needs improvement';
          break;
          
        case 'short-answer':
          score = this.evaluateShortAnswer(question, answer);
          feedback = `Score: ${score}/${question.points}`;
          break;
          
        default:
          score = 0;
          feedback = 'Question type not supported';
      }
      
      totalScore += score;
      results.push({ questionId: i, score, feedback });
    }
    
    const percentage = (totalScore / assessment.totalPoints) * 100;
    const passed = percentage >= assessment.passingScore;
    
    // Update user's skill assessment record
    await storage.updateSkillsAssessment(assessmentId, {
      score: totalScore,
      completedAt: new Date(),
      passed
    });
    
    return {
      assessmentId,
      userId,
      totalScore,
      percentage,
      passed,
      results,
      certificate: passed ? this.generateCertificate(userId, assessment.skill, assessment.level) : null
    };
  }

  private async evaluateCodingAnswer(question: any, answer: string): Promise<any> {
    let passedTests = 0;
    const testResults = [];
    
    for (const testCase of question.testCases) {
      try {
        const result = await codeExecutor.executeCode({
          code: answer,
          language: 'javascript',
          testCases: [testCase]
        });
        
        if (result.stdout.trim() === testCase.output) {
          passedTests++;
          testResults.push({ passed: true });
        } else {
          testResults.push({ passed: false, expected: testCase.output, actual: result.stdout });
        }
      } catch (error) {
        testResults.push({ passed: false, error: 'Code execution failed' });
      }
    }
    
    const score = (passedTests / question.testCases.length) * question.points;
    const feedback = `Passed ${passedTests}/${question.testCases.length} test cases`;
    
    return { score, feedback, testResults };
  }

  private evaluateSQLAnswer(question: any, answer: string): number {
    // Normalize and compare SQL queries
    const normalize = (sql: string) => sql.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized = normalize(answer);
    const expected = normalize(question.expectedQuery);
    
    if (normalized === expected) {
      return question.points;
    }
    
    // Partial credit for similar queries
    const keywords = ['select', 'from', 'where', 'group by', 'order by', 'join'];
    let matches = 0;
    keywords.forEach(keyword => {
      if (normalized.includes(keyword) && expected.includes(keyword)) {
        matches++;
      }
    });
    
    return Math.floor((matches / keywords.length) * question.points * 0.5);
  }

  private evaluateShortAnswer(question: any, answer: string): number {
    const lowerAnswer = answer.toLowerCase();
    let matches = 0;
    
    question.keywords.forEach((keyword: string) => {
      if (lowerAnswer.includes(keyword.toLowerCase())) {
        matches++;
      }
    });
    
    return Math.floor((matches / question.keywords.length) * question.points);
  }

  private generateCertificate(userId: number, skill: string, level: string): any {
    return {
      certificateId: `CERT-${userId}-${Date.now()}`,
      userId,
      skill,
      level,
      issuedDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      verificationUrl: `/verify/certificate/${userId}/${skill}/${level}`
    };
  }

  async generateAdaptiveQuestions(userId: number, skill: string, previousScore: number): Promise<any[]> {
    // Adaptive algorithm that adjusts difficulty based on performance
    let difficulty: 'beginner' | 'intermediate' | 'advanced';
    
    if (previousScore < 50) {
      difficulty = 'beginner';
    } else if (previousScore < 80) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'advanced';
    }
    
    const assessment = await this.generateAssessment(skill, difficulty);
    
    // Add adaptive modifications
    if (previousScore < 30) {
      // Add hints for struggling users
      assessment.questions = assessment.questions.map((q: any) => ({
        ...q,
        hint: `Hint: Consider ${skill} fundamentals`
      }));
    } else if (previousScore > 90) {
      // Add bonus challenges for high performers
      assessment.questions.push({
        type: 'bonus',
        question: `Advanced ${skill} challenge`,
        points: 20,
        isBonus: true
      });
    }
    
    return assessment.questions;
  }
}

const assessmentEngine = new SkillsAssessmentEngine();

// API Routes
router.get("/api/skills-assessment/available", async (req, res) => {
  try {
    const assessments = await storage.getAvailableAssessments();
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

router.post("/api/skills-assessment/start", async (req: any, res) => {
  try {
    const { skill, level } = req.body;
    const userId = req.user?.id || 1;
    
    const assessment = await assessmentEngine.generateAssessment(skill, level);
    
    // Store assessment in database
    const saved = await storage.createSkillsAssessment({
      userId,
      skill,
      level,
      questions: assessment.questions,
      totalPoints: assessment.questions.reduce((sum: number, q: any) => sum + q.points, 0),
      timeLimit: assessment.timeLimit,
      startedAt: new Date()
    });
    
    res.json(saved);
  } catch (error) {
    console.error("Error starting assessment:", error);
    res.status(500).json({ error: "Failed to start assessment" });
  }
});

router.post("/api/skills-assessment/:id/submit", async (req: any, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const userId = req.user?.id || 1;
    const { answers } = req.body;
    
    const result = await assessmentEngine.evaluateSubmission(assessmentId, userId, answers);
    res.json(result);
  } catch (error) {
    console.error("Error submitting assessment:", error);
    res.status(500).json({ error: "Failed to submit assessment" });
  }
});

router.get("/api/skills-assessment/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const assessments = await storage.getUserSkillsAssessments(userId);
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching user assessments:", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

router.get("/api/skills-assessment/:id/adaptive", async (req: any, res) => {
  try {
    const assessmentId = parseInt(req.params.id);
    const userId = req.user?.id || 1;
    
    const assessment = await storage.getSkillsAssessment(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    
    const questions = await assessmentEngine.generateAdaptiveQuestions(
      userId,
      assessment.skill,
      assessment.score || 0
    );
    
    res.json(questions);
  } catch (error) {
    console.error("Error generating adaptive questions:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

router.get("/api/skills-assessment/certificates/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const certificates = await storage.getUserCertificates(userId);
    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ error: "Failed to fetch certificates" });
  }
});

// Skill Gap Analysis
router.get("/api/skills-assessment/gap-analysis/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get user's current skills
    const userSkills = await storage.getUserSkills(userId);
    
    // Get desired role requirements
    const userProfile = await storage.getUserProfile(userId);
    const roleRequirements = await storage.getRoleRequirements(userProfile.desiredRole);
    
    // Calculate gaps
    const gaps = roleRequirements
      .filter((required: any) => {
        const userSkill = userSkills.find((s: any) => s.name === required.skill);
        return !userSkill || userSkill.level < required.level;
      })
      .map((required: any) => {
        const userSkill = userSkills.find((s: any) => s.name === required.skill);
        return {
          skill: required.skill,
          currentLevel: userSkill?.level || 0,
          requiredLevel: required.level,
          gap: required.level - (userSkill?.level || 0),
          priority: required.priority,
          learningResources: required.resources
        };
      })
      .sort((a: any, b: any) => b.priority - a.priority);
    
    res.json({
      userId,
      desiredRole: userProfile.desiredRole,
      currentSkills: userSkills,
      requiredSkills: roleRequirements,
      gaps,
      recommendedPath: gaps.slice(0, 5) // Top 5 priorities
    });
  } catch (error) {
    console.error("Error in gap analysis:", error);
    res.status(500).json({ error: "Failed to perform gap analysis" });
  }
});

export default router;