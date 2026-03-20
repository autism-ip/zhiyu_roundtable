/**
 * 知乎API客户端测试
 * [INPUT]: 依赖 vitest (describe, it, expect, beforeEach, vi)
 * [OUTPUT]: 测试 ZhihuClient 的签名生成和请求方法
 * [POS]: lib/zhihu/__tests__/client.test.ts - 知乎客户端单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import crypto from 'crypto'

// Mock fetch
global.fetch = vi.fn()

describe('ZhihuClient - 签名生成', () => {
  let createHmacSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    createHmacSpy = vi.spyOn(crypto, 'createHmac')
  })

  afterEach(() => {
    createHmacSpy.mockRestore()
  })

  it('应正确生成签名 - 包含app_key, ts, logid', async () => {
    const { createZhihuHeaders } = await import('../client')

    const headers = createZhihuHeaders('test-app-key', 'test-app-secret')

    expect(headers['X-App-Key']).toBe('test-app-key')
    expect(headers['X-Timestamp']).toMatch(/^\d+$/)
    expect(headers['X-Log-Id']).toMatch(/^log_\w+$/)
    // 签名应为非空字符串
    expect(typeof headers['X-Sign']).toBe('string')
    expect(headers['X-Sign'].length).toBeGreaterThan(0)
  })

  it('createHmac应被调用并使用sha256', async () => {
    const { createZhihuHeaders } = await import('../client')

    createZhihuHeaders('test-key', 'test-secret')

    expect(createHmacSpy).toHaveBeenCalledTimes(1)
    expect(createHmacSpy).toHaveBeenCalledWith('sha256', 'test-secret')
  })

  it('GET请求不应包含Content-Type头', async () => {
    const { createZhihuHeaders } = await import('../client')

    const headers = createZhihuHeaders('test-key', 'test-secret', false)

    expect(headers['Content-Type']).toBeUndefined()
  })

  it('POST请求应包含Content-Type头', async () => {
    const { createZhihuHeaders } = await import('../client')

    const headers = createZhihuHeaders('test-key', 'test-secret', true)

    expect(headers['Content-Type']).toBe('application/json')
  })
})

describe('ZhihuClient - 请求方法', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET请求应正确拼接query参数', async () => {
    const { ZhihuClient } = await import('../client')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 200, msg: 'success', data: [] }),
    } as Response)

    const client = new ZhihuClient('test-key', 'test-secret')
    await client.get('/test', { foo: 'bar', page: 1 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('/test')
    expect(calledUrl).toContain('foo=bar')
    expect(calledUrl).toContain('page=1')
  })

  it('GET请求无参数时不拼接query string', async () => {
    const { ZhihuClient } = await import('../client')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 200, msg: 'success', data: null }),
    } as Response)

    const client = new ZhihuClient('test-key', 'test-secret')
    await client.get('/test')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toBe('https://openapi.zhihu.com/test')
  })

  it('POST请求应正确发送body', async () => {
    const { ZhihuClient } = await import('../client')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 200, msg: 'success', data: { id: '123' } }),
    } as Response)

    const client = new ZhihuClient('test-key', 'test-secret')
    await client.post('/test', { name: 'test', value: 42 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const call = mockFetch.mock.calls[0]
    const options = call[1] as RequestInit
    expect(options.method).toBe('POST')
    expect(options.body).toBe('{"name":"test","value":42}')
  })

  it('错误响应应返回错误状态', async () => {
    const { ZhihuClient } = await import('../client')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ status: 401, msg: 'unauthorized', data: null }),
    } as Response)

    const client = new ZhihuClient('test-key', 'test-secret')
    const result = await client.get('/test')

    expect(result.status).toBe(401)
    expect(result.msg).toBe('unauthorized')
    expect(result.data).toBeNull()
  })

  it('POST请求应使用正确的headers', async () => {
    const { ZhihuClient } = await import('../client')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 200, msg: 'success', data: null }),
    } as Response)

    const client = new ZhihuClient('test-key', 'test-secret')
    await client.post('/test', {})

    const call = mockFetch.mock.calls[0]
    const options = call[1] as RequestInit
    const headers = options.headers as Record<string, string>

    expect(headers['X-App-Key']).toBe('test-key')
    expect(headers['X-Timestamp']).toMatch(/^\d+$/)
    expect(headers['X-Log-Id']).toMatch(/^log_\w+$/)
    expect(typeof headers['X-Sign']).toBe('string')
    expect(headers['X-Sign'].length).toBeGreaterThan(0)
    expect(headers['Content-Type']).toBe('application/json')
  })
})

describe('ZhihuClient - createZhihuClient 工厂函数', () => {
  const originalAppKey = process.env.ZHIHU_APP_KEY
  const originalAppSecret = process.env.ZHIHU_APP_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env vars
    if (originalAppKey !== undefined) {
      process.env.ZHIHU_APP_KEY = originalAppKey
    } else {
      delete process.env.ZHIHU_APP_KEY
    }
    if (originalAppSecret !== undefined) {
      process.env.ZHIHU_APP_SECRET = originalAppSecret
    } else {
      delete process.env.ZHIHU_APP_SECRET
    }
  })

  it('环境变量完整时返回客户端实例', async () => {
    process.env.ZHIHU_APP_KEY = 'test-key'
    process.env.ZHIHU_APP_SECRET = 'test-secret'

    const { createZhihuClient, ZhihuClient } = await import('../client')
    const client = createZhihuClient()

    expect(client).not.toBeNull()
    expect(client).toBeInstanceOf(ZhihuClient)
  })

  it('缺少ZHIHU_APP_KEY时返回null', async () => {
    delete process.env.ZHIHU_APP_KEY
    process.env.ZHIHU_APP_SECRET = 'test-secret'

    const { createZhihuClient } = await import('../client')
    const client = createZhihuClient()

    expect(client).toBeNull()
  })

  it('缺少ZHIHU_APP_SECRET时返回null', async () => {
    process.env.ZHIHU_APP_KEY = 'test-key'
    delete process.env.ZHIHU_APP_SECRET

    const { createZhihuClient } = await import('../client')
    const client = createZhihuClient()

    expect(client).toBeNull()
  })
})
