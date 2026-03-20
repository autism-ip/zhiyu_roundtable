/**
 * SecondMe OAuth 流程诊断
 */

import { test, expect, Page } from '@playwright/test';

test.describe('SecondMe OAuth 登录流程诊断', () => {
  test('检查 SecondMe OAuth 授权 URL 构建', async ({ page }) => {
    // 监听所有网络请求
    const oauthRequests: string[] = [];
    const navigationUrls: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('second.me') || url.includes('oauth')) {
        oauthRequests.push(`${request.method()} ${url}`);
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('second.me') || url.includes('oauth')) {
        oauthRequests.push(`RESPONSE ${response.status()} ${url}`);
      }
    });

    page.on('framenavigated', frame => {
      navigationUrls.push(`Frame: ${frame.url()}`);
    });

    // 访问登录页
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // 点击 SecondMe 登录按钮
    const secondmeButton = page.getByRole('button', { name: /SecondMe/i });
    await expect(secondmeButton).toBeVisible();

    // 触发点击
    await secondmeButton.click();

    // 等待可能的跳转
    await page.waitForTimeout(3000);

    console.log('\n=== OAuth 相关请求 ===');
    oauthRequests.forEach(r => console.log(r));

    console.log('\n=== 导航历史 ===');
    console.log('最终 URL:', page.url());
    console.log('导航事件:', navigationUrls);

    // 检查当前 URL
    const finalUrl = page.url();
    if (finalUrl.includes('second.me') || finalUrl.includes('oauth')) {
      console.log('\n成功跳转到 OAuth 页面');
    } else {
      console.log('\n未跳转到 OAuth 页面，最终 URL:', finalUrl);

      // 检查 NextAuth 内部路由
      const authApiUrls = oauthRequests.filter(r => r.includes('/api/auth'));
      console.log('Auth API 调用:', authApiUrls);
    }
  });

  test('检查 NextAuth signIn 行为', async ({ page }) => {
    // 访问登录页
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // 直接访问 NextAuth 的 signIn 页面
    await page.goto('http://localhost:3000/api/auth/signin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n=== NextAuth SignIn 页内容 ===');
    const content = await page.content();
    // 检查是否有错误信息
    if (content.includes('Error') || content.includes('error')) {
      console.log('发现错误信息');
    }
    console.log('页面 URL:', page.url());
    console.log('页面标题:', await page.title());

    // 截图
    await page.screenshot({ path: '/tmp/nextauth-signin.png', fullPage: true });
    console.log('截图已保存到 /tmp/nextauth-signin.png');
  });

  test('检查 providers API', async ({ page }) => {
    // 访问 NextAuth 的 providers 端点
    const response = await page.request.get('http://localhost:3000/api/auth/providers');
    const providers = await response.json();

    console.log('\n=== NextAuth Providers ===');
    console.log(JSON.stringify(providers, null, 2));

    // 检查 secondme provider 是否存在
    if (providers.secondme) {
      console.log('\nSecondMe provider 已配置:');
      console.log('- authorization URL:', providers.secondme.authorizationUrl);
      console.log('- token URL:', providers.secondme.tokenUrl);
      console.log('- profile URL:', providers.secondme.profileUrl);
    } else {
      console.log('\n警告: SecondMe provider 未在 providers 列表中');
    }
  });
});