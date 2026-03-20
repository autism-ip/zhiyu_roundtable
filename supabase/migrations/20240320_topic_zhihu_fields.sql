-- =============================================================================
-- 话题表添加知乎相关字段
-- 迁移ID: 20240320_topic_zhihu_fields
-- 创建时间: 2026-03-20
-- 作者: Claude Code (TDD Workflow)
-- 描述: 为topics表添加知乎扩展字段，包括话题来源、热度分和榜单排名
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 添加话题来源字段
-- -----------------------------------------------------------------------------
ALTER TABLE "public"."topics"
ADD COLUMN IF NOT EXISTS "topic_source" TEXT DEFAULT 'manual'
CHECK ("topic_source" IN ('manual', 'zhihu_billboard', 'zhihu_search'));

COMMENT ON COLUMN "public"."topics"."topic_source" IS
'话题来源: manual(手动创建), zhihu_billboard(知乎热榜), zhihu_search(知乎搜索)';

-- -----------------------------------------------------------------------------
-- 2. 添加知乎热度分字段
-- -----------------------------------------------------------------------------
ALTER TABLE "public"."topics"
ADD COLUMN IF NOT EXISTS "heat_score" INTEGER DEFAULT 0 CHECK ("heat_score" >= 0);

COMMENT ON COLUMN "public"."topics"."heat_score" IS '知乎热度分，数值越高表示越热';

-- -----------------------------------------------------------------------------
-- 3. 添加知乎榜单排名字段
-- -----------------------------------------------------------------------------
ALTER TABLE "public"."topics"
ADD COLUMN IF NOT EXISTS "zhihu_rank" INTEGER DEFAULT 0 CHECK ("zhihu_rank" >= 0);

COMMENT ON COLUMN "public"."topics"."zhihu_rank" IS '知乎榜单排名，0表示未上榜';

-- -----------------------------------------------------------------------------
-- 4. 为 zhihu_id 添加唯一索引（如果话题来源是知乎）
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'topics_zhihu_id_key'
  ) THEN
    -- 首先移除旧的非唯一索引（如果存在）
    DROP INDEX IF EXISTS "public"."topics_zhihu_id_idx";

    -- 创建唯一索引
    CREATE UNIQUE INDEX "topics_zhihu_id_key"
    ON "public"."topics" ("zhihu_id")
    WHERE "zhihu_id" IS NOT NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. 创建索引优化查询性能
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "topics_topic_source_idx"
ON "public"."topics" ("topic_source");

CREATE INDEX IF NOT EXISTS "topics_heat_score_idx"
ON "public"."topics" ("heat_score" DESC);

CREATE INDEX IF NOT EXISTS "topics_zhihu_rank_idx"
ON "public"."topics" ("zhihu_rank")
WHERE "zhihu_rank" > 0;

-- -----------------------------------------------------------------------------
-- 验证迁移
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- 验证列存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics'
    AND column_name = 'topic_source'
  ) THEN
    RAISE EXCEPTION '迁移失败: topic_source 列未创建';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics'
    AND column_name = 'heat_score'
  ) THEN
    RAISE EXCEPTION '迁移失败: heat_score 列未创建';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'topics'
    AND column_name = 'zhihu_rank'
  ) THEN
    RAISE EXCEPTION '迁移失败: zhihu_rank 列未创建';
  END IF;

  RAISE NOTICE '迁移验证通过: 所有字段已成功创建';
END $$;

-- =============================================================================
-- 回滚脚本 (如需回滚，执行以下SQL)
-- =============================================================================
/*
-- 删除索引
DROP INDEX IF EXISTS "public"."topics_zhihu_rank_idx";
DROP INDEX IF EXISTS "public"."topics_heat_score_idx";
DROP INDEX IF EXISTS "public"."topics_topic_source_idx";
DROP INDEX IF EXISTS "public"."topics_zhihu_id_key";

-- 删除列
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "zhihu_rank";
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "heat_score";
ALTER TABLE "public"."topics" DROP COLUMN IF EXISTS "topic_source";
*/
