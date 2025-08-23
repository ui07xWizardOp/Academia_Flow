import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { safeExecutor } from './safe-executor';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
  memory: number;
  error?: string;
  securityViolation?: boolean;
  testCaseResults?: TestCaseResult[];
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
  weight?: number;
  hidden?: boolean;
}

export interface TestCaseResult {
  testCaseId: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  runtime: number;
  memory: number;
  error?: string;
  points: number;
  maxPoints: number;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  testCases?: TestCase[];
  timeLimit?: number; // in milliseconds
  memoryLimit?: number; // in MB
  userId?: string;
  problemId?: number;
  stdin?: string;
}

interface SecurityPolicy {
  maxFileSize: number; // in bytes
  maxOutputSize: number; // in bytes
  allowedSyscalls?: string[];
  bannedKeywords?: string[];
  networkAccess: boolean;
  fileSystemAccess: 'none' | 'readonly' | 'limited';
  maxProcesses: number;
  maxOpenFiles: number;
}

const DEFAULT_SECURITY_POLICIES: Record<string, SecurityPolicy> = {
  python: {
    maxFileSize: 1024 * 1024, // 1MB
    maxOutputSize: 1024 * 1024, // 1MB
    networkAccess: false,
    fileSystemAccess: 'readonly',
    maxProcesses: 10,
    maxOpenFiles: 50,
    bannedKeywords: ['__import__', 'eval', 'exec', 'open', 'compile', 'globals', 'locals', 'vars']
  },
  javascript: {
    maxFileSize: 1024 * 1024,
    maxOutputSize: 1024 * 1024,
    networkAccess: false,
    fileSystemAccess: 'readonly',
    maxProcesses: 10,
    maxOpenFiles: 50,
    bannedKeywords: ['require', 'import', 'fetch', 'XMLHttpRequest', 'WebSocket', 'process.exit']
  },
  java: {
    maxFileSize: 2 * 1024 * 1024, // 2MB for Java
    maxOutputSize: 1024 * 1024,
    networkAccess: false,
    fileSystemAccess: 'readonly',
    maxProcesses: 15,
    maxOpenFiles: 100,
    bannedKeywords: ['Runtime.exec', 'ProcessBuilder', 'System.exit', 'SecurityManager']
  },
  cpp: {
    maxFileSize: 2 * 1024 * 1024,
    maxOutputSize: 1024 * 1024,
    networkAccess: false,
    fileSystemAccess: 'readonly',
    maxProcesses: 10,
    maxOpenFiles: 50,
    bannedKeywords: ['system(', 'exec', 'fork', 'popen', '#include <sys/socket.h>']
  }
};

export class SecureCodeExecutor {
  private tempDir = '/tmp/secure-code-execution';
  private dockerAvailable: boolean = false;
  private dockerCheckPerformed: boolean = false;
  private executionMetrics: Map<string, any> = new Map();

  constructor() {
    this.initializeEnvironment();
  }

  private async initializeEnvironment() {
    await this.ensureTempDir();
    await this.checkDockerAvailability();
    await this.setupDockerImages();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true, mode: 0o700 });
    }
  }

  private async checkDockerAvailability(): Promise<boolean> {
    if (this.dockerCheckPerformed) return this.dockerAvailable;
    
    try {
      execSync('docker --version', { stdio: 'ignore' });
      execSync('docker ps', { stdio: 'ignore' });
      this.dockerAvailable = true;
      console.log('[SecureCodeExecutor] Docker is available - using secure container execution');
    } catch {
      this.dockerAvailable = false;
      console.log('[SecureCodeExecutor] Docker not available - using restricted direct execution');
      console.warn('[SecureCodeExecutor] WARNING: Production requires Docker for secure code isolation');
    }
    
    this.dockerCheckPerformed = true;
    return this.dockerAvailable;
  }

  private async setupDockerImages() {
    if (!this.dockerAvailable) return;

    const images = [
      'python:3.11-alpine',
      'node:18-alpine',
      'openjdk:17-alpine',
      'gcc:alpine'
    ];

    for (const image of images) {
      try {
        console.log(`[SecureCodeExecutor] Checking Docker image: ${image}`);
        execSync(`docker pull ${image}`, { stdio: 'ignore' });
      } catch (error) {
        console.error(`[SecureCodeExecutor] Failed to pull Docker image ${image}:`, error);
      }
    }
  }

  private validateCode(code: string, language: string): { valid: boolean; error?: string } {
    const policy = DEFAULT_SECURITY_POLICIES[language.toLowerCase()];
    
    if (!policy) {
      return { valid: false, error: `Unsupported language: ${language}` };
    }

    // Check file size
    if (Buffer.byteLength(code, 'utf8') > policy.maxFileSize) {
      return { valid: false, error: 'Code exceeds maximum allowed size' };
    }

    // Check for banned keywords
    if (policy.bannedKeywords) {
      for (const keyword of policy.bannedKeywords) {
        if (code.includes(keyword)) {
          return { 
            valid: false, 
            error: `Security violation: Use of restricted keyword '${keyword}' is not allowed` 
          };
        }
      }
    }

    return { valid: true };
  }

  async executeCode(request: CodeExecutionRequest): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const workDir = join(this.tempDir, executionId);
    const startTime = Date.now();

    // Validate code before execution
    const validation = this.validateCode(request.code, request.language);
    if (!validation.valid) {
      return {
        stdout: '',
        stderr: validation.error || 'Code validation failed',
        exitCode: -1,
        runtime: 0,
        memory: 0,
        error: validation.error,
        securityViolation: true
      };
    }

    try {
      await fs.mkdir(workDir, { recursive: true, mode: 0o700 });
      
      // Store execution metrics
      this.executionMetrics.set(executionId, {
        userId: request.userId,
        problemId: request.problemId,
        language: request.language,
        startTime: new Date()
      });

      const result = await this.executeLanguageSpecific(request, workDir);
      
      // Log execution metrics
      const metrics = this.executionMetrics.get(executionId);
      if (metrics) {
        metrics.endTime = new Date();
        metrics.runtime = result.runtime;
        metrics.exitCode = result.exitCode;
        console.log(`[SecureCodeExecutor] Execution ${executionId} completed:`, metrics);
      }

      return result;
    } catch (error) {
      console.error(`[SecureCodeExecutor] Execution error for ${executionId}:`, error);
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown execution error',
        exitCode: -1,
        runtime: Date.now() - startTime,
        memory: 0,
        error: 'Execution failed'
      };
    } finally {
      await this.cleanup(workDir);
      this.executionMetrics.delete(executionId);
    }
  }

  private async executeLanguageSpecific(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    switch (request.language.toLowerCase()) {
      case 'python':
        return await this.executePython(request, workDir);
      case 'javascript':
        return await this.executeJavaScript(request, workDir);
      case 'java':
        return await this.executeJava(request, workDir);
      case 'cpp':
      case 'c++':
        return await this.executeCpp(request, workDir);
      default:
        throw new Error(`Unsupported language: ${request.language}`);
    }
  }

  private async executePython(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    if (this.dockerAvailable) {
      const fileName = 'solution.py';
      const filePath = join(workDir, fileName);
      const secureCode = this.wrapPythonCode(request.code);
      await fs.writeFile(filePath, secureCode);
      
      return await this.runInSecureDocker(
        'python:3.11-alpine',
        ['python', '-u', `/code/${fileName}`],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128,
        request.stdin
      );
    } else {
      // Use safe executor for Python in non-Docker environments
      return this.executeInSafeMode(request, 'python');
    }
  }

  private executeInSafeMode(request: CodeExecutionRequest, language: string): ExecutionResult {
    // Import safeExecutor at the top of the file instead of using require
    const startTime = Date.now();
    
    // Execute the code
    const result = safeExecutor.execute(language, request.code, request.stdin || '');
    
    // Process test cases if provided
    let testCaseResults: TestCaseResult[] = [];
    if (request.testCases && request.testCases.length > 0) {
      for (let i = 0; i < request.testCases.length; i++) {
        const tc = request.testCases[i];
        const tcResult = safeExecutor.execute(language, request.code, tc.input);
        
        testCaseResults.push({
          testCaseId: i,
          passed: tcResult.stdout.trim() === tc.expectedOutput.trim(),
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: tcResult.stdout,
          runtime: tcResult.runtime,
          memory: 0,
          points: tcResult.stdout.trim() === tc.expectedOutput.trim() ? (tc.weight || 1) : 0,
          maxPoints: tc.weight || 1
        });
      }
    }
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      runtime: Date.now() - startTime,
      memory: 0,
      testCaseResults
    };
  }

  private wrapPythonCode(code: string): string {
    return `
import sys
import resource
import signal

# Set resource limits
resource.setrlimit(resource.RLIMIT_CPU, (5, 5))  # CPU time limit
resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))  # Memory limit
resource.setrlimit(resource.RLIMIT_NOFILE, (50, 50))  # Open files limit
resource.setrlimit(resource.RLIMIT_NPROC, (10, 10))  # Process limit

# Timeout handler
def timeout_handler(signum, frame):
    print("Time limit exceeded", file=sys.stderr)
    sys.exit(1)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(5)  # 5 second timeout

# Disable dangerous functions
__builtins__.__import__ = None
__builtins__.open = None
__builtins__.compile = None
__builtins__.eval = None
__builtins__.exec = None

# User code
${code}
`;
  }

  private async executeJavaScript(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    if (this.dockerAvailable) {
      const fileName = 'solution.js';
      const filePath = join(workDir, fileName);
      const secureCode = this.wrapJavaScriptCode(request.code);
      await fs.writeFile(filePath, secureCode);
      
      return await this.runInSecureDocker(
        'node:18-alpine',
        ['node', '--max-old-space-size=128', `/code/${fileName}`],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128,
        request.stdin
      );
    } else {
      // Use safe executor for JavaScript in non-Docker environments
      return this.executeInSafeMode(request, 'javascript');
    }
  }

  private wrapJavaScriptCode(code: string): string {
    return `
'use strict';
// Disable dangerous features
const originalRequire = require;
require = undefined;
global.require = undefined;
process.exit = undefined;
process.kill = undefined;
process.abort = undefined;

// Set timeout
setTimeout(() => {
  console.error("Time limit exceeded");
  process.exitCode = 1;
}, 5000);

// User code
${code}
`;
  }

  private async executeJava(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'Solution.java';
    const filePath = join(workDir, fileName);
    
    // Wrap user code in secure Java class
    const javaCode = this.wrapJavaCode(request.code);
    await fs.writeFile(filePath, javaCode);

    if (this.dockerAvailable) {
      // Compile first
      const compileResult = await this.runInSecureDocker(
        'openjdk:17-alpine',
        ['javac', `/code/${fileName}`],
        workDir,
        10000,
        256
      );

      if (compileResult.exitCode !== 0) {
        return {
          ...compileResult,
          error: 'Compilation error'
        };
      }

      // Run compiled class
      return await this.runInSecureDocker(
        'openjdk:17-alpine',
        ['java', '-Xmx128m', '-Xms32m', '-cp', '/code', 'Solution'],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 256,
        request.stdin
      );
    } else {
      // Java not supported in safe mode - requires compilation
      return {
        stdout: 'Java execution requires Docker environment for compilation',
        stderr: '',
        exitCode: 1,
        runtime: 0,
        memory: 0,
        error: 'Java is not supported in this environment'
      };
    }
  }

  private wrapJavaCode(code: string): string {
    if (code.includes('class Solution')) {
      return code;
    }
    
    return `
import java.util.*;
import java.io.*;

public class Solution {
    static {
        // Set security manager
        System.setSecurityManager(new SecurityManager() {
            @Override
            public void checkPermission(java.security.Permission perm) {
                // Allow only basic permissions
                String permName = perm.getName();
                if (permName.startsWith("exitVM") || 
                    permName.contains("exec") || 
                    permName.contains("connect") ||
                    permName.contains("listen")) {
                    throw new SecurityException("Operation not permitted: " + permName);
                }
            }
        });
    }
    
    public static void main(String[] args) {
        try {
            ${code}
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
`;
  }

  private async executeCpp(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.cpp';
    const filePath = join(workDir, fileName);
    const executablePath = join(workDir, 'solution');
    
    // Add security headers to C++ code
    const secureCode = this.wrapCppCode(request.code);
    await fs.writeFile(filePath, secureCode);

    if (this.dockerAvailable) {
      // Compile with security flags
      const compileResult = await this.runInSecureDocker(
        'gcc:alpine',
        [
          'g++',
          '-o', '/code/solution',
          `/code/${fileName}`,
          '-std=c++17',
          '-Wall',
          '-Wextra',
          '-O2',
          '-D_FORTIFY_SOURCE=2',
          '-fstack-protector-strong'
        ],
        workDir,
        10000,
        256
      );

      if (compileResult.exitCode !== 0) {
        return {
          ...compileResult,
          error: 'Compilation error'
        };
      }

      // Run executable
      return await this.runInSecureDocker(
        'gcc:alpine',
        ['/code/solution'],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128,
        request.stdin
      );
    } else {
      // C++ not supported in safe mode - requires compilation
      return {
        stdout: 'C++ execution requires Docker environment for compilation',
        stderr: '',
        exitCode: 1,
        runtime: 0,
        memory: 0,
        error: 'C++ is not supported in this environment'
      };
    }
  }

  private wrapCppCode(code: string): string {
    if (code.includes('#include')) {
      return code;
    }
    
    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
#include <unistd.h>
#include <sys/resource.h>

void setResourceLimits() {
    struct rlimit rl;
    
    // CPU time limit
    rl.rlim_cur = rl.rlim_max = 5;
    setrlimit(RLIMIT_CPU, &rl);
    
    // Memory limit (128MB)
    rl.rlim_cur = rl.rlim_max = 128 * 1024 * 1024;
    setrlimit(RLIMIT_AS, &rl);
    
    // Process limit
    rl.rlim_cur = rl.rlim_max = 0;
    setrlimit(RLIMIT_NPROC, &rl);
}

int main() {
    setResourceLimits();
    
    try {
        ${code}
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown error occurred" << std::endl;
        return 1;
    }
    
    return 0;
}
`;
  }

  private async runInSecureDocker(
    image: string,
    command: string[],
    workDir: string,
    timeLimit: number,
    memoryLimit: number,
    stdin?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const containerId = `exec_${uuidv4().substring(0, 8)}`;

    return new Promise((resolve) => {
      const dockerArgs = [
        'run',
        '--rm',
        '--name', containerId,
        '--network', 'none',
        '--memory', `${memoryLimit}m`,
        '--memory-swap', `${memoryLimit}m`,
        '--cpus', '0.5',
        '--pids-limit', '30',
        '--user', '65534:65534',
        '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=10m',
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        '-v', `${workDir}:/code:ro`,
        '--workdir', '/code',
        '-i',
        image,
        ...command
      ];

      const dockerProcess = spawn('docker', dockerArgs);
      
      let stdout = '';
      let stderr = '';
      let killed = false;
      let memoryUsage = 0;

      // Send stdin if provided
      if (stdin) {
        dockerProcess.stdin?.write(stdin);
      }
      dockerProcess.stdin?.end();

      // Set timeout
      const timeout = setTimeout(() => {
        killed = true;
        try {
          execSync(`docker kill ${containerId}`, { stdio: 'ignore' });
        } catch {}
      }, timeLimit);

      // Monitor memory usage
      const memoryMonitor = setInterval(() => {
        try {
          const stats = execSync(`docker stats --no-stream --format "{{.MemUsage}}" ${containerId}`, 
            { encoding: 'utf8' }).trim();
          const match = stats.match(/([0-9.]+)([KMG]?)iB/);
          if (match) {
            let usage = parseFloat(match[1]);
            if (match[2] === 'K') usage /= 1024;
            if (match[2] === 'G') usage *= 1024;
            memoryUsage = Math.max(memoryUsage, usage);
          }
        } catch {}
      }, 100);

      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > DEFAULT_SECURITY_POLICIES.python.maxOutputSize) {
          stdout = stdout.substring(0, DEFAULT_SECURITY_POLICIES.python.maxOutputSize) + 
                  '\n... Output truncated (exceeded limit) ...';
        }
      });

      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > DEFAULT_SECURITY_POLICIES.python.maxOutputSize) {
          stderr = stderr.substring(0, DEFAULT_SECURITY_POLICIES.python.maxOutputSize) + 
                  '\n... Error output truncated (exceeded limit) ...';
        }
      });

      dockerProcess.on('close', (code) => {
        clearTimeout(timeout);
        clearInterval(memoryMonitor);
        const runtime = Date.now() - startTime;

        if (killed) {
          resolve({
            stdout: stdout.trim(),
            stderr: 'Time limit exceeded',
            exitCode: -1,
            runtime: timeLimit,
            memory: memoryUsage,
            error: 'Time limit exceeded'
          });
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            runtime,
            memory: memoryUsage
          });
        }
      });

      dockerProcess.on('error', (error) => {
        clearTimeout(timeout);
        clearInterval(memoryMonitor);
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: -1,
          runtime: Date.now() - startTime,
          memory: 0,
          error: `Docker execution error: ${error.message}`
        });
      });
    });
  }

  private async runDirectRestricted(
    command: string,
    args: string[],
    cwd: string,
    timeLimit: number,
    stdin?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        cwd,
        env: {
          PATH: '/usr/local/bin:/usr/bin:/bin',
          HOME: '/tmp',
          USER: 'nobody'
        },
        uid: 65534,
        gid: 65534
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Send stdin if provided
      if (stdin) {
        childProcess.stdin?.write(stdin);
      }
      childProcess.stdin?.end();

      // Set timeout
      const timeout = setTimeout(() => {
        killed = true;
        childProcess.kill('SIGTERM');
        setTimeout(() => childProcess.kill('SIGKILL'), 1000);
      }, timeLimit);

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        if (stdout.length > DEFAULT_SECURITY_POLICIES.python.maxOutputSize) {
          stdout = stdout.substring(0, DEFAULT_SECURITY_POLICIES.python.maxOutputSize) + 
                  '\n... Output truncated (exceeded limit) ...';
        }
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (stderr.length > DEFAULT_SECURITY_POLICIES.python.maxOutputSize) {
          stderr = stderr.substring(0, DEFAULT_SECURITY_POLICIES.python.maxOutputSize) + 
                  '\n... Error output truncated (exceeded limit) ...';
        }
      });

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        const runtime = Date.now() - startTime;

        if (killed) {
          resolve({
            stdout: stdout.trim(),
            stderr: 'Time limit exceeded',
            exitCode: -1,
            runtime: timeLimit,
            memory: 0,
            error: 'Time limit exceeded'
          });
        } else {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            runtime,
            memory: 0
          });
        }
      });

      childProcess.on('error', (error: Error) => {
        clearTimeout(timeout);
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: -1,
          runtime: Date.now() - startTime,
          memory: 0,
          error: error.message
        });
      });
    });
  }

  async executeWithTestCases(request: CodeExecutionRequest): Promise<{
    results: TestCaseResult[];
    allPassed: boolean;
    score: number;
    runtime: number;
    memory: number;
  }> {
    if (!request.testCases || request.testCases.length === 0) {
      const result = await this.executeCode(request);
      return {
        results: [],
        allPassed: result.exitCode === 0,
        score: result.exitCode === 0 ? 100 : 0,
        runtime: result.runtime,
        memory: result.memory
      };
    }

    const results: TestCaseResult[] = [];
    let totalRuntime = 0;
    let maxMemory = 0;
    let totalPoints = 0;
    let maxPoints = 0;

    for (let i = 0; i < request.testCases.length; i++) {
      const testCase = request.testCases[i];
      const weight = testCase.weight || 1;
      const testMaxPoints = weight * 10;
      maxPoints += testMaxPoints;

      // Don't modify the code, just pass the input
      const modifiedRequest = {
        ...request,
        stdin: testCase.input
      };

      const result = await this.executeCode(modifiedRequest);
      totalRuntime += result.runtime;
      maxMemory = Math.max(maxMemory, result.memory);

      const actualOutput = result.stdout.trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput && result.exitCode === 0;
      
      let points = 0;
      if (passed) {
        points = testMaxPoints;
      } else if (result.exitCode === 0) {
        // Partial credit for correct execution but wrong output
        const similarity = this.calculateSimilarity(actualOutput, expectedOutput);
        points = Math.floor(testMaxPoints * similarity * 0.5);
      }
      
      totalPoints += points;

      results.push({
        testCaseId: i,
        passed,
        input: testCase.hidden ? 'Hidden' : testCase.input,
        expectedOutput: testCase.hidden ? 'Hidden' : expectedOutput,
        actualOutput: testCase.hidden && !passed ? 'Hidden' : actualOutput,
        runtime: result.runtime,
        memory: result.memory,
        error: result.error,
        points,
        maxPoints: testMaxPoints
      });
    }

    return {
      results,
      allPassed: results.every(r => r.passed),
      score: Math.round((totalPoints / maxPoints) * 100),
      runtime: totalRuntime,
      memory: maxMemory
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private injectTestInput(code: string, language: string, input: string): string {
    // Implementation similar to original but with better error handling
    switch (language.toLowerCase()) {
      case 'python':
        return `${code}\n\n# Test execution\nif __name__ == "__main__":\n    import sys\n    try:\n        # Parse input\n        ${this.generateInputParser(input, 'python')}\n        result = solution(${this.formatInput(input, 'python')})\n        print(result)\n    except Exception as e:\n        print(f"Runtime Error: {e}", file=sys.stderr)\n        sys.exit(1)`;
      
      case 'javascript':
        return `${code}\n\n// Test execution\ntry {\n    const input = ${input};\n    const result = solution(${this.formatInput(input, 'javascript')});\n    console.log(result);\n} catch(e) {\n    console.error("Runtime Error:", e.message);\n    process.exit(1);\n}`;
      
      case 'java':
        return this.wrapJavaTestCode(code, input);
      
      case 'cpp':
      case 'c++':
        return this.wrapCppTestCode(code, input);
      
      default:
        return code;
    }
  }

  private generateInputParser(input: string, language: string): string {
    // Generate appropriate input parsing code based on language
    return '';
  }

  private formatInput(input: string, language: string): string {
    // Format input appropriately for each language
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return language === 'python' ? `[${parsed.join(', ')}]` : input;
      }
      return input;
    } catch {
      return input;
    }
  }

  private wrapJavaTestCode(code: string, input: string): string {
    if (!code.includes('class Solution')) {
      code = `public class Solution {\n${code}\n}`;
    }
    
    return `
import java.util.*;
import java.io.*;

${code}

class TestRunner {
    public static void main(String[] args) {
        try {
            Solution solution = new Solution();
            // Parse and run with input: ${input}
            Object result = solution.solution(${input});
            System.out.println(result);
        } catch (Exception e) {
            System.err.println("Runtime Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
`;
  }

  private wrapCppTestCode(code: string, input: string): string {
    return `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

${code}

int main() {
    try {
        // Parse and run with input: ${input}
        auto result = solution(${input});
        cout << result << endl;
    } catch (const exception& e) {
        cerr << "Runtime Error: " << e.what() << endl;
        return 1;
    } catch (...) {
        cerr << "Unknown runtime error" << endl;
        return 1;
    }
    return 0;
}
`;
  }

  private async cleanup(workDir: string) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`[SecureCodeExecutor] Failed to cleanup ${workDir}:`, error);
    }
  }

  public getExecutionMode(): string {
    return this.dockerAvailable ? 'Docker (Production-Secure)' : 'Restricted Direct (Development)';
  }

  public getSecurityPolicies(): Record<string, SecurityPolicy> {
    return DEFAULT_SECURITY_POLICIES;
  }

  public async healthCheck(): Promise<{
    status: string;
    dockerAvailable: boolean;
    tempDirAccessible: boolean;
    securityPoliciesLoaded: boolean;
  }> {
    const tempDirAccessible = await fs.access(this.tempDir)
      .then(() => true)
      .catch(() => false);

    return {
      status: this.dockerAvailable ? 'healthy' : 'degraded',
      dockerAvailable: this.dockerAvailable,
      tempDirAccessible,
      securityPoliciesLoaded: true
    };
  }
}

export const secureCodeExecutor = new SecureCodeExecutor();