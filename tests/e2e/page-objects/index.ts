/**
 * Page Objects 导出
 * [INPUT]: 依赖各个 Page Object 类
 * [OUTPUT]: 对外统一导出所有 Page Objects
 * [POS]: tests/e2e/page-objects/index.ts - POM 导出模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export { HomePage } from './HomePage';
export { LoginPage } from './LoginPage';
export { RoundsPage } from './RoundsPage';
export { MatchesPage } from './MatchesPage';
export { ProfilePage } from './ProfilePage';
export { SquarePage } from './SquarePage';
