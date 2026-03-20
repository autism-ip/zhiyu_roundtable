/**
 * Agent 模式页
 * [INPUT]: 依赖 @/components/ui/* 的 UI 组件，依赖 @/hooks/use-secondme-session
 * [OUTPUT]: 对外提供 Agent 模式切换页面
 * [POS]: app/agent-mode/page.tsx - Agent 模式控制页
 * [PROTOCOL]: 变更时更新此头部
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSecondMeSession } from "@/hooks/use-secondme-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bot,
  User,
  Zap,
  Settings,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

// ============================================
// SecondMe API 类型定义
// ============================================

interface SecondMeSession {
  id: string;
  name: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  agent_description?: string;
  updated_at: string;
}

interface SecondMeApiResponse {
  code: number;
  msg?: string;
  data?: {
    sessions: SecondMeSession[];
    total?: number;
  };
}

interface AgentModeConfig {
  mode: "human" | "agent";
  agentId?: string;
  autoAction: boolean;
  humanIntervention: boolean;
}

// ============================================
// localStorage Keys (与 navbar 保持一致)
// ============================================

const AGENT_MODE_CONFIG_KEY = "agent_mode_config";
const AGENT_SELECTED_ID_KEY = "agent_selected_id";

// ============================================
// API 响应类型
// ============================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// 动画变体
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// 模式切换卡片组件
// ============================================

function ModeToggleCard({
  title,
  description,
  icon: Icon,
  isActive,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border-amber-500/50 shadow-lg shadow-amber-500/20"
          : "bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/50 hover:border-slate-600/50"
      }`}
    >
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-amber-950" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isActive
              ? "bg-gradient-to-br from-amber-500 to-yellow-500"
              : "bg-slate-700"
          }`}
        >
          <Icon className={`w-7 h-7 ${isActive ? "text-amber-950" : "text-slate-400"}`} />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${isActive ? "text-amber-100" : "text-slate-200"}`}>
            {title}
          </h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 设置项组件
// ============================================

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
      <div>
        <h4 className="font-medium text-slate-200">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
          enabled ? "bg-amber-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
            enabled ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ============================================
// 本地 Agent 类型 (用于 UI 展示)
// ============================================

interface LocalAgent {
  id: string;
  name: string;
  personality?: string;
  is_active: boolean;
  rounds_joined?: number;
}

// ============================================
// Agent 选择卡片组件
// ============================================

function AgentSelectCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: LocalAgent;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
        isSelected
          ? "bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border-amber-500/50"
          : "bg-slate-900/50 border-slate-700/50 hover:border-slate-600/50"
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-amber-950" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-amber-500/30">
          <AvatarImage src={undefined} />
          <AvatarFallback className="bg-gradient-to-br from-amber-600 to-yellow-600 text-amber-50">
            <Bot className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-medium text-slate-200">{agent.name}</h4>
          <p className="text-xs text-slate-400">{agent.personality || "暂无描述"}</p>
        </div>
        <Badge
          className={
            agent.is_active
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
          }
        >
          {agent.is_active ? "活跃" : "未激活"}
        </Badge>
      </div>
    </motion.div>
  );
}

// ============================================
// 加载状态组件
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <div className="flex items-center gap-3 text-amber-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>加载中...</span>
      </div>
    </div>
  );
}

// ============================================
// 未登录状态组件
// ============================================

function UnauthenticatedState() {
  return (
    <div className="min-h-screen bg-[#0a0908]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
      </div>

      <div className="relative container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
            <Bot className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-amber-50 mb-4">
            Agent 模式控制
          </h1>
          <p className="text-amber-300/60 mb-8">
            登录后配置您的 Agent 模式
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-0"
          >
            <Link href="/login">立即登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主页面组件
// ============================================

export default function AgentModePage() {
  const { user: authUser, isLoading: authLoading } = useSecondMeSession();

  // 状态管理
  const [agents, setAgents] = useState<LocalAgent[]>([]);
  const [modeConfig, setModeConfig] = useState<AgentModeConfig>({
    mode: "human",
    autoAction: false,
    humanIntervention: false,
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 获取用户 Agent (从 SecondMe API)
  useEffect(() => {
    async function fetchAgent() {
      if (!authUser?.userId) return;

      setIsLoading(true);

      try {
        // 获取 SecondMe access token
        const tokenResponse = await fetch('/api/auth/secondme/token');
        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          console.error('No access token available');
          setAgents([]);
          return;
        }

        // 调用 SecondMe Chat Session List API 获取用户的 Agent 信息
        const response = await fetch('https://api.mindverse.com/gate/lab/api/secondme/chat/session/list', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        const result: SecondMeApiResponse = await response.json();

        // 解析 SecondMe API 响应
        if (result.code === 0 && result.data?.sessions) {
          // 从 sessions 中提取唯一的 Agent 信息
          const agentMap = new Map<string, LocalAgent>();

          for (const session of result.data.sessions) {
            if (!agentMap.has(session.agent_id)) {
              agentMap.set(session.agent_id, {
                id: session.agent_id,
                name: session.agent_name || 'SecondMe Agent',
                personality: session.agent_description,
                is_active: true,
                rounds_joined: 0,
              });
            }
          }

          const agentList = Array.from(agentMap.values());
          setAgents(agentList);

          // 如果有 Agent 且没有选中，则默认选中第一个
          if (agentList.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agentList[0].id);
          }
        } else {
          // API 返回错误或无数据
          console.error('SecondMe API error:', result.msg || 'Unknown error');
          setAgents([]);
        }
      } catch (err) {
        console.error("获取 SecondMe Agent 失败:", err);
        setAgents([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (authUser?.userId) {
      fetchAgent();
    }
  }, [authUser?.userId, selectedAgentId]);

  // 从 localStorage 恢复状态
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem(AGENT_MODE_CONFIG_KEY);
      const savedAgentId = localStorage.getItem(AGENT_SELECTED_ID_KEY);

      if (savedConfig) {
        const parsed = JSON.parse(savedConfig) as AgentModeConfig;
        setModeConfig(parsed);
      }
      if (savedAgentId) {
        setSelectedAgentId(savedAgentId);
      }
    } catch (err) {
      console.error("恢复 Agent 模式状态失败:", err);
    }
  }, []);

  // 保存状态到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(AGENT_MODE_CONFIG_KEY, JSON.stringify(modeConfig));
      if (selectedAgentId) {
        localStorage.setItem(AGENT_SELECTED_ID_KEY, selectedAgentId);
      }
    } catch (err) {
      console.error("保存 Agent 模式状态失败:", err);
    }
  }, [modeConfig, selectedAgentId]);

  // 处理模式切换
  const handleModeChange = (newMode: "human" | "agent") => {
    setModeConfig((prev) => ({
      ...prev,
      mode: newMode,
    }));
  };

  // 处理设置项切换
  const handleSettingChange = (setting: "autoAction" | "humanIntervention", value: boolean) => {
    setModeConfig((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  // 保存配置
  const handleSave = async () => {
    if (!authUser?.userId) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/users/${authUser.userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_mode_config: modeConfig,
          selected_agent_id: selectedAgentId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 保存成功，可以添加 toast 提示
        console.log("配置已保存");
      }
    } catch (err) {
      console.error("保存配置失败:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 加载状态
  if (authLoading || isLoading) {
    return <LoadingState />;
  }

  // 未登录状态
  if (!authUser) {
    return <UnauthenticatedState />;
  }

  return (
    <div className="min-h-screen bg-[#0a0908]">
      {/* 背景纹理 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#0a0908] to-[#0a0908]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-3xl">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回个人中心
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-amber-950" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-amber-50">
                Agent 模式控制
              </h1>
              <p className="text-amber-300/60 text-sm">
                设定您的 Agent 如何自动行动
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* 模式选择 */}
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-800/50">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  选择模式
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <ModeToggleCard
                    title="人类模式"
                    description="完全手动控制，不启用自动行动"
                    icon={User}
                    isActive={modeConfig.mode === "human"}
                    onClick={() => handleModeChange("human")}
                  />
                  <ModeToggleCard
                    title="Agent 模式"
                    description="启用 AI Agent 自动参与圆桌讨论"
                    icon={Bot}
                    isActive={modeConfig.mode === "agent"}
                    onClick={() => handleModeChange("agent")}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Agent 选择 */}
          {modeConfig.mode === "agent" && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-amber-400" />
                    选择 Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agents.length > 0 ? (
                    agents.map((agent) => (
                      <AgentSelectCard
                        key={agent.id}
                        agent={agent}
                        isSelected={selectedAgentId === agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                      />
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">
                      暂无可用的 Agent，请先创建一个
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Agent 模式设置 */}
          {modeConfig.mode === "agent" && (
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Agent 设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SettingToggle
                    title="自动行动"
                    description="Agent 自动参与圆桌讨论，无需确认"
                    enabled={modeConfig.autoAction}
                    onChange={(value) => handleSettingChange("autoAction", value)}
                  />
                  <SettingToggle
                    title="人类干预"
                    description="允许人类随时介入中断 Agent 行动"
                    enabled={modeConfig.humanIntervention}
                    onChange={(value) => handleSettingChange("humanIntervention", value)}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 保存按钮 */}
          <motion.div variants={itemVariants} className="flex justify-end gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-900/20"
            >
              取消
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  保存配置
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
