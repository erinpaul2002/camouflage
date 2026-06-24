import { test, expect, type Page, type Browser } from '@playwright/test';

/**
 * Core multiplayer journey (F1/F2/F3): a host creates a room, two friends join by code, the
 * lobby updates live, the host starts the game, and every player transitions into the role
 * reveal. Each player is an isolated browser context so this exercises the real Socket.io
 * fan-out, not a single shared session.
 */

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Create Room' }).click();
  // Lobby renders once the server acknowledges room creation.
  const codeEl = page.locator('.bq-code-display .code');
  await expect(codeEl).not.toBeEmpty();
  const code = (await codeEl.textContent())?.trim() ?? '';
  expect(code).toMatch(/^[A-Z0-9]+$/);
  return code;
}

async function joinRoom(browser: Browser, code: string, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByPlaceholder('CODE').fill(code);
  await page.getByRole('button', { name: 'Join Room' }).click();
  await expect(page.locator('.bq-code-display .code')).toHaveText(code);
  return page;
}

test('host creates a room, friends join by code, host starts, all reach role reveal', async ({
  page,
  browser,
}) => {
  // Host creates the room.
  const code = await createRoom(page, 'Alice');

  // Two friends join with the code (need 3+ players to start).
  const bob = await joinRoom(browser, code, 'Bob');
  const carol = await joinRoom(browser, code, 'Carol');

  // The host's lobby reflects all three players live.
  await expect(page.getByText('3 / 8 players')).toBeVisible();

  // Host starts — button is enabled at 3 players.
  const startBtn = page.getByRole('button', { name: 'Start Game' });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // Every player transitions into the role-reveal spin.
  for (const p of [page, bob, carol]) {
    await expect(p.getByText('Spinning for the Seeker…')).toBeVisible();
  }

  // After the reveal, all three reach gameplay (HUD shown for the whole prep phase).
  // The HUD role is stable, unlike the transient reveal banner, so assert seeker count here.
  const pages = [page, bob, carol];
  for (const p of pages) {
    await expect(p.locator('.bq-hud-role')).toBeVisible();
  }
  let seekerCount = 0;
  for (const p of pages) {
    if (await p.locator('.bq-hud-role.seeker').count()) seekerCount += 1;
  }
  expect(seekerCount).toBe(1);

  await bob.context().close();
  await carol.context().close();
});

test('joining with a bad code surfaces an error and stays on the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Your name').fill('Dave');
  // Valid length (5 chars) but no such room exists — exercises server-side rejection.
  await page.getByPlaceholder('CODE').fill('ZZZZZ');
  await page.getByRole('button', { name: 'Join Room' }).click();

  await expect(page.locator('.bq-error')).toBeVisible();
  // Still on the menu — no lobby code display appeared.
  await expect(page.locator('.bq-code-display .code')).toHaveCount(0);
});
