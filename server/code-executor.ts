import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
  memory: number;
  error?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  testCases?: TestCase[];
  timeLimit?: number; // in milliseconds
  memoryLimit?: number; // in MB
}

export class CodeExecutor {
  private tempDir = '/tmp/code-execution';
  private dockerAvailable: boolean = false;
  private dockerCheckPerformed: boolean = false;

  constructor() {
    this.ensureTempDir();
    this.checkDockerAvailability();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private checkDockerAvailability() {
    if (this.dockerCheckPerformed) return this.dockerAvailable;
    
    try {
      // Check if Docker is installed and running
      execSync('docker --version', { stdio: 'ignore' });
      execSync('docker ps', { stdio: 'ignore' });
      this.dockerAvailable = true;
      console.log('[CodeExecutor] Docker is available - using secure container execution');
    } catch {
      this.dockerAvailable = false;
      console.log('[CodeExecutor] Docker not available - using fallback direct execution');
      console.log('[CodeExecutor] NOTE: For production, Docker is recommended for secure code isolation');
    }
    
    this.dockerCheckPerformed = true;
    return this.dockerAvailable;
  }

  async executeCode(request: CodeExecutionRequest): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const workDir = join(this.tempDir, executionId);

    try {
      await fs.mkdir(workDir, { recursive: true });

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
    } finally {
      // Cleanup temp files
      await this.cleanup(workDir);
    }
  }

  private async executePython(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.py';
    const filePath = join(workDir, fileName);

    // Write code to file
    await fs.writeFile(filePath, request.code);

    // Use Docker if available, otherwise direct execution
    if (this.dockerAvailable) {
      return await this.runInDocker(
        'python:3.11-alpine',
        ['python', `/code/${fileName}`],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128
      );
    } else {
      return await this.runDirect(
        'python3',
        [filePath],
        workDir,
        request.timeLimit || 5000
      );
    }
  }

  private async executeJavaScript(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.js';
    const filePath = join(workDir, fileName);

    await fs.writeFile(filePath, request.code);

    if (this.dockerAvailable) {
      return await this.runInDocker(
        'node:18-alpine',
        ['node', `/code/${fileName}`],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128
      );
    } else {
      return await this.runDirect(
        'node',
        [filePath],
        workDir,
        request.timeLimit || 5000
      );
    }
  }

  private async executeJava(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'Solution.java';
    const filePath = join(workDir, fileName);

    // Wrap user code in a proper class structure if needed
    let javaCode = request.code;
    if (!javaCode.includes('class Solution')) {
      javaCode = `public class Solution {\n    public static void main(String[] args) {\n        ${request.code}\n    }\n}`;
    }

    await fs.writeFile(filePath, javaCode);

    if (this.dockerAvailable) {
      // Compile first, then run
      const compileResult = await this.runInDocker(
        'openjdk:17-alpine',
        ['javac', `/code/${fileName}`],
        workDir,
        10000,
        256
      );

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: 1,
          runtime: compileResult.runtime,
          memory: compileResult.memory,
          error: 'Compilation error'
        };
      }

      // Run the compiled class
      return await this.runInDocker(
        'openjdk:17-alpine',
        ['java', '-cp', '/code', 'Solution'],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 256
      );
    } else {
      // Direct execution fallback
      const compileResult = await this.runDirect(
        'javac',
        [filePath],
        workDir,
        10000
      );

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: 1,
          runtime: compileResult.runtime,
          memory: 0,
          error: 'Compilation error'
        };
      }

      return await this.runDirect(
        'java',
        ['-cp', workDir, 'Solution'],
        workDir,
        request.timeLimit || 5000
      );
    }
  }

  private async executeCpp(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.cpp';
    const filePath = join(workDir, fileName);
    const executablePath = join(workDir, 'solution');

    await fs.writeFile(filePath, request.code);

    if (this.dockerAvailable) {
      // Compile first
      const compileResult = await this.runInDocker(
        'gcc:alpine',
        ['g++', '-o', '/code/solution', `/code/${fileName}`, '-std=c++17'],
        workDir,
        10000,
        256
      );

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: 1,
          runtime: compileResult.runtime,
          memory: compileResult.memory,
          error: 'Compilation error'
        };
      }

      // Run the compiled executable
      return await this.runInDocker(
        'gcc:alpine',
        ['/code/solution'],
        workDir,
        request.timeLimit || 5000,
        request.memoryLimit || 128
      );
    } else {
      // Direct execution fallback
      const compileResult = await this.runDirect(
        'g++',
        ['-o', executablePath, filePath, '-std=c++17'],
        workDir,
        10000
      );

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: 1,
          runtime: compileResult.runtime,
          memory: 0,
          error: 'Compilation error'
        };
      }

      return await this.runDirect(
        executablePath,
        [],
        workDir,
        request.timeLimit || 5000
      );
    }
  }

  // Docker-based execution for production environments
  private async runInDocker(
    image: string,
    command: string[],
    workDir: string,
    timeLimit: number,
    memoryLimit: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none', // No network access
        '--memory', `${memoryLimit}m`,
        '--cpus', '0.5',
        '--user', '65534:65534', // nobody user
        '--read-only',
        '--tmpfs', '/tmp:rw,size=10m',
        '-v', `${workDir}:/code:ro`,
        '--workdir', '/code',
        image,
        ...command
      ];

      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout
      const timeout = setTimeout(() => {
        killed = true;
        dockerProcess.kill('SIGKILL');
      }, timeLimit);

      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Limit output size
        if (stdout.length > 100000) {
          stdout = stdout.substring(0, 100000) + '\n... Output truncated ...';
        }
      });

      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        // Limit error output size
        if (stderr.length > 100000) {
          stderr = stderr.substring(0, 100000) + '\n... Error output truncated ...';
        }
      });

      dockerProcess.on('close', (code) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const runtime = endTime - startTime;

        if (killed) {
          resolve({
            stdout: '',
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
            memory: 0 // Docker memory usage tracking would need additional setup
          });
        }
      });

      dockerProcess.on('error', (error) => {
        clearTimeout(timeout);
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

  // Direct execution fallback for development environments (less secure)
  private async runDirect(
    command: string,
    args: string[],
    cwd: string,
    timeLimit: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
        }
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout
      const timeout = setTimeout(() => {
        killed = true;
        childProcess.kill('SIGTERM');
        setTimeout(() => {
          childProcess.kill('SIGKILL');
        }, 1000);
      }, timeLimit);

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        // Limit output size to prevent memory issues
        if (stdout.length > 100000) {
          stdout = stdout.substring(0, 100000) + '\n... Output truncated ...';
        }
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        // Limit error output size
        if (stderr.length > 100000) {
          stderr = stderr.substring(0, 100000) + '\n... Error output truncated ...';
        }
      });

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const runtime = endTime - startTime;

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
        let errorMessage = error.message;
        
        // Provide helpful error messages for common issues
        if (error.message.includes('ENOENT')) {
          if (command === 'python3') {
            errorMessage = 'Python is not installed. Please install Python 3 to run Python code.';
          } else if (command === 'javac' || command === 'java') {
            errorMessage = 'Java is not installed. Please install Java JDK to run Java code.';
          } else if (command === 'g++') {
            errorMessage = 'C++ compiler is not installed. Please install g++ to run C++ code.';
          } else {
            errorMessage = `Command '${command}' not found. Please ensure the required runtime is installed.`;
          }
        }

        resolve({
          stdout: '',
          stderr: errorMessage,
          exitCode: -1,
          runtime: Date.now() - startTime,
          memory: 0,
          error: errorMessage
        });
      });

      // Handle stdin if needed (for future interactive programs)
      childProcess.stdin?.end();
    });
  }

  async executeWithTestCases(request: CodeExecutionRequest): Promise<{
    results: ExecutionResult[];
    allPassed: boolean;
    score: number;
  }> {
    if (!request.testCases || request.testCases.length === 0) {
      // Just execute the code without test cases
      const result = await this.executeCode(request);
      return {
        results: [result],
        allPassed: result.exitCode === 0,
        score: result.exitCode === 0 ? 100 : 0
      };
    }

    const results: ExecutionResult[] = [];
    let passedTests = 0;

    for (const testCase of request.testCases) {
      // Modify code to include test input (this is language-specific)
      const modifiedRequest = {
        ...request,
        code: this.injectTestInput(request.code, request.language, testCase.input)
      };

      const result = await this.executeCode(modifiedRequest);
      
      // Check if output matches expected (handle both 'expected' and 'expectedOutput' keys)
      const actualOutput = result.stdout.trim();
      const expectedValue = (testCase as any).expectedOutput || (testCase as any).expected;
      const expectedOutput = expectedValue && typeof expectedValue === 'string' 
        ? expectedValue.trim() 
        : String(expectedValue || "");
      const passed = actualOutput === expectedOutput && result.exitCode === 0;

      if (passed) passedTests++;

      results.push({
        ...result,
        error: passed ? undefined : `Expected: "${expectedOutput}", Got: "${actualOutput}"`
      });
    }

    return {
      results,
      allPassed: passedTests === request.testCases.length,
      score: Math.round((passedTests / request.testCases.length) * 100)
    };
  }

  private injectTestInput(code: string, language: string, input: string): string {
    switch (language.toLowerCase()) {
      case 'python':
        // For Python, we'll create a test harness
        return `${code}\n\n# Test execution\nif __name__ == "__main__":\n    try:\n        result = solution(${input})\n        print(result)\n    except Exception as e:\n        print(f"Error: {e}")`;
      
      case 'javascript':
        // For JavaScript, call the function with test input
        return `${code}\n\n// Test execution\ntry {\n    const result = solution(${input});\n    console.log(result);\n} catch(e) {\n    console.error("Error:", e.message);\n}`;
      
      case 'java':
        // For Java, we need to be more careful with the class structure
        if (code.includes('class Solution')) {
          // Insert test call in main method
          return code.replace(
            'public static void main(String[] args) {',
            `public static void main(String[] args) {\n        try {\n            Object result = solution(${input});\n            System.out.println(result);\n        } catch(Exception e) {\n            System.err.println("Error: " + e.getMessage());\n        }\n    }\n\n    public static Object solution`
          );
        } else {
          // Wrap in a complete class
          return `public class Solution {\n    public static void main(String[] args) {\n        try {\n            ${code}\n            // Test with input: ${input}\n        } catch(Exception e) {\n            System.err.println("Error: " + e.getMessage());\n        }\n    }\n}`;
        }
      
      case 'cpp':
      case 'c++':
        // For C++, add a main function if it doesn't exist
        if (!code.includes('int main')) {
          return `#include <iostream>\n${code}\n\nint main() {\n    try {\n        auto result = solution(${input});\n        std::cout << result << std::endl;\n    } catch(...) {\n        std::cerr << "Error occurred" << std::endl;\n    }\n    return 0;\n}`;
        }
        return code;
      
      default:
        return code;
    }
  }

  private async cleanup(workDir: string) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup ${workDir}:`, error);
    }
  }

  // Public method to check execution environment status
  public getExecutionMode(): string {
    return this.dockerAvailable ? 'Docker (Secure)' : 'Direct (Development)';
  }
}

export const codeExecutor = new CodeExecutor();