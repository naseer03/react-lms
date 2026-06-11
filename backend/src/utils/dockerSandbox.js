const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const TMP_DIR = path.join(__dirname, '../../tmp/sandbox');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const LANG_CONFIG = {
  javascript: {
    image: 'node:20-alpine',
    filename: 'solution.js',
    cmd: (file) => ['node', file],
    extension: 'js',
  },
  python: {
    image: 'python:3.11-alpine',
    filename: 'solution.py',
    cmd: (file) => ['python3', file],
    extension: 'py',
  },
  java: {
    image: 'openjdk:17-alpine',
    filename: 'Solution.java',
    cmd: () => ['sh', '-c', 'cd /sandbox && javac Solution.java && java Solution'],
    extension: 'java',
  },
  cpp: {
    image: 'gcc:12',
    filename: 'solution.cpp',
    cmd: () => ['sh', '-c', 'g++ -O2 -o /sandbox/solution /sandbox/solution.cpp && /sandbox/solution'],
    extension: 'cpp',
  },
  c: {
    image: 'gcc:12',
    filename: 'solution.c',
    cmd: () => ['sh', '-c', 'gcc -O2 -o /sandbox/solution /sandbox/solution.c && /sandbox/solution'],
    extension: 'c',
  },
};

/**
 * Execute code in a Docker container sandbox.
 * NEVER executes code directly on host — always inside isolated container.
 *
 * @param {string} language
 * @param {string} code
 * @param {string} input   - stdin input
 * @param {number} timeoutMs
 * @returns {Promise<{stdout, stderr, exitCode, executionTime}>}
 */
const executeInSandbox = async (language, code, input = '', timeoutMs = 5000) => {
  const config = LANG_CONFIG[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  // Write code to a temp directory
  const runId = crypto.randomBytes(8).toString('hex');
  const runDir = path.join(TMP_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const codeFile = path.join(runDir, config.filename);
  const inputFile = path.join(runDir, 'input.txt');
  fs.writeFileSync(codeFile, code, 'utf8');
  fs.writeFileSync(inputFile, input, 'utf8');

  const startTime = Date.now();

  try {
    const result = await runDockerContainer(config, runDir, runId, timeoutMs);
    return { ...result, executionTime: Date.now() - startTime };
  } finally {
    // Always clean up temp files
    fs.rmSync(runDir, { recursive: true, force: true });
  }
};

const runDockerContainer = (config, runDir, runId, timeoutMs) => {
  return new Promise((resolve) => {
    // Docker run args with strict resource limits
    const dockerArgs = [
      'run',
      '--rm',                                     // auto-remove container
      '--name', `lms-sandbox-${runId}`,
      '--network', 'none',                        // no network access
      '--memory', '128m',                         // 128MB RAM limit
      '--memory-swap', '128m',                    // no swap
      '--cpus', '0.5',                            // half CPU
      '--pids-limit', '50',                       // limit processes
      '--read-only',                              // read-only filesystem
      '--tmpfs', '/tmp:size=10m',                 // writable tmp only
      '-v', `${runDir}:/sandbox:ro`,              // mount code read-only
      '-i',                                       // stdin
      config.image,
      ...config.cmd(`/sandbox/${config.filename}`),
    ];

    const docker = spawn('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Send stdin input
    if (docker.stdin) {
      docker.stdin.write(config.inputFile || '');
      docker.stdin.end();
    }

    docker.stdout.on('data', (d) => { stdout += d.toString(); });
    docker.stderr.on('data', (d) => { stderr += d.toString(); });

    // Kill container on timeout
    const timer = setTimeout(() => {
      killed = true;
      spawn('docker', ['kill', `lms-sandbox-${runId}`]).on('error', () => {});
      docker.kill('SIGKILL');
    }, timeoutMs);

    docker.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: killed ? -1 : (exitCode ?? 0),
        timedOut: killed,
      });
    });

    docker.on('error', (err) => {
      clearTimeout(timer);
      logger.error(`Docker spawn error: ${err.message}`);
      resolve({ stdout: '', stderr: err.message, exitCode: -1, timedOut: false });
    });
  });
};

/**
 * Run code against an array of test cases.
 * Returns per-case results.
 */
const runTestCases = async (language, code, testCases, timeLimitMs = 5000) => {
  const results = [];

  for (const tc of testCases) {
    try {
      const { stdout, stderr, exitCode, timedOut, executionTime } = await executeInSandbox(
        language, code, tc.input || '', timeLimitMs
      );

      const actualOutput = stdout.trim();
      const expectedOutput = (tc.expectedOutput || '').trim();
      const passed = !timedOut && exitCode === 0 && actualOutput === expectedOutput;

      results.push({
        testCaseId: tc._id,
        isHidden: tc.isHidden,
        passed,
        input: tc.isHidden ? '[hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[hidden]' : expectedOutput,
        actualOutput: tc.isHidden ? (passed ? '[correct]' : '[incorrect]') : actualOutput,
        executionTime: executionTime || 0,
        error: timedOut ? 'Time Limit Exceeded' : (stderr || null),
      });
    } catch (err) {
      results.push({
        testCaseId: tc._id,
        isHidden: tc.isHidden,
        passed: false,
        input: tc.isHidden ? '[hidden]' : tc.input,
        expectedOutput: tc.isHidden ? '[hidden]' : tc.expectedOutput,
        actualOutput: '',
        executionTime: 0,
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = { executeInSandbox, runTestCases };
