/**
 * OAuth 登录诊断测试 - 模拟登录成功后的场景
 */

import { test, expect, Page } from '@playwright/test';

test.describe('OAuth 登录后场景诊断', () => {
  test('检查登录按钮和页面渲染', async ({ page }) => {
    // 1. 检查首页
    console.log('=== 检查首页 ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 检查首页是否有登录按钮
    const loginLink = page.getByRole('link', { name: /登录/i });
    const loginLinkVisible = await loginLink.isVisible().catch(() => false);
    console.log('首页登录链接可见:', loginLinkVisible);

    // 2. 检查登录页
    console.log('\n=== 检查登录页 ===');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // 截图登录页
    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });

    // 3. 检查 SecondMe OAuth URL 是否正确构建
    console.log('\n=== 检查 OAuth 配置 ===');
    const secondmeButton = page.getByRole('button', { name: /SecondMe/i });
    if (await secondmeButton.isVisible()) {
      // 获取 button 的 onclick 或者检查 href
      const buttonHtml = await secondmeButton.evaluate(el => el.outerHTML);
      console.log('SecondMe 按钮 HTML:', buttonHtml);

      // 点击之前检查所有控制台消息
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      });

      await secondmeButton.click();
      await page.waitForTimeout(1000);

      console.log('\n控制台消息:');
      consoleMessages.forEach(m => console.log(m));

      // 检查是否跳转到了 OAuth 页面
      const url = page.url();
      console.log('\n点击后 URL:', url);

      if (url.includes('second.me')) {
        console.log('正确跳转到 SecondMe OAuth 页面');
      } else {
        console.log('未跳转到 OAuth 页面');
      }
    }

    // 4. 检查 auth session API
    console.log('\n=== 检查 Auth Session API ===');
    const sessionResponse = await page.request.get('http://localhost:3000/api/auth/session');
    console.log('Session API 状态:', sessionResponse.status());
    const sessionData = await sessionResponse.json();
    console.log('Session 数据:', JSON.stringify(sessionData, null, 2));
  });

  test('检查已登录用户访问受保护页面', async ({ page }) => {
    // 先访问 rounds 页面（应该会显示空状态或提示登录）
    console.log('=== 访问 rounds 页面 ===');
    await page.goto('http://localhost:3000/rounds');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const roundsContent = await page.locator('body').innerText();
    console.log('Rounds 页面内容预览:', roundsContent.substring(0, 300));

    // 截图
    await page.screenshot({ path: '/tmp/rounds-page.png', fullPage: true });
  });

  test('检查 API 路由错误', async ({ page }) => {
    const errors: string[] = [];

    // 捕获所有控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`Page Error: ${err.message}`);
    });

    page.on('requestfailed', request => {
      errors.push(`Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // 访问首页
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 访问 rounds
    await page.goto('http://localhost:3000/rounds');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 访问 matches
    await page.goto('http://localhost:3000/matches');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== 捕获的错误 ===');
    if (errors.length === 0) {
      console.log('没有检测到错误');
    } else {
      errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    // 截图
    await page.screenshot({ path: '/tmp/errors-check.png', fullPage: true });
  });
});
