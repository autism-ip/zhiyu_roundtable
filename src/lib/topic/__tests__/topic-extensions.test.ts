/**
 * 话题表扩展字段测试
 * [INPUT]: 依赖 lib/supabase/types 的 DbTopic 类型
 * [OUTPUT]: 验证 DbTopic 类型包含知乎扩展字段
 * [POS]: lib/topic/__tests__/ - 话题模块测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect } from 'vitest';
import type { DbTopic } from '@/lib/supabase/types';

// =============================================================================
// 类型辅助函数 - 验证字段存在性
// =============================================================================

/**
 * 验证 topic 对象包含必需字段
 * 这是一个运行时验证函数
 */
function validateTopicFields(topic: DbTopic): {
  hasTopicSource: boolean;
  hasHeatScore: boolean;
  hasZhihuRank: boolean;
} {
  return {
    hasTopicSource: 'topic_source' in topic,
    hasHeatScore: 'heat_score' in topic,
    hasZhihuRank: 'zhihu_rank' in topic,
  };
}

// =============================================================================
// 测试：话题表扩展字段验证
// =============================================================================

describe('Topic表扩展 - 知乎字段验证', () => {
  /**
   * 测试：DbTopic 必须包含 topic_source 字段
   */
  it('DbTopic 必须包含 topic_source 字段', () => {
    const mockTopic: DbTopic = {
      id: 'test-id',
      title: '测试话题',
      description: null,
      category: null,
      tags: null,
      zhihu_id: null,
      zhihu_url: null,
      status: 'active',
      topic_source: 'manual',
      heat_score: 0,
      zhihu_rank: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validation = validateTopicFields(mockTopic);
    expect(validation.hasTopicSource).toBe(true);
  });

  /**
   * 测试：topic_source 字段应为有效枚举值
   */
  it('topic_source 字段应支持 manual/zhihu_billboard/zhihu_search 枚举值', () => {
    const validSources = ['manual', 'zhihu_billboard', 'zhihu_search'] as const;

    validSources.forEach((source) => {
      const topic: DbTopic = {
        id: 'test-id',
        title: '测试话题',
        description: null,
        category: null,
        tags: null,
        zhihu_id: null,
        zhihu_url: null,
        status: 'active',
        topic_source: source,
        heat_score: 0,
        zhihu_rank: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(topic.topic_source).toBe(source);
    });
  });

  /**
   * 测试：heat_score 字段应为数字类型
   */
  it('heat_score 字段应为 number 类型', () => {
    const topic: DbTopic = {
      id: 'test-id',
      title: '测试话题',
      description: null,
      category: null,
      tags: null,
      zhihu_id: null,
      zhihu_url: null,
      status: 'active',
      topic_source: 'manual',
      heat_score: 8500,
      zhihu_rank: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(typeof topic.heat_score).toBe('number');
    expect(topic.heat_score).toBe(8500);
  });

  /**
   * 测试：zhihu_rank 字段应为数字类型
   */
  it('zhihu_rank 字段应为 number 类型', () => {
    const topic: DbTopic = {
      id: 'test-id',
      title: '测试话题',
      description: null,
      category: null,
      tags: null,
      zhihu_id: null,
      zhihu_url: null,
      status: 'active',
      topic_source: 'zhihu_billboard',
      heat_score: 0,
      zhihu_rank: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(typeof topic.zhihu_rank).toBe('number');
    expect(topic.zhihu_rank).toBe(3);
  });

  /**
   * 测试：zhihu_rank 为 0 表示未上榜
   */
  it('zhihu_rank 为 0 表示未上榜', () => {
    const notRankedTopic: DbTopic = {
      id: 'test-id',
      title: '测试话题',
      description: null,
      category: null,
      tags: null,
      zhihu_id: 'zhihu-123',
      zhihu_url: null,
      status: 'active',
      topic_source: 'zhihu_search',
      heat_score: 500,
      zhihu_rank: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(notRankedTopic.zhihu_rank).toBe(0);
  });

  /**
   * 测试：完整话题对象包含所有知乎扩展字段
   */
  it('从知乎热榜获取的话题应包含所有扩展字段', () => {
    const zhihuTopic: DbTopic = {
      id: 'zhihu-123',
      title: 'AI与大模型发展趋势',
      description: '讨论AI和大模型的最新发展',
      category: 'technology',
      tags: ['AI', '大模型'],
      zhihu_id: 'zhihu-456',
      zhihu_url: 'https://www.zhihu.com/question/123',
      status: 'active',
      topic_source: 'zhihu_billboard',
      heat_score: 25000,
      zhihu_rank: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(zhihuTopic.topic_source).toBe('zhihu_billboard');
    expect(zhihuTopic.heat_score).toBe(25000);
    expect(zhihuTopic.zhihu_rank).toBe(5);
    expect(zhihuTopic.zhihu_id).toBe('zhihu-456');
  });

  /**
   * 测试：字段验证函数能正确识别所有扩展字段
   */
  it('validateTopicFields 函数应正确识别所有扩展字段', () => {
    const topic: DbTopic = {
      id: 'test-id',
      title: '测试话题',
      description: null,
      category: null,
      tags: null,
      zhihu_id: null,
      zhihu_url: null,
      status: 'active',
      topic_source: 'zhihu_billboard',
      heat_score: 10000,
      zhihu_rank: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validation = validateTopicFields(topic);
    expect(validation.hasTopicSource).toBe(true);
    expect(validation.hasHeatScore).toBe(true);
    expect(validation.hasZhihuRank).toBe(true);
  });
});
