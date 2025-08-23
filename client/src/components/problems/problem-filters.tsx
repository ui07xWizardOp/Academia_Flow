import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, Tag, TrendingUp, Building, Code } from "lucide-react";

interface ProblemFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalProblems: number;
  filteredCount: number;
}

export interface FilterState {
  search: string;
  difficulty: string;
  status: string;
  topics: string[];
  companies: string[];
}

const topics = [
  "Arrays", "Hash Table", "String", "Dynamic Programming", 
  "Math", "Sorting", "Greedy", "Depth-First Search",
  "Binary Search", "Tree", "Breadth-First Search", "Matrix",
  "Two Pointers", "Binary Tree", "Bit Manipulation", "Stack",
  "Heap", "Graph", "Linked List", "Recursion"
];

const companies = [
  "Google", "Amazon", "Microsoft", "Meta", "Apple",
  "Netflix", "Uber", "Airbnb", "Bloomberg", "LinkedIn",
  "Oracle", "Adobe", "Salesforce", "Tesla", "SpaceX"
];

export function ProblemFilters({ onFilterChange, totalProblems, filteredCount }: ProblemFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    difficulty: "all",
    status: "all",
    topics: [],
    companies: []
  });

  const [showTopics, setShowTopics] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDifficultyChange = (value: string) => {
    const newFilters = { ...filters, difficulty: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusChange = (value: string) => {
    const newFilters = { ...filters, status: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleTopic = (topic: string) => {
    const newTopics = filters.topics.includes(topic)
      ? filters.topics.filter(t => t !== topic)
      : [...filters.topics, topic];
    const newFilters = { ...filters, topics: newTopics };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleCompany = (company: string) => {
    const newCompanies = filters.companies.includes(company)
      ? filters.companies.filter(c => c !== company)
      : [...filters.companies, company];
    const newFilters = { ...filters, companies: newCompanies };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters = {
      search: "",
      difficulty: "all",
      status: "all",
      topics: [],
      companies: []
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const hasActiveFilters = 
    filters.search || 
    filters.difficulty !== "all" || 
    filters.status !== "all" || 
    filters.topics.length > 0 || 
    filters.companies.length > 0;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Search and Main Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search problems by title or description..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search-problems"
            />
          </div>
          
          <Select value={filters.difficulty} onValueChange={handleDifficultyChange}>
            <SelectTrigger className="w-full lg:w-[180px]" data-testid="select-difficulty">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full lg:w-[180px]" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Problems</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
              <SelectItem value="attempted">Attempted</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="whitespace-nowrap"
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Topic and Company Filters */}
        <div className="space-y-2">
          {/* Topic Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTopics(!showTopics)}
                className="text-sm font-medium"
                data-testid="button-toggle-topics"
              >
                <Tag className="w-4 h-4 mr-1" />
                Topics
                {filters.topics.length > 0 && (
                  <Badge className="ml-2 bg-purple-100 text-purple-700">
                    {filters.topics.length}
                  </Badge>
                )}
                <span className="ml-2">{showTopics ? "▼" : "▶"}</span>
              </Button>
            </div>
            {showTopics && (
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Badge
                    key={topic}
                    variant={filters.topics.includes(topic) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      filters.topics.includes(topic) 
                        ? "bg-purple-600 hover:bg-purple-700" 
                        : "hover:bg-purple-50 hover:border-purple-300"
                    }`}
                    onClick={() => toggleTopic(topic)}
                    data-testid={`badge-topic-${topic.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Company Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompanies(!showCompanies)}
                className="text-sm font-medium"
                data-testid="button-toggle-companies"
              >
                <Building className="w-4 h-4 mr-1" />
                Companies
                {filters.companies.length > 0 && (
                  <Badge className="ml-2 bg-orange-100 text-orange-700">
                    {filters.companies.length}
                  </Badge>
                )}
                <span className="ml-2">{showCompanies ? "▼" : "▶"}</span>
              </Button>
            </div>
            {showCompanies && (
              <div className="flex flex-wrap gap-2">
                {companies.map((company) => (
                  <Badge
                    key={company}
                    variant={filters.companies.includes(company) ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      filters.companies.includes(company) 
                        ? "bg-orange-500 hover:bg-orange-600" 
                        : "hover:bg-orange-50 hover:border-orange-300"
                    }`}
                    onClick={() => toggleCompany(company)}
                    data-testid={`badge-company-${company.toLowerCase()}`}
                  >
                    {company}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-purple-600">{filteredCount}</span> of{" "}
            <span className="font-semibold">{totalProblems}</span> problems
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="button-sort-difficulty">
              <TrendingUp className="w-4 h-4 mr-1" />
              Sort by Difficulty
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-sort-acceptance">
              <Code className="w-4 h-4 mr-1" />
              Sort by Acceptance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}