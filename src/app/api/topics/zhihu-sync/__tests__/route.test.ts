/**
 * 知乎热榜话题同步API测试
 * [INPUT]: 依赖 vitest (describe, it, expect, vi, beforeEach)
 * [OUTPUT]: 测试 GET /api/topics/zhihu-sync 的行为
 * [POS]: app/api/topics/zhihu-sync/__tests__/route.test.ts - 热榜同步API测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================
// Mock 依赖
// ============================================

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

// Mock BillboardService
vi.mock('@/lib/zhihu/services/billboard', () => ({
  createBillboardService: vi.fn()
}))

// Mock supabaseAdmin
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      findFirst: vi.fn(),
      insert: vi.fn(),
    })),
  },
}))

// Mock console.error to keep test output clean
vi.mock('console', () => ({
  error: vi.fn(),
  log: vi.fn(),
}))

// ============================================
// 测试数据
// ============================================

const mockTopics = [
  {
    zhihu_id: 'topic-001',
    title: '知乎热榜第一',
    description: '测试描述1',
    category: '科技',
    zhihu_url: 'https://www.zhihu.com/topic/001',
  },
  {
    zhihu_id: 'topic-002',
    title: '知乎热榜第二',
    description: '测试描述2',
    category: '生活',
    zhihu_url: 'https://www.zhihu.com/topic/002',
  },
]

const mockUserCookie = {
  value: encodeURIComponent(JSON.stringify({ id: 'user-123', name: '测试用户' }))
}

// ============================================
// 测试套件
// ============================================

describe('GET /api/topics/zhihu-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未登录时应返回401', async () => {
    // Import after mocks are set up
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn(() => null)
    })

    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost:3000/api/topics/zhihu-sync')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('BillboardService未配置时应返回500', async () => {
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn((name: string) => name === 'secondme_user' ? mockUserCookie : null)
    })

    const { createBillboardService } = await import('@/lib/zhihu/services/billboard')
    ;(createBillboardService as ReturnType<typeof vi.fn>).mockReturnValue(null)

    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost:3000/api/topics/zhihu-sync')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_CONFIGURED')
  })

  it('成功同步时应返回统计信息', async () => {
    // Setup cookies mock
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn((name: string) => name === 'secondme_user' ? mockUserCookie : null)
    })

    // Setup BillboardService mock
    const mockBillboardService = {
      getTopicsFromBillboard: vi.fn().mockResolvedValue(mockTopics)
    }
    const { createBillboardService } = await import('@/lib/zhihu/services/billboard')
    ;(createBillboardService as ReturnType<typeof vi.fn>).mockReturnValue(mockBillboardService)

    // Setup supabaseAdmin mock
    const { supabaseAdmin } = await import('@/lib/supabase/client')
    const mockFindFirst = vi.fn()
    const mockInsert = vi.fn()

    // First call: findFirst returns null (not exists)
    mockFindFirst.mockResolvedValue(null)
    // Second call: insert success
    mockInsert.mockResolvedValue({ data: { id: 'new-topic-id' }, error: null })

    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      findFirst: mockFindFirst,
      insert: mockInsert,
    })

    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost:3000/api/topics/zhihu-sync')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(2)
    expect(body.data.created).toBe(2)
    expect(body.data.skipped).toBe(0)
    expect(body.data.errors).toEqual([])
  })

  it('已存在的话题应被跳过', async () => {
    // Setup cookies mock
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn((name: string) => name === 'secondme_user' ? mockUserCookie : null)
    })

    // Setup BillboardService mock
    const mockBillboardService = {
      getTopicsFromBillboard: vi.fn().mockResolvedValue([mockTopics[0]])
    }
    const { createBillboardService } = await import('@/lib/zhihu/services/billboard')
    ;(createBillboardService as ReturnType<typeof vi.fn>).mockReturnValue(mockBillboardService)

    // Setup supabaseAdmin mock
    const { supabaseAdmin } = await import('@/lib/supabase/client')
    const mockFindFirst = vi.fn()

    // Topic already exists
    mockFindFirst.mockResolvedValue({ id: 'existing-topic-id' })

    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      findFirst: mockFindFirst,
    })

    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost:3000/api/topics/zhihu-sync')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(1)
    expect(body.data.created).toBe(0)
    expect(body.data.skipped).toBe(1)
  })

  it('应支持topCnt和publishInHours查询参数', async () => {
    // Setup cookies mock
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn((name: string) => name === 'secondme_user' ? mockUserCookie : null)
    })

    // Setup BillboardService mock
    const mockBillboardService = {
      getTopicsFromBillboard: vi.fn().mockResolvedValue([])
    }
    const { createBillboardService } = await import('@/lib/zhihu/services/billboard')
    ;(createBillboardService as ReturnType<typeof vi.fn>).mockReturnValue(mockBillboardService)

    // Setup supabaseAdmin mock
    const { supabaseAdmin } = await import('@/lib/supabase/client')
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      findFirst: vi.fn().mockResolvedValue(null),
    })

    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost:3000/api/topics/zhihu-sync?topCnt=10&publishInHours=24')

    await GET(request)

    // Verify BillboardService was called with correct params
    expect(mockBillboardService.getTopicsFromBillboard).toHaveBeenCalledWith({
      topCnt: 10,
      publishInHours: 24
    })
  })
})
