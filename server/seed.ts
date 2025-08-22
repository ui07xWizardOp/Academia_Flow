import { db } from "./db";
import { problems } from "@shared/schema";

const sampleProblems = [
  {
    title: "Two Sum",
    description: `<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.</p>

<p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>

<p>You can return the answer in any order.</p>

<h3>Example 1:</h3>
<pre><code>Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].</code></pre>

<h3>Example 2:</h3>
<pre><code>Input: nums = [3,2,4], target = 6
Output: [1,2]</code></pre>

<h3>Constraints:</h3>
<ul>
<li>2 ≤ nums.length ≤ 10⁴</li>
<li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
<li>-10⁹ ≤ target ≤ 10⁹</li>
<li>Only one valid answer exists.</li>
</ul>`,
    difficulty: "easy" as const,
    topics: ["Array", "Hash Table"],
    starterCode: {
      python: `def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Write your solution here
    pass`,
      javascript: `function twoSum(nums, target) {
    // Write your solution here
}`,
      java: `public class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};`
    },
    testCases: [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1]
      },
      {
        input: { nums: [3, 2, 4], target: 6 },
        expected: [1, 2]
      },
      {
        input: { nums: [3, 3], target: 6 },
        expected: [0, 1]
      }
    ]
  },
  {
    title: "Binary Search",
    description: `<p>Given an array of integers <code>nums</code> which is sorted in ascending order, and an integer <code>target</code>, write a function to search <code>target</code> in <code>nums</code>. If <code>target</code> exists, then return its index. Otherwise, return <code>-1</code>.</p>

<p>You must write an algorithm with <code>O(log n)</code> runtime complexity.</p>

<h3>Example 1:</h3>
<pre><code>Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4</code></pre>

<h3>Example 2:</h3>
<pre><code>Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1</code></pre>

<h3>Constraints:</h3>
<ul>
<li>1 ≤ nums.length ≤ 10⁴</li>
<li>-10⁴ < nums[i], target < 10⁴</li>
<li>All the integers in nums are unique.</li>
<li>nums is sorted in ascending order.</li>
</ul>`,
    difficulty: "medium" as const,
    topics: ["Array", "Binary Search"],
    starterCode: {
      python: `def search(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: int
    """
    # Write your solution here
    pass`,
      javascript: `function search(nums, target) {
    // Write your solution here
}`,
      java: `public class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
      cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};`
    },
    testCases: [
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
        expected: 4
      },
      {
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
        expected: -1
      }
    ]
  },
  {
    title: "Merge Intervals",
    description: `<p>Given an array of <code>intervals</code> where <code>intervals[i] = [start_i, end_i]</code>, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.</p>

<h3>Example 1:</h3>
<pre><code>Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
Explanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].</code></pre>

<h3>Example 2:</h3>
<pre><code>Input: intervals = [[1,4],[4,5]]
Output: [[1,5]]
Explanation: Intervals [1,4] and [4,5] are considered overlapping.</code></pre>

<h3>Constraints:</h3>
<ul>
<li>1 ≤ intervals.length ≤ 10⁴</li>
<li>intervals[i].length == 2</li>
<li>0 ≤ start_i ≤ end_i ≤ 10⁴</li>
</ul>`,
    difficulty: "hard" as const,
    topics: ["Array", "Sorting"],
    starterCode: {
      python: `def merge(intervals):
    """
    :type intervals: List[List[int]]
    :rtype: List[List[int]]
    """
    # Write your solution here
    pass`,
      javascript: `function merge(intervals) {
    // Write your solution here
}`,
      java: `public class Solution {
    public int[][] merge(int[][] intervals) {
        // Write your solution here
        return new int[][]{};
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        // Write your solution here
        return {};
    }
};`
    },
    testCases: [
      {
        input: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
        expected: [[1, 6], [8, 10], [15, 18]]
      },
      {
        input: { intervals: [[1, 4], [4, 5]] },
        expected: [[1, 5]]
      }
    ]
  },
  {
    title: "Valid Parentheses",
    description: `<p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>

<p>An input string is valid if:</p>
<ol>
<li>Open brackets must be closed by the same type of brackets.</li>
<li>Open brackets must be closed in the correct order.</li>
<li>Every close bracket has a corresponding open bracket of the same type.</li>
</ol>

<h3>Example 1:</h3>
<pre><code>Input: s = "()"
Output: true</code></pre>

<h3>Example 2:</h3>
<pre><code>Input: s = "()[]{}"
Output: true</code></pre>

<h3>Example 3:</h3>
<pre><code>Input: s = "(]"
Output: false</code></pre>

<h3>Constraints:</h3>
<ul>
<li>1 ≤ s.length ≤ 10⁴</li>
<li>s consists of parentheses only '()[]{}'.</li>
</ul>`,
    difficulty: "easy" as const,
    topics: ["String", "Stack"],
    starterCode: {
      python: `def is_valid(s):
    """
    :type s: str
    :rtype: bool
    """
    # Write your solution here
    pass`,
      javascript: `function isValid(s) {
    // Write your solution here
}`,
      java: `public class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
      cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your solution here
        return false;
    }
};`
    },
    testCases: [
      {
        input: { s: "()" },
        expected: true
      },
      {
        input: { s: "()[]{}" },
        expected: true
      },
      {
        input: { s: "(]" },
        expected: false
      }
    ]
  },
  {
    title: "Maximum Subarray",
    description: `<p>Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.</p>

<p>A <strong>subarray</strong> is a <strong>contiguous</strong> part of an array.</p>

<h3>Example 1:</h3>
<pre><code>Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.</code></pre>

<h3>Example 2:</h3>
<pre><code>Input: nums = [1]
Output: 1</code></pre>

<h3>Example 3:</h3>
<pre><code>Input: nums = [5,4,-1,7,8]
Output: 23</code></pre>

<h3>Constraints:</h3>
<ul>
<li>1 ≤ nums.length ≤ 10⁵</li>
<li>-10⁴ ≤ nums[i] ≤ 10⁴</li>
</ul>

<p><strong>Follow up:</strong> If you have figured out the O(n) solution, try coding another solution using the divide and conquer approach, which is more subtle.</p>`,
    difficulty: "medium" as const,
    topics: ["Array", "Dynamic Programming"],
    starterCode: {
      python: `def max_sub_array(nums):
    """
    :type nums: List[int]
    :rtype: int
    """
    # Write your solution here
    pass`,
      javascript: `function maxSubArray(nums) {
    // Write your solution here
}`,
      java: `public class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
      cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};`
    },
    testCases: [
      {
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expected: 6
      },
      {
        input: { nums: [1] },
        expected: 1
      },
      {
        input: { nums: [5, 4, -1, 7, 8] },
        expected: 23
      }
    ]
  }
];

export async function seedDatabase() {
  console.log("Seeding database with sample problems...");
  
  try {
    // Check if problems already exist
    const existingProblems = await db.select().from(problems);
    
    if (existingProblems.length > 0) {
      console.log("Database already seeded with problems.");
      return;
    }

    // Insert sample problems
    for (const problem of sampleProblems) {
      await db.insert(problems).values(problem);
    }

    console.log(`Successfully seeded ${sampleProblems.length} problems to the database.`);
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
