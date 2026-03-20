/**
 * Navbar 组件测试
 * [INPUT]: 依赖 useSecondMeSession hook、UI 组件
 * [OUTPUT]: 验证 Navbar 在 authenticated/unauthenticated/loading 状态下的渲染
 * [POS]: components/navbar.test.tsx - Navbar 组件的 TDD 测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import * as useSecondMeSessionModule from "@/hooks/use-secondme-session";
import { createMockSession, createMockUser } from "@/tests/helpers/secondme-session-mock";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <svg data-testid="lucide-icon" {...props} />;
  return {
    Users: MockIcon,
    MessageSquare: MockIcon,
    User: MockIcon,
    LogOut: MockIcon,
    Clock: MockIcon,
    Square: MockIcon,
    Bot: MockIcon,
  };
});

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  AvatarImage: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DropdownMenuContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => <div role="menuitem" {...props}>{children}</div>,
  DropdownMenuSeparator: (props: any) => <div role="separator" {...props} />,
  DropdownMenuTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock cookie
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie") || {
  value: "",
  writable: true,
  configurable: true,
};

beforeEach(() => {
  mockPush.mockClear();
  // Reset cookie mock
  Object.defineProperty(document, "cookie", {
    value: "",
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Restore original cookie descriptor
  Object.defineProperty(document, "cookie", {
    value: originalCookieDescriptor.value,
    writable: originalCookieDescriptor.writable,
    configurable: originalCookieDescriptor.configurable,
  });
});

describe("Navbar 组件", () => {
  describe("认证状态渲染", () => {
    it("Loading 状态 - 显示骨架屏", () => {
      // Arrange - isLoading 为 true 时显示骨架屏
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: true,
      });

      // Act
      render(<Navbar />);

      // Assert - 检查骨架屏元素存在
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("Authenticated 状态 - 显示用户头像按钮", () => {
      // Arrange
      const mockUser = createMockUser({
        name: "测试用户",
        email: "test@example.com",
      });
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert - 检查用户菜单触发按钮存在（头像按钮）
      const avatarButton = screen.getByRole("button");
      expect(avatarButton).toBeInTheDocument();
    });

    it("Unauthenticated 状态 - 显示登录按钮", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      const loginButton = screen.getByRole("link", { name: /登录/i });
      expect(loginButton).toBeInTheDocument();
    });
  });

  describe("用户信息渲染", () => {
    it("显示正确的用户名首字母作为头像 fallback", () => {
      // Arrange
      const mockUser = createMockUser({ name: "张三" });
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert - AvatarFallback 应该显示 name 的首字母
      // 注意：在 jsdom 环境中，DropdownMenu 可能不会完全展开，所以我们验证渲染的fallback
      const avatarFallback = document.querySelector(".rounded-full span:last-child");
      expect(avatarFallback?.textContent).toBe("张");
    });

    it("不显示用户名时显示默认 U", () => {
      // Arrange - 创建没有 name 的用户
      const mockUser = createMockUser({ name: "" });
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert - 默认 fallback 应该是 "U"
      const avatarFallback = document.querySelector(".rounded-full span:last-child");
      expect(avatarFallback?.textContent).toBe("U");
    });
  });

  describe("登出功能", () => {
    it("点击退出登录调用 router.push 跳转到 /login", async () => {
      // Arrange
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      // Act - 点击头像打开菜单
      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      // 点击退出登录 menuitem
      const logoutItem = screen.getByRole("menuitem", { name: /退出登录/i });
      await userEvent.click(logoutItem);

      // Assert - 验证 router.push 被调用跳转到登录页
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  describe("导航链接", () => {
    it("显示圆桌链接", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      expect(screen.getByRole("link", { name: "圆桌" })).toHaveAttribute("href", "/rounds");
    });

    it("显示知遇卡链接", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      expect(screen.getByRole("link", { name: "知遇卡" })).toHaveAttribute("href", "/matches");
    });

    it("显示时间线链接", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      expect(screen.getByRole("link", { name: "时间线" })).toHaveAttribute("href", "/timeline");
    });

    it("显示广场链接", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      expect(screen.getByRole("link", { name: "广场" })).toHaveAttribute("href", "/square");
    });

    it("显示Agent模式链接", () => {
      // Arrange
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      // Act
      render(<Navbar />);

      // Assert
      expect(screen.getByRole("link", { name: "Agent" })).toHaveAttribute("href", "/agent-mode");
    });
  });

  describe("登出链接存在于下拉菜单", () => {
    it("登录后下拉菜单包含退出登录选项", async () => {
      // Arrange
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      // Act - 打开下拉菜单
      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      // Assert - 退出登录选项存在
      expect(screen.getByRole("menuitem", { name: /退出登录/i })).toBeInTheDocument();
    });
  });
});
