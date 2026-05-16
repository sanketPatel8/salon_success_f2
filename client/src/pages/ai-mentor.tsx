import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  Compass,
  MessageCircle,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AiSettingsResponse = {
  name: string;
  description: string;
  welcomeHeadline: string;
  welcomeMessage: string;
  conversationStarters: string[];
  enabled: boolean;
  visibleToMembers: boolean;
  responseMode: "live" | "preview";
  vectorStoreConfigured: boolean;
  storageMode: "database" | "memory";
};

type AiConversation = {
  id: number;
  title: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

type AiMessage = {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  source: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AiMentor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoCreatedRef = useRef(false);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    null,
  );
  const [draft, setDraft] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["/api/ai/settings"],
    queryFn: async (): Promise<AiSettingsResponse> => {
      const response = await fetch("/api/ai/settings", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load AI Mentor");
      }

      return response.json();
    },
  });

  const conversationsQuery = useQuery({
    queryKey: ["/api/ai/conversations"],
    queryFn: async (): Promise<{ conversations: AiConversation[] }> => {
      const response = await fetch("/api/ai/conversations", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      return response.json();
    },
    enabled: settingsQuery.data?.visibleToMembers !== false,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (title?: string) => {
      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(title ? { title } : {}),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed to create conversation");
      }

      return body as { conversation: AiConversation };
    },
    onSuccess: (result) => {
      setActiveConversationId(result.conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Couldn't start a chat",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const conversations = conversationsQuery.data?.conversations ?? [];

  useEffect(() => {
    if (activeConversationId) {
      return;
    }

    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
      return;
    }

    if (
      conversationsQuery.isSuccess &&
      conversations.length === 0 &&
      !autoCreatedRef.current &&
      !createConversationMutation.isPending
    ) {
      autoCreatedRef.current = true;
      createConversationMutation.mutate("New chat");
    }
  }, [
    activeConversationId,
    conversations,
    conversationsQuery.isSuccess,
    createConversationMutation,
  ]);

  const messagesQuery = useQuery({
    queryKey: ["/api/ai/conversations", activeConversationId, "messages"],
    queryFn: async (): Promise<{
      conversation: AiConversation;
      messages: AiMessage[];
    }> => {
      const response = await fetch(
        `/api/ai/conversations/${activeConversationId}/messages`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      return response.json();
    },
    enabled:
      Boolean(activeConversationId) && settingsQuery.data?.visibleToMembers !== false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      message,
    }: {
      conversationId: number;
      message: string;
    }) => {
      const response = await fetch(
        `/api/ai/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ message }),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed to send message");
      }

      return body as {
        assistantMessage: AiMessage;
        userMessage: AiMessage;
        responseMode: "live" | "preview";
      };
    },
    onSuccess: (_, variables) => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: ["/api/ai/conversations", variables.conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    },
    onError: (error) => {
      toast({
        title: "Message not sent",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const activeMessages = messagesQuery.data?.messages ?? [];

  useEffect(() => {
    if (settingsQuery.data && !settingsQuery.data.visibleToMembers) {
      setLocation("/");
    }
  }, [settingsQuery.data, setLocation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, sendMessageMutation.isPending]);

  const statusTone =
    settingsQuery.data?.responseMode === "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  const helperCards = useMemo(
    () => [
      {
        icon: Compass,
        title: "Best for",
        body: "Mindset resets, clarity, business systems, visibility, pricing, growth plans, and turning messy ideas into simple next steps.",
      },
      {
        icon: Wand2,
        title: "How it thinks",
        body: "Short, practical, Katie-style replies with quick wins first, then a simple next action you can actually use this week.",
      },
      {
        icon: Sparkles,
        title: "Portal context",
        body: "When enabled by admin, the mentor can tailor replies using your portal data so the advice feels less generic and more useful.",
      },
    ],
    [],
  );

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    try {
      let conversationId = activeConversationId;

      if (!conversationId) {
        const result = await createConversationMutation.mutateAsync("New chat");
        conversationId = result.conversation.id;
        setActiveConversationId(conversationId);
      }

      await sendMessageMutation.mutateAsync({
        conversationId,
        message: trimmed,
      });
    } catch {
      return;
    }
  };

  return (
    <>
      <Header
        title="KG AI Mentor"
        description="Private, on-brand mentoring inside your member portal"
      />

      <main className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,143,159,0.22),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(255,239,244,0.9))] p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-[28px] border border-primary/20 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="border-b border-rose-100 bg-gradient-to-r from-white via-rose-50 to-white px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    Katie on call
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {settingsQuery.data?.name || "KG AI Mentor"}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    {settingsQuery.data?.description ||
                      "Your private salon-side strategist for decisions, direction, and momentum."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("border", statusTone)} variant="outline">
                    {settingsQuery.data?.responseMode === "live"
                      ? "Live API mode"
                      : "Preview mode"}
                  </Badge>
                  <Badge
                    className="border border-slate-200 bg-slate-50 text-slate-700"
                    variant="outline"
                  >
                    {settingsQuery.data?.storageMode === "database"
                      ? "Conversation history saved"
                      : "Conversation history in memory"}
                  </Badge>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 px-4 py-5 sm:px-6">
                {activeMessages.length === 0 && (
                  <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-sm">
                    <CardContent className="p-5 sm:p-6">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Welcome
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                          {settingsQuery.data?.welcomeHeadline ||
                            "Ask Katie for the next best move."}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {settingsQuery.data?.welcomeMessage ||
                            "Use the mentor for strategy, mindset, systems, or turning your next idea into a sharper plan."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {(settingsQuery.data?.conversationStarters ?? []).map(
                            (starter) => (
                              <button
                                key={starter}
                                type="button"
                                onClick={() => void sendMessage(starter)}
                                className="rounded-full border border-primary/20 bg-white px-4 py-2 text-left text-sm text-slate-700 transition hover:border-primary hover:bg-rose-50 hover:text-slate-900"
                              >
                                {starter}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeMessages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isUser ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm sm:max-w-[78%]",
                          isUser
                            ? "rounded-br-md bg-slate-900 text-white"
                            : "rounded-bl-md border border-rose-100 bg-white text-slate-800",
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          <span className={isUser ? "text-white/70" : "text-slate-500"}>
                            {isUser ? "You" : "Katie"}
                          </span>
                          {!isUser && message.source !== "openai" && (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                            >
                              Preview
                            </Badge>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-[24px] rounded-bl-md border border-rose-100 bg-white px-4 py-3 text-slate-800 shadow-sm sm:max-w-[78%]">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Katie
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                        >
                          Thinking
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-rose-100 bg-white/95 px-4 py-4 sm:px-6">
              {settingsQuery.data && !settingsQuery.data.enabled ? (
                <Card className="border-amber-200 bg-amber-50 shadow-none">
                  <CardContent className="p-4 text-sm text-amber-900">
                    The AI Mentor is currently disabled by the admin.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={draft}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setDraft(event.target.value)
                    }
                    placeholder="Ask Katie for help with pricing, leadership, growth, visibility, or your next business move..."
                    className="min-h-[108px] resize-none rounded-[22px] border-rose-200 bg-rose-50/40 px-4 py-3"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Short, practical answers in Katie's style, with a clear next step.
                    </p>
                    <Button
                      onClick={() => void sendMessage(draft)}
                      disabled={
                        sendMessageMutation.isPending ||
                        createConversationMutation.isPending ||
                        !draft.trim()
                      }
                      className="rounded-full px-5"
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Send to Katie
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                      Conversation room
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">Keep it simple</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full bg-white text-slate-900 hover:bg-white/90"
                    onClick={() => createConversationMutation.mutate("New chat")}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New chat
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {conversations.slice(0, 6).map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={cn(
                        "w-full rounded-2xl border px-3 py-3 text-left transition",
                        activeConversationId === conversation.id
                          ? "border-primary bg-white/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <p className="truncate text-sm font-medium">
                          {conversation.title}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-white/60">
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {helperCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.title}
                  className="border border-slate-200 bg-white/90 shadow-sm"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-rose-100 p-2.5">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {card.body}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </aside>
        </div>
      </main>
    </>
  );
}
