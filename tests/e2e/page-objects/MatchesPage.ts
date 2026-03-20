/**
 * 知遇卡列表 Page Object
 * [INPUT]: 依赖 Playwright 的 Page 对象
 * [OUTPUT]: 对外提供知遇卡列表操作方法
 * [POS]: tests/e2e/page-objects/MatchesPage.ts - 知遇卡列表 POM
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Page, Locator } from '@playwright/test';

export class MatchesPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly tabs: Locator;
  readonly loginPrompt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /知遇卡/i });
    this.tabs = page.getByRole('tablist');
    this.loginPrompt = page.getByRole('heading', { name: /知遇卡/i }).getByText(/登录/i);
  }

  async goto() {
    await this.page.goto('/matches');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async clickTab(tabName: string) {
    await this.page.getByRole('tab', { name: new RegExp(tabName) }).click();
  }
}
