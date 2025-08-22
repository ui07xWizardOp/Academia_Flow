#!/usr/bin/env python3

import json
import requests
import os
import sys
import csv
from pathlib import Path

def create_sample_leetcode_problems():
    """Create a sample set of LeetCode-style problems with company classifications"""
    print("🔽 Creating sample LeetCode problems dataset...")
    
    # Sample problems based on popular LeetCode questions
    problems = [
        {
            'id': 1,
            'title': 'Two Sum',
            'description': 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            'difficulty': 'Easy',
            'topics': ['Array', 'Hash Table'],
            'companies': ['Amazon', 'Google', 'Microsoft', 'Apple', 'Facebook'],
            'examples': [
                {'input': 'nums = [2,7,11,15], target = 9', 'output': '[0,1]', 'explanation': 'Because nums[0] + nums[1] == 9, we return [0, 1].'}
            ],
            'constraints': ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9']
        },
        {
            'id': 3,
            'title': 'Longest Substring Without Repeating Characters',
            'description': 'Given a string s, find the length of the longest substring without repeating characters.',
            'difficulty': 'Medium',
            'topics': ['Hash Table', 'String', 'Sliding Window'],
            'companies': ['Amazon', 'Microsoft', 'Facebook', 'Apple', 'Adobe'],
            'examples': [
                {'input': 's = "abcabcbb"', 'output': '3', 'explanation': 'The answer is "abc", with the length of 3.'}
            ],
            'constraints': ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.']
        },
        {
            'id': 5,
            'title': 'Longest Palindromic Substring',
            'description': 'Given a string s, return the longest palindromic substring in s.',
            'difficulty': 'Medium', 
            'topics': ['String', 'Dynamic Programming'],
            'companies': ['Amazon', 'Microsoft', 'Adobe', 'Apple'],
            'examples': [
                {'input': 's = "babad"', 'output': '"bab"', 'explanation': 'Note: "aba" is also a valid answer.'}
            ],
            'constraints': ['1 <= s.length <= 1000', 's consist of only digits and English letters.']
        },
        {
            'id': 15,
            'title': '3Sum',
            'description': 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.',
            'difficulty': 'Medium',
            'topics': ['Array', 'Two Pointers', 'Sorting'],
            'companies': ['Facebook', 'Amazon', 'Microsoft', 'Apple', 'Adobe'],
            'examples': [
                {'input': 'nums = [-1,0,1,2,-1,-4]', 'output': '[[-1,-1,2],[-1,0,1]]', 'explanation': 'The distinct triplets are [-1,-1,2] and [-1,0,1].'}
            ],
            'constraints': ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5']
        },
        {
            'id': 20,
            'title': 'Valid Parentheses',
            'description': 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
            'difficulty': 'Easy',
            'topics': ['String', 'Stack'],
            'companies': ['Amazon', 'Microsoft', 'Google', 'Facebook', 'Apple'],
            'examples': [
                {'input': 's = "()"', 'output': 'true'},
                {'input': 's = "()[]{}"', 'output': 'true'},
                {'input': 's = "(]"', 'output': 'false'}
            ],
            'constraints': ['1 <= s.length <= 10^4', 's consists of parentheses only "()[]{}"']
        },
        {
            'id': 21,
            'title': 'Merge Two Sorted Lists',
            'description': 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a sorted list.',
            'difficulty': 'Easy',
            'topics': ['Linked List', 'Recursion'],
            'companies': ['Amazon', 'Microsoft', 'Apple', 'Adobe'],
            'examples': [
                {'input': 'list1 = [1,2,4], list2 = [1,3,4]', 'output': '[1,1,2,3,4,4]'}
            ],
            'constraints': ['The number of nodes in both lists is in the range [0, 50]', '-100 <= Node.val <= 100']
        },
        {
            'id': 53,
            'title': 'Maximum Subarray',
            'description': 'Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum.',
            'difficulty': 'Medium',
            'topics': ['Array', 'Divide and Conquer', 'Dynamic Programming'],
            'companies': ['Amazon', 'Microsoft', 'Apple', 'Facebook', 'LinkedIn'],
            'examples': [
                {'input': 'nums = [-2,1,-3,4,-1,2,1,-5,4]', 'output': '6', 'explanation': '[4,-1,2,1] has the largest sum = 6.'}
            ],
            'constraints': ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4']
        },
        {
            'id': 70,
            'title': 'Climbing Stairs',
            'description': 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
            'difficulty': 'Easy',
            'topics': ['Math', 'Dynamic Programming', 'Memoization'],
            'companies': ['Amazon', 'Apple', 'Adobe', 'Uber'],
            'examples': [
                {'input': 'n = 2', 'output': '2', 'explanation': 'There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps'}
            ],
            'constraints': ['1 <= n <= 45']
        },
        {
            'id': 121,
            'title': 'Best Time to Buy and Sell Stock',
            'description': 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
            'difficulty': 'Easy',
            'topics': ['Array', 'Dynamic Programming'],
            'companies': ['Amazon', 'Facebook', 'Microsoft', 'Bloomberg', 'Apple'],
            'examples': [
                {'input': 'prices = [7,1,5,3,6,4]', 'output': '5', 'explanation': 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.'}
            ],
            'constraints': ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4']
        },
        {
            'id': 125,
            'title': 'Valid Palindrome',
            'description': 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
            'difficulty': 'Easy',
            'topics': ['Two Pointers', 'String'],
            'companies': ['Facebook', 'Amazon', 'Microsoft', 'Apple'],
            'examples': [
                {'input': 's = "A man, a plan, a canal: Panama"', 'output': 'true', 'explanation': '"amanaplanacanalpanama" is a palindrome.'}
            ],
            'constraints': ['1 <= s.length <= 2 * 10^5', 's consists only of printable ASCII characters.']
        },
        {
            'id': 200,
            'title': 'Number of Islands',
            'description': 'Given an m x n 2D binary grid grid which represents a map of "1"s (land) and "0"s (water), return the number of islands.',
            'difficulty': 'Medium',
            'topics': ['Array', 'Depth-First Search', 'Breadth-First Search', 'Union Find', 'Matrix'],
            'companies': ['Amazon', 'Facebook', 'Google', 'Microsoft', 'Apple'],
            'examples': [
                {'input': 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', 'output': '1'}
            ],
            'constraints': ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 300']
        },
        {
            'id': 206,
            'title': 'Reverse Linked List',
            'description': 'Given the head of a singly linked list, reverse the list and return the reversed list.',
            'difficulty': 'Easy',
            'topics': ['Linked List', 'Recursion'],
            'companies': ['Amazon', 'Microsoft', 'Apple', 'Facebook', 'Adobe'],
            'examples': [
                {'input': 'head = [1,2,3,4,5]', 'output': '[5,4,3,2,1]'}
            ],
            'constraints': ['The number of nodes in the list is the range [0, 5000]', '-5000 <= Node.val <= 5000']
        },
        {
            'id': 238,
            'title': 'Product of Array Except Self',
            'description': 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].',
            'difficulty': 'Medium',
            'topics': ['Array', 'Prefix Sum'],
            'companies': ['Amazon', 'Facebook', 'Microsoft', 'Apple', 'Lyft'],
            'examples': [
                {'input': 'nums = [1,2,3,4]', 'output': '[24,12,8,6]'}
            ],
            'constraints': ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30']
        },
        {
            'id': 242,
            'title': 'Valid Anagram',
            'description': 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
            'difficulty': 'Easy',
            'topics': ['Hash Table', 'String', 'Sorting'],
            'companies': ['Amazon', 'Facebook', 'Apple', 'Bloomberg'],
            'examples': [
                {'input': 's = "anagram", t = "nagaram"', 'output': 'true'},
                {'input': 's = "rat", t = "car"', 'output': 'false'}
            ],
            'constraints': ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters.']
        },
        {
            'id': 347,
            'title': 'Top K Frequent Elements',
            'description': 'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
            'difficulty': 'Medium',
            'topics': ['Array', 'Hash Table', 'Divide and Conquer', 'Sorting', 'Heap (Priority Queue)', 'Bucket Sort', 'Counting', 'Quickselect'],
            'companies': ['Amazon', 'Facebook', 'Apple', 'Yelp', 'Pocket Gems'],
            'examples': [
                {'input': 'nums = [1,1,1,2,2,3], k = 2', 'output': '[1,2]'}
            ],
            'constraints': ['1 <= nums.length <= 10^5', 'k is in the range [1, the number of unique elements in the array]']
        }
    ]
    
    print(f"✅ Created {len(problems)} sample LeetCode problems")
    return problems

def download_company_mappings():
    """Download company-wise problem mappings from GitHub repository"""
    print("🔽 Downloading company-wise problem mappings...")
    
    # GitHub API URL for the repository contents
    github_api_url = "https://api.github.com/repos/krishnadey30/LeetCode-Questions-CompanyWise/contents"
    
    company_mappings = {}
    
    try:
        # Get repository contents
        response = requests.get(github_api_url)
        response.raise_for_status()
        
        files = response.json()
        
        # Look for company-specific files
        for file_info in files:
            if file_info['type'] == 'file' and file_info['name'].endswith('.md'):
                company_name = file_info['name'].replace('.md', '').replace('_', ' ').title()
                
                # Skip README and other non-company files
                if company_name.lower() in ['readme', 'license']:
                    continue
                
                print(f"📈 Processing {company_name}...")
                
                # Download file content
                file_response = requests.get(file_info['download_url'])
                if file_response.status_code == 200:
                    content = file_response.text
                    
                    # Extract problem numbers/titles from markdown
                    problems = extract_problems_from_markdown(content)
                    if problems:
                        company_mappings[company_name] = problems
                        print(f"✅ Found {len(problems)} problems for {company_name}")
        
        print(f"✅ Successfully processed {len(company_mappings)} companies")
        return company_mappings
        
    except Exception as e:
        print(f"❌ Error downloading company mappings: {e}")
        return {}

def extract_problems_from_markdown(content):
    """Extract problem information from markdown content"""
    problems = []
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Look for patterns like:
        # - [Problem Name](link)
        # 1. Problem Name
        # * Problem Name
        if any(line.startswith(prefix) for prefix in ['- [', '* [', '1. ', '2. ', '3. ']):
            # Extract problem title
            if '[' in line and ']' in line:
                start = line.find('[') + 1
                end = line.find(']')
                if start > 0 and end > start:
                    problem_title = line[start:end].strip()
                    if problem_title and len(problem_title) > 3:
                        problems.append(problem_title)
            elif line.startswith(('1. ', '2. ', '3. ', '4. ', '5. ', '6. ', '7. ', '8. ', '9. ')):
                # Extract from numbered list
                problem_title = line.split('. ', 1)[1].strip()
                if problem_title and len(problem_title) > 3:
                    problems.append(problem_title)
    
    return problems

def process_leetcode_data(problems, company_mappings):
    """Process the LeetCode problems and enhance with company classifications"""
    print("🔄 Processing LeetCode problems...")
    
    try:
        processed_problems = []
        
        for problem in problems:
            # Enhance with additional company data from the mappings
            enhanced_companies = set(problem.get('companies', []))
            
            # Add companies from the mapping data
            for company, mapped_problems in company_mappings.items():
                for mapped_problem in mapped_problems:
                    if problem['title'].lower() in mapped_problem.lower() or mapped_problem.lower() in problem['title'].lower():
                        enhanced_companies.add(company)
            
            processed_problem = {
                'id': problem['id'],
                'title': problem['title'],
                'description': problem['description'],
                'difficulty': normalize_difficulty(problem['difficulty']),
                'topics': problem['topics'] if isinstance(problem['topics'], list) else [problem['topics']],
                'companies': list(enhanced_companies),
                'examples': problem.get('examples', []),
                'constraints': problem.get('constraints', []),
                'leetcode_id': problem['id'],
                'premium': False,
                'acceptance_rate': 0.0,
            }
            
            processed_problems.append(processed_problem)
        
        print(f"✅ Processed {len(processed_problems)} problems")
        return processed_problems
        
    except Exception as e:
        print(f"❌ Error processing problems: {e}")
        return None

def classify_problem_by_company(row, company_mappings):
    """Classify a problem by which companies ask it"""
    problem_title = str(row.get('title', ''))
    companies = []
    
    # Check each company's problem list
    for company, problems in company_mappings.items():
        for problem in problems:
            # Simple string matching (could be improved with fuzzy matching)
            if problem_title.lower() in problem.lower() or problem.lower() in problem_title.lower():
                companies.append(company)
                break
    
    return companies

def normalize_difficulty(difficulty):
    """Normalize difficulty levels"""
    difficulty = difficulty.lower().strip()
    if difficulty in ['easy', '1']:
        return 'easy'
    elif difficulty in ['medium', '2']:
        return 'medium'
    elif difficulty in ['hard', '3']:
        return 'hard'
    else:
        return 'medium'  # default

def parse_topics(topics_str):
    """Parse topics/tags from string"""
    if not topics_str or topics_str == 'nan':
        return []
    
    # Handle different formats
    topics = []
    if '[' in topics_str and ']' in topics_str:
        # JSON-like format
        try:
            topics = json.loads(topics_str.replace("'", '"'))
        except:
            # Fallback to simple parsing
            topics = topics_str.strip('[]').replace("'", "").split(',')
    else:
        # Comma-separated
        topics = topics_str.split(',')
    
    return [topic.strip() for topic in topics if topic.strip()]

def parse_examples(examples_str):
    """Parse examples from string"""
    if not examples_str or examples_str == 'nan':
        return []
    
    # Simple example parsing - could be enhanced
    examples = []
    if 'Input:' in examples_str and 'Output:' in examples_str:
        # Try to extract input/output pairs
        parts = examples_str.split('Example')
        for part in parts[1:]:  # Skip first empty part
            if 'Input:' in part and 'Output:' in part:
                input_start = part.find('Input:') + 6
                output_start = part.find('Output:')
                
                if output_start > input_start:
                    input_val = part[input_start:output_start].strip()
                    output_val = part[output_start + 7:].strip()
                    
                    examples.append({
                        'input': input_val,
                        'output': output_val
                    })
    
    return examples[:3]  # Limit to 3 examples

def parse_constraints(constraints_str):
    """Parse constraints from string"""
    if not constraints_str or constraints_str == 'nan':
        return []
    
    # Split by common delimiters
    constraints = []
    for line in constraints_str.split('\n'):
        line = line.strip()
        if line and len(line) > 5:  # Filter out very short lines
            constraints.append(line)
    
    return constraints[:5]  # Limit to 5 constraints

def save_processed_data(problems, output_file='leetcode_problems.json'):
    """Save processed problems to JSON file"""
    print(f"💾 Saving {len(problems)} problems to {output_file}...")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(problems, f, indent=2, ensure_ascii=False)
        print(f"✅ Data saved successfully")
        return True
    except Exception as e:
        print(f"❌ Error saving data: {e}")
        return False

def generate_summary(problems):
    """Generate summary statistics"""
    print("\n📊 DATASET SUMMARY:")
    print("=" * 50)
    
    # Total problems
    print(f"📈 Total Problems: {len(problems)}")
    
    # Difficulty distribution
    difficulty_counts = {}
    for problem in problems:
        diff = problem['difficulty']
        difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
    
    print(f"🎯 Difficulty Distribution:")
    for diff, count in sorted(difficulty_counts.items()):
        percentage = (count / len(problems)) * 100
        print(f"   {diff.title()}: {count} ({percentage:.1f}%)")
    
    # Company distribution
    company_counts = {}
    for problem in problems:
        for company in problem.get('companies', []):
            company_counts[company] = company_counts.get(company, 0) + 1
    
    if company_counts:
        print(f"\n🏢 Top 10 Companies by Problem Count:")
        top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for company, count in top_companies:
            print(f"   {company}: {count} problems")
    
    # Topic distribution
    topic_counts = {}
    for problem in problems:
        for topic in problem.get('topics', []):
            topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    if topic_counts:
        print(f"\n🔖 Top 10 Topics:")
        top_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for topic, count in top_topics:
            print(f"   {topic}: {count} problems")

def main():
    print("🚀 LeetCode Dataset Import Tool")
    print("=" * 50)
    
    # Step 1: Create sample LeetCode problems (using curated set)
    problems = create_sample_leetcode_problems()
    if not problems:
        print("❌ Failed to create problems dataset. Exiting.")
        sys.exit(1)
    
    # Step 2: Download company mappings
    print("🔄 Downloading company mappings...")
    company_mappings = download_company_mappings()
    print(f"✅ Downloaded mappings for {len(company_mappings)} companies")
    
    # Step 3: Process the data
    processed_problems = process_leetcode_data(problems, company_mappings)
    if not processed_problems:
        print("❌ Failed to process dataset. Exiting.")
        sys.exit(1)
    
    # Step 4: Save processed data
    if not save_processed_data(processed_problems):
        print("❌ Failed to save data. Exiting.")
        sys.exit(1)
    
    # Step 5: Generate summary
    generate_summary(processed_problems)
    
    print("\n🎉 LeetCode dataset import completed successfully!")
    print(f"📁 Output file: leetcode_problems.json")
    print(f"📊 Total problems imported: {len(processed_problems)}")

if __name__ == "__main__":
    main()