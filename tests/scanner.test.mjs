import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const script = await readFile(new URL('../launch-point-smart-scanner.user.js', import.meta.url), 'utf8');
const ids = [
  '1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q',
  '1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ',
];
const actions = ['Check in to Lounge and Borrow Equipment', 'Check out of Lounge and Return Equipment',
  'Check in to Lounge as additional person in a group', 'Check in to Lounge as a "watcher"'];
const stations = ['Console Station 1', 'Console Station 2', 'Console Station 3', 'PC Station'];
// Reduced Google Forms structure: real labels, list items, textboxes and ARIA radios.
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const radios = (title, options) => `<div role="listitem"><div role="heading">${title} *</div><div role="radiogroup">${options.map(value => `<div role="radio" aria-checked="false" data-value="${escape(value)}" tabindex="0">${value}</div>`).join('')}</div></div>`;
const inputs = (title, required) => [1, 2, 3, 4].map(i => `<div role="listitem"><div role="heading"><span>${title} ${i}</span> </div><input type="text" ${required && i === 1 ? 'required' : ''}></div>`).join('');
const fixture = `<!doctype html><html><body><form id="mG61Hd">${radios('Action', actions)}${inputs('Student ID Card Number', true)}${radios('Console Station or PC', stations)}${inputs('Equipment Barcode', false)}<div role="button" jsname="M2UYVd" tabindex="0">Submit</div><button type="submit">Native submit</button></form></body></html>`;
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser.close(); });

async function setup(id = ids[0], suffix = 'viewform', html = fixture) {
  const page = await browser.newPage();
  await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: html,
    headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'" } }));
  await page.goto(`https://docs.google.com/forms/d/e/${id}/${suffix}`);
  await page.evaluate(() => {
    window.nativeSubmissions = 0;
    document.addEventListener('click', event => {
      const radio = event.target.closest('[role="radio"]');
      if (radio) {
        for (const el of radio.parentElement.children) el.setAttribute('aria-checked', String(el === radio));
      }
      if (event.target.closest('[jsname="M2UYVd"]')) window.nativeSubmissions++;
    });
    document.addEventListener('submit', event => { event.preventDefault(); window.nativeSubmissions++; });
  });
  await page.evaluate(script);
  const panel = page.locator('#lp-scanner');
  if (ids.includes(id) && suffix.split('?')[0] === 'viewform') {
    await panel.locator('#scan').waitFor();
    await page.waitForFunction(() => document.querySelector('#lp-scanner').shadowRoot.activeElement?.id === 'scan');
  }
  return { page, panel, scan: panel.locator('#scan'), status: panel.locator('#status') };
}
async function scanCode(ctx, value) { await ctx.scan.fill(value); await ctx.scan.press('Enter'); }
const submissions = ctx => ctx.page.evaluate(() => window.nativeSubmissions);
const studentInput = ctx => ctx.page.locator('form input[type="text"]').first();

const checked = (ctx, prefix) => ctx.page.locator(`[role="radio"][aria-checked="true"][data-value^="${prefix}"]`).getAttribute('data-value');
async function submitAndWait(ctx) { await ctx.scan.press('d'); await ctx.page.waitForFunction(() => window.nativeSubmissions === 1); }

test('compact interface contains only heading, Scan and Help at rest', async () => {
  const ctx = await setup();
  assert.equal(await ctx.panel.getByRole('heading').innerText(), 'Launch Point Scanner');
  assert.equal(await ctx.panel.getByLabel('Scan', { exact: true }).count(), 1);
  assert.equal(await ctx.panel.locator('select').count(), 0);
  assert.equal(await ctx.panel.getByRole('button').count(), 0);
  assert.equal(await ctx.status.isVisible(), false);
  await ctx.panel.locator('summary').focus(); await ctx.page.keyboard.press('Enter');
  assert.equal(await ctx.panel.locator('details').getAttribute('open'), '');
  await ctx.page.waitForTimeout(500);
  assert.equal(await ctx.panel.locator('summary').evaluate(el => el === el.getRootNode().activeElement), true);
  const box = await ctx.panel.boundingBox(); assert.ok(box.width <= 250);
  await ctx.page.close();
});

test('URL restrictions include account-specific paths and exclude other forms', async () => {
  for (const id of ids) { const ctx = await setup(id, 'viewform?usp=sf_link'); assert.equal(await ctx.panel.count(), 1); await ctx.page.close(); }
  const ctx = await setup();
  await ctx.page.goto(`https://docs.google.com/forms/u/0/d/e/${ids[0]}/viewform?usp=form_confirm`);
  await ctx.page.evaluate(script); await ctx.panel.locator('#scan').waitFor();
  assert.equal(await ctx.panel.count(), 1); await ctx.page.close();
  for (const [id, path] of [[ids[0] + 'x', 'viewform'], [ids[0], 'viewform/extra'], [ids[0], 'formResponseEvil'], ['other', 'viewform']]) {
    const ctx = await setup(id, path); assert.equal(await ctx.panel.count(), 0); await ctx.page.close();
  }
});

test('scan validation, duplicate prevention, limits and Enter protection', async () => {
  const ctx = await setup();
  await scanCode(ctx, 'bad'); assert.match(await ctx.status.innerText(), /Invalid barcode/);
  for (let i = 1; i <= 4; i++) await scanCode(ctx, String(i).padStart(15, '0'));
  await scanCode(ctx, '000000000000001'); assert.match(await ctx.status.innerText(), /already entered/);
  await scanCode(ctx, '000000000000005'); assert.match(await ctx.status.innerText(), /four student/);
  for (const code of ['1082', '1083', '1084', '9999']) await scanCode(ctx, code);
  await scanCode(ctx, '9998'); assert.match(await ctx.status.innerText(), /four equipment/);
  assert.equal(await checked(ctx, 'Console'), stations[1]);
  await ctx.page.locator('[jsname="M2UYVd"]').focus(); await ctx.page.keyboard.press('Enter');
  assert.equal(await submissions(ctx), 0); await ctx.page.close();
});

test('unselected station defaults to PC with or without unknown equipment', async () => {
  for (const equipment of ['', '9999']) {
    const ctx = await setup();
    await scanCode(ctx, '000000000000001'); await ctx.scan.press('a');
    if (equipment) await scanCode(ctx, equipment);
    await submitAndWait(ctx); assert.equal(await checked(ctx, 'PC'), 'PC Station');
    await ctx.page.locator('[jsname="M2UYVd"]').click(); assert.equal(await submissions(ctx), 1);
    assert.equal(await studentInput(ctx).inputValue(), '000000000000001'); await ctx.page.close();
  }
});

test('explicit stations are retained and mapped equipment conflicts block submission', async () => {
  const ctx = await setup();
  await scanCode(ctx, '000000000000001'); await ctx.scan.press('w');
  await ctx.page.locator('[data-value="Console Station 3"]').click();
  await submitAndWait(ctx); assert.equal(await checked(ctx, 'Console'), stations[2]); await ctx.page.close();
  const conflict = await setup();
  await scanCode(conflict, '000000000000001'); await conflict.scan.press('a');
  await scanCode(conflict, '1083'); await scanCode(conflict, '1088');
  await conflict.scan.press('d'); assert.match(await conflict.status.innerText(), /conflicting stations/);
  assert.equal(await submissions(conflict), 0);
  await conflict.page.locator('form input[type="text"]').nth(5).fill('');
  await submitAndWait(conflict); assert.equal(await checked(conflict, 'Console'), stations[1]); await conflict.page.close();
});

test('shortcuts do not interrupt text editing; incomplete scans block submission', async () => {
  const ctx = await setup();
  await ctx.scan.press('d'); assert.match(await ctx.status.innerText(), /at least one/);
  await scanCode(ctx, '000000000000001'); await ctx.scan.press('d'); assert.match(await ctx.status.innerText(), /Choose an action/);
  await ctx.scan.press('a'); await ctx.scan.fill('123'); await ctx.scan.press('w'); assert.equal(await ctx.scan.inputValue(), '123w');
  await ctx.page.locator('[jsname="M2UYVd"]').click(); assert.match(await ctx.status.innerText(), /finish the current scan/);
  await ctx.scan.press('Escape'); assert.equal(await ctx.scan.inputValue(), '');
  await submitAndWait(ctx); await ctx.page.close();
});

test('confirmation follows Googles account-specific another-response link and remounts scanner', async () => {
  const ctx = await setup();
  await scanCode(ctx, '000000000000001'); await ctx.scan.press('a'); await submitAndWait(ctx);
  const confirmationURL = `https://docs.google.com/forms/d/e/${ids[0]}/formResponse`;
  const nextURL = `https://docs.google.com/forms/u/0/d/e/${ids[0]}/viewform?usp=form_confirm`;
  await ctx.page.route(confirmationURL, route => route.fulfill({ contentType: 'text/html', body: `<div class="vHW8K">Your response has been recorded.</div><a href="${nextURL}">Submit another response</a>` }));
  await ctx.page.goto(confirmationURL); await ctx.page.evaluate(script);
  await ctx.page.waitForURL(nextURL); await ctx.page.evaluate(script);
  await ctx.panel.locator('#scan').waitFor(); await ctx.page.waitForTimeout(500);
  assert.equal(await studentInput(ctx).inputValue(), '');
  assert.equal(await ctx.scan.evaluate(el => el === el.getRootNode().activeElement), true);
  await ctx.page.close();
});

test('delayed Google selections complete before queued submit', async () => {
  const ctx = await setup();
  await ctx.page.evaluate(() => document.addEventListener('click', event => {
    const radio = event.target.closest('[role="radio"]'); if (!radio) return;
    event.stopImmediatePropagation(); setTimeout(() => {
      for (const el of radio.parentElement.children) el.setAttribute('aria-checked', String(el === radio));
    }, 200);
  }, true));
  await scanCode(ctx, '000000000000001'); await ctx.scan.press('a'); await scanCode(ctx, '1083');
  await submitAndWait(ctx); assert.equal(await checked(ctx, 'Console'), stations[1]); await ctx.page.close();
});

test('scans scroll the filled field into view and preserve scanner focus', async () => {
  const ctx = await setup();
  await ctx.page.evaluate(() => {
    for (const item of document.querySelectorAll('form [role="listitem"]')) item.style.minHeight = '600px';
  });
  for (const [code, index] of [['000000000000001', 0], ['1083', 4]]) {
    await scanCode(ctx, code);
    const field = ctx.page.locator('form input[type="text"]').nth(index);
    await ctx.page.waitForFunction(index => {
      const rect = document.querySelectorAll('form input[type="text"]')[index].getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }, index);
    assert.equal(await field.inputValue(), code);
    assert.equal(await ctx.scan.evaluate(el => el === el.getRootNode().activeElement), true);
  }
  await ctx.page.close();
});

test('scanner can be dragged by its title and stays inside the viewport', async () => {
  const ctx = await setup();
  await scanCode(ctx, 'bad');
  assert.equal(await ctx.status.innerText(), 'Invalid barcode');
  await ctx.panel.locator('summary').click();
  assert.doesNotMatch(await ctx.panel.locator('details').innerText(), /digits/);
  await ctx.panel.locator('summary').click();
  await ctx.scan.focus();
  const title = await ctx.panel.locator('h2').boundingBox();
  const before = await ctx.panel.boundingBox();
  await ctx.page.mouse.move(title.x + 20, title.y + 10);
  await ctx.page.mouse.down();
  await ctx.page.mouse.move(title.x - 180, title.y + 110);
  await ctx.page.mouse.up();
  const after = await ctx.panel.boundingBox();
  assert.ok(Math.abs(after.x - (before.x - 200)) < 2);
  assert.ok(Math.abs(after.y - (before.y + 100)) < 2);
  assert.equal(await ctx.scan.evaluate(el => el === el.getRootNode().activeElement), true);
  await ctx.page.setViewportSize({ width: 400, height: 300 });
  await ctx.page.waitForFunction(() => {
    const bounds = document.querySelector('#lp-scanner').getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth;
  });
  const resized = await ctx.panel.boundingBox();
  assert.ok(resized.x >= 0 && resized.x + resized.width <= 400);
  await ctx.page.close();
});

test('repeated errors do not rewrite status, and a valid scan clears the error', async () => {
  const ctx = await setup();
  await scanCode(ctx, 'bad');
  assert.equal(await ctx.status.innerText(), 'Invalid barcode');
  await ctx.page.evaluate(() => {
    window.statusChanges = 0;
    const status = document.querySelector('#lp-scanner').shadowRoot.querySelector('#status');
    new MutationObserver(records => { window.statusChanges += records.length; }).observe(status, { childList: true, attributes: true });
  });
  await scanCode(ctx, 'bad');
  assert.equal(await ctx.page.evaluate(() => window.statusChanges), 0);
  await scanCode(ctx, '000000000000001');
  assert.equal(await ctx.status.isVisible(), false);
  assert.equal(await ctx.status.textContent(), '');
  await ctx.scan.press('a');
  await submitAndWait(ctx);
  assert.equal(await ctx.scan.isDisabled(), true);
  await ctx.page.evaluate(() => { const now = Date.now(); Date.now = () => now + 21000; });
  await ctx.panel.locator('summary').click();
  await ctx.panel.locator('#retry').waitFor({ state: 'visible' });
  await ctx.panel.locator('#retry').click();
  assert.equal(await ctx.scan.isDisabled(), false);
  assert.equal(await studentInput(ctx).inputValue(), '000000000000001');
  await ctx.page.close();
});
