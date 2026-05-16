import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Brain,
  CheckCircle2,
  Database,
  FileUp,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import {
  buildDefaultAiMentorSettingsInput,
  type AiMentorKnowledgeFile,
  type AiMentorSettingsInput,
} from "@shared/ai-mentor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type AiMentorRuntime = {
  hasApiKey: boolean;
  storageMode: "database" | "memory";
  vectorStoreConfigured: boolean;
  conversationCount: number;
  messageCount: number;
  vectorStoreName: string | null;
  vectorStoreStatus: string | null;
  vectorStoreFileCounts: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    cancelled: number;
  } | null;
  knowledgeCounts: {
    total: number;
    enabled: number;
    synced: number;
    failed: number;
    pending: number;
    skipped: number;
  };
  lastKnowledgeSyncStatus: string;
  lastKnowledgeSyncMessage: string | null;
  lastKnowledgeSyncAt: string | null;
};

type AiMentorAdminResponse = {
  settings: AiMentorSettingsInput & {
    id: number;
    lastKnowledgeSyncAt: string | null;
    lastKnowledgeSyncStatus: string;
    lastKnowledgeSyncMessage: string | null;
    createdAt: string;
    updatedAt: string;
  };
  runtime: AiMentorRuntime;
};

type KnowledgeSyncResponse = AiMentorAdminResponse & {
  summary: {
    vectorStoreId: string;
    uploadedFiles: number;
    skippedDuplicates: number;
    failedSources: number;
    enabledSources: number;
    totalSources: number;
  };
};

function toMultiline(items: string[]) {
  return items.join("\n");
}

function fromMultiline(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getKnowledgeStatusTone(status: string) {
  switch (status) {
    case "synced":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    case "skipped":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

export default function AdminAiMentorStudio({
  adminPassword,
}: {
  adminPassword: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const defaults = useMemo(() => buildDefaultAiMentorSettingsInput(), []);
  const [form, setForm] = useState<AiMentorSettingsInput>(defaults);
  const [startersText, setStartersText] = useState(
    toMultiline(defaults.conversationStarters),
  );
  const [knowledgeText, setKnowledgeText] = useState(
    toMultiline(defaults.knowledgeSources),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/ai/settings"],
    queryFn: async (): Promise<AiMentorAdminResponse> => {
      const response = await fetch("/api/admin/ai/settings", {
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load AI Mentor settings");
      }

      return response.json();
    },
    enabled: Boolean(adminPassword),
  });

  useEffect(() => {
    if (!data?.settings) {
      return;
    }

    const {
      name,
      description,
      instructions,
      welcomeHeadline,
      welcomeMessage,
      conversationStarters,
      knowledgeSources,
      knowledgeFiles,
      model,
      vectorStoreId,
      enabled,
      visibleToMembers,
      webSearchEnabled,
      allowPortalContext,
    } = data.settings;

    setForm({
      name,
      description,
      instructions,
      welcomeHeadline,
      welcomeMessage,
      conversationStarters,
      knowledgeSources,
      knowledgeFiles,
      model,
      vectorStoreId,
      enabled,
      visibleToMembers,
      webSearchEnabled,
      allowPortalContext,
    });
    setStartersText(toMultiline(conversationStarters));
    setKnowledgeText(toMultiline(knowledgeSources));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: AiMentorSettingsInput) => {
      const response = await fetch("/api/admin/ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed to save AI Mentor settings");
      }

      return body as AiMentorAdminResponse;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/admin/ai/settings"], result);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/settings"] });
      toast({
        title: "AI Mentor updated",
        description: "The mentor configuration has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not save the AI Mentor settings.",
        variant: "destructive",
      });
    },
  });

  const syncKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/ai/knowledge/sync", {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword,
        },
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || "Failed to sync mentor knowledge");
      }

      return body as KnowledgeSyncResponse;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["/api/admin/ai/settings"], result);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/settings"] });
      toast({
        title: "Knowledge synced",
        description: `${result.summary.uploadedFiles} files were added to the fresh vector store.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Knowledge sync failed",
        description:
          error instanceof Error
            ? error.message
            : "We could not sync the Katie knowledge files.",
        variant: "destructive",
      });
    },
  });

  const runtime = data?.runtime;
  const responseModeLabel = runtime?.hasApiKey ? "Live API mode" : "Preview mode";

  const summaryBadges = useMemo(
    () => [
      {
        label: responseModeLabel,
        tone: runtime?.hasApiKey
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-amber-100 text-amber-800 border-amber-200",
      },
      {
        label:
          runtime?.storageMode === "database" ? "Database-backed" : "Memory fallback",
        tone:
          runtime?.storageMode === "database"
            ? "bg-slate-100 text-slate-800 border-slate-200"
            : "bg-blue-100 text-blue-800 border-blue-200",
      },
      {
        label: runtime?.vectorStoreConfigured
          ? "Knowledge linked"
          : "Knowledge pending sync",
        tone: runtime?.vectorStoreConfigured
          ? "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200"
          : "bg-rose-100 text-rose-800 border-rose-200",
      },
    ],
    [responseModeLabel, runtime],
  );

  const handleFieldChange = <K extends keyof AiMentorSettingsInput>(
    key: K,
    value: AiMentorSettingsInput[K],
  ) => {
    setForm((current: AiMentorSettingsInput) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleKnowledgeFileChange = (
    index: number,
    patch: Partial<AiMentorKnowledgeFile>,
  ) => {
    setForm((current: AiMentorSettingsInput) => ({
      ...current,
      knowledgeFiles: current.knowledgeFiles.map((file: AiMentorKnowledgeFile, fileIndex: number) =>
        fileIndex === index ? { ...file, ...patch } : file,
      ),
    }));
  };

  const handleKnowledgeFileRemove = (index: number) => {
    setForm((current: AiMentorSettingsInput) => ({
      ...current,
      knowledgeFiles: current.knowledgeFiles.filter(
        (_file: AiMentorKnowledgeFile, fileIndex: number) => fileIndex !== index,
      ),
    }));
  };

  const handleKnowledgeFileAdd = () => {
    setForm((current: AiMentorSettingsInput) => ({
      ...current,
      knowledgeFiles: [
        ...current.knowledgeFiles,
        {
          label: "New knowledge source",
          sourcePath: "",
          enabled: true,
          sourceType: "file",
          lastSyncedAt: null,
          syncStatus: "pending",
          openaiFileId: null,
          vectorStoreFileId: null,
          lastError: null,
          uploadedFilename: null,
        },
      ],
    }));
  };

  const handleResetPreset = () => {
    const nextDefaults = buildDefaultAiMentorSettingsInput();
    setForm(nextDefaults);
    setStartersText(toMultiline(nextDefaults.conversationStarters));
    setKnowledgeText(toMultiline(nextDefaults.knowledgeSources));
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      conversationStarters: fromMultiline(startersText),
      knowledgeSources: fromMultiline(knowledgeText),
      vectorStoreId: form.vectorStoreId?.trim() || null,
      knowledgeFiles: form.knowledgeFiles.map((file: AiMentorKnowledgeFile) => ({
        ...file,
        label: file.label.trim(),
        sourcePath: file.sourcePath.trim(),
      })),
    });
  };

  const refreshRuntime = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/ai/settings"] });
  };

  return (
    <Card className="mb-6 md:mb-8 overflow-hidden border-primary/20 shadow-lg">
      <div className="border-b border-primary/20 bg-gradient-to-r from-rose-100 via-white to-pink-100">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI Mentor Studio
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl text-slate-900">
                  Shape the in-portal KG AI Mentor
                </CardTitle>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  This is the control room for the branded mentor experience. Phase 2
                  brings the live OpenAI connection, vector store status, and one-click
                  knowledge syncing into the same workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {summaryBadges.map((badge) => (
                <Badge
                  key={badge.label}
                  className={`border ${badge.tone}`}
                  variant="outline"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
      </div>

      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-slate-200 bg-white/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-900">API Key status</p>
                <p className="mt-1 text-sm text-slate-600">
                  {runtime?.hasApiKey
                    ? "Ready for live OpenAI responses and knowledge sync."
                    : "Missing for now. Add the key to unlock live responses and vector store sync."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <Database className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Usage snapshot</p>
                <p className="mt-1 text-sm text-slate-600">
                  {runtime
                    ? `${runtime.conversationCount} conversations and ${runtime.messageCount} total messages recorded so far.`
                    : "Loading usage data..."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <Brain className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Knowledge state</p>
                <p className="mt-1 text-sm text-slate-600">
                  {runtime
                    ? `${runtime.knowledgeCounts.synced}/${runtime.knowledgeCounts.enabled} enabled sources synced.`
                    : "Loading knowledge status..."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/80 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <Bot className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Vector store</p>
                <p className="mt-1 text-sm text-slate-600">
                  {runtime?.vectorStoreConfigured
                    ? runtime.vectorStoreName || "Linked and ready."
                    : "Not created yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {!runtime?.hasApiKey && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription className="text-sm">
              Live responses and knowledge syncing need `OPENAI_API_KEY` in the
              project environment. Until then, members stay on branded preview-mode
              replies.
            </AlertDescription>
          </Alert>
        )}

        {runtime?.lastKnowledgeSyncMessage && (
          <Alert
            className={
              runtime.lastKnowledgeSyncStatus === "failed"
                ? "border-red-200 bg-red-50 text-red-900"
                : runtime.lastKnowledgeSyncStatus === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-900"
            }
          >
            <AlertDescription className="flex flex-col gap-1 text-sm">
              <span>{runtime.lastKnowledgeSyncMessage}</span>
              {runtime.lastKnowledgeSyncAt && (
                <span className="text-xs opacity-80">
                  Last sync: {new Date(runtime.lastKnowledgeSyncAt).toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <Bot className="h-5 w-5 text-primary" />
                  Assistant profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5 pt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai-name">Name</Label>
                    <Input
                      id="ai-name"
                      value={form.name}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("name", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Model</Label>
                    <Input
                      id="ai-model"
                      value={form.model}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("model", event.target.value)
                      }
                      placeholder="gpt-5.2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-description">Description</Label>
                  <Textarea
                    id="ai-description"
                    value={form.description}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleFieldChange("description", event.target.value)
                    }
                    className="min-h-[110px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai-headline">Welcome headline</Label>
                    <Input
                      id="ai-headline"
                      value={form.welcomeHeadline}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("welcomeHeadline", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-vector-store">Vector store ID</Label>
                    <Input
                      id="ai-vector-store"
                      value={form.vectorStoreId ?? ""}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange("vectorStoreId", event.target.value)
                      }
                      placeholder="Auto-filled after sync"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-welcome-message">Welcome message</Label>
                  <Textarea
                    id="ai-welcome-message"
                    value={form.welcomeMessage}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleFieldChange("welcomeMessage", event.target.value)
                    }
                    className="min-h-[110px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Voice and guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="ai-instructions">Instructions</Label>
                  <Textarea
                    id="ai-instructions"
                    value={form.instructions}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleFieldChange("instructions", event.target.value)
                    }
                    className="min-h-[420px] font-mono text-xs leading-6"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-lg text-slate-900">
                  Runtime controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-5 pt-0">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      Show to customers
                    </p>
                    <p className="text-sm text-slate-600">
                      Display the KG AI Mentor page in the member portal.
                    </p>
                  </div>
                  <Switch
                    checked={form.visibleToMembers}
                    onCheckedChange={(checked: boolean) =>
                      handleFieldChange("visibleToMembers", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">Mentor enabled</p>
                    <p className="text-sm text-slate-600">
                      Keep replies active when the mentor is visible.
                    </p>
                  </div>
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(checked: boolean) =>
                      handleFieldChange("enabled", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">Web search enabled</p>
                    <p className="text-sm text-slate-600">
                      Allow the mentor to pull current web context when needed.
                    </p>
                  </div>
                  <Switch
                    checked={form.webSearchEnabled}
                    onCheckedChange={(checked: boolean) =>
                      handleFieldChange("webSearchEnabled", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      Use member portal context
                    </p>
                    <p className="text-sm text-slate-600">
                      Tailor replies using the member's own numbers and setup.
                    </p>
                  </div>
                  <Switch
                    checked={form.allowPortalContext}
                    onCheckedChange={(checked: boolean) =>
                      handleFieldChange("allowPortalContext", checked)
                    }
                  />
                </div>

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-rose-50 via-white to-pink-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Knowledge sync
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Creates a fresh OpenAI vector store, unpacks ZIP archives,
                        uploads supported files, and links the result back to this
                        mentor.
                      </p>
                    </div>
                    {runtime?.lastKnowledgeSyncStatus === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : runtime?.lastKnowledgeSyncStatus === "failed" ? (
                      <TriangleAlert className="h-5 w-5 text-red-600" />
                    ) : (
                      <Brain className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                      onClick={() => syncKnowledgeMutation.mutate()}
                      disabled={
                        syncKnowledgeMutation.isPending ||
                        saveMutation.isPending ||
                        !runtime?.hasApiKey
                      }
                    >
                      {syncKnowledgeMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                      )}
                      Fresh sync to OpenAI
                    </Button>
                    <Button variant="outline" onClick={refreshRuntime}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh runtime
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-lg text-slate-900">
                  Conversation starters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-5 pt-0">
                <p className="text-sm text-slate-600">
                  One starter per line. These appear as one-tap prompts for members.
                </p>
                <Textarea
                  value={startersText}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setStartersText(event.target.value)
                  }
                  className="min-h-[180px]"
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <Globe className="h-5 w-5 text-primary" />
                  Knowledge references
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-5 pt-0">
                <p className="text-sm text-slate-600">
                  Friendly references for the custom GPT-style setup and admin notes.
                </p>
                <Textarea
                  value={knowledgeText}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setKnowledgeText(event.target.value)
                  }
                  className="min-h-[220px]"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg text-slate-900">
                  Knowledge sync files
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  These are the actual source files the admin can sync into OpenAI.
                  ZIP archives are unpacked automatically and supported inner files are
                  ingested.
                </p>
              </div>
              <Button variant="outline" onClick={handleKnowledgeFileAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add source
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5 pt-0">
            {form.knowledgeFiles.map((file: AiMentorKnowledgeFile, index: number) => (
              <div
                key={`${file.label}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="space-y-2">
                      <Label>Source label</Label>
                      <Input
                        value={file.label}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleKnowledgeFileChange(index, {
                            label: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source path</Label>
                      <Input
                        value={file.sourcePath}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleKnowledgeFileChange(index, {
                            sourcePath: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <Switch
                        checked={file.enabled}
                        onCheckedChange={(checked: boolean) =>
                          handleKnowledgeFileChange(index, { enabled: checked })
                        }
                      />
                      <span className="text-sm text-slate-700">Enabled</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`border ${getKnowledgeStatusTone(file.syncStatus)}`}
                    >
                      {file.syncStatus}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleKnowledgeFileRemove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                </div>

                {(file.lastError || file.uploadedFilename || file.lastSyncedAt) && (
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {file.uploadedFilename && (
                      <p>Last uploaded: {file.uploadedFilename}</p>
                    )}
                    {file.lastSyncedAt && (
                      <p>
                        Synced at: {new Date(file.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                    {file.lastError && (
                      <p className="text-red-600">Issue: {file.lastError}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {isLoading
              ? "Loading current mentor configuration..."
              : "The member-facing chat reads from these settings immediately, and the knowledge sync uses this file list exactly."}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleResetPreset}>
              Load starter preset
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save AI Mentor"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
