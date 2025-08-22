import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { AlertCircle, Users, Calendar, Clock, Plus, Search } from "lucide-react";

export default function StudyGroups() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for study groups - in a real app, this would come from an API
  const studyGroups = [
    {
      id: 1,
      name: "Data Structures & Algorithms",
      description: "Weekly problem-solving sessions focusing on DSA concepts and leetcode practice",
      members: 12,
      maxMembers: 15,
      nextMeeting: "2024-01-25T18:00:00Z",
      topics: ["Arrays", "Trees", "Dynamic Programming"],
      difficulty: "Intermediate",
      isJoined: true
    },
    {
      id: 2,
      name: "System Design Study Circle",
      description: "Discuss system design patterns and practice mock interviews",
      members: 8,
      maxMembers: 10,
      nextMeeting: "2024-01-26T19:00:00Z",
      topics: ["Microservices", "Databases", "Load Balancing"],
      difficulty: "Advanced",
      isJoined: false
    },
    {
      id: 3,
      name: "Frontend Development Group",
      description: "React, TypeScript, and modern web development practices",
      members: 15,
      maxMembers: 20,
      nextMeeting: "2024-01-24T17:00:00Z",
      topics: ["React", "TypeScript", "CSS"],
      difficulty: "Beginner",
      isJoined: false
    },
    {
      id: 4,
      name: "Competitive Programming",
      description: "Prepare for coding competitions and contests together",
      members: 6,
      maxMembers: 12,
      nextMeeting: "2024-01-27T16:00:00Z",
      topics: ["Algorithms", "Mathematics", "Graph Theory"],
      difficulty: "Advanced",
      isJoined: true
    }
  ];

  const filteredGroups = studyGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatMeetingTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Groups</h1>
              <p className="text-gray-600 mt-1">Join study groups to learn together with your peers.</p>
            </div>
            <Button data-testid="button-create-group">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Study Groups Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search study groups by name or topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-groups"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Study Groups Grid */}
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No study groups found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? "Try adjusting your search terms." : "No study groups are available yet."}
                  </p>
                  {!searchTerm && (
                    <Button data-testid="button-create-first-group">
                      <Plus className="w-4 h-4 mr-2" />
                      Create the first group
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg" data-testid={`group-title-${group.id}`}>
                          {group.name}
                        </CardTitle>
                        <Badge 
                          variant={group.difficulty === 'Beginner' ? 'default' : group.difficulty === 'Intermediate' ? 'secondary' : 'outline'}
                          className="mt-2"
                        >
                          {group.difficulty}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-1" />
                        {group.members}/{group.maxMembers}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                    
                    {/* Topics */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {group.topics.map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>

                    {/* Next Meeting */}
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Next meeting: {formatMeetingTime(group.nextMeeting)}</span>
                    </div>

                    {/* Members Preview */}
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(4, group.members))].map((_, i) => (
                          <Avatar key={i} className="w-8 h-8 border-2 border-white">
                            <AvatarFallback className="bg-gray-300 text-gray-600 text-sm">
                              {String.fromCharCode(65 + i)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.members > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{group.members - 4}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant={group.isJoined ? "outline" : "default"}
                        size="sm"
                        data-testid={`button-${group.isJoined ? 'leave' : 'join'}-${group.id}`}
                      >
                        {group.isJoined ? "Leave Group" : "Join Group"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Your Groups Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Groups</CardTitle>
            </CardHeader>
            <CardContent>
              {studyGroups.filter(g => g.isJoined).length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You haven't joined any study groups yet.</p>
                  <p className="text-sm text-gray-500">Join a group above to start learning with others!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studyGroups.filter(g => g.isJoined).map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{group.name}</h3>
                          <p className="text-sm text-gray-500">
                            Next meeting: {formatMeetingTime(group.nextMeeting)}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" data-testid={`button-view-${group.id}`}>
                        View Group
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}