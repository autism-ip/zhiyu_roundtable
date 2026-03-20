# 话题表知乎字段扩展迁移

> **迁移ID**: 20240320_topic_zhihu_fields
> **执行时间**: 2026-03-20
> **状态**: 已完成

## 变更内容

| 字段 | 类型 | 默认值 | 约束 | 说明 |
|------|------|--------|------|------|
| `topic_source` | TEXT | `'manual'` | IN ('manual', 'zhihu_billboard', 'zhihu_search') | 话题来源 |
| `heat_score` | INTEGER | `0` | >= 0 | 知乎热度分 |
| `zhihu_rank` | INTEGER | `0` | >= 0 | 知乎榜单排名，0表示未上榜 |

## 索引变更

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `topics_zhihu_id_key` | zhihu_id | UNIQUE (WHERE NOT NULL) | 知乎ID唯一索引 |
| `topics_topic_source_idx` | topic_source | B-Tree | 来源字段索引 |
| `topics_heat_score_idx` | heat_score | B-Tree (DESC) | 热度分降序索引 |
| `topics_zhihu_rank_idx` | zhihu_rank | B-Tree (WHERE > 0) | 榜单排名索引（仅已上榜） |

## 业务含义

### topic_source 枚举值

| 值 | 说明 | 使用场景 |
|----|------|----------|
| `manual` | 手动创建 | 用户在平台上手动创建的话题 |
| `zhihu_billboard` | 知乎热榜 | 从知乎热榜API导入的话题 |
| `zhihu_search` | 知乎搜索 | 从知乎搜索结果导入的话题 |

### heat_score 热度分

- 范围: 0 - 无上限
- 来源: 知乎API返回的热度值
- 用途: 排序、筛选热门话题

### zhihu_rank 榜单排名

- 0: 未上榜
- 1-50: 热榜排名
- 用途: 标识话题在知乎热榜的位置

## 回滚

如需回滚此迁移，执行以下SQL:

```sql
-- 删除索引
DROP INDEX IF EXISTS "public"."topics_zhihu_rank_idx";
DROP INDEX IF EXISTS "public"."topics_heat_score_idx";
DROP INDEX IF EXISTS "public"."topics_topic_source_idx";
DROP INDEX IF EXISTS "public"."topics_zhihu_id_key";

-- 删除列
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "zhihu_rank";
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "heat_score";
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "topic_source";
```

## 验证

迁移执行后，以下SQL应返回成功:

```sql
-- 验证列存在
SELECT column_name FROM information_schema.columns
WHERE table_name = 'topics'
AND column_name IN ('topic_source', 'heat_score', 'zhihu_rank');
```

## 相关文件

- 迁移SQL: `supabase/migrations/20240320_topic_zhihu_fields.sql`
- 类型定义: `src/lib/supabase/types.ts` (DbTopic)
- 客户端类型: `src/lib/supabase/client.ts` (Database['public']['Tables']['topics'])
- 服务层: `src/lib/topic/topic-service.ts`
- 测试: `src/lib/topic/__tests__/topic-extensions.test.ts`
