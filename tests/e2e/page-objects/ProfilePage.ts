/**
 * 用户资料 Page Object
 * [INPUT]: 依赖 Playwright 的 Page 对象
 * [OUTPUT]: 对外提供用户资料页操作方法
 * [POS]: tests/e2e/page-objects/ProfilePage.ts - 用户资料页 POM
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Page, Locator } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly loginPrompt: Locator;
  readonly tabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /个人中心/i });
    this.loginPrompt = page.getByText(/立即登录/i);
    this.tabs = page.locator('button').filter({ hasText: /概览|Agent|活动记录/i });
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
