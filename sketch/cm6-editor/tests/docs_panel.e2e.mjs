import { chromium, expect } from '@playwright/test';

// Override with DOCS_E2E_BASE if your dev server is on another port
// (the README's `serve` workflow commonly occupies 3000 already).
const BASE = process.env.DOCS_E2E_BASE || 'http://localhost:3000/sketch/cm6-editor/';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'load' });

await page.click('#btn-help');                                   // open docs
await page.click('[data-section="getting-started"]');            // drill into a section
await page.click('[data-page="welcome"]');                       // open a page (async fetch+render)
await expect(page.locator('article.docs-page h1')).toHaveCount(1);
await page.click('.docs-load-example');                          // load example into editor
await expect(page.locator('.cm-content')).toContainText('->');

await page.click('[data-go="sections"]');
await page.click('[data-section="index"]');
await expect(page.locator('.docs-nav a').first()).toBeVisible();

await page.click('[data-go="sections"]');
await page.click('[data-section="search"]');
await page.fill('#docs-search-input', 'transition');
await expect(page.locator('#docs-search-results li').first()).toBeVisible();

await browser.close();
console.log('docs_panel e2e OK');
