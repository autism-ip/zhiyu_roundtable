/**
 * 圆桌广场 Page Object
 * [INPUT]: 依赖 Playwright 的 Page 对象
 * [OUTPUT]: 对外提供圆桌广场操作方法
 * [POS]: tests/e2e/page-objects/RoundsPage.ts - 圆桌广场 POM
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Page, Locator } from '@playwright/test';

export class RoundsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly tabs: Locator;
  readonly roundsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /圆桌广场/i });
    this.createButton = page.getByRole('link', { name: /创建圆桌/i });
    this.searchInput = page.getByPlaceholder(/搜索圆桌/i);
    this.tabs = page.getByRole('tablist');
    this.roundsList = page.locator('[class*="grid"]');
  }

  async goto() {
    await this.page.goto('/rounds');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForRounds() {
    await this.page.waitForSelector('[class*="Card"]', { timeout: 10000 }).catch(() => {
      // 忽略超时，等待加载完成
    });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async clickTab(tabName: string) {
    await this.page.getByRole('tab', { name: new RegExp(tabName) }).click();
  }

  async clickCreateRound() {
    await this.createButton.click();
  }
}
