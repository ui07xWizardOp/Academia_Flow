import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  UserMinus,
  Shield,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  GraduationCap,
  BookOpen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  status: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
  coursesEnrolled?: number;
  submissionCount?: number;
}

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    role: "student",
    department: "",
  });

  // Fetch users
  const { data: usersData = { users: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['/api/admin/users', currentPage, searchQuery, roleFilter, statusFilter],
    queryFn: async () => {
      // Mock data for demonstration
      const mockUsers: User[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        email: `user${i + 1}@university.edu`,
        name: `User ${i + 1}`,
        role: i % 20 === 0 ? 'admin' : i % 10 === 0 ? 'professor' : 'student',
        status: i % 15 === 0 ? 'suspended' : i % 8 === 0 ? 'inactive' : 'active',
        department: ['Computer Science', 'Engineering', 'Mathematics', 'Physics'][i % 4],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        coursesEnrolled: Math.floor(Math.random() * 8) + 1,
        submissionCount: Math.floor(Math.random() * 100),
      }));

      // Apply filters
      let filtered = mockUsers;
      if (searchQuery) {
        filtered = filtered.filter(u => 
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      if (roleFilter !== "all") {
        filtered = filtered.filter(u => u.role === roleFilter);
      }
      if (statusFilter !== "all") {
        filtered = filtered.filter(u => u.status === statusFilter);
      }

      // Paginate
      const start = (currentPage - 1) * itemsPerPage;
      const paginatedUsers = filtered.slice(start, start + itemsPerPage);

      return { users: paginatedUsers, total: filtered.length };
    },
  });

  // User statistics
  const { data: userStats = {
    totalUsers: 15234,
    activeUsers: 14500,
    suspendedUsers: 234,
    inactiveUsers: 500,
    students: 14500,
    professors: 680,
    admins: 54,
  }} = useQuery({
    queryKey: ['/api/admin/user-stats'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewUser({
        username: "",
        email: "",
        name: "",
        password: "",
        role: "student",
        department: "",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      return apiRequest(`/api/admin/users/${userData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'professor':
        return 'bg-blue-100 text-blue-700';
      case 'student':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-700';
      case 'suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalPages = Math.ceil(usersData.total / itemsPerPage);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and permissions</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                data-testid="button-export-users"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline"
                data-testid="button-import-users"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="button-add-user"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalUsers.toLocaleString()}</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Students:</span>
                    <span className="font-medium">{userStats.students.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Professors:</span>
                    <span className="font-medium">{userStats.professors}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Admins:</span>
                    <span className="font-medium">{userStats.admins}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{userStats.activeUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((userStats.activeUsers / userStats.totalUsers) * 100)}% of total users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{userStats.inactiveUsers}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  No login in last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{userStats.suspendedUsers}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Account access restricted
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>User List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="professor">Professors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading users...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Courses</TableHead>
                          <TableHead>Submissions</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData.users.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || '-'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(user.status)}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.lastLogin 
                                ? format(new Date(user.lastLogin), 'MMM d, yyyy')
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>{user.coursesEnrolled || 0}</TableCell>
                            <TableCell>{user.submissionCount || 0}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsEditDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-${user.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.status === 'active' ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-yellow-600"
                                    data-testid={`button-suspend-${user.id}`}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-600"
                                    data-testid={`button-activate-${user.id}`}
                                  >
                                    <Unlock className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, usersData.total)} of {usersData.total} users
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-username">Username</Label>
              <Input
                id="new-username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                data-testid="input-new-username"
              />
            </div>
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                data-testid="input-new-email"
              />
            </div>
            <div>
              <Label htmlFor="new-name">Full Name</Label>
              <Input
                id="new-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                data-testid="input-new-name"
              />
            </div>
            <div>
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="new-role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-department">Department</Label>
              <Input
                id="new-department"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                data-testid="input-new-department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createUserMutation.mutate(newUser)}
              disabled={createUserMutation.isPending}
              data-testid="button-create-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={selectedUser.status} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && updateUserMutation.mutate(selectedUser)}
              disabled={updateUserMutation.isPending}
              data-testid="button-save-user"
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                User: <span className="font-medium">{selectedUser.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Email: <span className="font-medium">{selectedUser.email}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}