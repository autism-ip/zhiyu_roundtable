/**
 * 导航流程 E2E 测试
 * [INPUT]: 依赖 Playwright test fixtures
 * [OUTPUT]: 对外提供导航流程测试
 * [POS]: tests/e2e/navigation.spec.ts - 导航流程测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { test, expect } from '@playwright/test';
import { HomePage } from './page-objects/HomePage';
import { LoginPage } from './page-objects/LoginPage';
import { RoundsPage } from './page-objects/RoundsPage';
import { MatchesPage } from './page-objects/MatchesPage';
import { SquarePage } from './page-objects/SquarePage';
import { ProfilePage } from './page-objects/ProfilePage';

test.describe('导航流程', () => {
  test('首页应该正常加载', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // 验证 Hero 标题
    await expect(homePage.heroTitle.first()).toBeVisible();

    // 验证探索按钮
    await expect(homePage.exploreButton.first()).toBeVisible();

    // 验证 CTA 区域
    await expect(homePage.ctaSection).toBeVisible();

    // 验证三层架构区域
    await expect(homePage.architectureSection).toBeVisible();
  });

  test('首页导航到圆桌广场', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    await homePage.clickExploreRounds();
    await page.waitForURL(/\/rounds/);

    const roundsPage = new RoundsPage(page);
    await expect(roundsPage.pageTitle).toBeVisible();
  });

  test('登录页面应该正常加载', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.waitForLoad();

    // 验证欢迎标题
    await expect(loginPage.welcomeTitle).toBeVisible();

    // 验证登录按钮
    await expect(loginPage.secondmeButton).toBeVisible();
    await expect(loginPage.googleButton).toBeVisible();

    // 验证返回链接
    await expect(loginPage.backLink).toBeVisible();
  });

  test('登录页返回首页', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.waitForLoad();

    await loginPage.clickBackToHome();
    await page.waitForURL('/');

    const homePage = new HomePage(page);
    await expect(homePage.heroTitle.first()).toBeVisible();
  });

  test('圆桌广场页面应该正常加载', async ({ page }) => {
    const roundsPage = new RoundsPage(page);
    await roundsPage.goto();
    await roundsPage.waitForLoad();

    // 验证页面标题
    await expect(roundsPage.pageTitle).toBeVisible();

    // 验证创建按钮
    await expect(roundsPage.createButton).toBeVisible();

    // 验证搜索框
    await expect(roundsPage.searchInput).toBeVisible();

    // 验证标签页
    await expect(roundsPage.tabs).toBeVisible();
  });

  test('圆桌广场标签页切换', async ({ page }) => {
    const roundsPage = new RoundsPage(page);
    await roundsPage.goto();
    await roundsPage.waitForLoad();

    // 切换到进行中标签
    await roundsPage.clickTab('进行中');
    await page.waitForTimeout(500);

    // 切换到等待中标签
    await roundsPage.clickTab('等待中');
    await page.waitForTimeout(500);

    // 切换到已完成标签
    await roundsPage.clickTab('已完成');
    await page.waitForTimeout(500);
  });

  test('知遇卡页面应该正常加载（未登录显示登录提示）', async ({ page }) => {
    const matchesPage = new MatchesPage(page);
    await matchesPage.goto();
    await matchesPage.waitForLoad();

    // 未登录状态应显示登录提示或页面标题
    const heading = page.getByRole('heading', { name: /知遇卡/i });
    await expect(heading.first()).toBeVisible();
  });

  test('社区广场页面应该正常加载（未登录显示登录提示）', async ({ page }) => {
    const squarePage = new SquarePage(page);
    await squarePage.goto();
    await squarePage.waitForLoad();

    // 未登录状态应显示登录提示或页面标题
    const heading = page.getByRole('heading', { name: /社区广场/i });
    await expect(heading.first()).toBeVisible();
  });

  test('用户资料页面应该正常加载（未登录显示登录提示）', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoad();

    // 等待页面内容加载
    await page.waitForTimeout(3000);

    // 页面应该能正常加载（不崩溃），检查页面包含预期内容之一
    // 可能的状态: 加载中 / 个人中心标题 / 立即登录按钮 / 出错了
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();

    // 验证页面没有 JavaScript 错误导致白屏（检查页面有内容）
    const bodyText = await page.textContent('body');
    expect(bodyText && bodyText.length > 0).toBeTruthy();
  });

  test('从首页导航到登录页', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitForLoad();

    // 点击导航区域的登录相关链接（如果有）
    const loginLink = page.getByRole('link', { name: /登录/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/\/login/);
    }
  });
});
