import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Trophy, 
  Code, 
  Target, 
  Star, 
  Award,
  BookOpen,
  Briefcase,
  Github,
  Linkedin,
  Globe,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  CheckCircle,
  Edit,
  Save,
  X
} from "lucide-react";

interface Skill {
  name: string;
  level: number; // 0-100
  category: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  joinedAt: string;
  skills: Skill[];
  achievements: Achievement[];
  stats: {
    problemsSolved: number;
    submissions: number;
    acceptanceRate: number;
    currentStreak: number;
    maxStreak: number;
    ranking: number;
    totalUsers: number;
  };
  recentActivity: {
    date: string;
    type: string;
    description: string;
  }[];
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile', user?.id],
    enabled: !!user?.id,
  });

  // Fetch user's progress by topic
  const { data: topicProgress } = useQuery({
    queryKey: ['/api/user/topic-progress', user?.id],
    enabled: !!user?.id,
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile({
      bio: profile?.bio,
      location: profile?.location,
      github: profile?.github,
      linkedin: profile?.linkedin,
      website: profile?.website
    });
  };

  const handleSave = () => {
    // Save profile changes
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({});
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage src={profile?.avatar} />
                  <AvatarFallback className="bg-white text-purple-600 text-2xl font-bold">
                    {profile?.name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile?.name}</h1>
                  <p className="text-purple-100 mb-3">
                    {isEditing ? (
                      <Textarea
                        value={editedProfile.bio || ''}
                        onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
                        className="bg-white/10 text-white placeholder-purple-200 border-white/20"
                        placeholder="Tell us about yourself..."
                        rows={2}
                      />
                    ) : (
                      profile?.bio || 'Passionate about coding and continuous learning'
                    )}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {isEditing ? (
                        <Input
                          value={editedProfile.location || ''}
                          onChange={(e) => setEditedProfile({...editedProfile, location: e.target.value})}
                          className="h-6 bg-white/10 text-white placeholder-purple-200 border-white/20"
                          placeholder="Location"
                        />
                      ) : (
                        profile?.location || 'Not specified'
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button onClick={handleCancel} size="sm" variant="outline" className="text-white border-white hover:bg-white/10">
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEdit} size="sm" variant="outline" className="text-white border-white hover:bg-white/10">
                    <Edit className="w-4 h-4 mr-1" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 mt-6">
              <a href={profile?.github} className="flex items-center gap-1 text-purple-100 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
                {isEditing ? (
                  <Input
                    value={editedProfile.github || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, github: e.target.value})}
                    className="h-6 bg-white/10 text-white placeholder-purple-200 border-white/20"
                    placeholder="GitHub username"
                  />
                ) : (
                  <span>{profile?.github || 'Add GitHub'}</span>
                )}
              </a>
              <a href={profile?.linkedin} className="flex items-center gap-1 text-purple-100 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
                {isEditing ? (
                  <Input
                    value={editedProfile.linkedin || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, linkedin: e.target.value})}
                    className="h-6 bg-white/10 text-white placeholder-purple-200 border-white/20"
                    placeholder="LinkedIn profile"
                  />
                ) : (
                  <span>{profile?.linkedin || 'Add LinkedIn'}</span>
                )}
              </a>
              <a href={profile?.website} className="flex items-center gap-1 text-purple-100 hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
                {isEditing ? (
                  <Input
                    value={editedProfile.website || ''}
                    onChange={(e) => setEditedProfile({...editedProfile, website: e.target.value})}
                    className="h-6 bg-white/10 text-white placeholder-purple-200 border-white/20"
                    placeholder="Personal website"
                  />
                ) : (
                  <span>{profile?.website || 'Add Website'}</span>
                )}
              </a>
              <span className="flex items-center gap-1">
                <Mail className="w-5 h-5" />
                {profile?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto max-w-6xl p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Problems Solved</p>
                    <p className="text-2xl font-bold text-purple-600">{profile?.stats.problemsSolved || 0}</p>
                  </div>
                  <Code className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Acceptance Rate</p>
                    <p className="text-2xl font-bold text-green-600">{profile?.stats.acceptanceRate || 0}%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Streak</p>
                    <p className="text-2xl font-bold text-orange-600">🔥 {profile?.stats.currentStreak || 0}</p>
                  </div>
                  <Target className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Max Streak</p>
                    <p className="text-2xl font-bold text-red-600">{profile?.stats.maxStreak || 0}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ranking</p>
                    <p className="text-2xl font-bold text-blue-600">
                      #{profile?.stats.ranking || 0}
                      <span className="text-sm text-gray-500">/{profile?.stats.totalUsers || 0}</span>
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="skills" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="skills">Skills & Progress</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Technical Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Data Structures', 'Algorithms', 'Dynamic Programming', 'Graph Theory', 'System Design', 'Database'].map((category) => (
                      <div key={category}>
                        <h4 className="font-medium mb-3">{category}</h4>
                        <div className="space-y-3">
                          {['Arrays', 'Trees', 'Graphs'].map((skill) => (
                            <div key={skill}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{skill}</span>
                                <span className="text-gray-600">{Math.floor(Math.random() * 30 + 70)}%</span>
                              </div>
                              <Progress value={Math.floor(Math.random() * 30 + 70)} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Achievements & Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'First Steps', description: 'Solved your first problem', rarity: 'common', icon: '👶' },
                      { title: 'Problem Solver', description: 'Solved 50 problems', rarity: 'rare', icon: '🎯' },
                      { title: 'Speed Demon', description: 'Solved a hard problem in under 10 minutes', rarity: 'epic', icon: '⚡' },
                      { title: 'Streak Master', description: 'Maintained a 30-day streak', rarity: 'legendary', icon: '🔥' },
                      { title: 'Bug Hunter', description: 'Found and reported a platform bug', rarity: 'epic', icon: '🐛' },
                      { title: 'Helper', description: 'Helped 10 students in study groups', rarity: 'rare', icon: '🤝' }
                    ].map((achievement) => (
                      <Card key={achievement.title} className={`border-2 ${getRarityColor(achievement.rarity)}`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-3xl mb-2">{achievement.icon}</div>
                            <h4 className="font-bold mb-1">{achievement.title}</h4>
                            <p className="text-xs text-gray-600 mb-2">{achievement.description}</p>
                            <Badge className={getRarityColor(achievement.rarity)}>
                              {achievement.rarity.toUpperCase()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { date: 'Today', type: 'problem', description: 'Solved "Two Sum" problem' },
                      { date: 'Yesterday', type: 'interview', description: 'Completed AI mock interview' },
                      { date: '2 days ago', type: 'achievement', description: 'Earned "Problem Solver" badge' },
                      { date: '3 days ago', type: 'study', description: 'Joined "Dynamic Programming" study group' },
                      { date: '1 week ago', type: 'submission', description: 'Best solution for "Binary Tree Maximum Path"' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <div className="w-2 h-2 rounded-full bg-purple-600 mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Resume & Career
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Resume Links</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Globe className="w-4 h-4 mr-1" /> Upload Resume
                        </Button>
                        <Button variant="outline" size="sm">
                          <Linkedin className="w-4 h-4 mr-1" /> Import from LinkedIn
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Career Readiness Score</h4>
                      <div className="flex items-center gap-4">
                        <Progress value={75} className="flex-1" />
                        <span className="font-bold text-purple-600">75%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Based on problems solved, interview practice, and skill assessments
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Target Companies</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple'].map((company) => (
                          <Badge key={company} variant="outline">{company}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}