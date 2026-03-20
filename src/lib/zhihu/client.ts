/**
 * 知乎API客户端
 * [INPUT]: 依赖 crypto (HMAC-SHA256), fetch
 * [OUTPUT]: 提供 get, post 方法
 * [POS]: lib/zhihu/client.ts - 知乎开放平台API客户端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import crypto from 'crypto'

const DOMAIN = 'https://openapi.zhihu.com'

export interface ZhihuHeaders extends Record<string, string> {
  'X-App-Key': string
  'X-Timestamp': string
  'X-Log-Id': string
  'X-Sign': string
  'Content-Type'?: string
}

export interface ZhihuResponse<T> {
  status: number
  msg: string
  data: T | null
}

export function createZhihuHeaders(
  appKey: string,
  appSecret: string,
  includeContentType = false
): ZhihuHeaders {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const logId = `log_${Date.now()}${Math.random().toString(36).slice(2, 8)}`

  return {
    'X-App-Key': appKey,
    'X-Timestamp': timestamp,
    'X-Log-Id': logId,
    'X-Sign': generateSignature(appKey, appSecret, timestamp, logId),
    ...(includeContentType && { 'Content-Type': 'application/json' }),
  }
}

function generateSignature(
  appKey: string,
  appSecret: string,
  timestamp: string,
  logId: string
): string {
  const signStr = `app_key:${appKey}|ts:${timestamp}|logid:${logId}|extra_info:`
  const hmac = crypto.createHmac('sha256', appSecret)
  hmac.write(signStr)
  hmac.end()
  return hmac.read().toString('base64')
}

export class ZhihuClient {
  private appKey: string
  private appSecret: string

  constructor(appKey: string, appSecret: string) {
    this.appKey = appKey
    this.appSecret = appSecret
  }

  async get<T>(path: string, params?: Record<string, string | number>): Promise<ZhihuResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : ''

    const headers = createZhihuHeaders(this.appKey, this.appSecret)

    const response = await fetch(`${DOMAIN}${path}${queryString}`, {
      method: 'GET',
      headers,
    })

    return response.json()
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<ZhihuResponse<T>> {
    const headers = createZhihuHeaders(this.appKey, this.appSecret, true)

    const response = await fetch(`${DOMAIN}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    return response.json()
  }
}

// 创建默认客户端实例
export function createZhihuClient(): ZhihuClient | null {
  const appKey = process.env.ZHIHU_APP_KEY
  const appSecret = process.env.ZHIHU_APP_SECRET

  if (!appKey || !appSecret) {
    console.warn('知乎API密钥未配置')
    return null
  }

  return new ZhihuClient(appKey, appSecret)
}
