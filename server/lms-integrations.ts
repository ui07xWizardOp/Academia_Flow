import { Router } from "express";
import axios from "axios";
import { storage } from "./storage";
import { z } from "zod";

// LMS Integration Types
interface LMSIntegration {
  id: number;
  name: string;
  type: 'canvas' | 'blackboard' | 'moodle' | 'google_classroom';
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;
  syncFrequency: number;
  lastSync?: Date;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  settings: {
    coursesSync: boolean;
    gradesSync: boolean;
    studentsSync: boolean;
    assignmentsSync: boolean;
    announcementsSync: boolean;
    discussionsSync: boolean;
    autoGradeSync: boolean;
    twoWaySync: boolean;
  };
}

interface SyncResult {
  type: string;
  success: boolean;
  itemsSynced: number;
  errors: string[];
  timestamp: Date;
}

// Canvas LMS Integration
export class CanvasIntegration {
  private baseUrl: string;
  private accessToken: string;
  private apiVersion = 'v1';

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.baseUrl}/api/${this.apiVersion}${endpoint}`;
    
    try {
      const response = await axios({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`Canvas API Error: ${error.message}`);
      throw new Error(`Canvas API request failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  // Course Management
  async getCourses(enrollmentType?: 'teacher' | 'student') {
    const params = enrollmentType ? `?enrollment_type=${enrollmentType}` : '';
    return await this.makeRequest(`/courses${params}`);
  }

  async getCourse(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}`);
  }

  async createCourse(courseData: {
    name: string;
    course_code: string;
    start_at?: string;
    end_at?: string;
    public_description?: string;
  }) {
    return await this.makeRequest('/accounts/self/courses', 'POST', {
      course: courseData
    });
  }

  // Student Management
  async getCourseStudents(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}/users?enrollment_type[]=student`);
  }

  async enrollStudent(courseId: string, userId: string) {
    return await this.makeRequest(`/courses/${courseId}/enrollments`, 'POST', {
      enrollment: {
        user_id: userId,
        type: 'StudentEnrollment',
        enrollment_state: 'active'
      }
    });
  }

  // Assignment Management
  async getAssignments(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}/assignments`);
  }

  async createAssignment(courseId: string, assignmentData: {
    name: string;
    description?: string;
    points_possible?: number;
    due_at?: string;
    submission_types?: string[];
  }) {
    return await this.makeRequest(`/courses/${courseId}/assignments`, 'POST', {
      assignment: assignmentData
    });
  }

  async updateAssignment(courseId: string, assignmentId: string, data: any) {
    return await this.makeRequest(`/courses/${courseId}/assignments/${assignmentId}`, 'PUT', {
      assignment: data
    });
  }

  // Grade Management
  async getGrades(courseId: string, assignmentId: string) {
    return await this.makeRequest(`/courses/${courseId}/assignments/${assignmentId}/submissions`);
  }

  async submitGrade(courseId: string, assignmentId: string, userId: string, grade: number, comment?: string) {
    return await this.makeRequest(
      `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
      'PUT',
      {
        submission: {
          posted_grade: grade
        },
        comment: comment ? { text_comment: comment } : undefined
      }
    );
  }

  // Announcement Management
  async getAnnouncements(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}/discussion_topics?only_announcements=true`);
  }

  async createAnnouncement(courseId: string, title: string, message: string) {
    return await this.makeRequest(`/courses/${courseId}/discussion_topics`, 'POST', {
      title,
      message,
      is_announcement: true,
      published: true
    });
  }

  // Sync Operations
  async syncCourses() {
    const courses = await this.getCourses();
    const syncResult: SyncResult = {
      type: 'courses',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const course of courses) {
      try {
        await storage.syncCanvasCourse({
          canvasId: course.id,
          name: course.name,
          courseCode: course.course_code,
          startDate: course.start_at,
          endDate: course.end_at,
          enrollmentCount: course.total_students || 0
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync course ${course.name}: ${error.message}`);
      }
    }

    return syncResult;
  }

  async syncStudents(courseId: string) {
    const students = await this.getCourseStudents(courseId);
    const syncResult: SyncResult = {
      type: 'students',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const student of students) {
      try {
        await storage.syncCanvasStudent({
          canvasId: student.id,
          name: student.name,
          email: student.email,
          courseId: courseId
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync student ${student.name}: ${error.message}`);
      }
    }

    return syncResult;
  }

  async syncGrades(courseId: string, assignmentId: string, grades: Array<{userId: string, grade: number}>) {
    const syncResult: SyncResult = {
      type: 'grades',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const gradeData of grades) {
      try {
        await this.submitGrade(courseId, assignmentId, gradeData.userId, gradeData.grade);
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync grade for user ${gradeData.userId}: ${error.message}`);
      }
    }

    return syncResult;
  }
}

// Blackboard LMS Integration
export class BlackboardIntegration {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(baseUrl: string, clientId: string, clientSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async authenticate() {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/learn/api/public/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
    } catch (error: any) {
      throw new Error(`Blackboard authentication failed: ${error.message}`);
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    await this.authenticate();
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/learn/api/public/v3${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`Blackboard API Error: ${error.message}`);
      throw new Error(`Blackboard API request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Course Management
  async getCourses() {
    const response = await this.makeRequest('/courses');
    return response.results || [];
  }

  async getCourse(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}`);
  }

  async createCourse(courseData: {
    courseId: string;
    name: string;
    description?: string;
    availability?: { available: 'Yes' | 'No' };
  }) {
    return await this.makeRequest('/courses', 'POST', courseData);
  }

  // User Management
  async getUsers(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/users`);
    return response.results || [];
  }

  async enrollUser(courseId: string, userId: string, role: 'Student' | 'Instructor' = 'Student') {
    return await this.makeRequest(`/courses/${courseId}/users/${userId}`, 'PUT', {
      courseRoleId: role
    });
  }

  // Grade Management
  async getGradeColumns(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/gradebook/columns`);
    return response.results || [];
  }

  async updateGrade(courseId: string, columnId: string, userId: string, score: number) {
    return await this.makeRequest(
      `/courses/${courseId}/gradebook/columns/${columnId}/users/${userId}`,
      'PATCH',
      { score }
    );
  }

  // Content Management
  async getContents(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/contents`);
    return response.results || [];
  }

  async createContent(courseId: string, contentData: {
    title: string;
    body?: { text: string };
    contentHandler?: { id: string };
  }) {
    return await this.makeRequest(`/courses/${courseId}/contents`, 'POST', contentData);
  }

  // Announcement Management
  async getAnnouncements(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/announcements`);
    return response.results || [];
  }

  async createAnnouncement(courseId: string, title: string, body: string) {
    return await this.makeRequest(`/courses/${courseId}/announcements`, 'POST', {
      title,
      body: { text: body }
    });
  }

  // Sync Operations
  async syncCourses() {
    const courses = await this.getCourses();
    const syncResult: SyncResult = {
      type: 'courses',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const course of courses) {
      try {
        await storage.syncBlackboardCourse({
          blackboardId: course.id,
          courseId: course.courseId,
          name: course.name,
          description: course.description
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync course ${course.name}: ${error.message}`);
      }
    }

    return syncResult;
  }
}

// Moodle LMS Integration
export class MoodleIntegration {
  private baseUrl: string;
  private wsToken: string;

  constructor(baseUrl: string, wsToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.wsToken = wsToken;
  }

  private async makeRequest(wsfunction: string, params: any = {}) {
    const url = `${this.baseUrl}/webservice/rest/server.php`;
    
    try {
      const response = await axios.post(url, null, {
        params: {
          wstoken: this.wsToken,
          wsfunction,
          moodlewsrestformat: 'json',
          ...params
        }
      });
      
      if (response.data.exception) {
        throw new Error(response.data.message || 'Moodle API error');
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`Moodle API Error: ${error.message}`);
      throw new Error(`Moodle API request failed: ${error.message}`);
    }
  }

  // Course Management
  async getCourses() {
    return await this.makeRequest('core_course_get_courses');
  }

  async getCourse(courseId: number) {
    const courses = await this.makeRequest('core_course_get_courses', {
      'options[ids][0]': courseId
    });
    return courses[0];
  }

  async createCourse(courseData: {
    fullname: string;
    shortname: string;
    categoryid: number;
    summary?: string;
  }) {
    return await this.makeRequest('core_course_create_courses', {
      'courses[0][fullname]': courseData.fullname,
      'courses[0][shortname]': courseData.shortname,
      'courses[0][categoryid]': courseData.categoryid,
      'courses[0][summary]': courseData.summary || ''
    });
  }

  // User Management
  async getEnrolledUsers(courseId: number) {
    return await this.makeRequest('core_enrol_get_enrolled_users', {
      courseid: courseId
    });
  }

  async enrollUser(courseId: number, userId: number, roleId: number = 5) {
    return await this.makeRequest('enrol_manual_enrol_users', {
      'enrolments[0][roleid]': roleId,
      'enrolments[0][userid]': userId,
      'enrolments[0][courseid]': courseId
    });
  }

  // Assignment Management
  async getAssignments(courseId: number) {
    return await this.makeRequest('mod_assign_get_assignments', {
      'courseids[0]': courseId
    });
  }

  async submitGrade(assignmentId: number, userId: number, grade: number, feedback?: string) {
    return await this.makeRequest('mod_assign_save_grade', {
      assignmentid: assignmentId,
      userid: userId,
      grade: grade,
      attemptnumber: -1,
      addattempt: 0,
      workflowstate: 'graded',
      applytoall: 0,
      'plugindata[assignfeedbackcomments_editor][text]': feedback || ''
    });
  }

  // Forum/Discussion Management
  async getForums(courseId: number) {
    return await this.makeRequest('mod_forum_get_forums_by_courses', {
      'courseids[0]': courseId
    });
  }

  async createDiscussion(forumId: number, subject: string, message: string) {
    return await this.makeRequest('mod_forum_add_discussion', {
      forumid: forumId,
      subject: subject,
      message: message
    });
  }

  // Sync Operations
  async syncCourses() {
    const courses = await this.getCourses();
    const syncResult: SyncResult = {
      type: 'courses',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const course of courses) {
      try {
        await storage.syncMoodleCourse({
          moodleId: course.id,
          fullname: course.fullname,
          shortname: course.shortname,
          summary: course.summary
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync course ${course.fullname}: ${error.message}`);
      }
    }

    return syncResult;
  }

  async syncGrades(assignmentId: number, grades: Array<{userId: number, grade: number, feedback?: string}>) {
    const syncResult: SyncResult = {
      type: 'grades',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const gradeData of grades) {
      try {
        await this.submitGrade(assignmentId, gradeData.userId, gradeData.grade, gradeData.feedback);
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync grade for user ${gradeData.userId}: ${error.message}`);
      }
    }

    return syncResult;
  }
}

// Google Classroom Integration
export class GoogleClassroomIntegration {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private tokenExpiry?: Date;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.accessToken = '';
  }

  private async refreshAccessToken() {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
    } catch (error: any) {
      throw new Error(`Google OAuth refresh failed: ${error.message}`);
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    await this.refreshAccessToken();
    
    try {
      const response = await axios({
        method,
        url: `https://classroom.googleapis.com/v1${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`Google Classroom API Error: ${error.message}`);
      throw new Error(`Google Classroom API request failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Course Management
  async getCourses() {
    const response = await this.makeRequest('/courses');
    return response.courses || [];
  }

  async getCourse(courseId: string) {
    return await this.makeRequest(`/courses/${courseId}`);
  }

  async createCourse(courseData: {
    name: string;
    section?: string;
    description?: string;
    room?: string;
    ownerId: string;
  }) {
    return await this.makeRequest('/courses', 'POST', courseData);
  }

  // Student Management
  async getStudents(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/students`);
    return response.students || [];
  }

  async inviteStudent(courseId: string, email: string) {
    return await this.makeRequest(`/courses/${courseId}/students`, 'POST', {
      userId: email
    });
  }

  // Assignment (CourseWork) Management
  async getCourseWork(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/courseWork`);
    return response.courseWork || [];
  }

  async createCourseWork(courseId: string, workData: {
    title: string;
    description?: string;
    materials?: any[];
    maxPoints?: number;
    dueDate?: { year: number; month: number; day: number };
    dueTime?: { hours: number; minutes: number };
    workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  }) {
    return await this.makeRequest(`/courses/${courseId}/courseWork`, 'POST', workData);
  }

  // Submission Management
  async getSubmissions(courseId: string, courseWorkId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`);
    return response.studentSubmissions || [];
  }

  async gradeSubmission(courseId: string, courseWorkId: string, submissionId: string, grade: number) {
    return await this.makeRequest(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}`,
      'PATCH',
      {
        updateMask: 'assignedGrade',
        assignedGrade: grade
      }
    );
  }

  // Announcement Management
  async getAnnouncements(courseId: string) {
    const response = await this.makeRequest(`/courses/${courseId}/announcements`);
    return response.announcements || [];
  }

  async createAnnouncement(courseId: string, text: string, materials?: any[]) {
    return await this.makeRequest(`/courses/${courseId}/announcements`, 'POST', {
      text,
      materials,
      state: 'PUBLISHED'
    });
  }

  // Sync Operations
  async syncCourses() {
    const courses = await this.getCourses();
    const syncResult: SyncResult = {
      type: 'courses',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const course of courses) {
      try {
        await storage.syncGoogleClassroomCourse({
          classroomId: course.id,
          name: course.name,
          section: course.section,
          description: course.descriptionHeading,
          room: course.room
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync course ${course.name}: ${error.message}`);
      }
    }

    return syncResult;
  }

  async syncStudents(courseId: string) {
    const students = await this.getStudents(courseId);
    const syncResult: SyncResult = {
      type: 'students',
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: new Date()
    };

    for (const student of students) {
      try {
        await storage.syncGoogleClassroomStudent({
          userId: student.userId,
          courseId: courseId,
          profile: student.profile
        });
        syncResult.itemsSynced++;
      } catch (error: any) {
        syncResult.errors.push(`Failed to sync student ${student.profile?.name?.fullName}: ${error.message}`);
      }
    }

    return syncResult;
  }
}

// LMS Integration Manager
export class LMSIntegrationManager {
  private integrations: Map<string, any> = new Map();

  async addIntegration(config: LMSIntegration) {
    let integration;
    
    switch (config.type) {
      case 'canvas':
        if (!config.baseUrl || !config.accessToken) {
          throw new Error('Canvas requires baseUrl and accessToken');
        }
        integration = new CanvasIntegration(config.baseUrl, config.accessToken);
        break;
        
      case 'blackboard':
        if (!config.baseUrl || !config.clientId || !config.clientSecret) {
          throw new Error('Blackboard requires baseUrl, clientId, and clientSecret');
        }
        integration = new BlackboardIntegration(config.baseUrl, config.clientId, config.clientSecret);
        break;
        
      case 'moodle':
        if (!config.baseUrl || !config.apiKey) {
          throw new Error('Moodle requires baseUrl and wsToken (apiKey)');
        }
        integration = new MoodleIntegration(config.baseUrl, config.apiKey);
        break;
        
      case 'google_classroom':
        if (!config.clientId || !config.clientSecret || !config.refreshToken) {
          throw new Error('Google Classroom requires clientId, clientSecret, and refreshToken');
        }
        integration = new GoogleClassroomIntegration(config.clientId, config.clientSecret, config.refreshToken);
        break;
        
      default:
        throw new Error(`Unsupported LMS type: ${config.type}`);
    }
    
    this.integrations.set(`${config.type}_${config.id}`, integration);
    
    // Store configuration in database
    await storage.saveLMSIntegration(config);
    
    return integration;
  }

  getIntegration(type: string, id: number) {
    return this.integrations.get(`${type}_${id}`);
  }

  async syncAll() {
    const results: SyncResult[] = [];
    
    for (const [key, integration] of this.integrations) {
      try {
        if (integration.syncCourses) {
          const result = await integration.syncCourses();
          results.push(result);
        }
      } catch (error: any) {
        results.push({
          type: 'error',
          success: false,
          itemsSynced: 0,
          errors: [`Sync failed for ${key}: ${error.message}`],
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }

  async testConnection(config: LMSIntegration): Promise<{success: boolean; message: string}> {
    try {
      let integration;
      
      switch (config.type) {
        case 'canvas':
          integration = new CanvasIntegration(config.baseUrl, config.accessToken!);
          await integration.getCourses();
          break;
          
        case 'blackboard':
          integration = new BlackboardIntegration(config.baseUrl, config.clientId!, config.clientSecret!);
          await integration.getCourses();
          break;
          
        case 'moodle':
          integration = new MoodleIntegration(config.baseUrl, config.apiKey!);
          await integration.getCourses();
          break;
          
        case 'google_classroom':
          integration = new GoogleClassroomIntegration(config.clientId!, config.clientSecret!, config.refreshToken!);
          await integration.getCourses();
          break;
      }
      
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// Express Router for LMS endpoints
const router = Router();
const lmsManager = new LMSIntegrationManager();

// Get all LMS integrations
router.get('/api/lms/integrations', async (req, res) => {
  try {
    const integrations = await storage.getLMSIntegrations();
    res.json(integrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add new LMS integration
router.post('/api/lms/integrations', async (req, res) => {
  try {
    const config = req.body as LMSIntegration;
    const integration = await lmsManager.addIntegration(config);
    res.json({ success: true, message: 'Integration added successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Test LMS connection
router.post('/api/lms/test-connection', async (req, res) => {
  try {
    const result = await lmsManager.testConnection(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync courses from specific LMS
router.post('/api/lms/:type/:id/sync/courses', async (req, res) => {
  try {
    const integration = lmsManager.getIntegration(req.params.type, parseInt(req.params.id));
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const result = await integration.syncCourses();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync students from specific course
router.post('/api/lms/:type/:id/sync/students/:courseId', async (req, res) => {
  try {
    const integration = lmsManager.getIntegration(req.params.type, parseInt(req.params.id));
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (integration.syncStudents) {
      const result = await integration.syncStudents(req.params.courseId);
      res.json(result);
    } else {
      res.status(400).json({ error: 'Student sync not supported for this LMS' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit grades to LMS
router.post('/api/lms/:type/:id/grades', async (req, res) => {
  try {
    const integration = lmsManager.getIntegration(req.params.type, parseInt(req.params.id));
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const { courseId, assignmentId, grades } = req.body;
    
    if (integration.syncGrades) {
      const result = await integration.syncGrades(courseId, assignmentId, grades);
      res.json(result);
    } else if (integration.submitGrade) {
      // For LMS that require individual grade submissions
      const results = [];
      for (const grade of grades) {
        try {
          await integration.submitGrade(courseId, assignmentId, grade.userId, grade.grade, grade.comment);
          results.push({ userId: grade.userId, success: true });
        } catch (error: any) {
          results.push({ userId: grade.userId, success: false, error: error.message });
        }
      }
      res.json({ results });
    } else {
      res.status(400).json({ error: 'Grade sync not supported for this LMS' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses from LMS
router.get('/api/lms/:type/:id/courses', async (req, res) => {
  try {
    const integration = lmsManager.getIntegration(req.params.type, parseInt(req.params.id));
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const courses = await integration.getCourses();
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create announcement in LMS
router.post('/api/lms/:type/:id/announcements', async (req, res) => {
  try {
    const integration = lmsManager.getIntegration(req.params.type, parseInt(req.params.id));
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const { courseId, title, message } = req.body;
    
    if (integration.createAnnouncement) {
      const result = await integration.createAnnouncement(courseId, title, message);
      res.json(result);
    } else {
      res.status(400).json({ error: 'Announcements not supported for this LMS' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync all integrations
router.post('/api/lms/sync-all', async (req, res) => {
  try {
    const results = await lmsManager.syncAll();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;