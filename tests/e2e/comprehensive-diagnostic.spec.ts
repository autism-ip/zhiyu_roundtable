/**
 * 全面诊断测试 - 登录后错误
 */

import { test, expect, Request } from '@playwright/test';

test.describe('登录后错误全面诊断', () => {
  test('全面诊断 - 包含网络请求', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const allRequests: string[] = [];

    // 捕获控制台消息
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // 捕获页面错误
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // 捕获失败的请求
    page.on('requestfailed', request => {
      const failure = request.failure();
      failedRequests.push(`${request.method()} ${request.url()} - ${failure?.errorText || 'Unknown error'}`);
    });

    // 捕获所有请求（用于调试）
    page.on('request', request => {
      allRequests.push(`${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`HTTP ${response.status()} - ${response.url()}`);
      }
    });

    console.log('=== 开始诊断 ===\n');

    // 1. 首页
    console.log('--- 1. 访问首页 ---');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/diag-home.png' });

    // 2. 登录页
    console.log('\n--- 2. 访问登录页 ---');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/diag-login.png' });

    // 3. 圆桌页面
    console.log('\n--- 3. 访问圆桌页面 ---');
    await page.goto('http://localhost:3000/rounds');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/diag-rounds.png' });

    // 4. 知遇卡页面
    console.log('\n--- 4. 访问知遇卡页面 ---');
    await page.goto('http://localhost:3000/matches');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/diag-matches.png' });

    // 5. 个人资料页面
    console.log('\n--- 5. 访问个人资料页面 ---');
    await page.goto('http://localhost:3000/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/diag-profile.png' });

    // 6. 尝试触发登录流程
    console.log('\n--- 6. 尝试触发登录 ---');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    const secondmeBtn = page.getByRole('button', { name: /SecondMe/i });
    if (await secondmeBtn.isVisible()) {
      console.log('点击 SecondMe 登录按钮...');
      await secondmeBtn.click();
      await page.waitForTimeout(3000);

      const afterClickUrl = page.url();
      console.log('点击后 URL:', afterClickUrl);

      if (afterClickUrl.includes('second.me')) {
        console.log('已跳转到 SecondMe OAuth');
      } else {
        console.log('未跳转，可能 signIn 函数有问题');
      }
    }

    // 输出诊断结果
    console.log('\n=== 诊断结果 ===\n');

    console.log('--- 控制台错误 ---');
    if (consoleErrors.length === 0) {
      console.log('无');
    } else {
      consoleErrors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    }

    console.log('\n--- 控制台警告 ---');
    if (consoleWarnings.length === 0) {
      console.log('无');
    } else {
      consoleWarnings.forEach((w, i) => console.log(`${i + 1}. ${w}`));
    }

    console.log('\n--- 页面错误 ---');
    if (pageErrors.length === 0) {
      console.log('无');
    } else {
      pageErrors.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    }

    console.log('\n--- 失败的请求 ---');
    if (failedRequests.length === 0) {
      console.log('无');
    } else {
      failedRequests.forEach((r, i) => console.log(`${i + 1}. ${r}`));
    }

    console.log('\n--- 所有请求 ---');
    allRequests.slice(0, 30).forEach((r, i) => console.log(`${i + 1}. ${r}`));
    if (allRequests.length > 30) {
      console.log(`... 还有 ${allRequests.length - 30} 个请求`);
    }

    console.log('\n=== 截图已保存 ===');
    console.log('/tmp/diag-home.png');
    console.log('/tmp/diag-login.png');
    console.log('/tmp/diag-rounds.png');
    console.log('/tmp/diag-matches.png');
    console.log('/tmp/diag-profile.png');
  });
});
