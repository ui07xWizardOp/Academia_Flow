import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Problem } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { ProblemCard } from "@/components/problems/problem-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, Search, Filter } from "lucide-react";

export default function Problems() {
  const [, setLocation] = useLocation();
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: problems = [], isLoading, error } = useQuery<Problem[]>({
    queryKey: ['/api/problems'],
  });

  const handleSolveProblem = (problemId: number) => {
    setLocation(`/code-editor?problem=${problemId}`);
  };

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = searchTerm === "" || 
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || problem.difficulty === difficultyFilter;
    const matchesTopic = topicFilter === "all" || problem.topics.includes(topicFilter);
    const matchesCompany = companyFilter === "all" || (problem.companies || []).includes(companyFilter);
    return matchesSearch && matchesDifficulty && matchesTopic && matchesCompany;
  });

  // Get unique values for filters
  const allTopics = Array.from(new Set(problems.flatMap((p) => p.topics)));
  const allCompanies = Array.from(new Set(problems.flatMap((p) => p.companies || []))).filter(Boolean).sort();

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading problems...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load problems</h2>
                <p className="text-gray-600">Please try again later or contact support.</p>
              </div>
            </CardContent>
          </Card>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Problem Library</h1>
              <p className="text-gray-600 mt-1">Practice coding problems to improve your skills.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-problems"
                />
              </div>
              
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-40" data-testid="select-difficulty">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-40" data-testid="select-topic">
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {allTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-40" data-testid="select-company">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {allCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Problems List */}
        <div className="flex-1 overflow-auto p-6">
          {filteredProblems.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No problems found</h3>
                  <p className="text-gray-600 mb-4">
                    {problems.length === 0 
                      ? "No problems are available yet. Please contact your instructor."
                      : "Try adjusting your filters to see more problems."
                    }
                  </p>
                  {difficultyFilter !== "all" || topicFilter !== "all" || companyFilter !== "all" || searchTerm !== "" ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDifficultyFilter("all");
                        setTopicFilter("all");
                        setCompanyFilter("all");
                        setSearchTerm("");
                      }}
                      data-testid="button-clear-filters"
                    >
                      Clear Filters
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProblems.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  id={problem.id}
                  title={problem.title}
                  description={problem.description}
                  difficulty={problem.difficulty as "easy" | "medium" | "hard"}
                  topics={problem.topics}
                  companies={problem.companies || []}
                  leetcodeId={problem.leetcodeId || undefined}
                  acceptanceRate={problem.acceptanceRate || undefined}
                  premium={problem.premium || false}
                  onSolve={handleSolveProblem}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
