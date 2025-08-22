import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';

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

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
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

    // Execute with Docker for security
    return await this.runInDocker(
      'python:3.11-alpine',
      ['python', `/code/${fileName}`],
      workDir,
      request.timeLimit || 5000,
      request.memoryLimit || 128
    );
  }

  private async executeJavaScript(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.js';
    const filePath = join(workDir, fileName);

    await fs.writeFile(filePath, request.code);

    return await this.runInDocker(
      'node:18-alpine',
      ['node', `/code/${fileName}`],
      workDir,
      request.timeLimit || 5000,
      request.memoryLimit || 128
    );
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
  }

  private async executeCpp(request: CodeExecutionRequest, workDir: string): Promise<ExecutionResult> {
    const fileName = 'solution.cpp';
    const filePath = join(workDir, fileName);
    const executablePath = join(workDir, 'solution');

    await fs.writeFile(filePath, request.code);

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
  }

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
      });

      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
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
          error: `Execution error: ${error.message}`
        });
      });
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
        return `${code}\n\n# Test input\nif __name__ == "__main__":\n    result = solution(${input})\n    print(result)`;
      case 'javascript':
        return `${code}\n\n// Test input\nconsole.log(solution(${input}));`;
      case 'java':
        return code.replace(
          'public static void main(String[] args)',
          `public static void main(String[] args) {\n        System.out.println(solution(${input}));\n    }\n    public static Object solution`
        );
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
}

export const codeExecutor = new CodeExecutor();