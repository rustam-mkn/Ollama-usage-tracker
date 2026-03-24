import chalk from 'chalk';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

const BAR_WIDTH = 18;
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤',
  cross: '┼',
  horizontal: '─',
  vertical: '│',
};

function pad(value, width) {
  const visibleWidth = stringWidth(stripAnsi(value));
  if (visibleWidth >= width) {
    return value;
  }

  return `${value}${' '.repeat(width - visibleWidth)}`;
}

function clampPercent(percent) {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function styleEmail(account, currentAccount) {
  const isCurrent =
    currentAccount && account.email.toLowerCase() === currentAccount.toLowerCase();
  const isBlocked =
    !account.missingUsage &&
    (clampPercent(account.sessionPercent) >= 100 ||
      clampPercent(account.weeklyPercent) >= 100);

  if (isBlocked) {
    return chalk.red.strikethrough(account.email);
  }

  if (isCurrent) {
    return chalk.hex('#da7b5b')(account.email);
  }

  return account.email;
}

function renderBar(percent) {
  const normalized = clampPercent(percent);
  const filled = Math.round((normalized / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const filledPart = '#'.repeat(filled);
  const emptyPart = '-'.repeat(empty);
  return `[${filledPart}${emptyPart}]`;
}

function renderUsageCell(percent, resetIn) {
  const normalized = clampPercent(percent);
  const percentLabel = String(normalized).padStart(3, ' ');
  return `${renderBar(normalized)} ${percentLabel}%  ${resetIn}`;
}

function renderMissingCell() {
  return chalk.dim('[------------------] --%  no data');
}

function buildRows(state) {
  return state.accounts.map((account) => {
    const blocked =
      !account.missingUsage &&
      (clampPercent(account.sessionPercent) >= 100 ||
        clampPercent(account.weeklyPercent) >= 100);

    return {
      email: styleEmail(account, state.currentAccount),
      session: account.missingUsage
        ? renderMissingCell()
        : renderUsageCell(account.sessionPercent, account.sessionResetIn),
      weekly: account.missingUsage
        ? renderMissingCell()
        : renderUsageCell(account.weeklyPercent, account.weeklyResetIn),
    };
  });
}

export function renderFramedTable(state) {
  const rows = buildRows(state);
  const safeRows =
    rows.length > 0
      ? rows
      : [
          {
            email: 'No tracked accounts yet.',
            session: '',
            weekly: '',
          },
        ];
  const emailWidth = Math.max(
    stringWidth('ACCOUNT'),
    ...safeRows.map((row) => stringWidth(stripAnsi(row.email)))
  );
  const sessionWidth = Math.max(
    stringWidth('SESSION'),
    ...safeRows.map((row) => stringWidth(stripAnsi(row.session)))
  );
  const weeklyWidth = Math.max(
    stringWidth('WEEKLY'),
    ...safeRows.map((row) => stringWidth(stripAnsi(row.weekly)))
  );
  const topBorder =
    `${BOX.topLeft}${BOX.horizontal.repeat(emailWidth + 2)}` +
    `${BOX.teeDown}${BOX.horizontal.repeat(sessionWidth + 2)}` +
    `${BOX.teeDown}${BOX.horizontal.repeat(weeklyWidth + 2)}${BOX.topRight}`;
  const headerBorder =
    `${BOX.teeRight}${BOX.horizontal.repeat(emailWidth + 2)}` +
    `${BOX.cross}${BOX.horizontal.repeat(sessionWidth + 2)}` +
    `${BOX.cross}${BOX.horizontal.repeat(weeklyWidth + 2)}${BOX.teeLeft}`;
  const bottomBorder =
    `${BOX.bottomLeft}${BOX.horizontal.repeat(emailWidth + 2)}` +
    `${BOX.teeUp}${BOX.horizontal.repeat(sessionWidth + 2)}` +
    `${BOX.teeUp}${BOX.horizontal.repeat(weeklyWidth + 2)}${BOX.bottomRight}`;
  const contentLine = (left, middle, right) =>
    `${BOX.vertical} ${pad(left, emailWidth)} ${BOX.vertical} ${pad(
      middle,
      sessionWidth
    )} ${BOX.vertical} ${pad(right, weeklyWidth)} ${BOX.vertical}`;

  const lines = [];
  lines.push(topBorder);
  lines.push(contentLine(chalk.bold('ACCOUNT'), chalk.bold('SESSION'), chalk.bold('WEEKLY')));
  lines.push(headerBorder);

  for (const row of safeRows) {
    lines.push(contentLine(row.email, row.session, row.weekly));
  }

  lines.push(bottomBorder);

  if (state.checkedAt) {
    lines.push('');
    lines.push(chalk.dim(`Checked at: ${state.checkedAt}`));
  }

  return lines.join('\n');
}

export function renderAccountBlocks(state) {
  const rows = buildRows(state);
  if (!rows.length) {
    return [
      `${BOX.topLeft}${BOX.horizontal.repeat(26)}${BOX.topRight}`,
      `${BOX.vertical} No tracked accounts yet. ${BOX.vertical}`,
      `${BOX.bottomLeft}${BOX.horizontal.repeat(26)}${BOX.bottomRight}`,
    ].join('\n');
  }
  const emailWidth = Math.max(...rows.map((row) => stringWidth(stripAnsi(row.email))));
  const sessionLineWidth = Math.max(
    stringWidth('session :'),
    ...rows.map((row) => stringWidth(stripAnsi(`session : ${row.session}`)))
  );
  const weeklyLineWidth = Math.max(
    stringWidth('weekly  :'),
    ...rows.map((row) => stringWidth(stripAnsi(`weekly  : ${row.weekly}`)))
  );
  const contentWidth = Math.max(emailWidth + 4, sessionLineWidth, weeklyLineWidth);

  const lines = [];

  for (const row of rows) {
    const emailText = stripAnsi(row.email);
    const topBorder =
      `${BOX.topLeft}${BOX.horizontal.repeat(3)} ${row.email} ` +
      `${BOX.horizontal.repeat(Math.max(0, contentWidth - stringWidth(emailText) - 3))}${BOX.topRight}`;
    const sessionLine = `${BOX.vertical} ${pad(`session : ${row.session}`, contentWidth)} ${BOX.vertical}`;
    const weeklyLine = `${BOX.vertical} ${pad(`weekly  : ${row.weekly}`, contentWidth)} ${BOX.vertical}`;
    const bottomBorder = `${BOX.bottomLeft}${BOX.horizontal.repeat(contentWidth + 2)}${BOX.bottomRight}`;

    lines.push(topBorder);
    lines.push(sessionLine);
    lines.push(weeklyLine);
    lines.push(bottomBorder);
    lines.push('');
  }

  lines.pop();

  if (state.checkedAt) {
    lines.push('');
    lines.push(chalk.dim(`Checked at: ${state.checkedAt}`));
  }

  return lines.join('\n');
}
