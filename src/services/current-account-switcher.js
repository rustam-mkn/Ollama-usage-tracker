import { input } from '@inquirer/prompts';
import { loginAccountInteractive, openConnectUrlInAccountProfile } from './usage-collector.js';
import { beginOllamaSignin, checkOllamaSigninStatus, signOutOllama } from './ollama-auth.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSigninStatus() {
  const attempts = 5;

  for (let index = 0; index < attempts; index += 1) {
    const status = await checkOllamaSigninStatus();
    if (status.signedIn) {
      return status;
    }

    if (index < attempts - 1) {
      await sleep(1500);
    }
  }

  throw new Error('Ollama sign-in did not finish yet. Complete the browser flow and try again.');
}

export async function switchOllamaAccount(account, promptTheme) {
  await signOutOllama().catch(() => {});

  const signin = await beginOllamaSignin();
  const browser = await openConnectUrlInAccountProfile(account, signin.connectUrl);

  try {
    await input({
      message: 'Finish the Ollama connect flow in the browser, then press Enter.',
      theme: promptTheme,
    });
    await browser.close();
    signin.abort();
    await waitForSigninStatus();
  } finally {
    await browser.close().catch(() => {});
  }
}
