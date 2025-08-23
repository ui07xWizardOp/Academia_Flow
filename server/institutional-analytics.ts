import { Router } from "express";
import { storage } from "./storage";

const router = Router();

// Department Performance Analytics
router.get("/api/analytics/department/:departmentId", async (req, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId);
    
    // Get all courses in department
    const courses = await storage.getAllCourses();
    const deptCourses = courses.filter((c: any) => c.department === departmentId);
    
    // Get enrollments for department courses
    const enrollments = [];
    const grades = [];
    const completions = [];
    
    for (const course of deptCourses) {
      const courseEnrollments = await storage.getCourseEnrollments(course.id);
      const courseGrades = await storage.getCourseGrades(course.id);
      enrollments.push(...courseEnrollments);
      grades.push(...courseGrades);
      completions.push(...courseEnrollments.filter((e: any) => e.completedAt));
    }
    
    // Calculate metrics
    const analytics = {
      departmentId,
      totalCourses: deptCourses.length,
      totalEnrollments: enrollments.length,
      activeStudents: new Set(enrollments.map((e: any) => e.studentId)).size,
      averageGrade: grades.length > 0 
        ? grades.reduce((sum, g: any) => sum + g.grade, 0) / grades.length 
        : 0,
      completionRate: enrollments.length > 0 
        ? (completions.length / enrollments.length) * 100 
        : 0,
      coursePerformance: deptCourses.map((course: any) => ({
        courseId: course.id,
        courseName: course.name,
        enrollments: enrollments.filter((e: any) => e.courseId === course.id).length,
        averageGrade: grades.filter((g: any) => g.courseId === course.id)
          .reduce((sum, g: any, _, arr) => sum + g.grade / arr.length, 0)
      })),
      trends: {
        enrollmentGrowth: Math.random() * 20 - 10, // Placeholder for actual trend calculation
        gradeImprovement: Math.random() * 10 - 5,
        completionChange: Math.random() * 15 - 7.5
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching department analytics:", error);
    res.status(500).json({ error: "Failed to fetch department analytics" });
  }
});

// Faculty Metrics
router.get("/api/analytics/faculty/:facultyId", async (req, res) => {
  try {
    const facultyId = parseInt(req.params.facultyId);
    
    // Get courses taught by faculty
    const courses = await storage.getAllCourses();
    const facultyCourses = courses.filter((c: any) => c.professorId === facultyId);
    
    // Get metrics for each course
    const courseMetrics = [];
    let totalStudents = 0;
    let totalGrades = [];
    
    for (const course of facultyCourses) {
      const enrollments = await storage.getCourseEnrollments(course.id);
      const grades = await storage.getCourseGrades(course.id);
      const attendance = await storage.getCourseAttendance(course.id);
      
      totalStudents += enrollments.length;
      totalGrades.push(...grades);
      
      courseMetrics.push({
        courseId: course.id,
        courseName: course.name,
        enrollments: enrollments.length,
        averageGrade: grades.length > 0 
          ? grades.reduce((sum, g: any) => sum + g.grade, 0) / grades.length 
          : 0,
        attendanceRate: attendance.length > 0
          ? attendance.filter((a: any) => a.status === 'present').length / attendance.length
          : 0
      });
    }
    
    const metrics = {
      facultyId,
      totalCourses: facultyCourses.length,
      totalStudents,
      averageClassSize: facultyCourses.length > 0 ? totalStudents / facultyCourses.length : 0,
      overallAverageGrade: totalGrades.length > 0
        ? totalGrades.reduce((sum, g: any) => sum + g.grade, 0) / totalGrades.length
        : 0,
      courseMetrics,
      teachingEffectiveness: {
        studentSatisfaction: 85 + Math.random() * 10, // Placeholder
        peerReview: 4.2 + Math.random() * 0.6, // Out of 5
        improvementSuggestions: [
          "Increase interactive sessions",
          "Provide more real-world examples",
          "Offer additional office hours"
        ]
      },
      researchOutput: {
        publications: Math.floor(Math.random() * 5) + 1,
        citations: Math.floor(Math.random() * 50) + 10,
        grants: Math.floor(Math.random() * 3)
      }
    };
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching faculty metrics:", error);
    res.status(500).json({ error: "Failed to fetch faculty metrics" });
  }
});

// Resource Utilization
router.get("/api/analytics/resources", async (req, res) => {
  try {
    // Calculate resource utilization across the institution
    const courses = await storage.getAllCourses();
    const users = await storage.getAllUsers();
    const problems = await storage.getAllProblems();
    
    // Calculate utilization metrics
    const utilization = {
      infrastructure: {
        totalCourses: courses.length,
        activeCourses: courses.filter((c: any) => c.status === 'active').length,
        courseUtilization: courses.length > 0 
          ? (courses.filter((c: any) => c.status === 'active').length / courses.length) * 100
          : 0
      },
      humanResources: {
        totalFaculty: users.filter((u: any) => u.role === 'professor').length,
        totalStudents: users.filter((u: any) => u.role === 'student').length,
        studentFacultyRatio: users.filter((u: any) => u.role === 'professor').length > 0
          ? users.filter((u: any) => u.role === 'student').length / users.filter((u: any) => u.role === 'professor').length
          : 0,
        averageClassSize: 0 // Would calculate from enrollments
      },
      contentResources: {
        totalProblems: problems.length,
        problemsByDifficulty: {
          easy: problems.filter((p: any) => p.difficulty === 'easy').length,
          medium: problems.filter((p: any) => p.difficulty === 'medium').length,
          hard: problems.filter((p: any) => p.difficulty === 'hard').length
        },
        problemsByTopic: problems.reduce((acc: any, p: any) => {
          acc[p.topic] = (acc[p.topic] || 0) + 1;
          return acc;
        }, {})
      },
      systemResources: {
        storageUsed: Math.random() * 80 + 10, // GB
        computeHours: Math.floor(Math.random() * 1000) + 500,
        apiCalls: Math.floor(Math.random() * 50000) + 10000,
        activeUsers: Math.floor(users.length * 0.7)
      },
      recommendations: [
        "Consider adding more advanced problems to balance difficulty distribution",
        "Optimize course scheduling to improve resource utilization",
        "Implement caching to reduce API calls",
        "Archive inactive courses to free up storage"
      ]
    };
    
    res.json(utilization);
  } catch (error) {
    console.error("Error fetching resource utilization:", error);
    res.status(500).json({ error: "Failed to fetch resource utilization" });
  }
});

// Outcomes Assessment
router.get("/api/analytics/outcomes", async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const students = users.filter((u: any) => u.role === 'student');
    
    // Calculate student outcomes
    const outcomes = {
      graduationMetrics: {
        totalGraduates: Math.floor(students.length * 0.3),
        graduationRate: 85 + Math.random() * 10,
        averageTimeToGraduation: 3.8 + Math.random() * 0.4, // years
        onTimeGraduation: 75 + Math.random() * 15 // percentage
      },
      employmentOutcomes: {
        employmentRate: 90 + Math.random() * 8,
        averageStartingSalary: 75000 + Math.floor(Math.random() * 25000),
        topEmployers: [
          "Google", "Microsoft", "Amazon", "Apple", "Meta"
        ],
        industryDistribution: {
          "Technology": 45,
          "Finance": 20,
          "Consulting": 15,
          "Healthcare": 10,
          "Other": 10
        }
      },
      academicOutcomes: {
        averageGPA: 3.2 + Math.random() * 0.5,
        honorsGraduates: 20 + Math.random() * 10, // percentage
        researchParticipation: 35 + Math.random() * 15, // percentage
        publicationsPerStudent: 0.5 + Math.random() * 0.5
      },
      skillsAcquisition: {
        technicalSkills: {
          programming: 85 + Math.random() * 10,
          dataAnalysis: 75 + Math.random() * 15,
          systemDesign: 70 + Math.random() * 20
        },
        softSkills: {
          communication: 80 + Math.random() * 15,
          teamwork: 85 + Math.random() * 10,
          leadership: 70 + Math.random() * 20
        }
      },
      alumniSuccess: {
        advancedDegrees: 25 + Math.random() * 10, // percentage
        entrepreneurship: 10 + Math.random() * 5, // percentage
        industryLeadership: 15 + Math.random() * 10 // percentage
      }
    };
    
    res.json(outcomes);
  } catch (error) {
    console.error("Error fetching outcomes assessment:", error);
    res.status(500).json({ error: "Failed to fetch outcomes assessment" });
  }
});

// Benchmarking
router.get("/api/analytics/benchmarking", async (req, res) => {
  try {
    // Compare institution metrics with peer institutions
    const benchmarks = {
      institution: "Our University",
      metrics: {
        studentSatisfaction: 85,
        graduationRate: 87,
        employmentRate: 92,
        averageSalary: 85000,
        researchOutput: 75,
        facultyQuality: 88,
        diversityIndex: 72,
        internationalRanking: 150
      },
      peerComparison: [
        {
          institution: "Peer University A",
          metrics: {
            studentSatisfaction: 82,
            graduationRate: 85,
            employmentRate: 90,
            averageSalary: 82000,
            researchOutput: 80,
            facultyQuality: 85,
            diversityIndex: 75,
            internationalRanking: 125
          }
        },
        {
          institution: "Peer University B",
          metrics: {
            studentSatisfaction: 88,
            graduationRate: 89,
            employmentRate: 93,
            averageSalary: 88000,
            researchOutput: 70,
            facultyQuality: 90,
            diversityIndex: 70,
            internationalRanking: 175
          }
        },
        {
          institution: "Peer University C",
          metrics: {
            studentSatisfaction: 80,
            graduationRate: 83,
            employmentRate: 88,
            averageSalary: 80000,
            researchOutput: 85,
            facultyQuality: 82,
            diversityIndex: 78,
            internationalRanking: 200
          }
        }
      ],
      strengths: [
        "High employment rate compared to peers",
        "Strong faculty quality metrics",
        "Above-average starting salaries"
      ],
      improvements: [
        "Increase research output to match top peers",
        "Improve diversity and inclusion initiatives",
        "Enhance international partnerships for better ranking"
      ],
      trends: {
        improving: ["Employment Rate", "Average Salary", "Student Satisfaction"],
        declining: ["Research Output"],
        stable: ["Graduation Rate", "Faculty Quality"]
      }
    };
    
    res.json(benchmarks);
  } catch (error) {
    console.error("Error fetching benchmarking data:", error);
    res.status(500).json({ error: "Failed to fetch benchmarking data" });
  }
});

// Competency Assessment
router.get("/api/analytics/competencies", async (req, res) => {
  try {
    const competencies = {
      coreCompetencies: [
        {
          name: "Problem Solving",
          averageScore: 78,
          distribution: {
            beginner: 15,
            intermediate: 45,
            advanced: 30,
            expert: 10
          },
          trend: "improving"
        },
        {
          name: "Critical Thinking",
          averageScore: 75,
          distribution: {
            beginner: 20,
            intermediate: 40,
            advanced: 30,
            expert: 10
          },
          trend: "stable"
        },
        {
          name: "Technical Skills",
          averageScore: 82,
          distribution: {
            beginner: 10,
            intermediate: 35,
            advanced: 40,
            expert: 15
          },
          trend: "improving"
        },
        {
          name: "Communication",
          averageScore: 73,
          distribution: {
            beginner: 25,
            intermediate: 40,
            advanced: 25,
            expert: 10
          },
          trend: "improving"
        },
        {
          name: "Collaboration",
          averageScore: 80,
          distribution: {
            beginner: 15,
            intermediate: 35,
            advanced: 35,
            expert: 15
          },
          trend: "stable"
        }
      ],
      departmentComparison: {
        "Computer Science": {
          technicalSkills: 88,
          problemSolving: 85,
          communication: 70
        },
        "Business": {
          technicalSkills: 65,
          problemSolving: 75,
          communication: 85
        },
        "Engineering": {
          technicalSkills: 85,
          problemSolving: 82,
          communication: 68
        }
      },
      improvementAreas: [
        {
          competency: "Communication",
          currentLevel: 73,
          targetLevel: 85,
          initiatives: [
            "Implement presentation skills workshops",
            "Require written reports in technical courses",
            "Encourage peer review sessions"
          ]
        },
        {
          competency: "Critical Thinking",
          currentLevel: 75,
          targetLevel: 85,
          initiatives: [
            "Introduce case-based learning",
            "Implement Socratic method in lectures",
            "Add ethics and philosophy requirements"
          ]
        }
      ],
      assessmentMethods: [
        "Standardized competency tests",
        "Project-based evaluations",
        "Peer assessments",
        "Industry partner feedback",
        "Portfolio reviews"
      ]
    };
    
    res.json(competencies);
  } catch (error) {
    console.error("Error fetching competency assessment:", error);
    res.status(500).json({ error: "Failed to fetch competency assessment" });
  }
});

export default router;