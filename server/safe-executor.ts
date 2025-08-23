// Safe code executor that handles permission errors gracefully
import vm from 'vm';

export interface SafeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
}

export class SafeExecutor {
  executeJavaScript(code: string, input: string = ''): SafeExecutionResult {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      // Prepare input lines for reading
      const inputLines = input.split('\n');
      let lineIndex = 0;
      
      // Create a safe sandbox environment
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            stdout += args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n';
          },
          error: (...args: any[]) => {
            stderr += args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ') + '\n';
          }
        },
        process: {
          stdin: {
            read: () => input
          },
          stdout: {
            write: (text: string) => { stdout += text; }
          },
          stderr: {
            write: (text: string) => { stderr += text; }
          }
        },
        // Basic JavaScript globals
        Math,
        Date,
        String,
        Number,
        Boolean,
        Array,
        Object,
        JSON,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        // Input handling
        input,
        readline: () => {
          if (lineIndex < inputLines.length) {
            return inputLines[lineIndex++];
          }
          return '';
        },
        readlines: () => inputLines
      };
      
      const context = vm.createContext(sandbox);
      
      // Run the code with a timeout
      vm.runInContext(code, context, {
        timeout: 5000,
        displayErrors: true
      });
      
    } catch (error: any) {
      stderr = error.message || 'Execution error';
      exitCode = 1;
    }

    return {
      stdout,
      stderr,
      exitCode,
      runtime: Date.now() - startTime
    };
  }

  executePython(code: string, input: string = ''): SafeExecutionResult {
    // Transpile Python-like code to JavaScript for safe execution
    const startTime = Date.now();
    
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      // Convert Python code to JavaScript (basic transpilation)
      let jsCode = code;
      
      // Handle print statements
      jsCode = jsCode.replace(/print\s*\((.*?)\)/g, 'console.log($1)');
      
      // Handle basic Python syntax
      jsCode = jsCode.replace(/:\s*$/gm, '{');
      jsCode = jsCode.replace(/^\s*elif\s+/gm, '} else if ');
      jsCode = jsCode.replace(/^\s*else\s*:/gm, '} else {');
      jsCode = jsCode.replace(/^\s*if\s+/gm, 'if (');
      jsCode = jsCode.replace(/\s+and\s+/g, ' && ');
      jsCode = jsCode.replace(/\s+or\s+/g, ' || ');
      jsCode = jsCode.replace(/\s+not\s+/g, ' !');
      jsCode = jsCode.replace(/True/g, 'true');
      jsCode = jsCode.replace(/False/g, 'false');
      jsCode = jsCode.replace(/None/g, 'null');
      
      // Handle for loops
      jsCode = jsCode.replace(/for\s+(\w+)\s+in\s+range\s*\(([\d\w,\s]+)\)/g, (match, var1, args) => {
        const argList = args.split(',').map((a: string) => a.trim());
        if (argList.length === 1) {
          return `for (let ${var1} = 0; ${var1} < ${argList[0]}; ${var1}++)`;
        } else if (argList.length === 2) {
          return `for (let ${var1} = ${argList[0]}; ${var1} < ${argList[1]}; ${var1}++)`;
        } else if (argList.length === 3) {
          return `for (let ${var1} = ${argList[0]}; ${var1} < ${argList[1]}; ${var1} += ${argList[2]})`;
        }
        return match;
      });
      
      // Handle def functions
      jsCode = jsCode.replace(/def\s+(\w+)\s*\((.*?)\)\s*:/g, 'function $1($2) {');
      
      // Handle input()
      const inputLines = input.split('\n');
      let inputIndex = 0;
      jsCode = jsCode.replace(/input\s*\(\s*\)/g, () => {
        const line = inputLines[inputIndex] || '';
        inputIndex++;
        return `"${line}"`;
      });
      
      // Add missing closing braces (simple heuristic)
      const openBraces = (jsCode.match(/{/g) || []).length;
      const closeBraces = (jsCode.match(/}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) {
        jsCode += '\n}';
      }
      
      // Execute the transpiled JavaScript
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            stdout += args.map(arg => String(arg)).join(' ') + '\n';
          }
        },
        Math,
        parseInt,
        parseFloat,
        String,
        Number,
        Array
      };
      
      const context = vm.createContext(sandbox);
      vm.runInContext(jsCode, context, {
        timeout: 5000,
        displayErrors: true
      });
      
      // If no output, assume success
      if (!stdout && exitCode === 0) {
        stdout = '';
      }
      
    } catch (error: any) {
      stderr = error.message || 'Python execution error';
      exitCode = 1;
    }

    return {
      stdout,
      stderr,
      exitCode,
      runtime: Date.now() - startTime
    };
  }

  execute(language: string, code: string, input: string = ''): SafeExecutionResult {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return this.executeJavaScript(code, input);
      case 'python':
      case 'py':
        return this.executePython(code, input);
      default:
        return {
          stdout: '',
          stderr: `Language ${language} is not supported in safe mode`,
          exitCode: 1,
          runtime: 0
        };
    }
  }
}

export const safeExecutor = new SafeExecutor();