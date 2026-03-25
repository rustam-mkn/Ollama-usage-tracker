import { spawn } from 'node:child_process';

function createCommandError(output, fallbackMessage) {
  const message = output.trim() || fallbackMessage;
  return new Error(message);
}

function waitForExit(child, getOutput, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill('SIGTERM');
      reject(createCommandError(getOutput(), 'Timed out waiting for ollama signin to finish.'));
    }, timeoutMs);

    child.once('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.once('exit', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve(getOutput());
      } else {
        reject(createCommandError(getOutput(), `ollama signin exited with code ${code}.`));
      }
    });
  });
}

export async function signOutOllama() {
  return new Promise((resolve, reject) => {
    const child = spawn('ollama', ['signout'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }

      reject(createCommandError(output, `ollama signout exited with code ${code}.`));
    });
  });
}

export async function beginOllamaSignin() {
  return new Promise((resolve, reject) => {
    const child = spawn('ollama', ['signin'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let resolved = false;

    const maybeResolve = () => {
      const match = output.match(/https:\/\/ollama\.com\/connect\S+/);
      if (match && !resolved) {
        resolved = true;
        resolve({
          connectUrl: match[0],
          waitForCompletion(timeoutMs) {
            return waitForExit(child, () => output, timeoutMs);
          },
          abort() {
            child.kill('SIGTERM');
          },
        });
      }
    };

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      maybeResolve();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
      maybeResolve();
    });

    child.once('error', (error) => {
      if (!resolved) {
        reject(error);
      }
    });

    child.once('exit', (code) => {
      if (!resolved) {
        if (code === 0) {
          reject(createCommandError(output, 'ollama signin exited before a connect URL was produced.'));
        } else {
          reject(createCommandError(output, `ollama signin exited with code ${code}.`));
        }
      }
    });
  });
}

export async function checkOllamaSigninStatus() {
  return new Promise((resolve, reject) => {
    const child = spawn('ollama', ['signin'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code !== 0) {
        reject(createCommandError(output, `ollama signin exited with code ${code}.`));
        return;
      }

      const signedInMatch = output.match(/already signed in as user '([^']+)'/i);
      resolve({
        signedIn: !!signedInMatch,
        user: signedInMatch ? signedInMatch[1] : null,
        output: output.trim(),
      });
    });
  });
}
