import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Problem } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { ProblemCard } from "@/components/problems/problem-card";
import { ProblemFilters, type FilterState } from "@/components/problems/problem-filters";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Problems() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    difficulty: "all",
    status: "all",
    topics: [],
    companies: []
  });

  const { data: problems = [], isLoading, error } = useQuery<Problem[]>({
    queryKey: ['/api/problems'],
  });

  const handleSolveProblem = (problemId: number) => {
    setLocation(`/app/problems/${problemId}`);
  };

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      // Search filter
      const matchesSearch = !filters.search || 
        problem.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        problem.description.toLowerCase().includes(filters.search.toLowerCase());
      
      // Difficulty filter
      const matchesDifficulty = filters.difficulty === "all" || problem.difficulty === filters.difficulty;
      
      // Topics filter (match any selected topic)
      const matchesTopics = filters.topics.length === 0 || 
        filters.topics.some(topic => problem.topics.includes(topic));
      
      // Companies filter (match any selected company)
      const matchesCompanies = filters.companies.length === 0 || 
        filters.companies.some(company => (problem.companies || []).includes(company));
      
      // Status filter (would need user submission data)
      // For now, we'll ignore status filter
      
      return matchesSearch && matchesDifficulty && matchesTopics && matchesCompanies;
    });
  }, [problems, filters]);

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
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-2">Problem Library</h1>
            <p className="text-purple-100">Master algorithms and data structures with real interview questions</p>
          </div>
        </div>

        {/* Filters and Problems */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <ProblemFilters 
              onFilterChange={setFilters}
              totalProblems={problems.length}
              filteredCount={filteredProblems.length}
            />
            
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
                  {/* Clear filters button handled by ProblemFilters component */}
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
    </div>
  );
}
