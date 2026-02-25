#!/usr/bin/env bun
/**
 * Extract conversations from Claude Code sessions for learning and reflection
 *
 * Design principles:
 * - No information loss - every piece of context matters for learning
 * - Signal over noise - clean output, highlight what matters
 * - Consolidated turns - group related messages into logical units
 *
 * Usage:
 *   bun run extract-session.ts <session-file>
 *   bun run extract-session.ts <project-folder> [--last N] [--json] [--stats-only]
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, resolve } from "path";

const PROJECTS_DIR = join(process.env.HOME || "", ".claude", "projects");

/**
 * Convert a real filesystem path to Claude Code session folder path
 * e.g., /Users/username/projects/myapp → ~/.claude/projects/-Users-username-projects-myapp
 */
function resolveSessionFolder(inputPath: string): string {
  const absolutePath = resolve(inputPath);

  // If already a session folder path (inside ~/.claude/projects/), use directly
  if (absolutePath.startsWith(PROJECTS_DIR)) {
    return absolutePath;
  }

  // Convert project path to session folder name
  const folderName = absolutePath
    .replace(/\/\./g, "--") // /. → --
    .replace(/\//g, "-"); // / → -

  const sessionFolder = join(PROJECTS_DIR, folderName);

  // Check if session folder exists
  if (existsSync(sessionFolder)) {
    return sessionFolder;
  }

  // Try partial match for subdirectories
  if (existsSync(PROJECTS_DIR)) {
    const folders = readdirSync(PROJECTS_DIR);
    const match = folders.find((f) => folderName.startsWith(f) || f.startsWith(folderName));
    if (match) {
      return join(PROJECTS_DIR, match);
    }
  }

  // Return original path if no session folder found (might be direct session folder)
  return absolutePath;
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
}

interface SessionStats {
  totalTurns: number;
  userTurns: number;
  assistantTurns: number;
  toolCalls: Record<string, number>;
  totalToolCalls: number;
  thinkingBlocks: number;
  durationMinutes: number;
  skillsUsed: string[];
  agentsUsed: string[];
}

interface DiaryEntry {
  taskSummary: string;
  workDone: string[];
  filesModified: string[];
  toolsUsedSummary: string;
  keyDecisions: string[];
  challenges: string[];
  outcomes: string[];
}

interface Session {
  sessionId: string;
  file: string;
  date: string;
  project: string;
  gitBranch?: string;
  turns: Turn[];
  stats: SessionStats;
  diary?: DiaryEntry;
}

interface RawEntry {
  type: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  isMeta?: boolean;
}

function parseSessionFile(filePath: string): Session | null {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const turns: Turn[] = [];
  let sessionId = "";
  let project = "";
  let gitBranch = "";
  const pendingToolResults = new Map<string, string>();

  for (const line of lines) {
    try {
      const entry: RawEntry = JSON.parse(line);

      // Skip metadata entries
      if (
        entry.type === "file-history-snapshot" ||
        entry.type === "queue-operation" ||
        entry.type === "progress" ||
        entry.type === "summary" ||
        entry.isMeta === true
      ) {
        continue;
      }

      sessionId = entry.sessionId || sessionId;
      project = entry.cwd || project;
      gitBranch = entry.gitBranch || gitBranch;

      if (entry.type === "user") {
        const parsed = parseUserMessage(entry.message?.content, pendingToolResults);
        if (parsed.content || parsed.toolResults.length > 0) {
          // If this is a tool result, attach it to the previous assistant turn
          if (parsed.toolResults.length > 0 && turns.length > 0) {
            const lastTurn = turns[turns.length - 1];
            if (lastTurn.role === "assistant" && lastTurn.tools) {
              for (const result of parsed.toolResults) {
                const tool = lastTurn.tools.find((t) => t.id === result.id);
                if (tool) {
                  tool.result = result.content;
                }
              }
            }
          }
          // If there's actual user content, add as new turn
          if (parsed.content) {
            turns.push({
              role: "user",
              timestamp: entry.timestamp || "",
              content: parsed.content,
            });
          }
        }
      } else if (entry.type === "assistant") {
        const parsed = parseAssistantMessage(entry.message?.content);
        // Merge with previous assistant turn if it's a continuation (same logical response)
        const lastTurn = turns[turns.length - 1];
        if (lastTurn?.role === "assistant" && !parsed.content && parsed.tools?.length) {
          // Just tools, merge with previous
          lastTurn.tools = [...(lastTurn.tools || []), ...parsed.tools];
          if (parsed.thinking && !lastTurn.thinking) {
            lastTurn.thinking = parsed.thinking;
          }
        } else if (parsed.content || parsed.thinking || parsed.tools?.length) {
          turns.push({
            role: "assistant",
            timestamp: entry.timestamp || "",
            thinking: parsed.thinking,
            content: parsed.content,
            tools: parsed.tools,
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

  // Calculate stats
  const stats = calculateStats(consolidatedTurns);

  // Generate diary entry
  const diary = generateDiary(consolidatedTurns, stats);

  return {
    sessionId,
    file: basename(filePath),
    date: consolidatedTurns[0]?.timestamp
      ? new Date(consolidatedTurns[0].timestamp).toLocaleDateString()
      : "unknown",
    project,
    gitBranch,
    turns: consolidatedTurns,
    stats,
    diary,
  };
}

function parseUserMessage(
  content: unknown,
  _pendingResults: Map<string, string>,
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

function consolidateTurns(turns: Turn[]): Turn[] {
  const consolidated: Turn[] = [];

  for (const turn of turns) {
    const last = consolidated[consolidated.length - 1];

    // Merge consecutive assistant turns
    if (turn.role === "assistant" && last?.role === "assistant") {
      if (turn.thinking && !last.thinking) {
        last.thinking = turn.thinking;
      }
      if (turn.content) {
        last.content = last.content ? `${last.content}\n\n${turn.content}` : turn.content;
      }
      if (turn.tools) {
        last.tools = [...(last.tools || []), ...turn.tools];
      }
    } else {
      consolidated.push({ ...turn });
    }
  }

  return consolidated;
}

function calculateStats(turns: Turn[]): SessionStats {
  const toolCalls: Record<string, number> = {};
  let totalToolCalls = 0;
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
        toolCalls[tool.name] = (toolCalls[tool.name] || 0) + 1;
        totalToolCalls++;

        // Track skills used
        if (tool.name === "Skill" && tool.input.skill) {
          skillsUsed.add(tool.input.skill as string);
        }

        // Track agents used
        if (tool.name === "Task" && tool.input.subagent_type) {
          agentsUsed.add(tool.input.subagent_type as string);
        }
      }
    }
  }

  // Calculate duration
  const timestamps = turns.map((t) => new Date(t.timestamp).getTime()).filter((t) => !isNaN(t));
  const durationMinutes =
    timestamps.length > 1
      ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60000)
      : 0;

  return {
    totalTurns: turns.length,
    userTurns,
    assistantTurns,
    toolCalls,
    totalToolCalls,
    thinkingBlocks,
    durationMinutes,
    skillsUsed: [...skillsUsed],
    agentsUsed: [...agentsUsed],
  };
}

function generateDiary(turns: Turn[], stats: SessionStats): DiaryEntry {
  const filesModified = new Set<string>();
  const workDone: string[] = [];

  // Extract files modified from tool calls
  for (const turn of turns) {
    if (turn.tools) {
      for (const tool of turn.tools) {
        if (tool.name === "Write" || tool.name === "Edit") {
          const filePath = tool.input.file_path as string;
          if (filePath) filesModified.add(filePath);
        }
      }
    }
  }

  // Extract user requests as work items
  for (const turn of turns) {
    if (turn.role === "user" && turn.content.length > 10) {
      const firstLine = turn.content.split("\n")[0].slice(0, 100);
      if (firstLine && !firstLine.startsWith("<")) {
        workDone.push(firstLine);
      }
    }
  }

  // Generate tools summary
  const topTools = Object.entries(stats.toolCalls)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}(${count})`)
    .join(", ");

  // Get first user message as task summary
  const firstUserTurn = turns.find((t) => t.role === "user");
  const taskSummary = firstUserTurn?.content.split("\n")[0].slice(0, 200) || "Unknown task";

  return {
    taskSummary,
    workDone: workDone.slice(0, 10),
    filesModified: [...filesModified],
    toolsUsedSummary: topTools,
    keyDecisions: [], // To be filled by AI analysis
    challenges: [], // To be filled by AI analysis
    outcomes: [], // To be filled by AI analysis
  };
}

function formatSession(
  session: Session,
  options: { verbose?: boolean; statsOnly?: boolean; diaryOnly?: boolean },
): string {
  const lines: string[] = [];

  // Header
  lines.push(`\n# Session: ${session.sessionId.slice(0, 8)}`);
  lines.push(
    `Date: ${session.date} | Duration: ${session.stats.durationMinutes}min | Branch: ${session.gitBranch || "unknown"}`,
  );
  lines.push(`Project: ${session.project}`);

  // Diary summary (always shown first for quick overview)
  if (session.diary) {
    lines.push(`\n## Summary`);
    lines.push(`**Task:** ${session.diary.taskSummary}`);
    if (session.diary.filesModified.length > 0) {
      lines.push(`**Files modified:** ${session.diary.filesModified.length}`);
      for (const file of session.diary.filesModified.slice(0, 10)) {
        lines.push(`  - ${file}`);
      }
    }
    if (session.diary.workDone.length > 0) {
      lines.push(`**Work items:**`);
      for (const item of session.diary.workDone.slice(0, 5)) {
        lines.push(`  - ${item}`);
      }
    }
  }

  // Stats summary
  lines.push(`\n## Stats`);
  lines.push(`- Turns: ${session.stats.userTurns} user, ${session.stats.assistantTurns} assistant`);
  lines.push(`- Tool calls: ${session.stats.totalToolCalls}`);
  if (Object.keys(session.stats.toolCalls).length > 0) {
    const topTools = Object.entries(session.stats.toolCalls)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}(${count})`)
      .join(", ");
    lines.push(`- Top tools: ${topTools}`);
  }

  // Skills and Agents
  if (session.stats.skillsUsed.length > 0) {
    lines.push(`- Skills: ${session.stats.skillsUsed.join(", ")}`);
  }
  if (session.stats.agentsUsed.length > 0) {
    lines.push(`- Agents: ${session.stats.agentsUsed.join(", ")}`);
  }

  if (options.statsOnly || options.diaryOnly) {
    return lines.join("\n");
  }

  // Conversation
  lines.push(`\n## Conversation\n`);

  for (const turn of session.turns) {
    if (turn.role === "user") {
      lines.push(`### 👤 User\n`);
      lines.push(turn.content);
      lines.push("");
    } else {
      lines.push(`### 🤖 Assistant\n`);

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

          // Format input based on tool type
          const inputStr = formatToolInput(tool.name, tool.input);
          if (inputStr) {
            lines.push("```");
            lines.push(inputStr);
            lines.push("```");
          }

          // Show result if available (truncated for readability)
          if (tool.result) {
            const resultPreview =
              tool.result.length > 500 ? tool.result.slice(0, 500) + "..." : tool.result;
            lines.push(`Result: ${resultPreview}`);
          }
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return `file: ${input.file_path}`;
    case "Write":
      return `file: ${input.file_path}\ncontent: ${(input.content as string)?.slice(0, 200)}...`;
    case "Edit":
      return `file: ${input.file_path}\nold: ${(input.old_string as string)?.slice(0, 100)}...\nnew: ${(input.new_string as string)?.slice(0, 100)}...`;
    case "Bash":
      return `$ ${input.command}`;
    case "Glob":
      return `pattern: ${input.pattern}${input.path ? `, path: ${input.path}` : ""}`;
    case "Grep":
      return `pattern: ${input.pattern}${input.path ? `, path: ${input.path}` : ""}`;
    case "Task":
      return `agent: ${input.subagent_type}\nprompt: ${(input.prompt as string)?.slice(0, 300)}...`;
    case "Skill":
      return `skill: ${input.skill}${input.args ? `\nargs: ${input.args}` : ""}`;
    case "TodoWrite": {
      const todos = input.todos as Array<{ content: string; status: string }>;
      if (todos) {
        return todos.map((t) => `[${t.status}] ${t.content}`).join("\n");
      }
      return JSON.stringify(input);
    }
    default:
      return JSON.stringify(input, null, 2);
  }
}

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

// Main
const args = process.argv.slice(2);
const target = args[0];
const isJson = args.includes("--json");
const verbose = args.includes("--verbose") || args.includes("-v");
const statsOnly = args.includes("--stats-only");
const diaryOnly = args.includes("--diary");
const lastIndex = args.indexOf("--last");
const limit = lastIndex !== -1 ? parseInt(args[lastIndex + 1]) : undefined;

if (!target) {
  console.log(`Usage:
  bun run extract-session.ts <session-file.jsonl>
  bun run extract-session.ts <project-folder> [--last N] [--json] [--verbose] [--stats-only] [--diary]

Options:
  --last N       Only process last N sessions (by date)
  --json         Output as JSON (for piping to other tools)
  --verbose      Include thinking blocks
  --stats-only   Only show statistics, not full conversation
  --diary        Only show diary summary (task, files, work items)
`);
  process.exit(1);
}

// Resolve target to session folder (handles both project paths and session folder paths)
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
  const session = parseSessionFile(file);
  if (session) sessions.push(session);
}

if (isJson) {
  console.log(JSON.stringify(sessions, null, 2));
} else {
  console.log(`\n# Extracted ${sessions.length} session(s)\n`);
  for (const session of sessions) {
    console.log(formatSession(session, { verbose, statsOnly, diaryOnly }));
  }
}
