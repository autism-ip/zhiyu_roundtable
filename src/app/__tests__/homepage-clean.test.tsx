/**
 * 首页清理测试
 * [INPUT]: 测试首页辅助功能区和创建Agent按钮已删除
 * [OUTPUT]: 验证首页不包含这些元素
 * [POS]: app/__tests__/homepage-clean.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

// Mock framer-motion
vi.mock("framer-motion", () => {
  const mockMotion = {
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  };
  return {
    motion: mockMotion,
    useScroll: () => ({ scrollYProgress: { current: { current: 0 } } }),
    useTransform: () => 0,
    useSpring: () => ({ current: 0 }),
    useInView: () => true,
  };
});

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <svg {...props} data-testid="lucide-icon" />;
  return {
    Telescope: MockIcon,
    MessageSquare: MockIcon,
    Handshake: MockIcon,
    Sparkles: MockIcon,
    ArrowRight: MockIcon,
    Heart: MockIcon,
    Quote: MockIcon,
    Clock: MockIcon,
    Users: MockIcon,
    User: MockIcon,
    Bot: MockIcon,
  };
});

describe("首页清理验证", () => {
  describe("辅助功能区已删除", () => {
    it("首页不包含时间线入口（应在Navbar）", () => {
      render(<Home />);
      // 首页不应该有时间线链接
      const timelineLinks = screen.queryAllByRole("link", { name: /时间线/i });
      // 允许0个（已删除）或只在导航中存在，但首页主体不应有
      // 这里检查的是首页主体区域
      const mainContent = document.querySelector("main") || document.body;
      const timelineInMain = Array.from(mainContent.querySelectorAll("a")).filter(a =>
        a.textContent?.includes("时间线")
      );
      expect(timelineInMain.length).toBe(0);
    });

    it("首页不包含广场入口（应在Navbar）", () => {
      render(<Home />);
      const mainContent = document.querySelector("main") || document.body;
      const squareInMain = Array.from(mainContent.querySelectorAll("a")).filter(a =>
        a.textContent?.includes("广场")
      );
      expect(squareInMain.length).toBe(0);
    });

    it("首页不包含创建Agent按钮", () => {
      render(<Home />);
      // 首页不应该有"创建 Agent"文字
      const createAgentLinks = screen.queryAllByText(/创建.*Agent/i);
      expect(createAgentLinks.length).toBe(0);
    });
  });

  describe("核心功能保留", () => {
    it("首页保留探索圆桌按钮", () => {
      render(<Home />);
      expect(screen.getByText("探索圆桌")).toBeInTheDocument();
    });

    it("首页保留四层架构展示", () => {
      render(<Home />);
      expect(screen.getByText("伯乐层")).toBeInTheDocument();
      expect(screen.getByText("争鸣层")).toBeInTheDocument();
      expect(screen.getByText("共试层")).toBeInTheDocument();
    });
  });
});
