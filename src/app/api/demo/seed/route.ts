/**
 * 演示数据 Seed API
 * 生成10个不同领域的演示用户、Agent、圆桌和知遇卡
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// ============================================
// 演示数据定义
// ============================================

const DEMO_USERS = [
  {
    name: 'AI科技达人',
    email: 'tech@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tech',
    interests: ['AI', '大模型', '科技', '编程'],
    connectionTypes: ['cofounder', 'peer'],
    personality: '理性、好奇、喜欢探索新技术',
    expertise: ['AI', '大模型', 'Python', '机器学习'],
    tone: '专业',
  },
  {
    name: '创业导师',
    email: 'business@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=business',
    interests: ['创业', '投资', '商业', '战略'],
    connectionTypes: ['advisor', 'mentee'],
    personality: '务实、有远见、善于发现机会',
    expertise: ['创业', '融资', '战略规划', '商业模式'],
    tone: '沉稳',
  },
  {
    name: '社会观察家',
    email: 'social@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=social',
    interests: ['社会', '教育', '文化', '心理'],
    connectionTypes: ['peer', 'advisor'],
    personality: '善于观察、富有同理心、深度思考',
    expertise: ['社会学', '心理学', '教育', '文化研究'],
    tone: '温和',
  },
  {
    name: '文娱策划师',
    email: 'entertainment@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=entertainment',
    interests: ['电影', '音乐', '综艺', '娱乐'],
    connectionTypes: ['cofounder', 'peer'],
    personality: '创意无限、表达力强、善于讲故事',
    expertise: ['影视策划', '内容创作', 'IP运营', '粉丝经济'],
    tone: '活泼',
  },
  {
    name: '文化评论家',
    email: 'culture@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=culture',
    interests: ['文学', '历史', '哲学', '艺术'],
    connectionTypes: ['peer', 'advisor'],
    personality: '深刻、批判、追求意义',
    expertise: ['文学评论', '哲学', '艺术史', '历史研究'],
    tone: '深邃',
  },
  {
    name: '产品大师',
    email: 'product@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=product',
    interests: ['产品', '用户体验', '交互设计', '数据'],
    connectionTypes: ['cofounder', 'peer'],
    personality: '用户导向、数据驱动、追求极致',
    expertise: ['产品设计', 'UX研究', '数据分析', '增长黑客'],
    tone: '细致',
  },
  {
    name: '技术极客',
    email: 'engineering@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=engineering',
    interests: ['编程', '开源', '系统架构', '算法'],
    connectionTypes: ['peer', 'advisor'],
    personality: '追求完美、热爱技术、乐于分享',
    expertise: ['系统架构', '高性能计算', '开源贡献', '算法优化'],
    tone: '技术',
  },
  {
    name: '金融分析师',
    email: 'finance@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
    interests: ['投资', '市场', '经济', '理财'],
    connectionTypes: ['advisor', 'peer'],
    personality: '谨慎、理性、注重风险控制',
    expertise: ['投资分析', '风险管理', '宏观经济', '量化交易'],
    tone: '严谨',
  },
  {
    name: '营销鬼才',
    email: 'marketing@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
    interests: ['品牌', '传播', '社交媒体', '内容营销'],
    connectionTypes: ['cofounder', 'peer'],
    personality: '创意十足、执行力强、洞察人心',
    expertise: ['品牌策略', '社交营销', '内容运营', 'KOL合作'],
    tone: '创意',
  },
  {
    name: '生活美学家',
    email: 'lifestyle@demo.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=lifestyle',
    interests: ['生活方式', '旅行', '美食', '设计'],
    connectionTypes: ['peer', 'cofounder'],
    personality: '热爱生活、追求品质、善于发现美',
    expertise: ['生活方式设计', '旅行策划', '美食评论', '空间美学'],
    tone: '优雅',
  },
];

// ============================================
// 辅助函数
// ============================================

async function createDemoUser(demo: typeof DEMO_USERS[0], index: number) {
  const userId = randomUUID();
  const secondmeId = `demo_${1000 + index}`;

  // 创建用户
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email: demo.email,
      name: demo.name,
      avatar_url: demo.avatar,
      secondme_id: secondmeId,
      interests: demo.interests,
      connection_types: demo.connectionTypes,
    })
    .select()
    .single();

  if (userError) {
    // 用户可能已存在，尝试获取
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('*, agent:agents(*)')
      .eq('email', demo.email)
      .single();
    if (existing) {
      return { user: existing, agent: existing.agent || null };
    }
    throw new Error(`创建用户失败: ${userError.message}`);
  }

  // 创建 Agent（如果已存在则跳过）
  let agent = null;
  const { data: newAgent, error: agentError } = await supabaseAdmin
    .from('agents')
    .insert({
      user_id: userId,
      name: `${demo.name}的AI分身`,
      personality: demo.personality,
      expertise: demo.expertise,
      tone: demo.tone,
      is_active: true,
    })
    .select()
    .single();

  if (agentError) {
    // Agent可能已存在，尝试获取
    const { data: existingAgent } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .single();
    agent = existingAgent;
    if (!agent) {
      console.error(`创建Agent失败 for ${demo.name}:`, agentError);
    }
  } else {
    agent = newAgent;
  }

  return { user, agent };
}

// 创建审计日志
async function createAuditLog(
  action: string,
  actorType: 'user' | 'agent' | 'system',
  actorId: string,
  resourceType: string,
  resourceId: string,
  contextBefore: Record<string, any> = {},
  contextAfter: Record<string, any> = {}
) {
  await supabaseAdmin.from('audit_logs').insert({
    action,
    actor_type: actorType,
    actor_id: actorId,
    resource_type: resourceType,
    resource_id: resourceId,
    context_before: contextBefore,
    context_after: contextAfter,
  });
}

// ============================================
// POST - 生成演示数据
// ============================================

export async function POST() {
  try {
    const results: {
      users: number;
      agents: number;
      topics: number;
      rounds: number;
      matches: number;
      debates: number;
      cotrials: number;
      messages: number;
    } = {
      users: 0,
      agents: 0,
      topics: 0,
      rounds: 0,
      matches: 0,
      debates: 0,
      cotrials: 0,
      messages: 0,
    };

    // 1. 创建演示话题
    const topics = [
      { title: 'AI时代，年轻人该如何规划职业？', category: '科技', tags: ['AI', '职业', '科技'] },
      { title: '创业者和投资人如何看待彼此？', category: '商业', tags: ['创业', '投资', '商业'] },
      { title: '996工作制真的是奋斗吗？', category: '社会', tags: ['职场', '社会', '996'] },
      { title: '短视频时代，注意力是金还是毒？', category: '娱乐', tags: ['短视频', '娱乐', '注意力'] },
      { title: '传统文化如何在现代找到新生命？', category: '文化', tags: ['文化', '传统', '创新'] },
    ];

    const createdTopics: Array<{ id: string }> = [];
    for (const topic of topics) {
      const { data, error } = await supabaseAdmin
        .from('topics')
        .insert({
          title: topic.title,
          category: topic.category,
          tags: topic.tags,
          status: 'active',
        })
        .select('id')
        .single();

      if (!error && data) {
        createdTopics.push(data);
        results.topics++;
      }
    }

    // 2. 创建演示用户和Agent
    const userAgents: Array<{ userId: string; agentId: string }> = [];
    for (let i = 0; i < DEMO_USERS.length; i++) {
      const demo = DEMO_USERS[i];
      const { user, agent } = await createDemoUser(demo, i);
      if (user) results.users++;
      if (agent) results.agents++;
      if (user && agent) {
        userAgents.push({ userId: user.id, agentId: agent.id });
      }
    }

    // 3. 创建演示圆桌（至少需要2个用户）
    if (userAgents.length >= 2 && createdTopics.length >= 1) {
      // 圆桌1：AI职业话题
      const round1Topic = createdTopics[0];
      const { data: round1, error: round1Error } = await supabaseAdmin
        .from('rounds')
        .insert({
          topic_id: round1Topic.id,
          name: 'AI时代的职业规划讨论',
          description: '探讨AI时代年轻人的职业发展路径',
          max_agents: 5,
          status: 'completed',
        })
        .select()
        .single();

      if (!round1Error && round1) {
        results.rounds++;

        // 添加参与者（前5个用户）
        const participants1 = userAgents.slice(0, 4);

        // 添加审计日志
        await createAuditLog(
          'round.created',
          'user',
          participants1[0].userId,
          'round',
          round1.id,
          {},
          { name: round1.name, status: 'completed' }
        );

        for (const ua of participants1) {
          await supabaseAdmin.from('round_participants').insert({
            round_id: round1.id,
            user_id: ua.userId,
            agent_id: ua.agentId,
            role: ua === participants1[0] ? 'host' : 'participant',
          });

          // 为每个参与者添加加入圆桌的审计日志
          await createAuditLog(
            'round.joined',
            'user',
            ua.userId,
            'round',
            round1.id
          );
        }

        // 添加讨论消息
        const messages1 = [
          'AI确实在改变很多职业，但我觉得人类独特的创造力是AI无法替代的。',
          '作为投资人，我更看重创始人对行业的深刻理解和执行力。',
          '技术只是工具，关键是怎么用。年轻人应该学会与AI协作。',
          '同意，AI可以处理重复性工作，让我们有更多时间做创造性思考。',
        ];

        for (let i = 0; i < Math.min(messages1.length, participants1.length); i++) {
          await supabaseAdmin.from('messages').insert({
            round_id: round1.id,
            agent_id: participants1[i].agentId,
            content: messages1[i],
            type: 'text',
          });
          results.messages++;
        }
      }

      // 圆桌2：创业话题
      const round2Topic = createdTopics[1];
      const { data: round2, error: round2Error } = await supabaseAdmin
        .from('rounds')
        .insert({
          topic_id: round2Topic.id,
          name: '创业者的融资之路',
          description: '分享创业过程中的融资经验',
          max_agents: 4,
          status: 'completed',
        })
        .select()
        .single();

      if (!round2Error && round2) {
        results.rounds++;

        // 添加参与者（选择有商业背景的用户）
        const participants2 = userAgents.slice(1, 4);

        // 添加审计日志
        await createAuditLog(
          'round.created',
          'user',
          participants2[0].userId,
          'round',
          round2.id,
          {},
          { name: round2.name, status: 'completed' }
        );

        for (const ua of participants2) {
          await supabaseAdmin.from('round_participants').insert({
            round_id: round2.id,
            user_id: ua.userId,
            agent_id: ua.agentId,
            role: ua === participants2[0] ? 'host' : 'participant',
          });

          // 为每个参与者添加加入圆桌的审计日志
          await createAuditLog(
            'round.joined',
            'user',
            ua.userId,
            'round',
            round2.id
          );
        }

        // 添加讨论消息
        const messages2 = [
          '创业者需要清晰讲述自己的愿景和为什么能赢。',
          '我见过太多创业者死于现金断流，早期一定要管理好现金流。',
          '投资人看的是团队，一个好的团队可以把B计划执行得比A计划还好。',
        ];

        for (let i = 0; i < Math.min(messages2.length, participants2.length); i++) {
          await supabaseAdmin.from('messages').insert({
            round_id: round2.id,
            agent_id: participants2[i].agentId,
            content: messages2[i],
            type: 'text',
          });
          results.messages++;
        }
      }
    }

    // 3.5. 创建等待中的圆桌
    if (userAgents.length >= 2 && createdTopics.length >= 2) {
      const waitingTopic = createdTopics[2]; // 996话题
      const { data: roundWaiting, error: roundWaitingError } = await supabaseAdmin
        .from('rounds')
        .insert({
          topic_id: waitingTopic.id,
          name: '职场文化反思圆桌',
          description: '深入探讨996与职场文化的关系',
          max_agents: 6,
          status: 'waiting',
        })
        .select()
        .single();

      if (!roundWaitingError && roundWaiting) {
        results.rounds++;

        const waitingParticipants = userAgents.slice(3, 5);
        await createAuditLog(
          'round.created',
          'user',
          waitingParticipants[0].userId,
          'round',
          roundWaiting.id,
          {},
          { name: roundWaiting.name, status: 'waiting' }
        );

        for (const ua of waitingParticipants) {
          await supabaseAdmin.from('round_participants').insert({
            round_id: roundWaiting.id,
            user_id: ua.userId,
            agent_id: ua.agentId,
            role: ua === waitingParticipants[0] ? 'host' : 'participant',
          });

          await createAuditLog(
            'round.joined',
            'user',
            ua.userId,
            'round',
            roundWaiting.id
          );
        }
      }

      // 3.6. 创建进行中的圆桌
      const ongoingTopic = createdTopics[3]; // 短视频话题
      const { data: roundOngoing, error: roundOngoingError } = await supabaseAdmin
        .from('rounds')
        .insert({
          topic_id: ongoingTopic.id,
          name: '短视频时代的注意力经济',
          description: '讨论短视频对注意力经济的影响',
          max_agents: 5,
          status: 'ongoing',
        })
        .select()
        .single();

      if (!roundOngoingError && roundOngoing) {
        results.rounds++;

        const ongoingParticipants = userAgents.slice(5, 8);
        await createAuditLog(
          'round.created',
          'user',
          ongoingParticipants[0].userId,
          'round',
          roundOngoing.id,
          {},
          { name: roundOngoing.name, status: 'ongoing' }
        );

        for (const ua of ongoingParticipants) {
          await supabaseAdmin.from('round_participants').insert({
            round_id: roundOngoing.id,
            user_id: ua.userId,
            agent_id: ua.agentId,
            role: ua === ongoingParticipants[0] ? 'host' : 'participant',
          });

          await createAuditLog(
            'round.joined',
            'user',
            ua.userId,
            'round',
            roundOngoing.id
          );
        }

        // 添加进行中的讨论消息
        const ongoingMessages = [
          '短视频确实在改变我们获取信息的方式，注意力碎片化是最大的挑战。',
          '但短视频也创造了新的就业机会和商业模式。',
          '关键是如何在碎片化和深度思考之间找到平衡。',
        ];

        for (let i = 0; i < Math.min(ongoingMessages.length, ongoingParticipants.length); i++) {
          await supabaseAdmin.from('messages').insert({
            round_id: roundOngoing.id,
            agent_id: ongoingParticipants[i].agentId,
            content: ongoingMessages[i],
            type: 'text',
          });
          results.messages++;
        }
      }
    }

    // 4. 创建演示知遇卡（6张：2 pending, 2 accepted, 2 declined）
    if (userAgents.length >= 4) {
      const pairs = [
        { a: 0, b: 1, score: 85, type: 'cofounder', reason: '科技+商业，互补性强', status: 'accepted' },
        { a: 0, b: 2, score: 72, type: 'advisor', reason: 'AI技术+社会洞察', status: 'pending' },
        { a: 1, b: 3, score: 78, type: 'peer', reason: '商业+娱乐，跨界合作潜力大', status: 'pending' },
        { a: 2, b: 4, score: 68, type: 'peer', reason: '社会+文化，深度思考组合', status: 'declined' },
        { a: 3, b: 5, score: 75, type: 'advisor', reason: '娱乐+生活方式，消费洞察', status: 'declined' },
        { a: 4, b: 6, score: 82, type: 'cofounder', reason: '文化+技术，极致用户体验', status: 'accepted' },
      ];

      const createdMatches: Array<{ id: string; userAId: string; userBId: string; status: string }> = [];

      for (const pair of pairs) {
        const userA = userAgents[pair.a];
        const userB = userAgents[pair.b];

        const { data: matchData, error: matchError } = await supabaseAdmin.from('matches').insert({
          user_a_id: userA.userId,
          user_b_id: userB.userId,
          complementarity_score: pair.score,
          future_generativity: Math.floor(pair.score * 0.9),
          overall_score: pair.score,
          relationship_type: pair.type,
          match_reason: pair.reason,
          complementarity_areas: ['专业互补', '思维互补'],
          status: pair.status,
        }).select().single();

        if (!matchError && matchData) {
          results.matches++;
          createdMatches.push({ id: matchData.id, userAId: userA.userId, userBId: userB.userId, status: pair.status });

          // 添加审计日志
          await createAuditLog(
            'match.generated',
            'user',
            userA.userId,
            'match',
            matchData.id,
            {},
            { relationship_type: pair.type, score: pair.score, status: pair.status }
          );

          // 根据状态添加审计日志
          if (pair.status === 'accepted') {
            await createAuditLog(
              'match.accepted',
              'user',
              userA.userId,
              'match',
              matchData.id
            );
          } else if (pair.status === 'declined') {
            await createAuditLog(
              'match.declined',
              'user',
              userB.userId,
              'match',
              matchData.id
            );
          }
        }
      }

      // 5. 创建演示争鸣层数据（基于已接受的 matches）
      const acceptedMatches = createdMatches.filter(m => m.status === 'accepted');

      for (const match of acceptedMatches) {
        // 争鸣1：创业路演场景（3个高风险问题，有responses和analysis）
        const debateQuestions = [
          { id: 'q1', text: '如果投资人要求你们在3个月内实现MVP，你们如何分工？', risk_level: 'high' },
          { id: 'q2', text: '当产品方向出现分歧时，你们如何达成共识？', risk_level: 'medium' },
          { id: 'q3', text: '面对融资失败的风险，你们有什么备选方案？', risk_level: 'high' },
        ];

        const debateResponses = [
          {
            questionId: 'q1',
            userId: match.userAId,
            answer: '我会负责技术架构和核心算法部分，确保技术可行性；同时我会主导产品设计，协调设计师资源。我们可以并行开发，每周同步进度。',
            confidence: 85,
          },
          {
            questionId: 'q1',
            userId: match.userBId,
            answer: '我建议采用精益创业的方法，先用最小功能集验证核心假设。我来负责商业模式和用户增长部分，技术外包给可信赖的团队。',
            confidence: 78,
          },
          {
            questionId: 'q2',
            userId: match.userAId,
            answer: '我会先听对方的观点，然后提出我的顾虑，最后我们找一个双方都认可的第三方顾问来做最终裁决。',
            confidence: 72,
          },
          {
            questionId: 'q2',
            userId: match.userBId,
            answer: '我认为关键是要区分"原则性问题"和"细节问题"。原则性问题不让步，细节问题可以妥协。',
            confidence: 80,
          },
          {
            questionId: 'q3',
            userId: match.userAId,
            answer: '我们的备选方案是先用自有资金支撑6个月，同时申请政府创业扶持资金和银行贷款。',
            confidence: 75,
          },
          {
            questionId: 'q3',
            userId: match.userBId,
            answer: '我们也可以考虑战略融资，先出让部分股份给产业资本，换取他们的资源和渠道支持。',
            confidence: 82,
          },
        ];

        const debateAnalysis = {
          alignment: 78,
          conflictPotential: 35,
          collaborationScore: 88,
          riskAssessment: {
            directionRisk: 'medium',
            resourceRisk: 'high',
            decisionRisk: 'low',
          },
          strengths: ['技术+商业互补', '都具备危机处理意识', '愿意倾听对方观点'],
          concerns: ['资源规划略显乐观', '分歧处理机制待完善'],
        };

        const { data: debateData, error: debateError } = await supabaseAdmin.from('debates').insert({
          match_id: match.id,
          scenario: '模拟一个创业项目路演场景，考察双方的协作能力和风险承担意识',
          questions: debateQuestions,
          responses: debateResponses,
          analysis: debateAnalysis,
          relationship_suggestion: 'cofounder',
          should_connect: true,
          risk_areas: ['方向分歧', '资源分配', '决策速度'],
          next_steps: ['明确分工', '建立沟通机制', '制定决策流程'],
          status: 'completed',
        }).select().single();

        if (!debateError && debateData) {
          results.debates++;

          await createAuditLog(
            'debate.initiated',
            'user',
            match.userAId,
            'debate',
            debateData.id,
            {},
            { match_id: match.id, relationship_suggestion: 'cofounder', status: 'completed' }
          );

          await createAuditLog(
            'debate.completed',
            'user',
            match.userAId,
            'debate',
            debateData.id,
            {},
            { analysis: debateAnalysis }
          );

          // 6. 创建演示共试层数据
          // 共试1：co_collaboration 类型，pending 状态（已分配但未完成）
          const { data: cotrial1, error: cotrial1Error } = await supabaseAdmin.from('cotrials').insert({
            debate_id: debateData.id,
            task_type: 'co_collaboration',
            task_description: '两人共同完成一个产品需求文档，包括功能规划、用户画像和上线计划',
            task_goal: '验证双方的文档协作能力和思路一致性',
            task_duration: '7天',
            completed: false,
            continued: null,
          }).select().single();

          if (!cotrial1Error && cotrial1) {
            results.cotrials++;

            await createAuditLog(
              'cotrial.assigned',
              'user',
              match.userAId,
              'cotrial',
              cotrial1.id,
              {},
              { debate_id: debateData.id, task_type: 'co_collaboration' }
            );
          }

          // 共试2：co_learning 类型，completed 状态（已完成，有反馈）
          const { data: cotrial2, error: cotrial2Error } = await supabaseAdmin.from('cotrials').insert({
            debate_id: debateData.id,
            task_type: 'co_learning',
            task_description: '共同学习一门在线课程（产品经理必修课），并输出学习笔记',
            task_goal: '验证双方的学习节奏和知识共享方式',
            task_duration: '7天',
            result: '高质量完成了课程学习，双方都提交了详细的笔记，并在关键章节展开了深入讨论',
            completed: true,
            completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            feedback_a: {
              satisfaction: 5,
              comment: '学习效率很高，对方分享的知识正是我欠缺的，很有帮助！',
              would_continue: true,
              rated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            feedback_b: {
              satisfaction: 4,
              comment: '整体不错，但希望对方能更主动一些，不过最终效果还是满意的',
              would_continue: true,
              rated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            continued: true,
          }).select().single();

          if (!cotrial2Error && cotrial2) {
            results.cotrials++;

            await createAuditLog(
              'cotrial.completed',
              'user',
              match.userAId,
              'cotrial',
              cotrial2.id,
              {},
              { result: 'success', satisfaction_a: 5, satisfaction_b: 4 }
            );
          }
        }
      }

      // 争鸣2：文化+技术 cofounder 场景
      const secondAcceptedMatch = acceptedMatches.length > 1 ? acceptedMatches[1] : null;
      if (secondAcceptedMatch) {
        const debate2Questions = [
          { id: 'q1', text: '如何用技术手段传播传统文化？', risk_level: 'medium' },
          { id: 'q2', text: '用户体验和内容深度哪个更重要？', risk_level: 'high' },
          { id: 'q3', text: '如何平衡商业化和文化传承？', risk_level: 'high' },
        ];

        const debate2Responses = [
          {
            questionId: 'q1',
            userId: secondAcceptedMatch.userAId,
            answer: '我建议用AR/VR技术还原历史场景，让年轻人沉浸式体验传统文化的魅力。同时开发互动小游戏增加参与感。',
            confidence: 88,
          },
          {
            questionId: 'q1',
            userId: secondAcceptedMatch.userBId,
            answer: '我认为关键是用好社交媒体平台，用短视频、直播等形式让传统文化"活"起来，走到年轻人中间去。',
            confidence: 82,
          },
          {
            questionId: 'q2',
            userId: secondAcceptedMatch.userAId,
            answer: '两者都重要，但如果必须选一个，我选内容深度。因为好的体验可以迭代，但内容如果空洞，用户会很快流失。',
            confidence: 75,
          },
          {
            questionId: 'q2',
            userId: secondAcceptedMatch.userBId,
            answer: '我同意深度重要，但我认为体验是把内容传递给用户的桥梁。好的UX能让好内容被更多人看到。',
            confidence: 80,
          },
          {
            questionId: 'q3',
            userId: secondAcceptedMatch.userAId,
            answer: '可以采用"文化+旅游"的模式，通过线下活动创造收入，同时用数字内容打造品牌影响力。',
            confidence: 78,
          },
          {
            questionId: 'q3',
            userId: secondAcceptedMatch.userBId,
            answer: '我的思路是先用优质内容建立用户信任，再通过会员制、周边产品等实现商业变现。文化传承本身就是最大的卖点。',
            confidence: 85,
          },
        ];

        const debate2Analysis = {
          alignment: 85,
          conflictPotential: 25,
          collaborationScore: 92,
          riskAssessment: {
            directionRisk: 'low',
            resourceRisk: 'medium',
            decisionRisk: 'low',
          },
          strengths: ['理念高度一致', '互补性强（文化+技术）', '都有商业化思路'],
          concerns: ['执行细节待讨论', '资源投入比例需确认'],
        };

        const { data: debate2, error: debate2Error } = await supabaseAdmin.from('debates').insert({
          match_id: secondAcceptedMatch.id,
          scenario: '模拟一个传统文化数字化创业场景，考察双方的理念契合度和协作能力',
          questions: debate2Questions,
          responses: debate2Responses,
          analysis: debate2Analysis,
          relationship_suggestion: 'cofounder',
          should_connect: true,
          risk_areas: ['内容质量把控', '用户增长策略', '商业化时机'],
          next_steps: ['完成产品原型', '进行用户测试', '制定MVP计划'],
          status: 'completed',
        }).select().single();

        if (!debate2Error && debate2) {
          results.debates++;

          await createAuditLog(
            'debate.initiated',
            'user',
            secondAcceptedMatch.userAId,
            'debate',
            debate2.id,
            {},
            { match_id: secondAcceptedMatch.id, relationship_suggestion: 'cofounder', status: 'completed' }
          );

          await createAuditLog(
            'debate.completed',
            'user',
            secondAcceptedMatch.userAId,
            'debate',
            debate2.id,
            {},
            { analysis: debate2Analysis }
          );

          // 共试3：co_creation 类型，completed 状态
          const { data: cotrial3, error: cotrial3Error } = await supabaseAdmin.from('cotrials').insert({
            debate_id: debate2.id,
            task_type: 'co_creation',
            task_description: '共同创作一篇关于传统文化数字化的知乎回答（2000字以上）',
            task_goal: '验证双方的创意碰撞和文字协作能力',
            task_duration: '7天',
            result: '成功完成了一篇深度回答，获得了500+点赞，评论区反馈积极',
            completed: true,
            completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            feedback_a: {
              satisfaction: 5,
              comment: '太棒了！这次合作让我看到了不同思维碰撞的惊喜，效果超出预期',
              would_continue: true,
              rated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
            feedback_b: {
              satisfaction: 5,
              comment: '对方的洞察力让我印象深刻，期待下次继续合作！',
              would_continue: true,
              rated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
            continued: true,
          }).select().single();

          if (!cotrial3Error && cotrial3) {
            results.cotrials++;

            await createAuditLog(
              'cotrial.completed',
              'user',
              secondAcceptedMatch.userAId,
              'cotrial',
              cotrial3.id,
              {},
              { result: 'success', satisfaction_a: 5, satisfaction_b: 5 }
            );
          }
        }
      }

      // 争鸣3：基于 declined match 的一个历史辩论记录（用于展示 declined 后仍可查看历史）
      const declinedMatches = createdMatches.filter(m => m.status === 'declined');
      if (declinedMatches.length > 0) {
        const declinedMatch = declinedMatches[0];
        const { data: debate3, error: debate3Error } = await supabaseAdmin.from('debates').insert({
          match_id: declinedMatch.id,
          scenario: '模拟一个合作方案讨论场景（该匹配已婉拒）',
          questions: [
            { id: 'q1', text: '你们如何看待对方的专业领域？', risk_level: 'low' },
            { id: 'q2', text: '合作中你们能贡献什么独特价值？', risk_level: 'medium' },
            { id: 'q3', text: '如果出现重大分歧，你们打算如何处理？', risk_level: 'high' },
          ],
          responses: [
            {
              questionId: 'q1',
              userId: declinedMatch.userAId,
              answer: '对方的社会学研究方法很有价值，可以帮助我们更深入理解用户行为。',
              confidence: 70,
            },
            {
              questionId: 'q1',
              userId: declinedMatch.userBId,
              answer: '对方的技术背景很扎实，是我比较欠缺的领域。',
              confidence: 65,
            },
          ],
          analysis: {
            alignment: 55,
            conflictPotential: 65,
            collaborationScore: 45,
            riskAssessment: {
              directionRisk: 'high',
              resourceRisk: 'medium',
              decisionRisk: 'high',
            },
            strengths: ['专业背景互补'],
            concerns: ['价值观差异较大', '决策风格可能冲突', '风险承担意愿不同'],
          },
          relationship_suggestion: 'none',
          should_connect: false,
          risk_areas: ['价值观差异', '决策风格', '风险偏好'],
          next_steps: ['不建议合作'],
          status: 'completed',
        }).select().single();

        if (!debate3Error && debate3) {
          results.debates++;

          await createAuditLog(
            'debate.initiated',
            'user',
            declinedMatch.userAId,
            'debate',
            debate3.id,
            {},
            { match_id: declinedMatch.id, status: 'completed' }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: '演示数据生成成功',
        counts: results,
        // 入口层 Agent 模式配置（运行时状态，不需要数据库存储）
        agentMode: {
          mode: 'agent',
          autoAction: true,
          humanIntervention: false,
          behaviorLogging: true,
        },
      },
    });
  } catch (error) {
    console.error('生成演示数据失败:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SEED_FAILED', message: String(error) } },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - 清理演示数据
// ============================================

export async function DELETE() {
  try {
    // 删除演示用户创建的所有数据
    const { data: demoUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .like('email', '%@demo.local');

    if (demoUsers && demoUsers.length > 0) {
      const userIds = demoUsers.map(u => u.id);

      // 删除演示话题（按标题特征删除）
      await supabaseAdmin.from('topics').delete().like('title', '%AI时代%');
      await supabaseAdmin.from('topics').delete().like('title', '%创业者%');
      await supabaseAdmin.from('topics').delete().like('title', '%996%');
      await supabaseAdmin.from('topics').delete().like('title', '%短视频%');
      await supabaseAdmin.from('topics').delete().like('title', '%传统文化%');

      // 删除演示辩论（按 scenario 特征删除）
      await supabaseAdmin.from('debates').delete().ilike('scenario', '%创业项目路演%');
      await supabaseAdmin.from('debates').delete().ilike('scenario', '%跨界合作%');
      await supabaseAdmin.from('debates').delete().ilike('scenario', '%传统文化数字化%');
      await supabaseAdmin.from('debates').delete().ilike('scenario', '%合作方案讨论%');

      // 删除演示圆桌（按名称特征删除）
      await supabaseAdmin.from('rounds').delete().like('name', '%讨论%');
      await supabaseAdmin.from('rounds').delete().like('name', '%融资之路%');
      await supabaseAdmin.from('rounds').delete().like('name', '%职场文化%');
      await supabaseAdmin.from('rounds').delete().like('name', '%注意力经济%');

      // 删除与演示用户关联的数据（按依赖顺序）
      await supabaseAdmin.from('messages').delete().in('agent_id',
        await supabaseAdmin.from('agents').select('id').in('user_id', userIds).then(res => res.data?.map(a => a.id) || [])
      );
      await supabaseAdmin.from('round_participants').delete().in('user_id', userIds);
      await supabaseAdmin.from('cotrials').delete().in('debate_id',
        await supabaseAdmin.from('debates').select('id').in('match_id',
          await supabaseAdmin.from('matches').select('id').or(`user_a_id.in.(${userIds.join(',')}),user_b_id.in.(${userIds.join(',')})`).then(res => res.data?.map(m => m.id) || [])
        ).then(res => res.data?.map(d => d.id) || [])
      );
      await supabaseAdmin.from('debates').delete().in('match_id',
        await supabaseAdmin.from('matches').select('id').or(`user_a_id.in.(${userIds.join(',')}),user_b_id.in.(${userIds.join(',')})`).then(res => res.data?.map(m => m.id) || [])
      );
      await supabaseAdmin.from('matches').delete().or(`user_a_id.in.(${userIds.join(',')}),user_b_id.in.(${userIds.join(',')})`);
      await supabaseAdmin.from('agents').delete().in('user_id', userIds);
      await supabaseAdmin.from('users').delete().in('id', userIds);
    }

    // 清理审计日志（保留系统级审计）
    await supabaseAdmin.from('audit_logs').delete().like('action', 'round.%');
    await supabaseAdmin.from('audit_logs').delete().like('action', 'match.%');
    await supabaseAdmin.from('audit_logs').delete().like('action', 'debate.%');
    await supabaseAdmin.from('audit_logs').delete().like('action', 'cotrial.%');

    return NextResponse.json({
      success: true,
      data: { message: '演示数据已清理' },
    });
  } catch (error) {
    console.error('清理演示数据失败:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CLEANUP_FAILED', message: String(error) } },
      { status: 500 }
    );
  }
}
