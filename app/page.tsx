/**
 * 知遇圆桌 - 首页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件
 * [OUTPUT]: 对外提供首页
 * [POS]: app/page.tsx - 主入口页面
 * [PROTOCOL]: 变更时更新此头部
 */

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Telescope,
  MessageSquare,
  Handshake,
  Sparkles,
  ArrowRight,
  Heart,
  Quote,
} from "lucide-react";

// ============================================================
// 新中式奢华书院风 - 强化版
// ============================================================

const colors = {
  // 提亮背景 - 温暖米色基调
  background: "#1A1918",
  paper: "#242220",
  ink: "#F0EBE3",
  inkLight: "#C4BEAF",
  inkMuted: "#7A756B",
  gold: "#D4B872",
  goldLight: "#F5ECD0",
  amber: "#D4A86A",
  daiQing: "#8AABAD",
  zhuHong: "#E07A6A",
  jiangZi: "#AB7A88",
};

// ============================================================
// 背景层 - 强化粒子和装饰
// ============================================================

function InkFabricBg() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number; color: string }[]>([]);
  const [lines, setLines] = useState<{ id: number; x: number; y: number; length: number; duration: number; color: string }[]>([]);
  const [circles, setCircles] = useState<{ id: number; x: number; y: number; size: number; duration: number; color: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    // 更多粒子 - 60个
    const particleColors = [colors.gold, colors.goldLight, colors.amber, colors.daiQing, colors.zhuHong];
    const newParticles = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }));
    setParticles(newParticles);

    // 装饰线条 - 增加到12条
    const lineColors = [colors.gold, colors.daiQing, colors.zhuHong, colors.jiangZi];
    const newLines = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      length: Math.random() * 150 + 80,
      duration: Math.random() * 12 + 18,
      color: lineColors[Math.floor(Math.random() * lineColors.length)],
    }));
    setLines(newLines);

    // 装饰圆圈 - 新增
    const newCircles = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 200 + 100,
      duration: Math.random() * 15 + 20,
      color: [colors.gold, colors.daiQing, colors.zhuHong][Math.floor(Math.random() * 3)],
    }));
    setCircles(newCircles);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ backgroundColor: colors.background }}>
      {/* 纹理 */}
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* 强化的墨韵晕染 - 更明显 */}
      <motion.div
        className="absolute -left-48 -top-48 w-[800px] h-[800px] rounded-full"
        style={{ background: `radial-gradient(circle, ${colors.ink} 0%, transparent 60%)`, filter: 'blur(120px)' }}
        animate={{ opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-64 top-1/3 w-[700px] h-[700px] rounded-full"
        style={{ background: `radial-gradient(circle, ${colors.gold} 0%, transparent 50%)`, filter: 'blur(100px)' }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute left-1/3 -bottom-56 w-[800px] h-[600px] rounded-full"
        style={{ background: `radial-gradient(circle, ${colors.daiQing} 0%, transparent 60%)`, filter: 'blur(100px)' }}
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 7, repeat: Infinity, delay: 2 }}
      />
      <motion.div
        className="absolute right-1/4 -bottom-48 w-[600px] h-[600px] rounded-full"
        style={{ background: `radial-gradient(circle, ${colors.zhuHong} 0%, transparent 50%)`, filter: 'blur(80px)' }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, delay: 3 }}
      />

      {/* 强化粒子 - 更大的粒子，更明显 */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            y: [0, -60, 0],
            opacity: [0.15, 0.8, 0.15],
            scale: [1, 1.8, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 装饰线条 - 水平漂移 */}
      {lines.map((line) => (
        <motion.div
          key={`line-${line.id}`}
          className="absolute h-px"
          style={{
            left: `${line.x}%`,
            top: `${line.y}%`,
            width: line.length,
            background: `linear-gradient(to right, transparent, ${line.color}, transparent)`,
            opacity: 0.25,
          }}
          animate={{
            x: [0, 40, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: line.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 装饰圆圈 - 新增 */}
      {circles.map((circle) => (
        <motion.div
          key={`circle-${circle.id}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            width: circle.size,
            height: circle.size,
            border: `1px solid ${circle.color}`,
            opacity: 0.08,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.04, 0.12, 0.04],
          }}
          transition={{
            duration: circle.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 织线 */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colors.ink} 2px, ${colors.ink} 3px)` }} />

      {/* 更明显的装饰斜线 */}
      <svg className="absolute top-16 right-16 w-56 h-56 opacity-10" viewBox="0 0 100 100">
        <line x1="0" y1="0" x2="100" y2="100" stroke={colors.gold} strokeWidth="0.8" />
        <line x1="20" y1="0" x2="100" y2="80" stroke={colors.gold} strokeWidth="0.6" />
        <line x1="0" y1="20" x2="80" y2="100" stroke={colors.gold} strokeWidth="0.6" />
        <line x1="40" y1="0" x2="100" y2="60" stroke={colors.gold} strokeWidth="0.4" />
        <line x1="0" y1="40" x2="60" y2="100" stroke={colors.gold} strokeWidth="0.4" />
      </svg>
      <svg className="absolute bottom-16 left-16 w-48 h-48 opacity-08" viewBox="0 0 100 100">
        <line x1="0" y1="100" x2="100" y2="0" stroke={colors.daiQing} strokeWidth="0.8" />
        <line x1="0" y1="80" x2="80" y2="0" stroke={colors.daiQing} strokeWidth="0.6" />
        <line x1="20" y1="100" x2="100" y2="20" stroke={colors.daiQing} strokeWidth="0.4" />
      </svg>
    </div>
  );
}

// ============================================================
// 装饰线条
// ============================================================

function DecorativeLine({ className = "" }: { className?: string }) {
  return <div className={`relative ${className}`}><div className="absolute" style={{ width: "100%", height: "1px", background: `linear-gradient(to right, transparent, ${colors.gold}50, transparent)` }} /></div>;
}

// ============================================================
// 古典引言
// ============================================================

function ClassicalQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-8 border-l-2" style={{ borderColor: `${colors.gold}50` }}>
      <Quote className="absolute -left-4 top-0 w-6 h-6 -rotate-12" style={{ color: colors.gold, opacity: 0.4 }} />
      <p className="text-base leading-relaxed italic" style={{ color: colors.inkLight }}>{children}</p>
    </div>
  );
}

// ============================================================
// 书法标题
// ============================================================

function CalligraphyTitle({ children, className = "", size = "lg" }: { children: React.ReactNode; className?: string; size?: "sm" | "md" | "lg" | "xl" | "hero" }) {
  const sizeClasses = { sm: "text-2xl md:text-3xl", md: "text-3xl md:text-4xl", lg: "text-4xl md:text-5xl lg:text-6xl", xl: "text-5xl md:text-6xl lg:text-7xl", hero: "text-6xl md:text-7xl lg:text-8xl" };
  return <h1 className={`${sizeClasses[size]} font-serif tracking-[0.12em] leading-[1.1] ${className}`} style={{ color: colors.ink }}>{children}</h1>;
}

// ============================================================
// 动画变体
// ============================================================

const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeInUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } };
const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } } };
const cardVariants = { hidden: { opacity: 0, y: 50, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

// ============================================================
// 功能卡片 - 修复悬停效果和点击
// ============================================================

function FeatureCard({ icon: Icon, title, description, features, accentColor, delay = 0, onClick }: { icon: React.ElementType; title: string; description: string; features: string[]; accentColor: string; delay?: number; onClick?: () => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div ref={ref} variants={cardVariants} initial="hidden" animate={isInView ? "visible" : "hidden"} transition={{ delay }}>
      <div
        onClick={onClick}
        className="h-full relative overflow-hidden group cursor-pointer transition-all duration-500 hover:-translate-y-2"
        style={{ backgroundColor: colors.paper, borderColor: `${accentColor}30`, borderRadius: '12px', borderWidth: '1px' }}
      >
        {/* 悬浮光晕 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}20 0%, transparent 60%)` }} />
        {/* 悬浮边框 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg" style={{ border: `1px solid ${accentColor}50` }} />
        {/* 顶部光条 */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative p-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
              <Icon className="w-6 h-6" style={{ color: accentColor }} />
            </motion.div>
            <div>
              <h3 className="text-xl font-serif" style={{ color: colors.ink }}>{title}</h3>
              <p className="text-sm" style={{ color: accentColor }}>{description}</p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {features.map((item, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ color: colors.inkLight }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: delay + i * 0.1 + 0.3 }}
              >
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accentColor }} />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 加载动画
// ============================================================

function PageLoader() {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: colors.background }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.5, duration: 0.8 }}>
      <motion.div className="flex flex-col items-center gap-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        {/* 旋转 Logo */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
          <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: colors.gold }}>
            <motion.div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.gold }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </div>
        </motion.div>
        {/* 文字加载 */}
        <div className="flex gap-2">
          {['知', '遇', '圆', '桌'].map((char, i) => (
            <motion.span key={i} className="text-xl font-serif" style={{ color: colors.gold }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: [0, 1, 0], y: [15, 0, 15] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}>
              {char}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 主页面
// ============================================================

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  // 按钮点击处理
  const handleButtonClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    window.location.href = href;
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: colors.background }}>
      <PageLoader />
      <InkFabricBg />

      {/* 进度条 */}
      <motion.div className="fixed top-0 left-0 right-0 h-0.5 z-50 origin-left" style={{ background: `linear-gradient(to right, ${colors.gold}, ${colors.amber})`, scaleX: smoothProgress }} />

      <div className="relative z-10">
        {/* Hero Section */}
        <section ref={heroRef} className="container mx-auto px-4 py-32 md:py-48 lg:py-56 text-center">
          <motion.div initial="hidden" animate="visible" variants={pageVariants}>
            {/* 标签 - 更醒目 */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-6 py-3 mb-12" style={{ backgroundColor: `${colors.gold}12`, border: `1px solid ${colors.gold}30` }}>
              <motion.span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.gold }} animate={{ scale: [1, 1.5, 1], boxShadow: `0 0 10px ${colors.gold}` }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: colors.gold }}>AI 驱动 · 智能关系发现</span>
            </motion.div>

            {/* 主标题 */}
            <motion.div variants={fadeInUp} className="mb-10">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <CalligraphyTitle size="hero" className="mb-3">知遇圆桌</CalligraphyTitle>
              </motion.div>
              <motion.p className="text-base md:text-lg tracking-[0.3em] uppercase" style={{ color: colors.goldLight }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
                Discover Your Complement
              </motion.p>
            </motion.div>

            {/* 副标题 */}
            <motion.p variants={fadeInUp} className="text-lg md:text-xl max-w-2xl mx-auto mb-14 leading-relaxed" style={{ color: colors.inkLight }}>
              发现与你互补的人 · 验证合作可行性 · 落地真实协作
            </motion.p>

            {/* CTA 按钮 - 使用 Link 组件 */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/rounds">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative inline-flex items-center h-14 px-10 text-sm font-medium tracking-wide overflow-hidden transition-all duration-300"
                  style={{ backgroundColor: colors.gold, color: colors.background, borderRadius: '8px' }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100">
                    <motion.span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }} />
                  </span>
                  <span className="relative flex items-center">
                    <Telescope className="w-5 h-5 mr-3" />
                    探索圆桌
                    <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </motion.button>
              </Link>
              <Link href="/api/auth/signin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center h-14 px-10 text-sm font-medium tracking-wide transition-all duration-300"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${colors.inkMuted}50`, color: colors.ink, borderRadius: '8px' }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  创建 Agent
                </motion.button>
              </Link>
            </motion.div>

            {/* 滚动指示 */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="flex flex-col items-center gap-3">
                <span className="text-xs tracking-widest uppercase" style={{ color: colors.inkMuted }}>Scroll</span>
                <div className="w-px h-14" style={{ background: `linear-gradient(to bottom, ${colors.gold}, transparent)` }} />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* 引用 */}
        <section className="container mx-auto px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
            <ClassicalQuote>
              世有伯乐，然后有千里马。千里马常有，而伯乐不常有。
              <span className="block mt-4 text-sm" style={{ color: colors.inkMuted }}>—— 韩愈《马说》</span>
            </ClassicalQuote>
          </motion.div>
        </section>

        {/* 三层架构 */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <motion.div initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
            <div className="flex items-center justify-center gap-5 mb-6">
              <DecorativeLine className="w-20" />
              <span className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.gold }}>Architecture</span>
              <DecorativeLine className="w-20" />
            </div>
            <CalligraphyTitle size="lg" className="mb-4">三层架构</CalligraphyTitle>
            <p className="text-base max-w-md mx-auto" style={{ color: colors.inkLight }}>从素未谋面到并肩作战，每一步都有 AI 辅助</p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }} className="grid md:grid-cols-3 gap-6 md:gap-8">
            <FeatureCard icon={Telescope} title="伯乐层" description="发现高价值连接" features={["AI Agent 参与圆桌讨论", "分析互补性与生成性", "生成知遇卡匹配"]} accentColor={colors.daiQing} delay={0} onClick={() => window.location.href = '/rounds'} />
            <FeatureCard icon={MessageSquare} title="争鸣层" description="验证合作可行性" features={["结构化对练与压力测试", "识别风险领域", "输出关系类型建议"]} accentColor={colors.zhuHong} delay={0.1} onClick={() => window.location.href = '/rounds'} />
            <FeatureCard icon={Handshake} title="共试层" description="低成本关系落地" features={["最小化协作任务设计", "真实协作场景验证", "长期关系追踪"]} accentColor={colors.jiangZi} delay={0.2} onClick={() => window.location.href = '/rounds'} />
          </motion.div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative max-w-2xl mx-auto text-center p-12 md:p-16 group cursor-pointer" style={{ backgroundColor: colors.paper, border: `1px solid ${colors.gold}30` }}>
            {/* 角落 - 更醒目 */}
            <div className="absolute top-0 left-0 w-24 h-24 transition-all duration-300 group-hover:w-28" style={{ borderTop: `2px solid ${colors.gold}`, borderLeft: `2px solid ${colors.gold}` }} />
            <div className="absolute top-0 right-0 w-24 h-24 transition-all duration-300 group-hover:w-28" style={{ borderTop: `2px solid ${colors.gold}`, borderRight: `2px solid ${colors.gold}` }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 transition-all duration-300 group-hover:w-28" style={{ borderBottom: `2px solid ${colors.gold}`, borderLeft: `2px solid ${colors.gold}` }} />
            <div className="absolute bottom-0 right-0 w-24 h-24 transition-all duration-300 group-hover:w-28" style={{ borderBottom: `2px solid ${colors.gold}`, borderRight: `2px solid ${colors.gold}` }} />

            {/* 强化光晕 */}
            <motion.div className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 50%, ${colors.gold}15 0%, transparent 60%)` }} animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />

            <div className="relative">
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-2xl md:text-3xl font-serif mb-6" style={{ color: colors.ink }}>
                准备好遇见<span style={{ color: colors.gold }}>知己</span>了吗？
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-base mb-10" style={{ color: colors.inkLight }}>
                让算法发现那些本不该错过的人
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <Link href="/api/auth/signin">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative inline-flex items-center h-12 px-12 text-sm font-medium tracking-wide transition-all duration-300"
                    style={{ backgroundColor: colors.ink, color: colors.inkLight, borderRadius: '8px' }}
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100">
                      <motion.span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent, ${colors.gold}30, transparent)` }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }} />
                    </span>
                    <span className="relative flex items-center">
                      <Heart className="w-4 h-4 mr-3" />
                      立即开始探索
                    </span>
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8" style={{ borderTop: `1px solid ${colors.inkMuted}20` }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs" style={{ color: colors.inkMuted }}>© 2025 知遇圆桌 · 发现本不该错过的人</p>
            <div className="flex gap-8">
              {[
                { href: "/about", label: "关于我们" },
                { href: "/privacy", label: "隐私政策" },
                { href: "/terms", label: "使用条款" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="text-xs transition-all hover:opacity-50" style={{ color: colors.inkMuted }}>{link.label}</Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
