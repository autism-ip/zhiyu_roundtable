/**
 * BillboardService 单元测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 使用 vi.hoisted 在 vi.mock 提升之前声明 mock
const { mockGet } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
  };
});

// Mock ZhihuClient
vi.mock('../../client', () => ({
  ZhihuClient: vi.fn().mockImplementation(() => ({
    get: mockGet,
  })),
  createZhihuClient: vi.fn().mockReturnValue({
    get: mockGet,
  }),
}));

// Mock constants
vi.mock('../../constants', () => ({
  ZHIHU_CONFIG: {
    DEFAULT_TOP_COUNT: 10,
    DEFAULT_PUBLISH_IN_HOURS: 24,
  },
}));

// 导入需要在mock之后
import { BillboardService } from '../billboard';
import type { ZhihuBillboardItem } from '../../types';

// 测试数据 - 使用正确的类型 (interaction_info)
const mockBillboardItem: ZhihuBillboardItem = {
  token: 'test-token-123',
  title: 'AI大模型将如何改变未来工作',
  body: '随着GPT等大模型的快速发展，越来越多的工作将被自动化。',
  link_url: 'https://www.zhihu.com/question/123456',
  type: 'QUESTION',
  heat_score: 9850,
  published_time: 1710900000,
  published_time_str: '2024-03-20',
  interaction_info: {
    vote_up_count: 1000,
    like_count: 500,
    comment_count: 200,
    favorites: 100,
    pv_count: 50000,
  },
};

const mockHotItem: ZhihuBillboardItem = {
  token: 'test-token-456',
  title: '特斯拉自动驾驶最新进展',
  body: '特斯拉最新发布的FSD版本在城区表现如何？',
  link_url: 'https://www.zhihu.com/question/789012',
  type: 'QUESTION',
  heat_score: 9200,
  published_time: 1710890000,
  published_time_str: '2024-03-19',
  interaction_info: {
    vote_up_count: 800,
    like_count: 400,
    comment_count: 150,
    favorites: 80,
    pv_count: 40000,
  },
};

const mockAnswerItem: ZhihuBillboardItem = {
  token: 'test-token-789',
  title: '回答：AI大模型将如何改变未来工作',
  body: '作为AI研究员，我认为...',
  link_url: 'https://www.zhihu.com/answer/111',
  type: 'ANSWER',
  heat_score: 8500,
  published_time: 1710880000,
  published_time_str: '2024-03-18',
  interaction_info: {
    vote_up_count: 600,
    like_count: 300,
    comment_count: 100,
    favorites: 50,
    pv_count: 30000,
  },
};

describe('BillboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBillboard', () => {
    it('应正确调用热榜API', async () => {
      const mockResponse = {
        status: 0,
        data: {
          list: [mockBillboardItem, mockHotItem],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const service = new BillboardService();
      const result = await service.getBillboard({ topCnt: 10, publishInHours: 24 });

      expect(mockGet).toHaveBeenCalledWith('/openapi/billboard/list', {
        top_cnt: 10,
        publish_in_hours: 24,
      });
      expect(result).toEqual([mockBillboardItem, mockHotItem]);
    });

    it('应使用默认参数调用API', async () => {
      const mockResponse = { status: 0, data: { list: [] } };
      mockGet.mockResolvedValue(mockResponse);

      const service = new BillboardService();
      await service.getBillboard();

      expect(mockGet).toHaveBeenCalledWith('/openapi/billboard/list', {
        top_cnt: 10,
        publish_in_hours: 24,
      });
    });

    it('API返回非零状态时应返回空数组', async () => {
      const mockResponse = { status: 1, msg: '请求频繁' };
      mockGet.mockResolvedValue(mockResponse);

      const service = new BillboardService();
      const result = await service.getBillboard();

      expect(result).toEqual([]);
    });

    it('API失败时应返回空数组', async () => {
      mockGet.mockRejectedValue(new Error('网络错误'));

      const service = new BillboardService();
      const result = await service.getBillboard();

      expect(result).toEqual([]);
    });
  });

  describe('mapToTopic', () => {
    it('应正确映射为Topic格式', () => {
      const service = new BillboardService();
      const result = service.mapToTopic(mockBillboardItem);

      expect(result).toEqual({
        title: 'AI大模型将如何改变未来工作',
        description: '随着GPT等大模型的快速发展，越来越多的工作将被自动化。',
        category: '科技',
        zhihu_id: 'test-token-123',
        zhihu_url: 'https://www.zhihu.com/question/123456',
        heat_score: 9850,
        topic_source: 'zhihu_billboard',
      });
    });

    it('应正确推断科技分类', () => {
      const service = new BillboardService();
      const result = service.mapToTopic(mockHotItem);

      expect(result.category).toBe('科技');
    });

    it('应正确推断商业分类', () => {
      const businessItem: ZhihuBillboardItem = {
        ...mockBillboardItem,
        token: 'biz-123',
        title: '创业公司如何融资',
        body: 'A轮融资的技巧与注意事项',
        heat_score: 8000,
        interaction_info: mockBillboardItem.interaction_info,
      };
      const service = new BillboardService();
      const result = service.mapToTopic(businessItem);

      expect(result.category).toBe('商业');
    });

    it('应正确推断社会分类', () => {
      const socialItem: ZhihuBillboardItem = {
        ...mockBillboardItem,
        token: 'soc-123',
        title: '职场中年危机如何应对',
        body: '35岁程序员的选择',
        heat_score: 7500,
        interaction_info: mockBillboardItem.interaction_info,
      };
      const service = new BillboardService();
      const result = service.mapToTopic(socialItem);

      expect(result.category).toBe('社会');
    });

    it('应正确推断娱乐分类', () => {
      const entertainmentItem: ZhihuBillboardItem = {
        ...mockBillboardItem,
        token: 'ent-123',
        title: '最新科幻电影观后感',
        body: '星际穿越的深度解析',
        heat_score: 7000,
        interaction_info: mockBillboardItem.interaction_info,
      };
      const service = new BillboardService();
      const result = service.mapToTopic(entertainmentItem);

      expect(result.category).toBe('娱乐');
    });

    it('无法推断时应返回其他分类', () => {
      const unknownItem: ZhihuBillboardItem = {
        ...mockBillboardItem,
        token: 'unk-123',
        title: '这是一个普通问题',
        body: '没有任何关键词',
        heat_score: 5000,
        interaction_info: mockBillboardItem.interaction_info,
      };
      const service = new BillboardService();
      const result = service.mapToTopic(unknownItem);

      expect(result.category).toBe('其他');
    });

    it('应截断过长的描述', () => {
      const longBodyItem: ZhihuBillboardItem = {
        ...mockBillboardItem,
        body: 'A'.repeat(1000),
        interaction_info: mockBillboardItem.interaction_info,
      };
      const service = new BillboardService();
      const result = service.mapToTopic(longBodyItem);

      expect(result.description.length).toBe(500);
    });
  });

  describe('getTopicsFromBillboard', () => {
    it('应过滤QUESTION类型并返回Topic列表', async () => {
      const mockResponse = {
        status: 0,
        data: {
          list: [mockBillboardItem, mockAnswerItem, mockHotItem],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const service = new BillboardService();
      const result = await service.getTopicsFromBillboard();

      // 应过滤掉ANSWER类型的项
      expect(result).toHaveLength(2);
      expect(result[0].zhihu_id).toBe('test-token-123');
      expect(result[1].zhihu_id).toBe('test-token-456');
    });

    it('应返回空数组当API失败', async () => {
      mockGet.mockRejectedValue(new Error('网络错误'));

      const service = new BillboardService();
      const result = await service.getTopicsFromBillboard();

      expect(result).toEqual([]);
    });
  });
});
