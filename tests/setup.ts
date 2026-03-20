/**
 * [INPUT]: 依赖 @testing-library/jest-dom
 * [OUTPUT]: 对外提供测试环境初始化
 * [POS]: tests/setup.ts - 测试环境设置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import '@testing-library/jest-dom';

// ===========================================
// Mock localStorage for jsdom environment
// ===========================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => { store[key] = value; },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; },
    get length(): number { return Object.keys(store).length; },
    key: (index: number): string | null => Object.keys(store)[index] || null,
  };
})();

// Mock localStorage in all test environments
beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  localStorageMock.clear();
});

// Mock Supabase environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Global test utilities
global.describeBDD = (feature: string, scenarios: () => void) => {
  describe(`[BDD] ${feature}`, scenarios);
};

global.itScenario = (scenario: string, test: () => void | Promise<void>) => {
  it(`Scenario: ${scenario}`, test);
};

// Extend expect matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeWithinRange(min: number, max: number): void;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () =>
        `expected ${received} to be within range [${min}, ${max}]`,
      pass,
    };
  },
});
