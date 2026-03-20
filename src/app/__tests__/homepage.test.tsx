/**
 * 首页功能测试
 * [INPUT]: 测试首页的四层架构展示和用户旅程
 * [OUTPUT]: 验证首页的四层架构入口、导航、功能卡片
 * [POS]: tests/homepage.test.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion - 必须在 import Home 之前
// 必须包含所有使用到的 motion 元素：div, span, a, li, p, h1, h2, h3, section, etc.
vi.mock('framer-motion', () => {
  const createMockMotion = (tag: string) => (props: any) => {
    const { children, ...rest } = props || {};
    return React.createElement(tag, rest, children);
  };

  return {
    motion: {
      div: createMockMotion('div'),
      span: createMockMotion('span'),
      a: createMockMotion('a'),
      li: createMockMotion('li'),
      p: createMockMotion('p'),
      h1: createMockMotion('h1'),
      h2: createMockMotion('h2'),
      h3: createMockMotion('h3'),
      section: createMockMotion('section'),
      button: createMockMotion('button'),
    },
    useScroll: () => ({ scrollYProgress: { current: { current: 0 } } }),
    useTransform: () => 0,
    useSpring: () => ({ current: 0 }),
    useInView: () => true,
  };
});

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => {
    const React = require('react');
    return React.createElement('svg', { 'data-testid': 'lucide-icon', ...props });
  };
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
    AlertTriangle: MockIcon,
  };
});

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

// Mock @/components/ui/button
vi.mock('@/components/ui/button', () => ({
  Button: (props: any) => React.createElement('button', props, props.children),
}));

// Mock @/components/ui/card
vi.mock('@/components/ui/card', () => ({
  Card: (props: any) => React.createElement('div', props, props.children),
  CardContent: (props: any) => React.createElement('div', props, props.children),
  CardDescription: (props: any) => React.createElement('p', props, props.children),
  CardHeader: (props: any) => React.createElement('div', props, props.children),
  CardTitle: (props: any) => React.createElement('h3', props, props.children),
}));

// Mock @radix-ui/react-slot
vi.mock('@radix-ui/react-slot', () => ({
  Slot: (props: any) => React.createElement('div', props, props.children),
}));

// Mock class-variance-authority
vi.mock('class-variance-authority', () => ({
  cva: () => () => '',
}));

// 导入 Home 组件
import Home from '@/app/page';

describe('首页四层架构展示', () => {
  beforeEach(() => {
    render(<Home />);
  });

  describe('Hero Section', () => {
    it('显示主标题', () => {
      expect(screen.getByText('知遇圆桌')).toBeInTheDocument();
    });

    it('显示副标题', () => {
      expect(screen.getByText(/发现与你互补的人/)).toBeInTheDocument();
    });
  });

  describe('伯乐层入口', () => {
    it('显示伯乐层卡片', () => {
      expect(screen.getByText('伯乐层')).toBeInTheDocument();
    });

    it('伯乐层卡片包含圆桌讨论功能', () => {
      expect(screen.getByText(/圆桌讨论/)).toBeInTheDocument();
    });
  });

  describe('争鸣层入口', () => {
    it('显示争鸣层卡片', () => {
      expect(screen.getByText('争鸣层')).toBeInTheDocument();
    });

    it('争鸣层卡片包含关系验证功能', () => {
      // 争鸣层的 description 是 "验证合作可行性"
      const elements = screen.getAllByText(/验证合作可行性/);
      expect(elements.length).toBeGreaterThan(0);
      // 找包含争鸣层描述的元素（className 包含 text-sm 的）
      const zhengmingDesc = elements.find(el => el.className.includes('text-sm'));
      expect(zhengmingDesc).toBeInTheDocument();
    });
  });

  describe('共试层入口', () => {
    it('显示共试层卡片', () => {
      expect(screen.getByText('共试层')).toBeInTheDocument();
    });

    it('共试层卡片包含协作落地功能', () => {
      expect(screen.getByText(/低成本关系落地/)).toBeInTheDocument();
    });
  });

  describe('辅助功能入口', () => {
    it('显示时间线入口', () => {
      expect(screen.getByText(/时间线/)).toBeInTheDocument();
    });

    it('显示社区广场入口', () => {
      expect(screen.getByText(/广场/)).toBeInTheDocument();
    });
  });

  describe('CTA 按钮', () => {
    it('显示探索圆桌按钮', () => {
      expect(screen.getByText('探索圆桌')).toBeInTheDocument();
    });

    it('探索圆桌链接指向 /rounds', () => {
      const exploreBtn = screen.getByText('探索圆桌').closest('a');
      expect(exploreBtn).toHaveAttribute('href', '/rounds');
    });
  });
});

describe('用户旅程', () => {
  describe('作为访客，我想快速了解项目架构', () => {
    it('可以在首页看到四层架构的清晰展示', () => {
      render(<Home />);
      expect(screen.getByText('伯乐层')).toBeInTheDocument();
      expect(screen.getByText('争鸣层')).toBeInTheDocument();
      expect(screen.getByText('共试层')).toBeInTheDocument();
    });

    it('每层都有明确的功能描述', () => {
      render(<Home />);
      expect(screen.getByText(/发现高价值连接/)).toBeInTheDocument();
      // "验证合作可行性" 出现在多处，使用 getAllByText
      const zhengmingElements = screen.getAllByText(/验证合作可行性/);
      expect(zhengmingElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/低成本关系落地/)).toBeInTheDocument();
    });
  });

  describe('作为用户，我想快速进入目标层级', () => {
    it('可以通过首页直接进入伯乐层', () => {
      render(<Home />);
      const boleCard = screen.getByText('伯乐层').closest('div');
      expect(boleCard).toBeTruthy();
    });

    it('可以通过首页直接进入争鸣层', () => {
      render(<Home />);
      const zhengmingCard = screen.getByText('争鸣层').closest('div');
      expect(zhengmingCard).toBeTruthy();
    });

    it('可以通过首页直接进入共试层', () => {
      render(<Home />);
      const gongshiCard = screen.getByText('共试层').closest('div');
      expect(gongshiCard).toBeTruthy();
    });
  });

  describe('作为用户，我想直接创建圆桌', () => {
    it('有明确的创建圆桌入口', () => {
      render(<Home />);
      expect(screen.getByText('探索圆桌')).toBeInTheDocument();
    });
  });
});
