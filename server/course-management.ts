import { Router } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { insertCourseSchema, insertEnrollmentSchema, insertAssignmentSchema, insertLectureSchema, insertAnnouncementSchema, insertGradeSchema, insertAttendanceSchema, insertDiscussionSchema } from "@shared/schema";

const router = Router();

// Middleware for authentication
const authenticateToken = (req: any, res: any, next: any) => {
  // This should be imported from routes.ts or a separate auth module
  // For now, we'll pass through
  next();
};

// Course Management Routes
router.get("/api/courses", authenticateToken, async (req, res) => {
  try {
    const courses = await storage.getAllCourses();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

router.get("/api/courses/:id", authenticateToken, async (req, res) => {
  try {
    const course = await storage.getCourse(parseInt(req.params.id));
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

router.post("/api/courses", authenticateToken, async (req, res) => {
  try {
    const validated = insertCourseSchema.parse(req.body);
    const course = await storage.createCourse(validated);
    res.json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.patch("/api/courses/:id", authenticateToken, async (req, res) => {
  try {
    const course = await storage.updateCourse(parseInt(req.params.id), req.body);
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

router.delete("/api/courses/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteCourse(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// Enrollment Management Routes
router.get("/api/enrollments/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const enrollments = await storage.getCourseEnrollments(parseInt(req.params.courseId));
    res.json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

router.get("/api/enrollments/user/:userId", authenticateToken, async (req, res) => {
  try {
    const enrollments = await storage.getUserEnrollments(parseInt(req.params.userId));
    res.json(enrollments);
  } catch (error) {
    console.error("Error fetching user enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

router.post("/api/enrollments", authenticateToken, async (req, res) => {
  try {
    const validated = insertEnrollmentSchema.parse(req.body);
    const enrollment = await storage.createEnrollment(validated);
    res.json(enrollment);
  } catch (error) {
    console.error("Error creating enrollment:", error);
    res.status(500).json({ error: "Failed to create enrollment" });
  }
});

router.patch("/api/enrollments/:id", authenticateToken, async (req, res) => {
  try {
    const enrollment = await storage.updateEnrollment(parseInt(req.params.id), req.body);
    res.json(enrollment);
  } catch (error) {
    console.error("Error updating enrollment:", error);
    res.status(500).json({ error: "Failed to update enrollment" });
  }
});

router.delete("/api/enrollments/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteEnrollment(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    res.status(500).json({ error: "Failed to delete enrollment" });
  }
});

// Assignment Management Routes
router.get("/api/assignments/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const assignments = await storage.getCourseAssignments(parseInt(req.params.courseId));
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.get("/api/assignments/:id", authenticateToken, async (req, res) => {
  try {
    const assignment = await storage.getAssignment(parseInt(req.params.id));
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(assignment);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

router.post("/api/assignments", authenticateToken, async (req, res) => {
  try {
    const validated = insertAssignmentSchema.parse(req.body);
    const assignment = await storage.createAssignment(validated);
    res.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.patch("/api/assignments/:id", authenticateToken, async (req, res) => {
  try {
    const assignment = await storage.updateAssignment(parseInt(req.params.id), req.body);
    res.json(assignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

router.delete("/api/assignments/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteAssignment(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// Assignment Submission Routes
router.get("/api/assignments/:assignmentId/submissions", authenticateToken, async (req, res) => {
  try {
    const submissions = await storage.getAssignmentSubmissions(parseInt(req.params.assignmentId));
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/api/assignments/:assignmentId/submit", authenticateToken, async (req: any, res) => {
  try {
    const submission = await storage.submitAssignment({
      assignmentId: parseInt(req.params.assignmentId),
      studentId: req.user.id,
      content: req.body.content,
      files: req.body.files,
      submittedAt: new Date()
    });
    res.json(submission);
  } catch (error) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
});

// Lecture Management Routes
router.get("/api/lectures/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const lectures = await storage.getCourseLectures(parseInt(req.params.courseId));
    res.json(lectures);
  } catch (error) {
    console.error("Error fetching lectures:", error);
    res.status(500).json({ error: "Failed to fetch lectures" });
  }
});

router.get("/api/lectures/:id", authenticateToken, async (req, res) => {
  try {
    const lecture = await storage.getLecture(parseInt(req.params.id));
    if (!lecture) {
      return res.status(404).json({ error: "Lecture not found" });
    }
    res.json(lecture);
  } catch (error) {
    console.error("Error fetching lecture:", error);
    res.status(500).json({ error: "Failed to fetch lecture" });
  }
});

router.post("/api/lectures", authenticateToken, async (req, res) => {
  try {
    const validated = insertLectureSchema.parse(req.body);
    const lecture = await storage.createLecture(validated);
    res.json(lecture);
  } catch (error) {
    console.error("Error creating lecture:", error);
    res.status(500).json({ error: "Failed to create lecture" });
  }
});

router.patch("/api/lectures/:id", authenticateToken, async (req, res) => {
  try {
    const lecture = await storage.updateLecture(parseInt(req.params.id), req.body);
    res.json(lecture);
  } catch (error) {
    console.error("Error updating lecture:", error);
    res.status(500).json({ error: "Failed to update lecture" });
  }
});

router.delete("/api/lectures/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteLecture(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting lecture:", error);
    res.status(500).json({ error: "Failed to delete lecture" });
  }
});

// Announcement Management Routes
router.get("/api/announcements/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const announcements = await storage.getCourseAnnouncements(parseInt(req.params.courseId));
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.get("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    const announcement = await storage.getAnnouncement(parseInt(req.params.id));
    if (!announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    res.json(announcement);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

router.post("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const validated = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(validated);
    res.json(announcement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.patch("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    const announcement = await storage.updateAnnouncement(parseInt(req.params.id), req.body);
    res.json(announcement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

router.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteAnnouncement(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Grade Management Routes
router.get("/api/grades/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const grades = await storage.getCourseGrades(parseInt(req.params.courseId));
    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

router.get("/api/grades/student/:studentId", authenticateToken, async (req, res) => {
  try {
    const grades = await storage.getStudentGrades(parseInt(req.params.studentId));
    res.json(grades);
  } catch (error) {
    console.error("Error fetching student grades:", error);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

router.post("/api/grades", authenticateToken, async (req, res) => {
  try {
    const validated = insertGradeSchema.parse(req.body);
    const grade = await storage.createGrade(validated);
    res.json(grade);
  } catch (error) {
    console.error("Error creating grade:", error);
    res.status(500).json({ error: "Failed to create grade" });
  }
});

router.patch("/api/grades/:id", authenticateToken, async (req, res) => {
  try {
    const grade = await storage.updateGrade(parseInt(req.params.id), req.body);
    res.json(grade);
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({ error: "Failed to update grade" });
  }
});

// Attendance Management Routes
router.get("/api/attendance/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const attendance = await storage.getCourseAttendance(parseInt(req.params.courseId));
    res.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

router.get("/api/attendance/student/:studentId", authenticateToken, async (req, res) => {
  try {
    const attendance = await storage.getStudentAttendance(parseInt(req.params.studentId));
    res.json(attendance);
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

router.post("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const validated = insertAttendanceSchema.parse(req.body);
    const attendance = await storage.recordAttendance(validated);
    res.json(attendance);
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ error: "Failed to record attendance" });
  }
});

router.patch("/api/attendance/:id", authenticateToken, async (req, res) => {
  try {
    const attendance = await storage.updateAttendance(parseInt(req.params.id), req.body);
    res.json(attendance);
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// Discussion Forum Routes
router.get("/api/discussions/course/:courseId", authenticateToken, async (req, res) => {
  try {
    const discussions = await storage.getCourseDiscussions(parseInt(req.params.courseId));
    res.json(discussions);
  } catch (error) {
    console.error("Error fetching discussions:", error);
    res.status(500).json({ error: "Failed to fetch discussions" });
  }
});

router.get("/api/discussions/:id", authenticateToken, async (req, res) => {
  try {
    const discussion = await storage.getDiscussion(parseInt(req.params.id));
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    res.json(discussion);
  } catch (error) {
    console.error("Error fetching discussion:", error);
    res.status(500).json({ error: "Failed to fetch discussion" });
  }
});

router.post("/api/discussions", authenticateToken, async (req, res) => {
  try {
    const validated = insertDiscussionSchema.parse(req.body);
    const discussion = await storage.createDiscussion(validated);
    res.json(discussion);
  } catch (error) {
    console.error("Error creating discussion:", error);
    res.status(500).json({ error: "Failed to create discussion" });
  }
});

router.post("/api/discussions/:id/reply", authenticateToken, async (req: any, res) => {
  try {
    const reply = await storage.createDiscussion({
      courseId: req.body.courseId,
      userId: req.user.id,
      title: `Re: ${req.body.title}`,
      content: req.body.content,
      parentId: parseInt(req.params.id)
    });
    res.json(reply);
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({ error: "Failed to create reply" });
  }
});

router.patch("/api/discussions/:id", authenticateToken, async (req, res) => {
  try {
    const discussion = await storage.updateDiscussion(parseInt(req.params.id), req.body);
    res.json(discussion);
  } catch (error) {
    console.error("Error updating discussion:", error);
    res.status(500).json({ error: "Failed to update discussion" });
  }
});

router.delete("/api/discussions/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteDiscussion(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting discussion:", error);
    res.status(500).json({ error: "Failed to delete discussion" });
  }
});

// Course Analytics Routes
router.get("/api/courses/:courseId/analytics", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    // Get all course data
    const [enrollments, assignments, grades, attendance, discussions] = await Promise.all([
      storage.getCourseEnrollments(courseId),
      storage.getCourseAssignments(courseId),
      storage.getCourseGrades(courseId),
      storage.getCourseAttendance(courseId),
      storage.getCourseDiscussions(courseId)
    ]);
    
    // Calculate analytics
    const analytics = {
      totalStudents: enrollments.length,
      activeStudents: enrollments.filter((e: any) => e.status === 'active').length,
      totalAssignments: assignments.length,
      averageGrade: grades.length > 0 
        ? grades.reduce((sum: number, g: any) => sum + g.grade, 0) / grades.length 
        : 0,
      attendanceRate: attendance.length > 0
        ? attendance.filter((a: any) => a.status === 'present').length / attendance.length
        : 0,
      discussionEngagement: discussions.length,
      completionRate: enrollments.filter((e: any) => e.completedAt).length / enrollments.length,
      gradeDistribution: {
        A: grades.filter((g: any) => g.grade >= 90).length,
        B: grades.filter((g: any) => g.grade >= 80 && g.grade < 90).length,
        C: grades.filter((g: any) => g.grade >= 70 && g.grade < 80).length,
        D: grades.filter((g: any) => g.grade >= 60 && g.grade < 70).length,
        F: grades.filter((g: any) => g.grade < 60).length
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching course analytics:", error);
    res.status(500).json({ error: "Failed to fetch course analytics" });
  }
});

// Module Builder Routes
router.get("/api/courses/:courseId/modules", authenticateToken, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const modules = await storage.getCourseModules(courseId);
    res.json(modules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

router.post("/api/courses/:courseId/modules", authenticateToken, async (req, res) => {
  try {
    const module = await storage.createCourseModule({
      courseId: parseInt(req.params.courseId),
      ...req.body
    });
    res.json(module);
  } catch (error) {
    console.error("Error creating module:", error);
    res.status(500).json({ error: "Failed to create module" });
  }
});

router.patch("/api/modules/:id", authenticateToken, async (req, res) => {
  try {
    const module = await storage.updateCourseModule(parseInt(req.params.id), req.body);
    res.json(module);
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ error: "Failed to update module" });
  }
});

router.delete("/api/modules/:id", authenticateToken, async (req, res) => {
  try {
    await storage.deleteCourseModule(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ error: "Failed to delete module" });
  }
});

export default router;