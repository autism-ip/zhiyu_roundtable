/**
 * 登录页 Page Object
 * [INPUT]: 依赖 Playwright 的 Page 对象
 * [OUTPUT]: 对外提供登录页操作方法
 * [POS]: tests/e2e/page-objects/LoginPage.ts - 登录页 POM
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly secondmeButton: Locator;
  readonly googleButton: Locator;
  readonly welcomeTitle: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.secondmeButton = page.getByRole('button', { name: /SecondMe/i });
    this.googleButton = page.getByRole('button', { name: /Google/i });
    this.welcomeTitle = page.getByRole('heading', { name: /欢迎回到知遇圆桌/i });
    this.backLink = page.getByRole('link', { name: /返回首页/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async clickSecondMeLogin() {
    await this.secondmeButton.click();
  }

  async clickGoogleLogin() {
    await this.googleButton.click();
  }

  async clickBackToHome() {
    await this.backLink.click();
  }
}
