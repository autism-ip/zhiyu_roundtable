/**
 * 知乎API常量配置
 * [INPUT]: 环境变量
 * [OUTPUT]: 提供圈子ID、配置常量
 * [POS]: lib/zhihu/constants.ts - 知乎常量
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const ZHIHU_RING_IDS = {
  国产剧观察团: '2001009660925334090',
  影视观察团: '2015023739549529606',
} as const

export const ZHIHU_CONFIG = {
  // API域名
  DOMAIN: 'https://openapi.zhihu.com',
  // 默认热榜获取数量
  DEFAULT_TOP_COUNT: 20,
  // 默认发布时间范围（小时）
  DEFAULT_PUBLISH_IN_HOURS: 48,
  // 搜索限流：每秒请求数
  SEARCH_RATE_LIMIT: 1,
  // 搜索限流：总请求量
  SEARCH_TOTAL_LIMIT: 1000,
} as const
