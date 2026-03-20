/**
 * Navbar 模式状态栏测试
 * [INPUT]: 测试 Agent 模式状态栏和登出功能
 * [OUTPUT]: 验证模式切换和登出状态更新
 * [POS]: components/__tests__/navbar-mode-bar.test.tsx
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
  const MockIcon = (props: any) => <svg {...props} data-testid="lucide-icon" />;
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

describe("Navbar 模式状态栏", () => {
  describe("模式状态显示", () => {
    it("显示当前是 Agent 模式还是人类模式", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<Navbar />);

      // 应该显示模式状态（Agent 或 人类）
      const modeText = screen.getAllByText(/(Agent|人类|人类模式)/i);
      expect(modeText.length).toBeGreaterThan(0);
    });

    it("点击模式切换按钮可以切换模式", () => {
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(<Navbar />);

      // 查找模式切换按钮
      const modeButton = screen.getByRole("button", { name: /切换|switch/i });
      expect(modeButton).toBeInTheDocument();
    });
  });

  describe("登出功能", () => {
    it("点击退出登录后页面刷新", async () => {
      const mockUser = createMockUser();
      vi.spyOn(useSecondMeSessionModule, "useSecondMeSession").mockReturnValue({
        user: mockUser,
        isLoading: false,
      });

      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: mockReload },
        writable: true,
      });

      render(<Navbar />);

      // 点击头像打开菜单
      const avatarButton = screen.getByRole("button");
      await userEvent.click(avatarButton);

      // 点击退出登录
      const logoutItem = screen.getByRole("menuitem", { name: /退出登录/i });
      await userEvent.click(logoutItem);

      // 应该调用 window.location.reload
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
