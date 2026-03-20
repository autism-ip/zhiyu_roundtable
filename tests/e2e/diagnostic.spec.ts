/**
 * 登录后错误诊断测试
 */

import { test, expect } from '@playwright/test';

test.describe('登录后错误诊断', () => {
  test('诊断登录后页面错误', async ({ page }) => {
    // 收集控制台错误
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // 收集页面错误
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // 1. 先访问首页
    console.log('=== 步骤1: 访问首页 ===');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 检查首页是否正常
    const title = await page.title();
    console.log('首页标题:', title);

    // 2. 访问登录页
    console.log('=== 步骤2: 访问登录页 ===');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // 检查登录页元素
    const secondmeButton = page.getByRole('button', { name: /SecondMe/ });
    const isSecondmeVisible = await secondmeButton.isVisible().catch(() => false);
    console.log('SecondMe 按钮可见:', isSecondmeVisible);

    // 3. 点击登录按钮（但不完成 OAuth）
    console.log('=== 步骤3: 点击登录按钮 ===');
    if (isSecondmeVisible) {
      await secondmeButton.click();
      // 等待一会儿看是否跳转到 OAuth 页面
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      console.log('点击后 URL:', currentUrl);
    }

    // 打印收集到的错误
    console.log('\n=== 控制台错误 ===');
    if (consoleErrors.length === 0) {
      console.log('无控制台错误');
    } else {
      consoleErrors.forEach((err, i) => console.log(`错误${i + 1}:`, err));
    }

    console.log('\n=== 控制台警告 ===');
    if (consoleWarnings.length === 0) {
      console.log('无控制台警告');
    } else {
      consoleWarnings.forEach((warn, i) => console.log(`警告${i + 1}:`, warn));
    }

    console.log('\n=== 页面错误 ===');
    if (pageErrors.length === 0) {
      console.log('无页面错误');
    } else {
      pageErrors.forEach((err, i) => console.log(`错误${i + 1}:`, err));
    }

    // 截图
    await page.screenshot({ path: '/tmp/login-diagnostic.png', fullPage: true });
    console.log('\n截图已保存到 /tmp/login-diagnostic.png');
  });

  test('诊断已登录用户访问首页', async ({ page }) => {
    // 由于无法真正完成 OAuth，我们模拟一个已登录状态
    // 通过直接检查页面渲染来诊断问题

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // 1. 访问 rounds 页面（需要认证的页面）
    console.log('=== 访问需要认证的页面 ===');
    await page.goto('http://localhost:3000/rounds');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const roundsUrl = page.url();
    console.log('Rounds 页面 URL:', roundsUrl);

    // 检查页面内容
    const bodyText = await page.locator('body').innerText().catch(() => '无法获取');
    console.log('页面内容前500字符:', bodyText.substring(0, 500));

    // 2. 访问 matches 页面
    console.log('\n=== 访问知遇卡页面 ===');
    await page.goto('http://localhost:3000/matches');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const matchesUrl = page.url();
    console.log('Matches 页面 URL:', matchesUrl);

    // 3. 访问 profile 页面
    console.log('\n=== 访问个人资料页面 ===');
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const profileUrl = page.url();
    console.log('Profile 页面 URL:', profileUrl);

    // 打印错误
    console.log('\n=== 控制台错误 ===');
    if (consoleErrors.length === 0) {
      console.log('无控制台错误');
    } else {
      consoleErrors.forEach((err, i) => console.log(`错误${i + 1}:`, err));
    }

    console.log('\n=== 页面错误 ===');
    if (pageErrors.length === 0) {
      console.log('无页面错误');
    } else {
      pageErrors.forEach((err, i) => console.log(`错误${i + 1}:`, err));
    }

    // 截图
    await page.screenshot({ path: '/tmp/auth-diagnostic.png', fullPage: true });
    console.log('\n截图已保存到 /tmp/auth-diagnostic.png');
  });
});
