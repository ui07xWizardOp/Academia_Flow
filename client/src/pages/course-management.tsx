import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Users, 
  Plus, 
  Settings, 
  Calendar, 
  ClipboardList,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  FileText,
  GraduationCap,
  Award,
  Clock
} from "lucide-react";

interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  semester: string;
  year: number;
  instructorId: number;
  enrolledStudents: number;
  maxStudents: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

interface Assignment {
  id: number;
  courseId: number;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  problems: number[];
  submissions: number;
  avgScore: number;
  status: 'draft' | 'published' | 'closed';
}

export default function CourseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  // Fetch instructor courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses/instructor', user?.id],
    enabled: !!user?.id && user?.role === 'professor',
  });

  // Fetch course assignments
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments/course', selectedCourse?.id],
    enabled: !!selectedCourse?.id,
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: async (courseData: any) => {
      const response = await apiRequest("POST", "/api/courses", courseData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Created",
        description: "Your new course has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/courses/instructor'] });
      setShowCreateCourse(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await apiRequest("POST", "/api/assignments", {
        ...assignmentData,
        courseId: selectedCourse?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment Created",
        description: "New assignment has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments/course'] });
      setShowCreateAssignment(false);
    },
  });

  if (user?.role !== 'professor') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">Course management is only available to professors.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (coursesLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
              <p className="text-gray-600 mt-1">Manage your courses, assignments, and student progress</p>
            </div>
            <Button 
              onClick={() => setShowCreateCourse(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Courses Yet</h2>
              <p className="text-gray-600 mb-6">Create your first course to get started with course management.</p>
              <Button 
                onClick={() => setShowCreateCourse(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Course
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="courses" className="space-y-6">
              <TabsList>
                <TabsTrigger value="courses">Courses</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Courses Tab */}
              <TabsContent value="courses" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card 
                      key={course.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <Badge 
                            className={
                              course.status === 'active' ? 'bg-green-100 text-green-800' :
                              course.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {course.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{course.code}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                          {course.description}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Students</span>
                            <span className="font-medium">
                              {course.enrolledStudents}/{course.maxStudents}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Semester</span>
                            <span className="font-medium">{course.semester} {course.year}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourse(course);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourse(course);
                              setShowCreateAssignment(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Assignment
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-4">
                {selectedCourse ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedCourse.name} - Assignments</h3>
                        <p className="text-gray-600">{selectedCourse.code}</p>
                      </div>
                      <Button 
                        onClick={() => setShowCreateAssignment(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Assignment
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      {assignments.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="font-semibold text-lg">{assignment.title}</h4>
                                  <Badge 
                                    className={
                                      assignment.status === 'published' ? 'bg-green-100 text-green-800' :
                                      assignment.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {assignment.status}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 mb-3">{assignment.description}</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="flex items-center text-gray-500 mb-1">
                                      <Clock className="w-4 h-4 mr-1" />
                                      <span>Due Date</span>
                                    </div>
                                    <div className="font-medium">
                                      {new Date(assignment.dueDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center text-gray-500 mb-1">
                                      <Award className="w-4 h-4 mr-1" />
                                      <span>Max Points</span>
                                    </div>
                                    <div className="font-medium">{assignment.maxPoints}</div>
                                  </div>
                                  <div>
                                    <div className="flex items-center text-gray-500 mb-1">
                                      <Users className="w-4 h-4 mr-1" />
                                      <span>Submissions</span>
                                    </div>
                                    <div className="font-medium">{assignment.submissions}</div>
                                  </div>
                                  <div>
                                    <div className="flex items-center text-gray-500 mb-1">
                                      <BarChart3 className="w-4 h-4 mr-1" />
                                      <span>Avg Score</span>
                                    </div>
                                    <div className="font-medium">{assignment.avgScore.toFixed(1)}%</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-6">
                                <Button size="sm" variant="outline">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Course</h3>
                    <p className="text-gray-600">Choose a course to view and manage its assignments.</p>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Courses</p>
                          <p className="text-2xl font-bold text-blue-600">{courses.length}</p>
                        </div>
                        <BookOpen className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Students</p>
                          <p className="text-2xl font-bold text-green-600">
                            {courses.reduce((sum, course) => sum + course.enrolledStudents, 0)}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {assignments.filter(a => a.status === 'published').length}
                          </p>
                        </div>
                        <ClipboardList className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {assignments.length > 0 
                              ? (assignments.reduce((sum, a) => sum + a.avgScore, 0) / assignments.length).toFixed(1)
                              : '0'
                            }%
                          </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Create Course Dialog */}
      <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Set up a new course for your students. You can always edit these details later.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const courseData = {
              name: formData.get('name'),
              code: formData.get('code'),
              description: formData.get('description'),
              semester: formData.get('semester'),
              year: parseInt(formData.get('year') as string),
              maxStudents: parseInt(formData.get('maxStudents') as string),
              status: 'active'
            };
            createCourseMutation.mutate(courseData);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Course Name</label>
                <Input name="name" placeholder="Data Structures & Algorithms" required />
              </div>
              <div>
                <label className="text-sm font-medium">Course Code</label>
                <Input name="code" placeholder="CS 201" required />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                name="description" 
                placeholder="Introduction to fundamental data structures and algorithms..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Semester</label>
                <Select name="semester" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
                    <SelectItem value="Summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input 
                  name="year" 
                  type="number" 
                  placeholder="2024" 
                  defaultValue={new Date().getFullYear()}
                  required 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Students</label>
                <Input name="maxStudents" type="number" placeholder="30" defaultValue="30" required />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateCourse(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCourseMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createCourseMutation.isPending ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create a new coding assignment for {selectedCourse?.name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const assignmentData = {
              title: formData.get('title'),
              description: formData.get('description'),
              dueDate: formData.get('dueDate'),
              maxPoints: parseInt(formData.get('maxPoints') as string),
              problems: [], // Would be selected from existing problems
              status: 'draft'
            };
            createAssignmentMutation.mutate(assignmentData);
          }} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assignment Title</label>
              <Input name="title" placeholder="Homework 1: Arrays and Strings" required />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                name="description" 
                placeholder="Complete the following problems focusing on array manipulation and string processing..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input name="dueDate" type="datetime-local" required />
              </div>
              <div>
                <label className="text-sm font-medium">Max Points</label>
                <Input name="maxPoints" type="number" placeholder="100" defaultValue="100" required />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateAssignment(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAssignmentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}