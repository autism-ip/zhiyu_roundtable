/**
 * 知乎热榜服务
 * [INPUT]: 依赖 ZhihuClient, ZHIHU_CONFIG
 * [OUTPUT]: 提供 getBillboard, mapToTopic, getTopicsFromBillboard 方法
 * [POS]: lib/zhihu/services/billboard.ts - 热榜话题服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { ZhihuClient, createZhihuClient } from '../client';
import { ZhihuBillboardItem } from '../types';
import { ZHIHU_CONFIG } from '../constants';

export interface TopicFromBillboard {
  title: string;
  description: string;
  category: string;
  zhihu_id: string;
  zhihu_url: string;
  heat_score: number;
  topic_source: 'zhihu_billboard';
}

export class BillboardService {
  private client: ZhihuClient | null;

  constructor(client?: ZhihuClient) {
    this.client = client || createZhihuClient();
  }

  /**
   * 获取知乎热榜列表
   */
  async getBillboard(options?: {
    topCnt?: number;
    publishInHours?: number;
  }): Promise<ZhihuBillboardItem[]> {
    if (!this.client) {
      console.warn('知乎客户端未初始化');
      return [];
    }

    const {
      topCnt = ZHIHU_CONFIG.DEFAULT_TOP_COUNT,
      publishInHours = ZHIHU_CONFIG.DEFAULT_PUBLISH_IN_HOURS,
    } = options || {};

    try {
      const response = await this.client.get<{ list: ZhihuBillboardItem[] }>(
        '/openapi/billboard/list',
        {
          top_cnt: topCnt,
          publish_in_hours: publishInHours,
        }
      );

      if (response.status === 0 && response.data?.list) {
        return response.data.list;
      }

      console.error('获取热榜失败:', response.msg);
      return [];
    } catch (error) {
      console.error('获取热榜异常:', error);
      return [];
    }
  }

  /**
   * 将热榜项转换为Topic格式
   */
  mapToTopic(item: ZhihuBillboardItem): TopicFromBillboard {
    const category = this.inferCategory(item.title, item.body);

    return {
      title: item.title,
      description: item.body.slice(0, 500),
      category,
      zhihu_id: item.token,
      zhihu_url: item.link_url,
      heat_score: item.heat_score,
      topic_source: 'zhihu_billboard',
    };
  }

  /**
   * 从标题和内容推断分类
   */
  private inferCategory(title: string, body: string): string {
    const text = `${title} ${body}`.toLowerCase();

    const categoryMap: Record<string, string[]> = {
      '科技': ['ai', '人工智能', 'chatgpt', '大模型', '技术', '编程', '软件', '自动驾驶', '特斯拉', '科技'],
      '商业': ['创业', '商业', '投资', '公司', '融资', '市场', '商业'],
      '社会': ['社会', '教育', '职场', '工作', '生活', '家庭', '社会'],
      '娱乐': ['电影', '电视剧', '明星', '综艺', '音乐', '游戏', '娱乐'],
      '文化': ['历史', '文化', '文学', '哲学', '思想', '文化'],
    };

    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some((k) => text.includes(k))) {
        return cat;
      }
    }

    return '其他';
  }

  /**
   * 获取热榜并转换为Topic格式
   */
  async getTopicsFromBillboard(options?: {
    topCnt?: number;
    publishInHours?: number;
  }): Promise<TopicFromBillboard[]> {
    const items = await this.getBillboard(options);
    return items
      .filter((item) => item.type === 'QUESTION')
      .map((item) => this.mapToTopic(item));
  }
}

// 创建默认服务实例
export function createBillboardService(): BillboardService {
  return new BillboardService();
}
