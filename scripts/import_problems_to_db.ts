import { db } from '../server/db';
import { problems } from '../shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

async function importLeetCodeProblems() {
  console.log('🚀 Starting LeetCode problems import to database...');
  
  try {
    // Read the generated JSON file
    const filePath = join(process.cwd(), 'leetcode_problems.json');
    const jsonData = readFileSync(filePath, 'utf8');
    const leetcodeProblems = JSON.parse(jsonData);
    
    console.log(`📋 Found ${leetcodeProblems.length} problems to import`);
    
    // Skip clearing existing problems to avoid foreign key constraints
    console.log('📝 Adding LeetCode problems (preserving existing data)...');
    
    // Import problems one by one
    let importedCount = 0;
    
    for (const problem of leetcodeProblems) {
      try {
        // Prepare starter code for different languages
        const starterCode = {
          python: `def solution(${getParametersFromExamples(problem.examples)}):\n    # Your code here\n    pass`,
          javascript: `function solution(${getParametersFromExamples(problem.examples)}) {\n    // Your code here\n}`,
          java: `public class Solution {\n    public ${getReturnTypeFromExamples(problem.examples)} solution(${getParametersFromExamples(problem.examples)}) {\n        // Your code here\n    }\n}`,
          cpp: `class Solution {\npublic:\n    ${getReturnTypeFromExamples(problem.examples)} solution(${getParametersFromExamples(problem.examples)}) {\n        // Your code here\n    }\n};`
        };
        
        // Generate basic test cases from examples
        const testCases = problem.examples?.map((example: any, index: number) => ({
          id: index + 1,
          input: example.input,
          expectedOutput: example.output,
          explanation: example.explanation || ''
        })) || [];
        
        await db.insert(problems).values({
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          topics: problem.topics || [],
          starterCode,
          testCases,
          leetcodeId: problem.id,
          companies: problem.companies || [],
          acceptanceRate: Math.floor((Math.random() * 80) + 20), // Random acceptance rate 20-100%
          premium: problem.premium || false,
          examples: problem.examples || [],
          constraints: problem.constraints || [],
          solution: null,
          createdBy: null
        });
        
        importedCount++;
        console.log(`✅ Imported: ${problem.title}`);
        
      } catch (error) {
        console.error(`❌ Failed to import ${problem.title}:`, error);
      }
    }
    
    console.log(`🎉 Successfully imported ${importedCount} out of ${leetcodeProblems.length} problems!`);
    
    // Verify import
    const totalProblems = await db.select().from(problems);
    console.log(`📊 Total problems in database: ${totalProblems.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

function getParametersFromExamples(examples: any[]): string {
  if (!examples || examples.length === 0) return 'params';
  
  // Simple parameter extraction from first example
  const firstExample = examples[0];
  if (firstExample && firstExample.input) {
    const input = firstExample.input;
    
    // Try to extract parameter names from input
    if (input.includes('nums = ')) {
      return 'nums, target';
    } else if (input.includes('s = ')) {
      return 's';
    } else if (input.includes('grid = ')) {
      return 'grid';
    } else if (input.includes('prices = ')) {
      return 'prices';
    } else if (input.includes('list1 = ') && input.includes('list2 = ')) {
      return 'list1, list2';
    } else if (input.includes('head = ')) {
      return 'head';
    } else if (input.includes('n = ')) {
      return 'n';
    }
  }
  
  return 'params';
}

function getReturnTypeFromExamples(examples: any[]): string {
  if (!examples || examples.length === 0) return 'int';
  
  const firstExample = examples[0];
  if (firstExample && firstExample.output) {
    const output = firstExample.output;
    
    // Simple return type detection
    if (output.includes('[') && output.includes(']')) {
      return 'int[]'; // Array return type
    } else if (output === 'true' || output === 'false') {
      return 'boolean';
    } else if (output.includes('"')) {
      return 'String';
    } else if (!isNaN(Number(output))) {
      return 'int';
    }
  }
  
  return 'int';
}

// Run the import
importLeetCodeProblems().catch(console.error);