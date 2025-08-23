import { Router } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

const router = Router();

// Admin authentication middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all users with filters
router.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = 'all', status = 'all' } = req.query;
    
    // Get all users
    let users = await storage.getAllUsers();
    
    // Apply filters
    if (search) {
      const searchLower = search.toString().toLowerCase();
      users = users.filter((u: any) => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.username?.toLowerCase().includes(searchLower)
      );
    }
    
    if (role !== 'all') {
      users = users.filter((u: any) => u.role === role);
    }
    
    if (status !== 'all') {
      users = users.filter((u: any) => (u.status || 'active') === status);
    }
    
    // Calculate pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    // Add additional user data
    const enrichedUsers = await Promise.all(paginatedUsers.map(async (user: any) => {
      const enrollments = await storage.getUserEnrollments(user.id);
      const submissions = await storage.getUserSubmissions(user.id);
      
      return {
        ...user,
        username: user.username || user.email?.split('@')[0] || `user${user.id}`,
        status: user.status || 'active',
        department: user.department || 'Computer Science',
        lastLogin: user.lastLogin || user.updatedAt,
        coursesEnrolled: enrollments.length,
        submissionCount: submissions.length,
      };
    }));
    
    res.json({
      users: enrichedUsers,
      total: users.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(users.length / Number(limit))
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user statistics
router.get("/api/admin/user-stats", requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u: any) => (u.status || 'active') === 'active').length,
      suspendedUsers: users.filter((u: any) => u.status === 'suspended').length,
      inactiveUsers: users.filter((u: any) => u.status === 'inactive').length,
      students: users.filter((u: any) => u.role === 'student').length,
      professors: users.filter((u: any) => u.role === 'professor').length,
      admins: users.filter((u: any) => u.role === 'admin').length,
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

// Create new user
router.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { username, email, name, password, role, department } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await storage.createUser({
      username: username || email.split('@')[0],
      email,
      name,
      password: hashedPassword,
      role: role || 'student',
      department,
      status: 'active'
    });
    
    res.json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
router.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    // Don't allow updating password directly
    delete updates.password;
    
    const updatedUser = await storage.updateUser(userId, updates);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Don't allow deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    await storage.deleteUser(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Reset user password
router.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(userId, { password: hashedPassword });
    
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Get system health metrics
router.get("/api/admin/system-health", requireAdmin, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date(),
      services: {
        database: 'connected',
        ai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
        lms: 'ready',
        jobBoard: 'ready',
        collaboration: 'active'
      }
    };
    
    res.json(health);
  } catch (error) {
    console.error("Error fetching system health:", error);
    res.status(500).json({ error: "Failed to fetch system health" });
  }
});

// Get activity logs
router.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // In a real implementation, this would fetch from a logging table
    const logs = [
      {
        id: 1,
        timestamp: new Date(),
        userId: 1,
        action: 'user_login',
        details: 'User logged in successfully',
        ip: '192.168.1.1'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000),
        userId: 2,
        action: 'problem_submit',
        details: 'Submitted solution for problem #42',
        ip: '192.168.1.2'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 7200000),
        userId: 3,
        action: 'course_enroll',
        details: 'Enrolled in CS101',
        ip: '192.168.1.3'
      }
    ];
    
    res.json(logs.slice(0, Number(limit)));
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

// Get department stats
router.get("/api/admin/department-stats", requireAdmin, async (req, res) => {
  try {
    const departments = [
      { name: 'Computer Science', value: 35, students: 5200, color: '#82ca9d' },
      { name: 'Engineering', value: 28, students: 4100, color: '#8884d8' },
      { name: 'Mathematics', value: 18, students: 2700, color: '#ffc658' },
      { name: 'Physics', value: 11, students: 1650, color: '#ff7c7c' },
      { name: 'Business', value: 8, students: 1200, color: '#8dd1e1' },
    ];
    res.json(departments);
  } catch (error) {
    console.error("Error fetching department stats:", error);
    res.status(500).json({ error: "Failed to fetch department stats" });
  }
});

// Get performance data
router.get("/api/admin/performance-data", requireAdmin, async (req, res) => {
  try {
    const data = [
      { month: 'Jan', users: 12453, revenue: 245000, submissions: 38920 },
      { month: 'Feb', users: 13102, revenue: 258900, submissions: 41235 },
      { month: 'Mar', users: 13876, revenue: 267400, submissions: 43876 },
      { month: 'Apr', users: 14234, revenue: 271200, submissions: 45012 },
      { month: 'May', users: 14897, revenue: 279800, submissions: 46543 },
      { month: 'Jun', users: 15234, revenue: 287500, submissions: 48295 },
    ];
    res.json(data);
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// Get recent activities
router.get("/api/admin/recent-activities", requireAdmin, async (req, res) => {
  try {
    const activities = [
      { id: 1, type: 'user_registration', message: 'New user registered: John Doe', time: '5 minutes ago', status: 'info' },
      { id: 2, type: 'submission', message: 'Problem submission from Alice Smith', time: '12 minutes ago', status: 'success' },
      { id: 3, type: 'course_enrollment', message: 'Bob Johnson enrolled in CS101', time: '1 hour ago', status: 'info' },
      { id: 4, type: 'system_alert', message: 'High server CPU usage detected', time: '3 hours ago', status: 'warning' },
      { id: 5, type: 'backup_completed', message: 'Daily backup completed successfully', time: '5 hours ago', status: 'success' },
    ];
    res.json(activities);
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    res.status(500).json({ error: "Failed to fetch recent activities" });
  }
});

// Get course stats
router.get("/api/admin/course-stats", requireAdmin, async (req, res) => {
  try {
    const courses = await storage.getAllCourses();
    const enrollments = await storage.getAllEnrollments();
    
    const stats = {
      totalCourses: courses.length,
      activeCourses: courses.filter((c: any) => c.status === 'active').length,
      archivedCourses: courses.filter((c: any) => c.status === 'archived').length,
      averageEnrollment: enrollments.length > 0 ? Math.floor(enrollments.length / courses.length) : 0,
      completionRate: 72.3,
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching course stats:", error);
    res.status(500).json({ error: "Failed to fetch course stats" });
  }
});

// Get system stats
router.get("/api/admin/system-stats", requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalProblems: (await storage.getAllProblems()).length,
      totalSubmissions: (await storage.getAllSubmissions()).length,
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      serverStatus: 'healthy',
      uptime: '99.9%',
      apiCalls: Math.floor(Math.random() * 100000) + 50000,
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({ error: "Failed to fetch system stats" });
  }
});

// Get analytics overview
router.get("/api/admin/analytics-overview", requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const problems = await storage.getAllProblems();
    const submissions = await storage.getAllSubmissions();
    const courses = await storage.getAllCourses();
    
    const overview = {
      users: {
        total: users.length,
        growth: Math.random() * 20 - 10, // Placeholder
        activeToday: Math.floor(users.length * 0.3),
        activeThisWeek: Math.floor(users.length * 0.6),
        activeThisMonth: Math.floor(users.length * 0.8)
      },
      problems: {
        total: problems.length,
        byDifficulty: {
          easy: problems.filter((p: any) => p.difficulty === 'easy').length,
          medium: problems.filter((p: any) => p.difficulty === 'medium').length,
          hard: problems.filter((p: any) => p.difficulty === 'hard').length
        }
      },
      submissions: {
        total: submissions.length,
        today: Math.floor(Math.random() * 100),
        thisWeek: Math.floor(Math.random() * 500),
        thisMonth: Math.floor(Math.random() * 2000),
        averagePerUser: submissions.length / users.length
      },
      courses: {
        total: courses.length,
        active: courses.filter((c: any) => c.status === 'active').length,
        averageEnrollment: Math.floor(Math.random() * 50) + 20
      },
      engagement: {
        dailyActiveUsers: Math.floor(users.length * 0.3),
        weeklyActiveUsers: Math.floor(users.length * 0.6),
        monthlyActiveUsers: Math.floor(users.length * 0.8),
        averageSessionDuration: '45 minutes',
        bounceRate: '12%'
      }
    };
    
    res.json(overview);
  } catch (error) {
    console.error("Error fetching analytics overview:", error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

// Get department performance
router.get("/api/admin/department-performance/:period", requireAdmin, async (req, res) => {
  try {
    const performance = {
      departments: [
        { name: 'Computer Science', score: 92, students: 5200, faculty: 85 },
        { name: 'Engineering', score: 88, students: 4100, faculty: 72 },
        { name: 'Mathematics', score: 85, students: 2700, faculty: 45 },
        { name: 'Physics', score: 87, students: 1650, faculty: 38 },
        { name: 'Business', score: 82, students: 1200, faculty: 28 },
      ],
      metrics: {
        averageGPA: 3.42,
        completionRate: 78.5,
        employmentRate: 89.2,
        researchOutput: 1245,
      }
    };
    res.json(performance);
  } catch (error) {
    console.error("Error fetching department performance:", error);
    res.status(500).json({ error: "Failed to fetch department performance" });
  }
});

// Get course analytics
router.get("/api/admin/course-analytics/:courseId", requireAdmin, async (req, res) => {
  try {
    const analytics = {
      enrollmentTrend: [
        { week: 'W1', enrolled: 45 },
        { week: 'W2', enrolled: 52 },
        { week: 'W3', enrolled: 58 },
        { week: 'W4', enrolled: 62 },
      ],
      performanceDistribution: {
        A: 15,
        B: 25,
        C: 20,
        D: 8,
        F: 2,
      },
      completionRate: 85.7,
      averageScore: 78.3,
    };
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching course analytics:", error);
    res.status(500).json({ error: "Failed to fetch course analytics" });
  }
});

// Get enrollment trends
router.get("/api/admin/enrollment-trends", requireAdmin, async (req, res) => {
  try {
    const trends = [
      { semester: 'Fall 2023', students: 14500, courses: 342 },
      { semester: 'Spring 2024', students: 14800, courses: 356 },
      { semester: 'Summer 2024', students: 8200, courses: 198 },
      { semester: 'Fall 2024', students: 15200, courses: 368 },
      { semester: 'Spring 2025', students: 15500, courses: 375 },
    ];
    res.json(trends);
  } catch (error) {
    console.error("Error fetching enrollment trends:", error);
    res.status(500).json({ error: "Failed to fetch enrollment trends" });
  }
});

// Get faculty metrics
router.get("/api/admin/faculty-metrics", requireAdmin, async (req, res) => {
  try {
    const professors = await storage.getAllUsers();
    const facultyMembers = professors.filter((u: any) => u.role === 'professor');
    
    const metrics = {
      totalFaculty: facultyMembers.length,
      averageRating: 4.3,
      coursesPerFaculty: 3.2,
      researchProjects: 156,
      publications: 423,
      distribution: {
        fullTime: Math.floor(facultyMembers.length * 0.7),
        partTime: Math.floor(facultyMembers.length * 0.2),
        visiting: Math.floor(facultyMembers.length * 0.1),
      }
    };
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching faculty metrics:", error);
    res.status(500).json({ error: "Failed to fetch faculty metrics" });
  }
});

// Get student outcomes
router.get("/api/admin/student-outcomes", requireAdmin, async (req, res) => {
  try {
    const outcomes = {
      graduationRate: 82.5,
      averageGPA: 3.42,
      employmentRate: 89.2,
      averageSalary: 75000,
      furtherEducation: 23.5,
      topEmployers: [
        { name: 'Google', count: 45 },
        { name: 'Microsoft', count: 38 },
        { name: 'Amazon', count: 35 },
        { name: 'Meta', count: 28 },
        { name: 'Apple', count: 22 },
      ],
      skillsProficiency: {
        programming: 88,
        problemSolving: 85,
        communication: 78,
        teamwork: 82,
        leadership: 75,
      }
    };
    res.json(outcomes);
  } catch (error) {
    console.error("Error fetching student outcomes:", error);
    res.status(500).json({ error: "Failed to fetch student outcomes" });
  }
});

// Get institutional stats
router.get("/api/admin/institutional-stats/:department/:period", requireAdmin, async (req, res) => {
  try {
    const stats = {
      overview: {
        totalStudents: 15500,
        totalFaculty: 512,
        totalCourses: 375,
        totalDepartments: 12,
      },
      rankings: {
        national: 42,
        regional: 8,
        subjectSpecific: 15,
      },
      financials: {
        revenue: 125000000,
        expenses: 118000000,
        research: 32000000,
        endowment: 450000000,
      },
      demographics: {
        undergraduate: 11200,
        graduate: 3800,
        doctoral: 500,
        international: 2100,
      }
    };
    res.json(stats);
  } catch (error) {
    console.error("Error fetching institutional stats:", error);
    res.status(500).json({ error: "Failed to fetch institutional stats" });
  }
});

// Get competency assessment
router.get("/api/admin/competency-assessment", requireAdmin, async (req, res) => {
  try {
    const assessment = {
      competencies: [
        { name: 'Technical Skills', score: 85, trend: 'up' },
        { name: 'Critical Thinking', score: 78, trend: 'stable' },
        { name: 'Communication', score: 72, trend: 'up' },
        { name: 'Leadership', score: 68, trend: 'down' },
        { name: 'Collaboration', score: 80, trend: 'up' },
      ],
      assessmentTypes: {
        exams: 45,
        projects: 30,
        presentations: 15,
        participation: 10,
      },
      improvementAreas: [
        'Written communication',
        'Public speaking',
        'Time management',
        'Research methodology',
      ]
    };
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching competency assessment:", error);
    res.status(500).json({ error: "Failed to fetch competency assessment" });
  }
});

// Get users with pagination and filters
router.get("/api/admin/users/:page/:role/:status", requireAdmin, async (req, res) => {
  try {
    const { page = '1', role = 'all', status = 'all' } = req.params;
    const limit = 10;
    
    let users = await storage.getAllUsers();
    
    // Apply filters
    if (role !== 'all') {
      users = users.filter((u: any) => u.role === role);
    }
    
    if (status !== 'all') {
      users = users.filter((u: any) => (u.status || 'active') === status);
    }
    
    // Calculate pagination
    const startIndex = (Number(page) - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
      users: paginatedUsers,
      total: users.length,
      page: Number(page),
      limit,
      totalPages: Math.ceil(users.length / limit)
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;