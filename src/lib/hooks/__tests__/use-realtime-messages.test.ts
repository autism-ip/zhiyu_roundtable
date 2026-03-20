import { renderHook, waitFor, act } from '@testing-library/react'
import { useRealtimeMessages } from '../use-realtime-messages'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb: string) => cb('SUBSCRIBED')),
    })),
    removeChannel: vi.fn(),
  },
}))

// Mock fetch
global.fetch = vi.fn()

describe('useRealtimeMessages', () => {
  const mockMessages = [
    { id: '1', agent_id: 'a1', agent_name: 'Agent 1', agent_avatar: null, content: 'Hello', timestamp: '2024-01-01', is_highlighted: false },
    { id: '2', agent_id: 'a2', agent_name: 'Agent 2', agent_avatar: null, content: 'Hi', timestamp: '2024-01-02', is_highlighted: false },
  ]

  beforeEach(() => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockMessages }),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('初始加载消息', async () => {
    const { result } = renderHook(() => useRealtimeMessages('round-123'))

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages)
    })
  })

  it('返回 isConnected 状态', async () => {
    const { result } = renderHook(() => useRealtimeMessages('round-123'))

    await waitFor(() => {
      expect(typeof result.current.isConnected).toBe('boolean')
    })
  })

  it('setMessages 可更新消息', async () => {
    const { result } = renderHook(() => useRealtimeMessages('round-123'))
    const newMessage = { id: '3', agent_id: 'a3', agent_name: 'Agent 3', agent_avatar: null, content: 'New', timestamp: '2024-01-03', is_highlighted: false }

    await waitFor(() => {
      expect(result.current.messages.length).toBe(2)
    })

    await act(async () => {
      result.current.setMessages((prev) => [...prev, newMessage])
    })

    expect(result.current.messages.length).toBe(3)
    expect(result.current.messages[2]).toEqual(newMessage)
  })

  it('roundId 为空时不加载', () => {
    const { result } = renderHook(() => useRealtimeMessages(''))

    expect(result.current.messages).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
