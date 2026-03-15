#!/usr/bin/env bun
/**
 * Extract comprehensive data from Claude Code sessions for learning and reflection.
 *
 * Deeply understands Claude Code's JSONL format, storage locations, and internal
 * data structures. Inspired by claude-code-karma's Pydantic models.
 *
 * Data extracted:
 * - Full conversation (user + assistant, filtered from noise)
 * - Token usage & estimated cost per session
 * - Work mode classification (exploration/building/testing)
 * - Subagent transcripts and activity
 * - Task tracking (TaskCreate/TaskUpdate reconstruction)
 * - Compaction events with token counts
 * - Session chaining (resumed sessions via leaf_uuid/slug)
 * - File operations (reads, writes, edits with paths)
 * - Model usage distribution (Opus/Sonnet/Haiku)
 * - Cache hit rates
 * - Session titles
 * - Permission mode changes
 *
 * Storage locations understood:
 * - ~/.claude/projects/{encoded-path}/{uuid}.jsonl           (main sessions)
 * - ~/.claude/projects/{encoded-path}/{uuid}/subagents/      (subagent transcripts)
 * - ~/.claude/projects/{encoded-path}/{uuid}/tool-results/   (tool result files)
 * - ~/.claude/tasks/{uuid}/                                  (task JSON files)
 * - ~/.claude/todos/{uuid}-*.json                            (legacy todo items)
 *
 * JSONL message types handled:
 * - user:                   User messages (prompts, tool results)
 * - assistant:              Claude responses (text, thinking, tool_use)
 * - file-history-snapshot:  File backup checkpoints
 * - summary:                Session titles (NOT compaction!)
 * - system/compact_boundary: True context compaction events
 * - queue-operation:        Plan mode queue operations
 * - progress:               Plan mode progress messages
 *
 * Usage:
 *   bun run extract-session.ts <session-file>
 *   bun run extract-session.ts <project-folder> [--last N] [--json] [--verbose] [--stats-only] [--diary] [--full]
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, resolve, dirname } from "path";

const HOME = process.env.HOME || "";
const PROJECTS_DIR = join(HOME, ".claude", "projects");
const TASKS_DIR = join(HOME, ".claude", "tasks");
const TODOS_DIR = join(HOME, ".claude", "todos");

// ============================================================================
// Model Pricing (from claude-code-karma usage.py)
// ============================================================================

const MODEL_PRICING: Record<string, { input: number; output: number; inputLong?: number; outputLong?: number; longContextThreshold?: number }> = {
  "claude-opus-4-6": { input: 5.0, output: 25.0, inputLong: 10.0, outputLong: 37.5, longContextThreshold: 200_000 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, inputLong: 6.0, outputLong: 22.5, longContextThreshold: 200_000 },
  "claude-opus-4-5-20251101": { input: 5.0, output: 25.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0, inputLong: 6.0, outputLong: 22.5, longContextThreshold: 200_000 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-opus-4-1-20250805": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0, inputLong: 6.0, outputLong: 22.5, longContextThreshold: 200_000 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

const MODEL_FAMILY_PATTERNS: [string, string][] = [
  ["haiku-4-5", "claude-haiku-4-5-20251001"],
  ["haiku-4", "claude-haiku-4-5-20251001"],
  ["haiku-3-5", "claude-3-5-haiku-20241022"],
  ["haiku", "claude-haiku-4-5-20251001"],
  ["sonnet-4-6", "claude-sonnet-4-6"],
  ["sonnet-4-5", "claude-sonnet-4-5-20250929"],
  ["sonnet-4", "claude-sonnet-4-20250514"],
  ["sonnet-3-7", "claude-3-7-sonnet-20250219"],
  ["sonnet-3-5", "claude-3-5-sonnet-20241022"],
  ["sonnet", "claude-sonnet-4-6"],
  ["opus-4-6", "claude-opus-4-6"],
  ["opus-4-5", "claude-opus-4-5-20251101"],
  ["opus-4-1", "claude-opus-4-1-20250805"],
  ["opus-4", "claude-opus-4-20250514"],
  ["opus-3", "claude-3-opus-20240229"],
  ["opus", "claude-opus-4-6"],
];

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.10;
const DEFAULT_PRICING_MODEL = "claude-sonnet-4-6";

function resolveModelPricing(model: string | undefined) {
  if (!model) return MODEL_PRICING[DEFAULT_PRICING_MODEL];
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  const lower = model.toLowerCase();
  for (const [pattern, canonical] of MODEL_FAMILY_PATTERNS) {
    if (lower.includes(pattern)) return MODEL_PRICING[canonical];
  }
  return MODEL_PRICING[DEFAULT_PRICING_MODEL];
}

function categorizeModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("opus")) return "Opus";
  if (lower.includes("sonnet")) return "Sonnet";
  if (lower.includes("haiku")) return "Haiku";
  return "Other";
}

// ============================================================================
// Work Mode Classification (from claude-code-karma analytics.py)
// ============================================================================

const EXPLORATION_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "WebFetch", "WebSearch", "ListMcpResourcesTool", "ReadMcpResourceTool"]);
const BUILDING_TOOLS = new Set(["Write", "Edit", "NotebookEdit", "MultiEdit"]);
const TESTING_TOOLS = new Set(["Bash", "Task", "Agent", "KillShell"]);

// ============================================================================
// Internal Message Detection (from claude-code-karma message.py)
// ============================================================================

function isInternalMessage(content: string): boolean {
  if (!content) return false;
  return (
    content.includes("<local-command-caveat>") ||
    content.includes("<local-command-stdout>") ||
    content.includes("<task-notification>") ||
    content.includes("<retrieval_status>") ||
    content.startsWith("Command running in background") ||
    content.startsWith("Command was manually backgrounded") ||
    content.startsWith("This session is being continued from a previous")
  );
}

/** Strip system/hook XML tags to get real user content */
function stripSystemTags(text: string): string {
  let cleaned = text.replace(
    /<(?:command-message|system-reminder|command-name|user-prompt-submit-hook|command-args|local-command-stdout|local-command-caveat)[^>]*>[\s\S]*?<\/(?:command-message|system-reminder|command-name|user-prompt-submit-hook|command-args|local-command-stdout|local-command-caveat)>/g,
    ""
  );
  // Also strip self-closing variants
  cleaned = cleaned.replace(
    /<(?:command-message|system-reminder|command-name|user-prompt-submit-hook|command-args)[^/]*\/?>/g,
    ""
  );
  return cleaned.trim();
}

// ============================================================================
// Path Resolution
// ============================================================================

function resolveSessionFolder(inputPath: string): string {
  const absolutePath = resolve(inputPath);
  if (absolutePath.startsWith(PROJECTS_DIR)) return absolutePath;

  const folderName = absolutePath
    .replace(/\/\./g, "--")
    .replace(/\//g, "-");

  const sessionFolder = join(PROJECTS_DIR, folderName);
  if (existsSync(sessionFolder)) return sessionFolder;

  if (existsSync(PROJECTS_DIR)) {
    const folders = readdirSync(PROJECTS_DIR);
    const match = folders.find((f) => {
      if (f === folderName) return true;
      if (folderName.startsWith(f + "-")) return true;
      if (f.startsWith(folderName + "-")) return true;
      return false;
    });
    if (match) return join(PROJECTS_DIR, match);
  }

  return absolutePath;
}

/** Extract UUID from a session JSONL filename */
function extractUuid(filePath: string): string {
  return basename(filePath, ".jsonl");
}

// ============================================================================
// Data Types
// ============================================================================

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

interface CompactionEvent {
  index: number;
  timestamp: string;
  trigger?: string; // "auto" | "manual"
  preTokens?: number;
  content?: string;
}

interface FileOperation {
  path: string;
  operation: "read" | "write" | "edit" | "glob" | "grep";
  timestamp: string;
  actor: "main" | "subagent";
}

interface TaskItem {
  id: string;
  subject: string;
  description: string;
  status: string; // "pending" | "in_progress" | "completed"
  activeForm?: string;
  blocks: string[];
  blockedBy: string[];
}

interface SubagentInfo {
  agentId: string;
  type?: string;
  slug?: string;
  messageCount: number;
  toolCalls: Record<string, number>;
  totalToolCalls: number;
  startTime?: string;
  endTime?: string;
  usage: TokenUsage;
  estimatedCostUsd: number;
  turns: Turn[]; // full conversation if --full
}

interface WorkModeDistribution {
  explorationPct: number;
  buildingPct: number;
  testingPct: number;
  primaryMode: string;
  explorationCount: number;
  buildingCount: number;
  testingCount: number;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

interface Turn {
  role: "user" | "assistant";
  timestamp: string;
  thinking?: string;
  content: string;
  tools?: ToolCall[];
  model?: string;
  usage?: TokenUsage;
  isSidechain?: boolean;
}

interface DiaryEntry {
  taskSummary: string;
  workDone: string[];
  filesModified: string[];
  filesRead: string[];
  toolsUsedSummary: string;
  costSummary: string;
  workModeSummary: string;
}

interface SessionStats {
  // Conversation
  totalTurns: number;
  userTurns: number;
  assistantTurns: number;
  thinkingBlocks: number;
  durationMinutes: number;

  // Tools
  toolCalls: Record<string, number>;
  totalToolCalls: number;
  skillsUsed: string[];
  agentsUsed: string[];

  // Tokens & Cost
  tokenUsage: TokenUsage;
  estimatedCostUsd: number;
  cacheHitRate: number;

  // Models
  modelsUsed: Record<string, number>; // model name → count
  modelsCategorized: Record<string, number>; // Opus/Sonnet/Haiku → count
  primaryModel?: string;

  // Work Mode
  workMode: WorkModeDistribution;

  // File Operations
  fileOperations: FileOperation[];
  filesModified: string[];
  filesRead: string[];

  // Compaction
  compactionEvents: CompactionEvent[];
  wasCompacted: boolean;
  totalCompactions: number;

  // Tasks
  tasks: TaskItem[];
  tasksCompleted: number;
  tasksPending: number;

  // Subagents
  subagents: SubagentInfo[];
  totalSubagents: number;

  // Session metadata
  sessionTitle?: string;
  isResumed: boolean;
  leafUuid?: string;
  slug?: string;
  permissionMode?: string;
  version?: string;
}

interface Session {
  sessionId: string;
  uuid: string;
  file: string;
  date: string;
  project: string;
  gitBranch?: string;
  slug?: string;
  turns: Turn[];
  stats: SessionStats;
  diary?: DiaryEntry;
}

// ============================================================================
// Raw JSONL Entry Type (comprehensive, from karma models)
// ============================================================================

interface RawEntry {
  type: string;
  subtype?: string;
  uuid?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  parentUuid?: string;
  isSidechain?: boolean;
  version?: string;
  slug?: string;
  agentId?: string;

  // User/Assistant message envelope
  message?: {
    id?: string;
    role?: string;
    content?: unknown;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    stop_reason?: string;
  };

  // Summary (session title)
  summary?: string;
  leafUuid?: string;

  // Compact boundary
  compactMetadata?: {
    trigger?: string;
    preTokens?: number;
  };
  content?: string;
  logicalParentUuid?: string;

  // Queue operation
  operation?: string;

  // Permission
  permission_mode?: string;

  // File history snapshot
  snapshot?: {
    messageId?: string;
    trackedFileBackups?: Record<string, unknown>;
    timestamp?: string;
  };

  isMeta?: boolean;
}

// ============================================================================
// JSONL Parsing (deeply informed by karma's message.py, content.py, usage.py)
// ============================================================================

function parseSessionFile(filePath: string, options: { full?: boolean } = {}): Session | null {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const turns: Turn[] = [];
  let sessionId = "";
  let project = "";
  let gitBranch = "";
  let slug = "";
  let permissionMode = "";
  let version = "";
  let sessionTitle: string | undefined;
  let leafUuid: string | undefined;
  let isResumed = false;
  let conversationStarted = false;

  // Accumulators
  const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
  const modelsUsed: Record<string, number> = {};
  const allToolCalls: Record<string, number> = {};
  let totalToolCallCount = 0;
  const compactionEvents: CompactionEvent[] = [];
  const fileOperations: FileOperation[] = [];
  const taskMap = new Map<string, TaskItem>();
  let taskCounter = 0;
  let messageIndex = 0;

  for (const line of lines) {
    try {
      const entry: RawEntry = JSON.parse(line);
      messageIndex++;

      // ── Extract metadata from every entry ──
      sessionId = entry.sessionId || sessionId;
      project = entry.cwd || project;
      gitBranch = entry.gitBranch || gitBranch;
      if (entry.slug) slug = entry.slug;
      if (entry.version) version = entry.version;
      if (entry.permission_mode) permissionMode = entry.permission_mode;

      // ── Handle system/compact_boundary (TRUE compaction) ──
      if (entry.type === "system" && entry.subtype === "compact_boundary") {
        compactionEvents.push({
          index: messageIndex,
          timestamp: entry.timestamp || "",
          trigger: entry.compactMetadata?.trigger,
          preTokens: entry.compactMetadata?.preTokens,
          content: entry.content,
        });
        continue;
      }

      // ── Handle summary (session title, NOT compaction) ──
      if (entry.type === "summary") {
        if (conversationStarted && entry.summary) {
          sessionTitle = entry.summary;
        }
        if (entry.leafUuid) {
          leafUuid = entry.leafUuid;
        }
        continue;
      }

      // ── Skip non-conversation entries ──
      if (
        entry.type === "file-history-snapshot" ||
        entry.type === "queue-operation" ||
        entry.type === "progress" ||
        entry.isMeta === true
      ) {
        continue;
      }

      // ── Skip sidechain (subagent) messages from main conversation ──
      if (entry.isSidechain) {
        continue;
      }

      // ── User messages ──
      if (entry.type === "user") {
        conversationStarted = true;
        const parsed = parseUserMessage(entry.message?.content);

        // Filter out internal messages
        if (parsed.content && isInternalMessage(parsed.content)) {
          // Still attach tool results even if content is internal
          if (parsed.toolResults.length > 0 && turns.length > 0) {
            attachToolResults(turns, parsed.toolResults);
          }
          continue;
        }

        // Strip system tags from user content
        const cleanedContent = parsed.content ? stripSystemTags(parsed.content) : "";

        // Attach tool results to previous assistant turn
        if (parsed.toolResults.length > 0 && turns.length > 0) {
          attachToolResults(turns, parsed.toolResults);
        }

        // Add real user content as new turn
        if (cleanedContent) {
          turns.push({
            role: "user",
            timestamp: entry.timestamp || "",
            content: cleanedContent,
          });
        }

        // Detect resumed session
        if (cleanedContent.includes("This session is being continued")) {
          isResumed = true;
        }
      }

      // ── Assistant messages ──
      else if (entry.type === "assistant") {
        conversationStarted = true;
        const parsed = parseAssistantMessage(entry.message?.content);

        // Track model usage
        const model = entry.message?.model;
        if (model) {
          modelsUsed[model] = (modelsUsed[model] || 0) + 1;
        }

        // Track token usage
        const msgUsage = entry.message?.usage;
        if (msgUsage) {
          totalUsage.inputTokens += msgUsage.input_tokens || 0;
          totalUsage.outputTokens += msgUsage.output_tokens || 0;
          totalUsage.cacheCreationInputTokens += msgUsage.cache_creation_input_tokens || 0;
          totalUsage.cacheReadInputTokens += msgUsage.cache_read_input_tokens || 0;
        }

        // Track tool calls and extract file operations + tasks
        if (parsed.tools) {
          for (const tool of parsed.tools) {
            allToolCalls[tool.name] = (allToolCalls[tool.name] || 0) + 1;
            totalToolCallCount++;

            // Track file operations
            trackFileOperation(tool, entry.timestamp || "", "main", fileOperations);

            // Reconstruct tasks from TaskCreate/TaskUpdate
            reconstructTask(tool, taskMap, taskCounter);
            if (tool.name === "TaskCreate") taskCounter++;
          }
        }

        // Merge or add turn
        const lastTurn = turns[turns.length - 1];
        if (lastTurn?.role === "assistant" && !parsed.content && parsed.tools?.length) {
          lastTurn.tools = [...(lastTurn.tools || []), ...parsed.tools];
          if (parsed.thinking && !lastTurn.thinking) lastTurn.thinking = parsed.thinking;
          // Update usage on merged turn
          if (msgUsage && lastTurn.usage) {
            lastTurn.usage.inputTokens += msgUsage.input_tokens || 0;
            lastTurn.usage.outputTokens += msgUsage.output_tokens || 0;
            lastTurn.usage.cacheCreationInputTokens += msgUsage.cache_creation_input_tokens || 0;
            lastTurn.usage.cacheReadInputTokens += msgUsage.cache_read_input_tokens || 0;
          }
        } else if (parsed.content || parsed.thinking || parsed.tools?.length) {
          turns.push({
            role: "assistant",
            timestamp: entry.timestamp || "",
            thinking: parsed.thinking,
            content: parsed.content,
            tools: parsed.tools,
            model: model,
            usage: msgUsage ? {
              inputTokens: msgUsage.input_tokens || 0,
              outputTokens: msgUsage.output_tokens || 0,
              cacheCreationInputTokens: msgUsage.cache_creation_input_tokens || 0,
              cacheReadInputTokens: msgUsage.cache_read_input_tokens || 0,
            } : undefined,
          });
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (turns.length === 0) return null;

  // Consolidate consecutive assistant turns
  const consolidatedTurns = consolidateTurns(turns);

  // Parse subagents
  const uuid = extractUuid(filePath);
  const sessionDir = join(dirname(filePath), uuid);
  const subagents = parseSubagents(sessionDir, options.full);

  // Load tasks from filesystem (fallback if JSONL reconstruction found none)
  let tasks = Array.from(taskMap.values());
  if (tasks.length === 0) {
    tasks = loadTasksFromFilesystem(uuid);
  }

  // Calculate comprehensive stats
  const stats = calculateStats(consolidatedTurns, {
    tokenUsage: totalUsage,
    modelsUsed,
    allToolCalls,
    totalToolCallCount,
    compactionEvents,
    fileOperations,
    tasks,
    subagents,
    sessionTitle,
    isResumed,
    leafUuid,
    slug,
    permissionMode,
    version,
  });

  // Generate diary
  const diary = generateDiary(consolidatedTurns, stats);

  return {
    sessionId,
    uuid,
    file: basename(filePath),
    date: consolidatedTurns[0]?.timestamp
      ? new Date(consolidatedTurns[0].timestamp).toLocaleDateString()
      : "unknown",
    project,
    gitBranch,
    slug: slug || undefined,
    turns: consolidatedTurns,
    stats,
    diary,
  };
}

// ============================================================================
// Message Parsing
// ============================================================================

function attachToolResults(turns: Turn[], toolResults: { id: string; content: string }[]) {
  const lastTurn = turns[turns.length - 1];
  if (lastTurn?.role === "assistant" && lastTurn.tools) {
    for (const result of toolResults) {
      const tool = lastTurn.tools.find((t) => t.id === result.id);
      if (tool) {
        tool.result = result.content;
      }
    }
  }
}

function parseUserMessage(
  content: unknown,
): { content: string; toolResults: { id: string; content: string }[] } {
  const toolResults: { id: string; content: string }[] = [];
  let textContent = "";

  if (typeof content === "string") {
    return { content: content.trim(), toolResults };
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === "text" && item.text) {
        textContent += item.text + "\n";
      } else if (item.type === "tool_result") {
        const resultContent = extractToolResultContent(item.content);
        if (item.tool_use_id && resultContent) {
          toolResults.push({ id: item.tool_use_id, content: resultContent });
        }
      }
    }
  }

  return { content: textContent.trim(), toolResults };
}

function extractToolResultContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === "text")
      .map((item) => item.text || "")
      .join("\n");
  }
  if (content && typeof content === "object") {
    return JSON.stringify(content);
  }
  return "";
}

function parseAssistantMessage(content: unknown): {
  content: string;
  thinking?: string;
  tools?: ToolCall[];
} {
  if (!Array.isArray(content)) return { content: "" };

  let text = "";
  let thinking = "";
  const tools: ToolCall[] = [];

  for (const item of content) {
    if (item.type === "text" && item.text) {
      text += item.text + "\n";
    } else if (item.type === "thinking" && item.thinking) {
      thinking = item.thinking;
    } else if (item.type === "tool_use" && item.name) {
      tools.push({
        id: item.id || "",
        name: item.name,
        input: item.input || {},
      });
    }
  }

  return {
    content: text.trim(),
    thinking: thinking || undefined,
    tools: tools.length > 0 ? tools : undefined,
  };
}

// ============================================================================
// File Operation Tracking
// ============================================================================

function trackFileOperation(tool: ToolCall, timestamp: string, actor: "main" | "subagent", ops: FileOperation[]) {
  const filePath = tool.input.file_path as string;
  switch (tool.name) {
    case "Read":
      if (filePath) ops.push({ path: filePath, operation: "read", timestamp, actor });
      break;
    case "Write":
      if (filePath) ops.push({ path: filePath, operation: "write", timestamp, actor });
      break;
    case "Edit":
      if (filePath) ops.push({ path: filePath, operation: "edit", timestamp, actor });
      break;
    case "Glob":
      if (tool.input.pattern) ops.push({ path: (tool.input.path as string) || ".", operation: "glob", timestamp, actor });
      break;
    case "Grep":
      if (tool.input.pattern) ops.push({ path: (tool.input.path as string) || ".", operation: "grep", timestamp, actor });
      break;
  }
}

// ============================================================================
// Task Reconstruction (from karma task.py)
// ============================================================================

function reconstructTask(tool: ToolCall, taskMap: Map<string, TaskItem>, counter: number) {
  if (tool.name === "TaskCreate") {
    const id = String(counter + 1);
    taskMap.set(id, {
      id,
      subject: (tool.input.subject as string) || "",
      description: (tool.input.description as string) || "",
      status: "pending",
      activeForm: tool.input.activeForm as string | undefined,
      blocks: [],
      blockedBy: [],
    });
  } else if (tool.name === "TaskUpdate") {
    const taskId = tool.input.taskId as string;
    if (!taskId || !taskMap.has(taskId)) return;
    const task = taskMap.get(taskId)!;
    if (tool.input.status) task.status = tool.input.status as string;
    if (tool.input.subject) task.subject = tool.input.subject as string;
    if (tool.input.description) task.description = tool.input.description as string;
    if (tool.input.activeForm) task.activeForm = tool.input.activeForm as string;
    if (Array.isArray(tool.input.addBlocks)) {
      for (const b of tool.input.addBlocks as string[]) {
        if (!task.blocks.includes(b)) task.blocks.push(b);
      }
    }
    if (Array.isArray(tool.input.addBlockedBy)) {
      for (const b of tool.input.addBlockedBy as string[]) {
        if (!task.blockedBy.includes(b)) task.blockedBy.push(b);
      }
    }
  }
}

/** Load tasks from ~/.claude/tasks/{uuid}/ filesystem */
function loadTasksFromFilesystem(uuid: string): TaskItem[] {
  const tasksDir = join(TASKS_DIR, uuid);
  if (!existsSync(tasksDir)) return [];
  try {
    const files = readdirSync(tasksDir).filter(f => f.endsWith(".json") && !f.startsWith("."));
    const tasks: TaskItem[] = [];
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(tasksDir, file), "utf-8"));
        tasks.push({
          id: data.id || basename(file, ".json"),
          subject: data.subject || "",
          description: data.description || "",
          status: data.status || "pending",
          activeForm: data.activeForm,
          blocks: data.blocks || [],
          blockedBy: data.blockedBy || [],
        });
      } catch { continue; }
    }
    return tasks.sort((a, b) => {
      const aNum = parseInt(a.id), bNum = parseInt(b.id);
      return (isNaN(aNum) || isNaN(bNum)) ? a.id.localeCompare(b.id) : aNum - bNum;
    });
  } catch { return []; }
}

// ============================================================================
// Subagent Parsing (from karma agent.py)
// ============================================================================

function parseSubagents(sessionDir: string, includeConversation?: boolean): SubagentInfo[] {
  const subagentsDir = join(sessionDir, "subagents");
  if (!existsSync(subagentsDir)) return [];

  try {
    const files = readdirSync(subagentsDir).filter(f => f.endsWith(".jsonl") && f.startsWith("agent-"));
    const subagents: SubagentInfo[] = [];

    for (const file of files) {
      try {
        const agentPath = join(subagentsDir, file);
        const agentContent = readFileSync(agentPath, "utf-8");
        const agentLines = agentContent.trim().split("\n").filter(Boolean);

        // Extract agent ID from filename: agent-{id}.jsonl → {id}
        const agentIdMatch = basename(file, ".jsonl").match(/^agent-([a-f0-9]+)/);
        const agentId = agentIdMatch ? agentIdMatch[1] : basename(file, ".jsonl");

        let agentType: string | undefined;
        let agentSlug: string | undefined;
        let startTime: string | undefined;
        let endTime: string | undefined;
        let messageCount = 0;
        const toolCalls: Record<string, number> = {};
        let totalToolCalls = 0;
        const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
        const agentTurns: Turn[] = [];

        for (const line of agentLines) {
          try {
            const entry: RawEntry = JSON.parse(line);
            messageCount++;

            if (!startTime && entry.timestamp) startTime = entry.timestamp;
            endTime = entry.timestamp || endTime;
            if (entry.slug) agentSlug = entry.slug;
            if (entry.agentId) agentType = entry.agentId;

            if (entry.type === "assistant" && entry.message) {
              // Track usage
              const msgUsage = entry.message.usage;
              if (msgUsage) {
                usage.inputTokens += msgUsage.input_tokens || 0;
                usage.outputTokens += msgUsage.output_tokens || 0;
                usage.cacheCreationInputTokens += msgUsage.cache_creation_input_tokens || 0;
                usage.cacheReadInputTokens += msgUsage.cache_read_input_tokens || 0;
              }

              // Track tool calls
              if (Array.isArray(entry.message.content)) {
                for (const block of entry.message.content as any[]) {
                  if (block.type === "tool_use" && block.name) {
                    toolCalls[block.name] = (toolCalls[block.name] || 0) + 1;
                    totalToolCalls++;
                  }
                }
              }

              // Build turns if --full
              if (includeConversation) {
                const parsed = parseAssistantMessage(entry.message.content);
                if (parsed.content || parsed.tools?.length) {
                  agentTurns.push({
                    role: "assistant",
                    timestamp: entry.timestamp || "",
                    content: parsed.content,
                    thinking: parsed.thinking,
                    tools: parsed.tools,
                    model: entry.message.model,
                  });
                }
              }
            } else if (entry.type === "user" && includeConversation) {
              const parsed = parseUserMessage(entry.message?.content);
              if (parsed.content) {
                agentTurns.push({
                  role: "user",
                  timestamp: entry.timestamp || "",
                  content: parsed.content,
                });
              }
            }
          } catch { continue; }
        }

        // Calculate cost for this subagent
        const estimatedCost = calculateCostFromUsage(usage, Object.keys(toolCalls).length > 0 ? undefined : undefined);

        subagents.push({
          agentId,
          type: agentType,
          slug: agentSlug,
          messageCount,
          toolCalls,
          totalToolCalls,
          startTime,
          endTime,
          usage,
          estimatedCostUsd: estimatedCost,
          turns: includeConversation ? consolidateTurns(agentTurns) : [],
        });
      } catch { continue; }
    }

    return subagents;
  } catch { return []; }
}

// ============================================================================
// Cost Calculation (from karma usage.py)
// ============================================================================

function calculateCostFromUsage(usage: TokenUsage, model?: string): number {
  const pricing = resolveModelPricing(model);

  const totalInput = usage.inputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
  const threshold = pricing.longContextThreshold || 0;
  const isLong = threshold > 0 && totalInput > threshold;

  const inputPrice = isLong ? (pricing.inputLong || pricing.input) : pricing.input;
  const outputPrice = isLong ? (pricing.outputLong || pricing.output) : pricing.output;

  const uncachedInputCost = (usage.inputTokens / 1_000_000) * inputPrice;
  const cacheWriteCost = (usage.cacheCreationInputTokens / 1_000_000) * inputPrice * CACHE_WRITE_MULTIPLIER;
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * inputPrice * CACHE_READ_MULTIPLIER;
  const outputCost = (usage.outputTokens / 1_000_000) * outputPrice;

  return uncachedInputCost + cacheWriteCost + cacheReadCost + outputCost;
}

// ============================================================================
// Turn Consolidation
// ============================================================================

function consolidateTurns(turns: Turn[]): Turn[] {
  const consolidated: Turn[] = [];

  for (const turn of turns) {
    const last = consolidated[consolidated.length - 1];

    if (turn.role === "assistant" && last?.role === "assistant") {
      if (turn.thinking && !last.thinking) last.thinking = turn.thinking;
      if (turn.content) {
        last.content = last.content ? `${last.content}\n\n${turn.content}` : turn.content;
      }
      if (turn.tools) {
        last.tools = [...(last.tools || []), ...turn.tools];
      }
      // Merge usage
      if (turn.usage && last.usage) {
        last.usage.inputTokens += turn.usage.inputTokens;
        last.usage.outputTokens += turn.usage.outputTokens;
        last.usage.cacheCreationInputTokens += turn.usage.cacheCreationInputTokens;
        last.usage.cacheReadInputTokens += turn.usage.cacheReadInputTokens;
      } else if (turn.usage) {
        last.usage = { ...turn.usage };
      }
    } else {
      consolidated.push({ ...turn });
    }
  }

  return consolidated;
}

// ============================================================================
// Stats Calculation
// ============================================================================

interface StatsContext {
  tokenUsage: TokenUsage;
  modelsUsed: Record<string, number>;
  allToolCalls: Record<string, number>;
  totalToolCallCount: number;
  compactionEvents: CompactionEvent[];
  fileOperations: FileOperation[];
  tasks: TaskItem[];
  subagents: SubagentInfo[];
  sessionTitle?: string;
  isResumed: boolean;
  leafUuid?: string;
  slug?: string;
  permissionMode?: string;
  version?: string;
}

function calculateStats(turns: Turn[], ctx: StatsContext): SessionStats {
  let thinkingBlocks = 0;
  let userTurns = 0;
  let assistantTurns = 0;
  const skillsUsed = new Set<string>();
  const agentsUsed = new Set<string>();

  for (const turn of turns) {
    if (turn.role === "user") userTurns++;
    if (turn.role === "assistant") assistantTurns++;
    if (turn.thinking) thinkingBlocks++;
    if (turn.tools) {
      for (const tool of turn.tools) {
        if (tool.name === "Skill" && tool.input.skill) {
          skillsUsed.add(tool.input.skill as string);
        }
        if ((tool.name === "Task" || tool.name === "Agent") && tool.input.subagent_type) {
          agentsUsed.add(tool.input.subagent_type as string);
        }
      }
    }
  }

  // Duration
  const timestamps = turns.map((t) => new Date(t.timestamp).getTime()).filter((t) => !isNaN(t));
  const durationMinutes = timestamps.length > 1
    ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60000)
    : 0;

  // Cache hit rate
  const totalCacheable = ctx.tokenUsage.inputTokens + ctx.tokenUsage.cacheCreationInputTokens + ctx.tokenUsage.cacheReadInputTokens;
  const cacheHitRate = totalCacheable > 0 ? ctx.tokenUsage.cacheReadInputTokens / totalCacheable : 0;

  // Model categorization
  const modelsCategorized: Record<string, number> = {};
  for (const [model, count] of Object.entries(ctx.modelsUsed)) {
    const cat = categorizeModel(model);
    modelsCategorized[cat] = (modelsCategorized[cat] || 0) + count;
  }

  // Primary model
  const primaryModel = Object.entries(ctx.modelsUsed).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Work mode distribution
  const workMode = calculateWorkMode(ctx.allToolCalls);

  // Cost calculation
  const estimatedCostUsd = calculateCostFromUsage(ctx.tokenUsage, primaryModel);

  // Add subagent costs
  const totalSubagentCost = ctx.subagents.reduce((sum, s) => sum + s.estimatedCostUsd, 0);

  // File lists
  const filesModified = [...new Set(ctx.fileOperations.filter(op => op.operation === "write" || op.operation === "edit").map(op => op.path))];
  const filesRead = [...new Set(ctx.fileOperations.filter(op => op.operation === "read").map(op => op.path))];

  // Task stats
  const tasksCompleted = ctx.tasks.filter(t => t.status === "completed").length;
  const tasksPending = ctx.tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;

  return {
    totalTurns: turns.length,
    userTurns,
    assistantTurns,
    thinkingBlocks,
    durationMinutes,

    toolCalls: ctx.allToolCalls,
    totalToolCalls: ctx.totalToolCallCount,
    skillsUsed: [...skillsUsed],
    agentsUsed: [...agentsUsed],

    tokenUsage: ctx.tokenUsage,
    estimatedCostUsd: Math.round((estimatedCostUsd + totalSubagentCost) * 10000) / 10000,
    cacheHitRate: Math.round(cacheHitRate * 10000) / 10000,

    modelsUsed: ctx.modelsUsed,
    modelsCategorized,
    primaryModel,

    workMode,
    fileOperations: ctx.fileOperations,
    filesModified,
    filesRead,

    compactionEvents: ctx.compactionEvents,
    wasCompacted: ctx.compactionEvents.length > 0,
    totalCompactions: ctx.compactionEvents.length,

    tasks: ctx.tasks,
    tasksCompleted,
    tasksPending,

    subagents: ctx.subagents,
    totalSubagents: ctx.subagents.length,

    sessionTitle: ctx.sessionTitle,
    isResumed: ctx.isResumed,
    leafUuid: ctx.leafUuid,
    slug: ctx.slug,
    permissionMode: ctx.permissionMode,
    version: ctx.version,
  };
}

function calculateWorkMode(toolCalls: Record<string, number>): WorkModeDistribution {
  let explorationCount = 0, buildingCount = 0, testingCount = 0;

  for (const [tool, count] of Object.entries(toolCalls)) {
    if (EXPLORATION_TOOLS.has(tool)) explorationCount += count;
    else if (BUILDING_TOOLS.has(tool)) buildingCount += count;
    else if (TESTING_TOOLS.has(tool)) testingCount += count;
  }

  const total = explorationCount + buildingCount + testingCount;
  if (total === 0) {
    return { explorationPct: 0, buildingPct: 0, testingPct: 0, primaryMode: "Unknown", explorationCount: 0, buildingCount: 0, testingCount: 0 };
  }

  const explorationPct = Math.round((explorationCount / total) * 1000) / 10;
  const buildingPct = Math.round((buildingCount / total) * 1000) / 10;
  const testingPct = Math.round((testingCount / total) * 1000) / 10;

  const modes: [number, string][] = [[explorationPct, "Exploration"], [buildingPct, "Building"], [testingPct, "Testing"]];
  const primaryMode = modes.sort((a, b) => b[0] - a[0])[0][1];

  return { explorationPct, buildingPct, testingPct, primaryMode, explorationCount, buildingCount, testingCount };
}

// ============================================================================
// Diary Generation
// ============================================================================

function generateDiary(turns: Turn[], stats: SessionStats): DiaryEntry {
  const workDone: string[] = [];

  for (const turn of turns) {
    if (turn.role === "user" && turn.content.length > 10) {
      const firstLine = turn.content.split("\n")[0].slice(0, 100);
      if (firstLine && !firstLine.startsWith("<")) {
        workDone.push(firstLine);
      }
    }
  }

  const topTools = Object.entries(stats.toolCalls)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}(${count})`)
    .join(", ");

  const firstUserTurn = turns.find((t) => t.role === "user");
  const taskSummary = firstUserTurn?.content.split("\n")[0].slice(0, 200) || "Unknown task";

  const costStr = stats.estimatedCostUsd > 0 ? `$${stats.estimatedCostUsd.toFixed(2)}` : "unknown";
  const workModeStr = stats.workMode.primaryMode !== "Unknown"
    ? `${stats.workMode.primaryMode} (${stats.workMode.explorationPct}% explore, ${stats.workMode.buildingPct}% build, ${stats.workMode.testingPct}% test)`
    : "Unknown";

  return {
    taskSummary,
    workDone: workDone.slice(0, 10),
    filesModified: stats.filesModified,
    filesRead: stats.filesRead.slice(0, 20),
    toolsUsedSummary: topTools,
    costSummary: costStr,
    workModeSummary: workModeStr,
  };
}

// ============================================================================
// Formatting
// ============================================================================

function formatSession(
  session: Session,
  options: { verbose?: boolean; statsOnly?: boolean; diaryOnly?: boolean; full?: boolean },
): string {
  const lines: string[] = [];
  const s = session.stats;

  // ── Header ──
  lines.push(`\n${"=".repeat(72)}`);
  lines.push(`# Session: ${session.sessionId.slice(0, 8)}${s.sessionTitle ? ` — ${s.sessionTitle}` : ""}`);
  lines.push(`${"=".repeat(72)}`);
  lines.push(`Date: ${session.date} | Duration: ${s.durationMinutes}min | Branch: ${session.gitBranch || "unknown"}`);
  lines.push(`Project: ${session.project}`);
  if (session.slug) lines.push(`Slug: ${session.slug}`);
  if (s.primaryModel) lines.push(`Model: ${s.primaryModel} (${categorizeModel(s.primaryModel)})`);
  if (s.permissionMode) lines.push(`Permission: ${s.permissionMode}`);
  if (s.isResumed) lines.push(`[RESUMED SESSION]`);
  if (s.wasCompacted) lines.push(`[COMPACTED ${s.totalCompactions}x]${s.compactionEvents.map(e => ` ${e.trigger || ""}${e.preTokens ? ` @${(e.preTokens/1000).toFixed(0)}k tokens` : ""}`).join(",")}`);

  // ── Summary / Diary ──
  if (session.diary) {
    lines.push(`\n## Summary`);
    lines.push(`**Task:** ${session.diary.taskSummary}`);
    lines.push(`**Cost:** ${session.diary.costSummary} | **Work Mode:** ${session.diary.workModeSummary}`);

    if (session.diary.filesModified.length > 0) {
      lines.push(`**Files modified (${session.diary.filesModified.length}):**`);
      for (const file of session.diary.filesModified.slice(0, 15)) {
        lines.push(`  - ${file}`);
      }
      if (session.diary.filesModified.length > 15) lines.push(`  ... and ${session.diary.filesModified.length - 15} more`);
    }
    if (session.diary.filesRead.length > 0) {
      lines.push(`**Files read (${session.diary.filesRead.length}):**`);
      for (const file of session.diary.filesRead.slice(0, 10)) {
        lines.push(`  - ${file}`);
      }
      if (session.diary.filesRead.length > 10) lines.push(`  ... and ${session.diary.filesRead.length - 10} more`);
    }
    if (session.diary.workDone.length > 0) {
      lines.push(`**Work items:**`);
      for (const item of session.diary.workDone.slice(0, 5)) {
        lines.push(`  - ${item}`);
      }
    }
  }

  if (options.diaryOnly) return lines.join("\n");

  // ── Stats ──
  lines.push(`\n## Stats`);
  lines.push(`- Turns: ${s.userTurns} user, ${s.assistantTurns} assistant`);
  lines.push(`- Tool calls: ${s.totalToolCalls}`);
  if (Object.keys(s.toolCalls).length > 0) {
    const topTools = Object.entries(s.toolCalls)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    lines.push(`- Top tools: ${topTools}`);
  }

  // Token usage
  const tu = s.tokenUsage;
  const totalTokens = tu.inputTokens + tu.outputTokens + tu.cacheCreationInputTokens + tu.cacheReadInputTokens;
  if (totalTokens > 0) {
    lines.push(`- Tokens: ${(totalTokens / 1000).toFixed(1)}k total (${(tu.inputTokens / 1000).toFixed(1)}k in, ${(tu.outputTokens / 1000).toFixed(1)}k out, ${(tu.cacheReadInputTokens / 1000).toFixed(1)}k cache-read, ${(tu.cacheCreationInputTokens / 1000).toFixed(1)}k cache-write)`);
    lines.push(`- Cache hit rate: ${(s.cacheHitRate * 100).toFixed(1)}%`);
    lines.push(`- Estimated cost: $${s.estimatedCostUsd.toFixed(2)}`);
  }

  // Models
  if (Object.keys(s.modelsCategorized).length > 0) {
    const modelStr = Object.entries(s.modelsCategorized)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}(${count})`)
      .join(", ");
    lines.push(`- Models: ${modelStr}`);
  }

  // Work mode
  if (s.workMode.primaryMode !== "Unknown") {
    lines.push(`- Work mode: ${s.workMode.primaryMode} — ${s.workMode.explorationPct}% explore, ${s.workMode.buildingPct}% build, ${s.workMode.testingPct}% test`);
  }

  // Skills and Agents
  if (s.skillsUsed.length > 0) lines.push(`- Skills: ${s.skillsUsed.join(", ")}`);
  if (s.agentsUsed.length > 0) lines.push(`- Agents: ${s.agentsUsed.join(", ")}`);

  // Tasks
  if (s.tasks.length > 0) {
    lines.push(`\n## Tasks (${s.tasksCompleted}/${s.tasks.length} completed)`);
    for (const task of s.tasks) {
      const status = task.status === "completed" ? "[x]" : task.status === "in_progress" ? "[~]" : "[ ]";
      lines.push(`  ${status} ${task.id}. ${task.subject}${task.description ? ` — ${task.description.slice(0, 80)}` : ""}`);
    }
  }

  // Subagents
  if (s.subagents.length > 0) {
    lines.push(`\n## Subagents (${s.totalSubagents})`);
    for (const sub of s.subagents) {
      const costStr = sub.estimatedCostUsd > 0 ? ` $${sub.estimatedCostUsd.toFixed(2)}` : "";
      const toolStr = Object.entries(sub.toolCalls)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([n, c]) => `${n}(${c})`)
        .join(", ");
      lines.push(`  - ${sub.type || sub.agentId}: ${sub.messageCount} msgs, ${sub.totalToolCalls} tools [${toolStr}]${costStr}`);
    }
  }

  // Compaction details
  if (s.compactionEvents.length > 0 && options.verbose) {
    lines.push(`\n## Compaction Events`);
    for (const evt of s.compactionEvents) {
      lines.push(`  - ${evt.timestamp}: ${evt.trigger || "unknown"} trigger${evt.preTokens ? `, ${(evt.preTokens/1000).toFixed(0)}k tokens before` : ""}`);
    }
  }

  if (options.statsOnly) return lines.join("\n");

  // ── Conversation ──
  lines.push(`\n## Conversation\n`);

  for (const turn of session.turns) {
    if (turn.role === "user") {
      lines.push(`### User\n`);
      lines.push(turn.content);
      lines.push("");
    } else {
      lines.push(`### Assistant${turn.model ? ` [${categorizeModel(turn.model)}]` : ""}\n`);

      if (options.verbose && turn.thinking) {
        lines.push(`<thinking>\n${turn.thinking}\n</thinking>\n`);
      }

      if (turn.content) {
        lines.push(turn.content);
        lines.push("");
      }

      if (turn.tools && turn.tools.length > 0) {
        for (const tool of turn.tools) {
          lines.push(`**Tool: ${tool.name}**`);

          const inputStr = formatToolInput(tool.name, tool.input);
          if (inputStr) {
            lines.push("```");
            lines.push(inputStr);
            lines.push("```");
          }

          if (tool.result) {
            const maxLen = options.full ? 10000 : 2000;
            const resultPreview = tool.result.length > maxLen ? tool.result.slice(0, maxLen) + "..." : tool.result;
            lines.push(`Result: ${resultPreview}`);
          }
          lines.push("");
        }
      }
    }
  }

  // ── Subagent Conversations (--full only) ──
  if (options.full && s.subagents.length > 0) {
    for (const sub of s.subagents) {
      if (sub.turns.length > 0) {
        lines.push(`\n## Subagent: ${sub.type || sub.agentId}\n`);
        for (const turn of sub.turns) {
          if (turn.role === "user") {
            lines.push(`### [Sub] User\n`);
            lines.push(turn.content);
            lines.push("");
          } else {
            lines.push(`### [Sub] Assistant${turn.model ? ` [${categorizeModel(turn.model)}]` : ""}\n`);
            if (options.verbose && turn.thinking) {
              lines.push(`<thinking>\n${turn.thinking}\n</thinking>\n`);
            }
            if (turn.content) { lines.push(turn.content); lines.push(""); }
            if (turn.tools) {
              for (const tool of turn.tools) {
                lines.push(`**Tool: ${tool.name}**`);
                const inputStr = formatToolInput(tool.name, tool.input);
                if (inputStr) { lines.push("```"); lines.push(inputStr); lines.push("```"); }
                if (tool.result) {
                  const preview = tool.result.length > 1000 ? tool.result.slice(0, 1000) + "..." : tool.result;
                  lines.push(`Result: ${preview}`);
                }
                lines.push("");
              }
            }
          }
        }
      }
    }
  }

  return lines.join("\n");
}

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return `file: ${input.file_path}${input.offset ? ` offset:${input.offset}` : ""}${input.limit ? ` limit:${input.limit}` : ""}`;
    case "Write":
      return `file: ${input.file_path}\ncontent: ${(input.content as string)?.slice(0, 200)}...`;
    case "Edit":
      return `file: ${input.file_path}\nold: ${(input.old_string as string)?.slice(0, 100)}...\nnew: ${(input.new_string as string)?.slice(0, 100)}...`;
    case "Bash":
      return `$ ${input.command}${input.timeout ? ` (timeout: ${input.timeout}ms)` : ""}${input.run_in_background ? " [background]" : ""}`;
    case "Glob":
      return `pattern: ${input.pattern}${input.path ? `, path: ${input.path}` : ""}`;
    case "Grep":
      return `pattern: ${input.pattern}${input.path ? `, path: ${input.path}` : ""}${input.glob ? `, glob: ${input.glob}` : ""}`;
    case "Task":
    case "Agent":
      return `agent: ${input.subagent_type || "general-purpose"}\nprompt: ${(input.prompt as string)?.slice(0, 300)}...${input.model ? `\nmodel: ${input.model}` : ""}${input.run_in_background ? "\n[background]" : ""}`;
    case "Skill":
      return `skill: ${input.skill}${input.args ? `\nargs: ${input.args}` : ""}`;
    case "TaskCreate":
      return `subject: ${input.subject}\ndescription: ${(input.description as string)?.slice(0, 150)}`;
    case "TaskUpdate":
      return `task: ${input.taskId} → ${input.status || ""}${input.subject ? ` "${input.subject}"` : ""}`;
    case "TodoWrite": {
      const todos = input.todos as Array<{ content: string; status: string }>;
      if (todos) return todos.map((t) => `[${t.status}] ${t.content}`).join("\n");
      return JSON.stringify(input);
    }
    case "WebFetch":
      return `url: ${input.url}${input.prompt ? `\nprompt: ${(input.prompt as string)?.slice(0, 100)}` : ""}`;
    case "WebSearch":
      return `query: ${input.query}`;
    case "NotebookEdit":
      return `notebook: ${input.notebook_path}\ncell: ${input.cell_number} (${input.new_source ? "edit" : "insert"})`;
    default:
      return JSON.stringify(input, null, 2);
  }
}

// ============================================================================
// Session File Discovery
// ============================================================================

function getSessionFiles(projectFolder: string, limit?: number): string[] {
  const files = readdirSync(projectFolder)
    .filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"))
    .map((f) => ({
      path: join(projectFolder, f),
      mtime: statSync(join(projectFolder, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const selected = limit ? files.slice(0, limit) : files;
  return selected.map((f) => f.path);
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const target = args[0];
const isJson = args.includes("--json");
const verbose = args.includes("--verbose") || args.includes("-v");
const statsOnly = args.includes("--stats-only");
const diaryOnly = args.includes("--diary");
const full = args.includes("--full");
const lastIndex = args.indexOf("--last");
const limit = lastIndex !== -1 ? parseInt(args[lastIndex + 1]) : undefined;

if (!target) {
  console.log(`Usage:
  bun run extract-session.ts <session-file.jsonl>
  bun run extract-session.ts <project-folder> [options]

Options:
  --last N       Only process last N sessions (by date)
  --json         Output as JSON (for piping to other tools)
  --verbose      Include thinking blocks and compaction details
  --stats-only   Only show statistics, not full conversation
  --diary        Only show diary summary
  --full         Include subagent conversations and longer tool results

Data extracted:
  - Full conversation (noise-filtered, system tags stripped)
  - Token usage & estimated cost (with model-specific pricing)
  - Work mode distribution (exploration/building/testing)
  - Subagent transcripts and activity
  - Task tracking (with dependency reconstruction)
  - Compaction events (auto/manual, token counts)
  - Session chain detection (resumed sessions)
  - File operations (reads, writes, edits)
  - Model distribution (Opus/Sonnet/Haiku)
  - Cache hit rates
  - Session titles
`);
  process.exit(1);
}

const resolvedTarget = resolveSessionFolder(target);

if (!existsSync(resolvedTarget)) {
  console.error("Path not found:", target);
  console.error("Resolved to:", resolvedTarget);
  console.error("\nMake sure you have Claude Code sessions for this project.");
  process.exit(1);
}

const stat = statSync(resolvedTarget);
const files = stat.isDirectory() ? getSessionFiles(resolvedTarget, limit) : [resolvedTarget];

const sessions: Session[] = [];

for (const file of files) {
  const session = parseSessionFile(file, { full });
  if (session) sessions.push(session);
}

if (isJson) {
  console.log(JSON.stringify(sessions, null, 2));
} else {
  // Print aggregate summary when multiple sessions
  if (sessions.length > 1) {
    const totalCost = sessions.reduce((s, ses) => s + ses.stats.estimatedCostUsd, 0);
    const totalTokens = sessions.reduce((s, ses) => {
      const u = ses.stats.tokenUsage;
      return s + u.inputTokens + u.outputTokens + u.cacheCreationInputTokens + u.cacheReadInputTokens;
    }, 0);
    const totalDuration = sessions.reduce((s, ses) => s + ses.stats.durationMinutes, 0);
    const totalToolCalls = sessions.reduce((s, ses) => s + ses.stats.totalToolCalls, 0);
    const totalSubagents = sessions.reduce((s, ses) => s + ses.stats.totalSubagents, 0);

    // Aggregate work mode
    const aggToolCalls: Record<string, number> = {};
    for (const ses of sessions) {
      for (const [tool, count] of Object.entries(ses.stats.toolCalls)) {
        aggToolCalls[tool] = (aggToolCalls[tool] || 0) + count;
      }
    }
    const aggWorkMode = calculateWorkMode(aggToolCalls);

    // Aggregate models
    const aggModels: Record<string, number> = {};
    for (const ses of sessions) {
      for (const [cat, count] of Object.entries(ses.stats.modelsCategorized)) {
        aggModels[cat] = (aggModels[cat] || 0) + count;
      }
    }

    console.log(`\n${"=".repeat(72)}`);
    console.log(`# Extracted ${sessions.length} session(s)`);
    console.log(`${"=".repeat(72)}`);
    console.log(`Total: ${totalDuration}min | ${(totalTokens/1000).toFixed(0)}k tokens | $${totalCost.toFixed(2)} | ${totalToolCalls} tool calls | ${totalSubagents} subagents`);
    console.log(`Work mode: ${aggWorkMode.explorationPct}% explore, ${aggWorkMode.buildingPct}% build, ${aggWorkMode.testingPct}% test (${aggWorkMode.primaryMode})`);
    if (Object.keys(aggModels).length > 0) {
      console.log(`Models: ${Object.entries(aggModels).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}(${v})`).join(", ")}`);
    }
    console.log("");
  }

  for (const session of sessions) {
    console.log(formatSession(session, { verbose, statsOnly, diaryOnly, full }));
  }
}
