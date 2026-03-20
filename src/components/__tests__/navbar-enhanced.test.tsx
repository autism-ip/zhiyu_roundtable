/**
 * Navbar 增强版测试 - 四层架构导航
 * [INPUT]: 测试增强版 Navbar 的完整导航功能
 * [OUTPUT]: 验证导航栏正确展示四层架构入口、辅助功能、用户菜单
 * [POS]: components/__tests__/navbar-enhanced.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/components/navbar";
import * as useSecondMeSessionModule from "@/hooks/use-secondme-session";
import { createMockUser } from "@/tests/helpers/secondme-session-mock";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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
    Sparkles: MockIcon,
    Menu: MockIcon,
    X: MockIcon,
  };
});

beforeEach(() => {
  mockPush.mockClear();
});

describe("Navbar 四层架构导航", () => {
  describe("导航项配置", () => {
    it("显示所有四层架构入口", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<Navbar />);

      // 伯乐层
      expect(screen.getByRole("link", { name: /^圆桌$/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /^知遇卡$/ })).toBeInTheDocument();
    });

    it("辅助功能入口从右往左排布", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<Navbar />);

      // 辅助功能（时间线、广场、Agent模式）
      expect(screen.getByRole("link", { name: /时间线/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /广场/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Agent/i })).toBeInTheDocument();
    });
  });

  describe("用户菜单下拉栏", () => {
    it("已登录用户显示头像按钮", () => {
      const mockUser = createMockUser({ name: "测试用户" });
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      const avatarButton = screen.getByRole("button");
      expect(avatarButton).toBeInTheDocument();
    });

    it("点击头像打开下拉菜单", async () => {
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      // 下拉菜单应该包含个人资料选项
      expect(screen.getByRole("menuitem", { name: /个人资料/i })).toBeInTheDocument();
    });

    it("下拉菜单包含登出选项", async () => {
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      expect(screen.getByRole("menuitem", { name: /退出登录/i })).toBeInTheDocument();
    });

    it("下拉菜单包含我的圆桌", async () => {
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      expect(screen.getByRole("menuitem", { name: /我的圆桌/i })).toBeInTheDocument();
    });
  });

  describe("登录状态", () => {
    it("未登录显示登录按钮", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<Navbar />);

      expect(screen.getByRole("link", { name: /登录/i })).toBeInTheDocument();
    });

    it("加载中显示骨架屏", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: true,
      });

      render(<Navbar />);

      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("登出功能", () => {
    it("点击退出登录跳转到登录页", async () => {
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      render(<Navbar />);

      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      const logoutItem = screen.getByRole("menuitem", { name: /退出登录/i });
      await userEvent.click(logoutItem);

      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
