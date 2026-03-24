# Ollama Account Manager

Interactive terminal app for tracking `Cloud Usage` across multiple Ollama accounts without constantly switching `ollama signin` / `signout`.

## Features

- Tracks multiple Ollama accounts in one place
- Shows `session` and `weekly` usage in a terminal dashboard
- Supports two views: framed table and account cards
- Stores a separate persistent browser profile for each account
- Lets you set the currently active account for visual highlighting
- Integrates with `ollama account` in `zsh` without replacing the real `ollama` binary

## How It Works

The app uses Playwright with a dedicated Chrome profile per email.

When you add an account:

1. A browser window opens for that account profile
2. You log into Ollama manually
3. The app reuses the saved session later to fetch `Cloud Usage`

This means regular Ollama commands stay untouched, and the app can read usage for several accounts independently.

## Requirements

- macOS
- `zsh`
- Node.js 18+
- Google Chrome installed at `/Applications/Google Chrome.app`

## Installation

```bash
git clone <your-repo-url>
cd ollama-account-manager
npm install
npm run install:zsh
source ~/.zshrc
```

## Usage

Start the app:

```bash
ollama account
```

On first launch:

1. Choose `Add first account`
2. Enter the Ollama account email
3. Log into Ollama in the opened Chrome window
4. Return to the terminal and press Enter

After that, you can:

- Refresh all tracked accounts
- Add new accounts
- Relogin an account
- Remove an account
- Switch between `table` and `cards` view
- Set the current account highlight

## Safety

`ollama account` is added through a small `zsh` function.

It only intercepts this exact case:

```bash
ollama account
```

All other commands are forwarded to the original Ollama binary:

- `ollama run`
- `ollama list`
- `ollama signin`
- `ollama signout`
- `ollama --help`

## Project Structure

```text
config/accounts.json        tracked accounts and UI preferences
data/current-account.txt    highlighted account
data/usage-snapshot.json    last fetched usage snapshot
profiles/                   persistent Chrome profiles, one per account
src/cli.js                  app entrypoint
src/services/menu.js        interactive menu flow
src/services/usage-collector.js
                            usage collection via Playwright
src/storage/store.js        config and snapshot persistence
src/render.js               terminal rendering
```

## Notes

- If Google blocks login in an automated browser flow, the app uses the installed Chrome channel rather than bundled Chromium.
- If Ollama changes the markup of the `Cloud Usage` page, the parser in `src/services/usage-collector.js` may need an update.

## Development

Run directly without shell integration:

```bash
node ./src/cli.js
```

Print current internal state as JSON:

```bash
node ./src/cli.js --json
```
