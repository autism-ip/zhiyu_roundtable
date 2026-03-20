/**
 * 话题 Seed API
 * [INPUT]: 依赖 TopicService
 * [OUTPUT]: 初始化话题种子数据
 * [POS]: app/api/topics/seed/route.ts - 话题 Seed 接口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopicService } from '@/lib/topic/topic-service';

// ============================================
// 种子数据定义
// ============================================

const SEED_TOPICS = [
  {
    title: "AI时代产品经理的价值在哪里？",
    description: "探讨在AI日益强大的今天，产品经理的核心竞争力是什么",
    category: "产品思考",
    tags: ["AI", "产品经理", "职业发展"],
  },
  {
    title: "创业公司如何找到第一个CTO？",
    description: "技术合伙人的寻找是创业初期最大的挑战之一",
    category: "创业",
    tags: ["创业", "团队", "CTO"],
  },
  {
    title: "远程协作能否替代办公室工作？",
    description: "后疫情时代的办公模式变革",
    category: "工作方式",
    tags: ["远程工作", "协作", "效率"],
  },
  {
    title: "程序员35岁中年危机是真实存在还是伪命题？",
    description: "职业发展路径与年龄焦虑的理性分析",
    category: "职业发展",
    tags: ["程序员", "职业发展", "中年危机"],
  },
  {
    title: "开源社区的贡献者如何获得合理回报？",
    description: "开源经济的可持续性问题",
    category: "开源",
    tags: ["开源", "社区", "商业模式"],
  },
  {
    title: "AI能否真正理解人类的情感？",
    description: "从哲学和技术的角度探讨人工智能的情商",
    category: "AI探索",
    tags: ["AI", "情感", "哲学"],
  },
  {
    title: "如何在技术变革中保持核心竞争力？",
    description: "终身学习与个人成长策略",
    category: "个人成长",
    tags: ["学习", "竞争力", "职业发展"],
  },
  {
    title: "SaaS产品的定价策略应该如何设计？",
    description: "从免费试用到企业级的定价模型",
    category: "产品思考",
    tags: ["SaaS", "定价", "商业模式"],
  },
];

// ============================================
// GET /api/topics/seed - 预览种子数据
// ============================================

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        topics: SEED_TOPICS,
        count: SEED_TOPICS.length,
      },
    });
  } catch (error: any) {
    console.error('获取种子数据预览失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取种子数据预览失败',
      },
    }, { status: 500 });
  }
}

// ============================================
// POST /api/topics/seed - 初始化种子数据
// ============================================

export async function POST() {
  try {
    const topicService = getTopicService();
    const createdTopics = [];

    for (const topicData of SEED_TOPICS) {
      try {
        const topic = await topicService.createTopic({
          title: topicData.title,
          description: topicData.description,
          category: topicData.category,
          tags: topicData.tags,
        });
        createdTopics.push(topic);
      } catch (error: any) {
        // 如果是唯一约束冲突，跳过该话题
        if (error.message.includes('唯一') || error.message.includes('unique')) {
          console.log(`话题已存在，跳过: ${topicData.title}`);
          continue;
        }
        // 其他错误记录但继续
        console.error(`创建话题失败: ${topicData.title}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        seedCount: createdTopics.length,
        topics: createdTopics,
        message: `成功初始化 ${createdTopics.length} 个话题`,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('初始化种子数据失败:', error);

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '初始化种子数据失败',
      },
    }, { status: 500 });
  }
}
