/**
 * 知乎API类型定义
 * [INPUT]: 知乎API响应结构
 * [OUTPUT]: 提供ZhihuBillBoardItem, ZhihuRingContent等类型
 * [POS]: lib/zhihu/types.ts - 知乎数据类型
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface ZhihuBillboardItem {
  token: string
  title: string
  body: string
  type: 'QUESTION' | 'ANSWER'
  heat_score: number
  published_time: number
  published_time_str: string
  link_url: string
  answers?: ZhihuAnswer[]
  interaction_info: ZhihuInteraction
}

export interface ZhihuAnswer {
  token: string
  body: string
  vote_up_count: number
  comment_count: number
  published_time: number
  link_url: string
  type: 'ANSWER'
  interaction_info: ZhihuInteraction
}

export interface ZhihuInteraction {
  vote_up_count: number
  like_count: number
  comment_count: number
  favorites: number
  pv_count: number
}

export interface ZhihuRingInfo {
  ring_id: string
  ring_name: string
  ring_desc: string
  ring_avatar: string
  membership_num: number
  discussion_num: number
}

export interface ZhihuRingContent {
  libian: string
  content: string
  author_name: string
  images?: string[]
  publish_time: number
  like_num: number
  comment_num: number
  share_num: number
  fav_num: number
  comments: ZhihuComment[]
}

export interface ZhihuComment {
  comment_id: number
  content: string
  author_name: string
  author_token: string
  like_count: number
  reply_count: number
  publish_time: number
}

export interface ZhihuSearchItem {
  title: string
  content_type: string
  content_id: string
  content_text: string
  url: string
  comment_count: number
  vote_up_count: number
  author_name: string
  author_avatar: string
  author_badge: string
  author_badge_text: string
  edit_time: number
  comment_info_list: Array<{ content: string }>
  authority_level: string
}
