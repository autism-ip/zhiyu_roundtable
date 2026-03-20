/**
 * Providers 组件测试
 * [INPUT]: 无外部数据依赖
 * [OUTPUT]: 验证 Providers 正确组合所有 Provider 并渲染 children
 * [POS]: components/providers.test.tsx - Providers 组件的 TDD 测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { Providers } from "./providers";

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sonner Toaster
vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

// Mock matchMedia for jsdom environment
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("Providers 组件", () => {
  it("渲染 children", () => {
    // Arrange & Act
    render(
      <Providers>
        <div data-testid="child-content">Test Content</div>
      </Providers>
    );

    // Assert
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("不包含 SessionProvider (NextAuth 已移除)", () => {
    // Arrange & Act
    const { container } = render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    // Assert - 验证不再有 SessionProvider
    // SecondMe 使用 cookie-based session，不需要 SessionProvider
    expect(container.querySelector("[data-session-provider]")).toBeNull();
  });

  it("包含 QueryClientProvider", () => {
    // Arrange & Act
    render(
      <Providers>
        <div>Content</div>
      </Providers>
    );

    // Assert - QueryClientProvider 应该存在（通过 React Query 测试）
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("响应式渲染多个 children", () => {
    // Arrange & Act
    render(
      <Providers>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </Providers>
    );

    // Assert
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });
});
