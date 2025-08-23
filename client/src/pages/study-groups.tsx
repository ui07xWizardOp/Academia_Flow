import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Plus, 
  Calendar, 
  Clock, 
  MessageSquare,
  Video,
  Code,
  BookOpen,
  Trophy,
  TrendingUp,
  Filter,
  Search,
  UserPlus,
  Settings,
  Bell,
  Share2,
  Globe,
  Lock,
  Star
} from "lucide-react";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  members: Member[];
  maxMembers: number;
  schedule: string;
  nextSession?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  tags: string[];
  meetingLink?: string;
  resources: Resource[];
  announcements: Announcement[];
}

interface Member {
  id: string;
  name: string;
  role: 'leader' | 'member';
  joinedAt: string;
  avatar?: string;
  problemsSolved?: number;
}

interface Resource {
  id: string;
  title: string;
  type: 'link' | 'document' | 'problem';
  url: string;
  addedBy: string;
  addedAt: string;
}

interface Announcement {
  id: string;
  message: string;
  createdBy: string;
  createdAt: string;
  priority: 'normal' | 'high';
}

const mockGroups: StudyGroup[] = [
  {
    id: '1',
    name: 'Dynamic Programming Masters',
    description: 'Deep dive into DP problems and optimization techniques',
    topic: 'Dynamic Programming',
    level: 'advanced',
    members: [
      { id: '1', name: 'Alice Chen', role: 'leader', joinedAt: '2024-01-15', problemsSolved: 234 },
      { id: '2', name: 'Bob Smith', role: 'member', joinedAt: '2024-01-20', problemsSolved: 189 },
      { id: '3', name: 'Carol Davis', role: 'member', joinedAt: '2024-01-22', problemsSolved: 156 }
    ],
    maxMembers: 8,
    schedule: 'Every Tuesday 7PM EST',
    nextSession: '2024-02-06T19:00:00',
    isPublic: true,
    createdBy: 'Alice Chen',
    createdAt: '2024-01-15',
    tags: ['algorithms', 'optimization', 'competitive'],
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    resources: [],
    announcements: []
  },
  {
    id: '2',
    name: 'Interview Prep Squad',
    description: 'Practice behavioral and technical interviews together',
    topic: 'Interview Preparation',
    level: 'intermediate',
    members: [
      { id: '4', name: 'David Lee', role: 'leader', joinedAt: '2024-01-10', problemsSolved: 145 },
      { id: '5', name: 'Emma Wilson', role: 'member', joinedAt: '2024-01-12', problemsSolved: 178 }
    ],
    maxMembers: 6,
    schedule: 'Mon/Wed/Fri 6PM PST',
    nextSession: '2024-02-05T18:00:00',
    isPublic: true,
    createdBy: 'David Lee',
    createdAt: '2024-01-10',
    tags: ['interview', 'FAANG', 'mock-interview'],
    resources: [],
    announcements: []
  },
  {
    id: '3',
    name: 'Graph Theory Beginners',
    description: 'Learn graph algorithms from scratch with peer support',
    topic: 'Graph Theory',
    level: 'beginner',
    members: [
      { id: '6', name: 'Frank Zhang', role: 'leader', joinedAt: '2024-01-18', problemsSolved: 67 }
    ],
    maxMembers: 10,
    schedule: 'Saturdays 2PM CST',
    isPublic: false,
    createdBy: 'Frank Zhang',
    createdAt: '2024-01-18',
    tags: ['graphs', 'algorithms', 'beginner-friendly'],
    resources: [],
    announcements: []
  }
];

export default function StudyGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    topic: "",
    level: "intermediate",
    maxMembers: 8,
    schedule: "",
    isPublic: true,
    tags: ""
  });

  // In a real app, this would fetch from the API
  const groups = mockGroups;

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          group.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || group.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleJoinGroup = (groupId: string) => {
    toast({
      title: "Joined Study Group!",
      description: "You've successfully joined the study group.",
    });
  };

  const handleLeaveGroup = (groupId: string) => {
    toast({
      title: "Left Study Group",
      description: "You've left the study group.",
    });
  };

  const handleCreateGroup = () => {
    // In a real app, this would make an API call
    toast({
      title: "Study Group Created!",
      description: "Your study group has been created successfully.",
    });
    setShowCreateDialog(false);
    setNewGroup({
      name: "",
      description: "",
      topic: "",
      level: "intermediate",
      maxMembers: 8,
      schedule: "",
      isPublic: true,
      tags: ""
    });
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Study Groups</h1>
                <p className="text-purple-100">Collaborate and learn together with peers</p>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-purple-700 hover:bg-purple-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Study Group</DialogTitle>
                    <DialogDescription>
                      Start a new study group to collaborate with other students
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Group Name</label>
                      <Input
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                        placeholder="e.g., Dynamic Programming Masters"
                        data-testid="input-group-name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                        placeholder="What will this group focus on?"
                        rows={3}
                        data-testid="textarea-group-description"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Main Topic</label>
                      <Input
                        value={newGroup.topic}
                        onChange={(e) => setNewGroup({...newGroup, topic: e.target.value})}
                        placeholder="e.g., Algorithms, System Design"
                        data-testid="input-group-topic"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Level</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={newGroup.level}
                          onChange={(e) => setNewGroup({...newGroup, level: e.target.value})}
                          data-testid="select-group-level"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Max Members</label>
                        <Input
                          type="number"
                          value={newGroup.maxMembers}
                          onChange={(e) => setNewGroup({...newGroup, maxMembers: parseInt(e.target.value)})}
                          min="2"
                          max="20"
                          data-testid="input-max-members"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Schedule</label>
                      <Input
                        value={newGroup.schedule}
                        onChange={(e) => setNewGroup({...newGroup, schedule: e.target.value})}
                        placeholder="e.g., Every Tuesday 7PM EST"
                        data-testid="input-schedule"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tags (comma separated)</label>
                      <Input
                        value={newGroup.tags}
                        onChange={(e) => setNewGroup({...newGroup, tags: e.target.value})}
                        placeholder="algorithms, optimization, interview-prep"
                        data-testid="input-tags"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newGroup.isPublic}
                        onChange={(e) => setNewGroup({...newGroup, isPublic: e.target.checked})}
                        className="rounded"
                        data-testid="checkbox-public"
                      />
                      <label className="text-sm">Make this group public</label>
                    </div>
                    <Button 
                      onClick={handleCreateGroup} 
                      className="w-full"
                      data-testid="button-create-group"
                    >
                      Create Study Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="container mx-auto p-6">
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search study groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-groups"
                  />
                </div>
                <select
                  className="px-4 py-2 border rounded-lg"
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  data-testid="select-filter-level"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card 
                key={group.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedGroup(group)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {group.name}
                        {group.isPublic ? (
                          <Globe className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{group.topic}</CardDescription>
                    </div>
                    <Badge className={getLevelBadgeColor(group.level)}>
                      {group.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>{group.members.length}/{group.maxMembers} members</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{group.schedule}</span>
                    </div>
                    
                    {group.nextSession && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>Next: {new Date(group.nextSession).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {group.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinGroup(group.id);
                      }}
                      data-testid={`button-join-${group.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Join Group
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group);
                      }}
                      data-testid={`button-view-${group.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredGroups.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No study groups found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or create a new study group
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Group
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Group Detail Modal */}
        {selectedGroup && (
          <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedGroup.name}</DialogTitle>
                <DialogDescription>{selectedGroup.description}</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="members" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="announcements">Announcements</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="members" className="space-y-4">
                  <div className="space-y-3">
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.name}
                              {member.role === 'leader' && (
                                <Badge className="ml-2 bg-purple-100 text-purple-700">Leader</Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-600">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {member.problemsSolved && (
                          <div className="text-right">
                            <p className="font-semibold">{member.problemsSolved}</p>
                            <p className="text-sm text-gray-600">Problems Solved</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="resources" className="space-y-4">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                  <p className="text-center text-gray-500 py-8">No resources added yet</p>
                </TabsContent>
                
                <TabsContent value="announcements" className="space-y-4">
                  <Button className="w-full">
                    <Bell className="w-4 h-4 mr-2" />
                    Post Announcement
                  </Button>
                  <p className="text-center text-gray-500 py-8">No announcements yet</p>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Meeting Link</label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          value={selectedGroup.meetingLink || ''} 
                          readOnly 
                          placeholder="No meeting link set"
                        />
                        <Button variant="outline">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Group
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => handleLeaveGroup(selectedGroup.id)}
                      >
                        Leave Group
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}