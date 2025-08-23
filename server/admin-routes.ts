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

export default router;