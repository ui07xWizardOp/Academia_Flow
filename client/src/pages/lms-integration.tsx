import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Link2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Download,
  Upload,
  Sync,
  Shield,
  Key,
  Globe,
  Database,
  Users,
  BookOpen,
  Calendar,
  BarChart3
} from "lucide-react";

interface LMSIntegration {
  id: number;
  name: string;
  type: 'canvas' | 'blackboard' | 'moodle' | 'brightspace' | 'schoology';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  url: string;
  apiKey?: string;
  lastSync: string;
  syncEnabled: boolean;
  coursesSync: boolean;
  gradesSync: boolean;
  studentsSync: boolean;
  assignmentsSync: boolean;
  totalCourses: number;
  syncedCourses: number;
  totalStudents: number;
  syncedStudents: number;
  lastError?: string;
}

interface SyncJob {
  id: number;
  type: 'full' | 'incremental' | 'courses' | 'students' | 'grades';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  itemsProcessed: number;
  totalItems: number;
  errors: string[];
}

export default function LMSIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<LMSIntegration | null>(null);

  // Fetch LMS integrations
  const { data: integrations = [], isLoading } = useQuery<LMSIntegration[]>({
    queryKey: ['/api/lms/integrations'],
    enabled: !!user?.id && (user?.role === 'admin' || user?.role === 'professor'),
  });

  // Fetch sync jobs
  const { data: syncJobs = [] } = useQuery<SyncJob[]>({
    queryKey: ['/api/lms/sync-jobs'],
    enabled: !!user?.id,
  });

  // Add integration mutation
  const addIntegrationMutation = useMutation({
    mutationFn: async (integrationData: any) => {
      const response = await apiRequest("POST", "/api/lms/integrations", integrationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Integration Added",
        description: "LMS integration has been configured successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/integrations'] });
      setShowAddIntegration(false);
    },
    onError: () => {
      toast({
        title: "Integration Failed",
        description: "Failed to add LMS integration. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await apiRequest("POST", `/api/lms/integrations/${integrationId}/test`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  // Sync data mutation
  const syncDataMutation = useMutation({
    mutationFn: async ({ integrationId, syncType }: { integrationId: number; syncType: string }) => {
      const response = await apiRequest("POST", `/api/lms/integrations/${integrationId}/sync`, {
        type: syncType
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Data synchronization has been initiated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/sync-jobs'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLMSLogo = (type: string) => {
    // In a real app, these would be actual logo images
    const logos: { [key: string]: string } = {
      canvas: "🎨",
      blackboard: "⚫",
      moodle: "📚",
      brightspace: "💡",
      schoology: "🎓"
    };
    return logos[type] || "📖";
  };

  if (user?.role !== 'admin' && user?.role !== 'professor') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">LMS integration is only available to administrators and professors.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading integrations...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">LMS Integration</h1>
              <p className="text-gray-600 mt-1">Connect and sync with external Learning Management Systems</p>
            </div>
            <Button 
              onClick={() => setShowAddIntegration(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="integrations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="sync">Sync Status</TabsTrigger>
              <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
              <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            </TabsList>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-4">
              {integrations.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No LMS Integrations</h2>
                  <p className="text-gray-600 mb-6">Connect your first Learning Management System to sync data.</p>
                  <Button onClick={() => setShowAddIntegration(true)}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Add Integration
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {integrations.map((integration) => (
                    <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="text-4xl">{getLMSLogo(integration.type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold capitalize">{integration.type}</h3>
                                <Badge className={getStatusColor(integration.status)}>
                                  <div className="flex items-center space-x-1">
                                    {getStatusIcon(integration.status)}
                                    <span>{integration.status}</span>
                                  </div>
                                </Badge>
                              </div>

                              <p className="text-gray-600 mb-4">{integration.url}</p>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex items-center space-x-2 text-sm">
                                  <BookOpen className="w-4 h-4 text-blue-500" />
                                  <span>{integration.syncedCourses}/{integration.totalCourses} courses</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Users className="w-4 h-4 text-green-500" />
                                  <span>{integration.syncedStudents}/{integration.totalStudents} students</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Calendar className="w-4 h-4 text-purple-500" />
                                  <span>Last sync: {new Date(integration.lastSync).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Sync className={`w-4 h-4 ${integration.syncEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                                  <span>{integration.syncEnabled ? 'Auto sync on' : 'Auto sync off'}</span>
                                </div>
                              </div>

                              {integration.lastError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                                  <p className="text-sm text-red-800">{integration.lastError}</p>
                                </div>
                              )}

                              <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600">Sync:</span>
                                  {integration.coursesSync && <Badge variant="outline">Courses</Badge>}
                                  {integration.studentsSync && <Badge variant="outline">Students</Badge>}
                                  {integration.gradesSync && <Badge variant="outline">Grades</Badge>}
                                  {integration.assignmentsSync && <Badge variant="outline">Assignments</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConnectionMutation.mutate(integration.id)}
                              disabled={testConnectionMutation.isPending}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncDataMutation.mutate({ 
                                integrationId: integration.id, 
                                syncType: 'incremental' 
                              })}
                              disabled={syncDataMutation.isPending || integration.status === 'syncing'}
                            >
                              <RefreshCw className={`w-4 h-4 ${syncDataMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => setSelectedIntegration(integration)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {integration.status === 'syncing' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Sync Progress</span>
                              <span className="font-medium">
                                {Math.round((integration.syncedCourses / integration.totalCourses) * 100)}%
                              </span>
                            </div>
                            <Progress 
                              value={(integration.syncedCourses / integration.totalCourses) * 100} 
                              className="h-2" 
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sync Status Tab */}
            <TabsContent value="sync" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Integrations</p>
                        <p className="text-2xl font-bold text-green-600">
                          {integrations.filter(i => i.status === 'connected').length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Syncing Now</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {integrations.filter(i => i.status === 'syncing').length}
                        </p>
                      </div>
                      <RefreshCw className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Courses</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {integrations.reduce((sum, i) => sum + i.totalCourses, 0)}
                        </p>
                      </div>
                      <BookOpen className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {integrations.reduce((sum, i) => sum + i.totalStudents, 0)}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Sync Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {syncJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            job.status === 'completed' ? 'bg-green-500' :
                            job.status === 'running' ? 'bg-blue-500' :
                            job.status === 'failed' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`} />
                          <div>
                            <p className="font-medium capitalize">{job.type} Sync</p>
                            <p className="text-sm text-gray-600">
                              {new Date(job.startTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {job.status}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {job.itemsProcessed}/{job.totalItems} items
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Field Mapping Tab */}
            <TabsContent value="mapping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Field Mapping Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">User Fields</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">LMS Email Field</label>
                          <Input defaultValue="email" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Email Field</label>
                          <Input defaultValue="email" disabled />
                        </div>
                        <div>
                          <label className="text-sm font-medium">LMS Name Field</label>
                          <Input defaultValue="name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Name Field</label>
                          <Input defaultValue="name" disabled />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Course Fields</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">LMS Course ID</label>
                          <Input defaultValue="course_id" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Course ID</label>
                          <Input defaultValue="id" disabled />
                        </div>
                        <div>
                          <label className="text-sm font-medium">LMS Course Name</label>
                          <Input defaultValue="name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Course Name</label>
                          <Input defaultValue="name" disabled />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Grade Fields</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">LMS Grade Field</label>
                          <Input defaultValue="score" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Grade Field</label>
                          <Input defaultValue="score" disabled />
                        </div>
                        <div>
                          <label className="text-sm font-medium">LMS Max Score</label>
                          <Input defaultValue="points_possible" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Platform Max Score</label>
                          <Input defaultValue="maxPoints" disabled />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Save Mapping Configuration
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sync Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sync Logs</CardTitle>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Logs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[
                      { time: '2024-01-15 14:30:25', level: 'INFO', message: 'Started incremental sync for Canvas integration' },
                      { time: '2024-01-15 14:30:30', level: 'INFO', message: 'Successfully synced 15 courses from Canvas' },
                      { time: '2024-01-15 14:30:45', level: 'INFO', message: 'Syncing student enrollments...' },
                      { time: '2024-01-15 14:31:02', level: 'SUCCESS', message: 'Incremental sync completed successfully' },
                      { time: '2024-01-15 13:15:10', level: 'ERROR', message: 'Failed to authenticate with Blackboard API' },
                      { time: '2024-01-15 13:15:15', level: 'INFO', message: 'Retrying Blackboard connection...' },
                      { time: '2024-01-15 13:15:20', level: 'SUCCESS', message: 'Blackboard connection restored' },
                    ].map((log, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 text-sm font-mono bg-gray-50 rounded">
                        <span className="text-gray-500">{log.time}</span>
                        <Badge className={
                          log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                          log.level === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {log.level}
                        </Badge>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAddIntegration} onOpenChange={setShowAddIntegration}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add LMS Integration</DialogTitle>
            <DialogDescription>
              Connect your Learning Management System to sync courses, students, and grades
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const integrationData = {
              type: formData.get('type'),
              name: formData.get('name'),
              url: formData.get('url'),
              apiKey: formData.get('apiKey'),
              syncEnabled: formData.get('syncEnabled') === 'on',
              coursesSync: formData.get('coursesSync') === 'on',
              studentsSync: formData.get('studentsSync') === 'on',
              gradesSync: formData.get('gradesSync') === 'on',
              assignmentsSync: formData.get('assignmentsSync') === 'on',
            };
            addIntegrationMutation.mutate(integrationData);
          }} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">LMS Platform</label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select LMS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="blackboard">Blackboard</SelectItem>
                    <SelectItem value="moodle">Moodle</SelectItem>
                    <SelectItem value="brightspace">Brightspace</SelectItem>
                    <SelectItem value="schoology">Schoology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Integration Name</label>
                <Input name="name" placeholder="University Canvas" required />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">LMS URL</label>
              <Input 
                name="url" 
                type="url" 
                placeholder="https://university.instructure.com" 
                required 
              />
            </div>

            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input 
                name="apiKey" 
                type="password" 
                placeholder="Enter your LMS API key" 
                required 
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-gray-900">Sync Configuration</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Auto Sync</label>
                  <p className="text-xs text-gray-500">Automatically sync data every hour</p>
                </div>
                <Switch name="syncEnabled" defaultChecked />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sync Courses</label>
                  <Switch name="coursesSync" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sync Students</label>
                  <Switch name="studentsSync" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sync Grades</label>
                  <Switch name="gradesSync" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sync Assignments</label>
                  <Switch name="assignmentsSync" defaultChecked />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddIntegration(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addIntegrationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {addIntegrationMutation.isPending ? "Connecting..." : "Add Integration"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}