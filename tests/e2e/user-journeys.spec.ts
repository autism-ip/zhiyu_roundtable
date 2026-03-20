/**
 * 关键用户流程 E2E 测试
 * [INPUT]: 依赖 Playwright test fixtures
 * [OUTPUT]: 对外提供关键用户流程测试
 * [POS]: tests/e2e/user-journeys.spec.ts - 关键用户流程测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './page-objects/HomePage';
import { LoginPage } from './page-objects/LoginPage';
import { RoundsPage } from './page-objects/RoundsPage';

test.describe('关键用户流程', () => {
  test.describe('匿名用户流程', () => {
    test('匿名用户可以浏览首页', async ({ page }) => {
      const homePage = new HomePage(page);

      await homePage.goto();
      await homePage.waitForLoad();

      // 验证 Hero 内容
      await expect(homePage.heroTitle.first()).toBeVisible();

      // 验证副标题
      const subtitle = page.getByText(/发现与你互补的人/);
      await expect(subtitle).toBeVisible();
    });

    test('匿名用户可以浏览圆桌广场', async ({ page }) => {
      const roundsPage = new RoundsPage(page);

      await roundsPage.goto();
      await roundsPage.waitForLoad();
      await roundsPage.waitForRounds();

      // 验证页面标题
      await expect(roundsPage.pageTitle).toBeVisible();

      // 验证搜索功能存在
      await expect(roundsPage.searchInput).toBeVisible();
    });

    test('匿名用户可以浏览登录页', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.waitForLoad();

      // 验证登录选项
      await expect(loginPage.secondmeButton).toBeVisible();
      await expect(loginPage.googleButton).toBeVisible();
    });
  });

  test.describe('页面元素验证', () => {
    test('首页包含三层架构介绍', async ({ page }) => {
      const homePage = new HomePage(page);

      await homePage.goto();
      await homePage.waitForLoad();

      // 验证伯乐层
      const boleLayer = page.getByText(/伯乐层/);
      await expect(boleLayer.first()).toBeVisible();

      // 验证争鸣层
      const zhengmingLayer = page.getByText(/争鸣层/);
      await expect(zhengmingLayer.first()).toBeVisible();

      // 验证共试层
      const gongshiLayer = page.getByText(/共试层/);
      await expect(gongshiLayer.first()).toBeVisible();
    });

    test('首页包含 CTA 按钮', async ({ page }) => {
      const homePage = new HomePage(page);

      await homePage.goto();
      await homePage.waitForLoad();

      // 验证探索圆桌按钮
      const exploreButton = page.getByRole('link', { name: /探索圆桌/i });
      await expect(exploreButton.first()).toBeVisible();

      // 验证创建 Agent 按钮
      const createAgentButton = page.getByRole('link', { name: /创建.*Agent/i });
      await expect(createAgentButton.first()).toBeVisible();
    });

    test('首页底部包含导航链接', async ({ page }) => {
      const homePage = new HomePage(page);

      await homePage.goto();
      await homePage.waitForLoad();

      // 滚动到底部
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // 验证底部链接
      const aboutLink = page.getByRole('link', { name: /关于我们/i });
      const privacyLink = page.getByRole('link', { name: /隐私政策/i });
      const termsLink = page.getByRole('link', { name: /使用条款/i });

      await expect(aboutLink).toBeVisible();
      await expect(privacyLink).toBeVisible();
      await expect(termsLink).toBeVisible();
    });
  });

  test.describe('响应式设计验证', () => {
    test('桌面视口下首页正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForLoad();

      await expect(homePage.heroTitle.first()).toBeVisible();
      await expect(homePage.exploreButton.first()).toBeVisible();
    });

    test('移动视口下首页正常显示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const homePage = new HomePage(page);
      await homePage.goto();
      await homePage.waitForLoad();

      await expect(homePage.heroTitle.first()).toBeVisible();
    });
  });
});
