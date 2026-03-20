/**
 * 登录页清理测试
 * [INPUT]: 测试 Google 登录按钮已删除
 * [OUTPUT]: 验证登录页只有 SecondMe 登录
 * [POS]: app/__tests__/login-clean.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/login/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <svg {...props} data-testid="lucide-icon" />;
  return {
    Sparkles: MockIcon,
    ArrowLeft: MockIcon,
    MessageCircle: MockIcon,
  };
});

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  CardFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

describe("登录页清理验证", () => {
  describe("Google登录已删除", () => {
    it("登录页不包含Google登录按钮", () => {
      render(<LoginPage />);
      const googleButtons = screen.queryAllByText(/Google/i);
      expect(googleButtons.length).toBe(0);
    });

    it("登录页不包含Chrome登录按钮", () => {
      render(<LoginPage />);
      const chromeButtons = screen.queryAllByText(/Chrome/i);
      expect(chromeButtons.length).toBe(0);
    });
  });

  describe("SecondMe登录保留", () => {
    it("保留SecondMe登录按钮", () => {
      render(<LoginPage />);
      expect(screen.getByText(/SecondMe/i)).toBeInTheDocument();
    });

    it("保留登录标题", () => {
      render(<LoginPage />);
      expect(screen.getByText("登录")).toBeInTheDocument();
    });
  });
});
