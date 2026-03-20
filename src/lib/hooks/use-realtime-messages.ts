/**
 * 实时消息订阅 Hook
 * [INPUT]: 依赖 @/lib/supabase/client 的 supabase 实例
 * [OUTPUT]: 提供 messages 数组、setMessages 更新函数、isConnected 状态
 * [POS]: lib/hooks/use-realtime-messages.ts - 圆桌实时消息订阅
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string | null;
  content: string;
  timestamp: string;
  is_highlighted: boolean;
}

export function useRealtimeMessages(roundId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 初始加载
  useEffect(() => {
    if (!roundId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/rounds/${roundId}/messages`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMessages(data.data);
        }
      } catch (err) {
        console.error("获取消息失败:", err);
      }
    };

    fetchMessages();
  }, [roundId]);

  // Realtime 订阅
  useEffect(() => {
    if (!roundId) return;

    const channel: RealtimeChannel = supabase
      .channel(`round:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `round_id=eq.${roundId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  return { messages, setMessages, isConnected };
}
