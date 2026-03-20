/**
 * 首页 Page Object
 * [INPUT]: 依赖 Playwright 的 Page 对象
 * [OUTPUT]: 对外提供首页操作方法
 * [POS]: tests/e2e/page-objects/HomePage.ts - 首页 POM
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly exploreButton: Locator;
  readonly ctaSection: Locator;
  readonly architectureSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.getByRole('heading', { name: '知遇圆桌' });
    this.exploreButton = page.getByRole('link', { name: /探索圆桌/i });
    this.ctaSection = page.locator('section').filter({ hasText: /准备好遇见/i });
    this.architectureSection = page.locator('section').filter({ hasText: /三层架构/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async clickExploreRounds() {
    await this.exploreButton.first().click();
  }
}
