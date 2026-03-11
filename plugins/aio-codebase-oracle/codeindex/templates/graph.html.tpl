<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FamilyBot - Code Graph</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a0e14;
    color: #b0bac5;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ---- TOOLBAR ---- */
  #toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px;
    background: linear-gradient(180deg, #111820 0%, #0f1419 100%);
    border-bottom: 1px solid #1e2630;
    flex-shrink: 0; z-index: 10;
  }
  #toolbar h1 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; font-weight: 600;
    color: #e6edf3; white-space: nowrap;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, #79c0ff 0%, #d2a8ff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .toolbar-sep { width: 1px; height: 24px; background: #1e2630; flex-shrink: 0; }

  #search-wrap {
    position: relative; display: flex; align-items: center;
  }
  #search-wrap .search-icon {
    position: absolute; left: 10px;
    color: #3d4752; font-size: 13px; pointer-events: none;
  }
  #search-wrap kbd {
    position: absolute; right: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #3d4752;
    border: 1px solid #1e2630; border-radius: 3px;
    padding: 1px 5px; pointer-events: none;
  }
  #search {
    background: #0a0e14; border: 1px solid #1e2630; border-radius: 8px;
    padding: 6px 40px 6px 30px; color: #b0bac5;
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    width: 220px; outline: none; transition: all 0.2s;
  }
  #search:focus { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(56,139,253,0.12); width: 280px; }
  #search::placeholder { color: #3d4752; }

  .module-toggles { display: flex; gap: 5px; flex-wrap: wrap; margin-left: auto; }
  .module-btn {
    padding: 4px 10px; border-radius: 20px;
    border: 1px solid; font-size: 11px;
    cursor: pointer; background: transparent;
    transition: all 0.2s; font-weight: 500;
    font-family: 'DM Sans', sans-serif;
  }
  .module-btn:hover { transform: translateY(-1px); filter: brightness(1.2); }
  .module-btn.inactive { opacity: 0.2; transform: none; }

  .toolbar-actions { display: flex; gap: 4px; margin-left: 8px; }
  .tool-btn {
    background: #111820; border: 1px solid #1e2630; border-radius: 6px;
    color: #536171; padding: 5px 8px; cursor: pointer;
    font-size: 12px; transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
    display: flex; align-items: center; gap: 4px;
  }
  .tool-btn:hover { color: #b0bac5; border-color: #2e3a46; background: #151d27; }

  /* ---- GRAPH ---- */
  #graph-container { flex: 1; position: relative; }
  svg { width: 100%; height: 100%; }

  /* ---- TOOLTIP ---- */
  #tooltip {
    position: absolute; pointer-events: none;
    background: rgba(17, 24, 32, 0.95);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid #1e2630; border-radius: 8px;
    padding: 10px 14px; z-index: 20;
    opacity: 0; transition: opacity 0.15s;
    max-width: 280px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  #tooltip.visible { opacity: 1; }
  #tooltip .tt-name {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; color: #e6edf3; font-weight: 500;
  }
  #tooltip .tt-module {
    font-size: 10px; margin-top: 3px; display: inline-block;
    padding: 1px 6px; border-radius: 8px;
  }
  #tooltip .tt-stats {
    font-size: 11px; color: #536171; margin-top: 6px;
    display: flex; gap: 12px;
  }
  #tooltip .tt-stats span { color: #8b949e; font-weight: 500; }
  #tooltip .tt-hint {
    font-size: 10px; color: #3d4752; margin-top: 6px;
    border-top: 1px solid #1e2630; padding-top: 5px;
  }

  /* ---- INFO PANEL ---- */
  #info-panel {
    position: absolute; top: 12px; right: 12px; width: 320px;
    background: rgba(17, 24, 32, 0.88);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid #1e2630; border-radius: 12px;
    padding: 20px; display: none; z-index: 15;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 1px rgba(88,166,255,0.1);
    max-height: calc(100vh - 140px); overflow-y: auto;
    transform: translateX(10px); opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
  #info-panel.open { display: block; transform: translateX(0); opacity: 1; }
  #info-panel h3 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px; color: #e6edf3; font-weight: 500;
    margin-bottom: 8px; word-break: break-all; line-height: 1.5;
  }
  #info-panel .close-btn {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: #3d4752;
    cursor: pointer; font-size: 18px; line-height: 1;
    transition: color 0.15s; border-radius: 4px;
    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  }
  #info-panel .close-btn:hover { color: #b0bac5; background: #1e2630; }
  .info-section { margin-bottom: 14px; }
  .info-section h4 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; text-transform: uppercase; color: #3d4752;
    margin-bottom: 6px; letter-spacing: 1px;
  }
  .info-metric {
    display: flex; justify-content: space-between;
    padding: 5px 0; font-size: 12px;
    border-bottom: 1px solid rgba(30,38,48,0.6);
  }
  .info-metric .label { color: #536171; }
  .info-metric .value { color: #e6edf3; font-weight: 600; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
  .info-tag {
    display: inline-block; padding: 2px 8px; border-radius: 12px;
    font-size: 10px; margin: 2px 2px 2px 0;
    font-family: 'JetBrains Mono', monospace;
  }
  .dep-list { font-size: 11px; color: #536171; }
  .dep-list div { padding: 3px 0; display: flex; align-items: center; gap: 2px; }
  .dep-list .dep-arrow { color: #3d4752; margin: 0 4px; font-size: 10px; }
  .dep-list .dep-weight {
    color: #58a6ff; font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ---- MINIMAP ---- */
  #minimap {
    position: absolute; bottom: 56px; right: 12px;
    width: 160px; height: 100px;
    background: rgba(17, 24, 32, 0.85);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border: 1px solid #1e2630; border-radius: 8px;
    overflow: hidden; z-index: 5;
    cursor: pointer;
  }
  #minimap svg { width: 100%; height: 100%; }
  #minimap .viewport-rect {
    fill: rgba(88,166,255,0.08);
    stroke: #58a6ff; stroke-width: 1.5; stroke-opacity: 0.5;
  }

  /* ---- STATS BAR ---- */
  #stats-bar {
    display: flex; gap: 24px;
    padding: 8px 16px;
    background: linear-gradient(180deg, #0f1419 0%, #111820 100%);
    border-top: 1px solid #1e2630;
    flex-shrink: 0; font-size: 12px;
  }
  .stat { display: flex; gap: 6px; align-items: center; }
  .stat .stat-label { color: #3d4752; font-size: 11px; }
  .stat .stat-value {
    color: #e6edf3; font-weight: 600;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
  }
  .stat .stat-value.warn { color: #f0883e; }

  /* ---- LEGEND ---- */
  .legend {
    position: absolute; bottom: 56px; left: 12px;
    background: rgba(17, 24, 32, 0.85);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    border: 1px solid #1e2630; border-radius: 8px;
    padding: 10px 14px; font-size: 11px; z-index: 5;
    transition: opacity 0.2s;
  }
  .legend-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; color: #3d4752; margin-left: auto;
  }

  /* ---- SVG ELEMENTS ---- */
  .node-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; fill: #8b949e;
    pointer-events: none; text-anchor: middle; font-weight: 400;
    transition: fill-opacity 0.3s;
  }
  .link { fill: none; transition: stroke-opacity 0.3s, stroke 0.3s; }
  circle { transition: fill-opacity 0.3s, stroke-opacity 0.3s; }

  /* ---- HUB PULSE ---- */
  @keyframes hub-ring {
    0% { stroke-opacity: 0.6; r: inherit; }
    100% { stroke-opacity: 0; }
  }

  /* ---- KEYBOARD HINT ---- */
  #keyboard-hint {
    position: absolute; bottom: 56px; left: 50%; transform: translateX(-50%);
    background: rgba(17, 24, 32, 0.9); border: 1px solid #1e2630;
    border-radius: 8px; padding: 6px 14px;
    font-size: 11px; color: #3d4752; z-index: 5;
    display: flex; gap: 16px;
    backdrop-filter: blur(8px);
    opacity: 0; transition: opacity 0.5s;
    pointer-events: none;
  }
  #keyboard-hint.show { opacity: 1; }
  #keyboard-hint kbd {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; background: #1e2630; border-radius: 3px;
    padding: 1px 5px; margin-right: 4px; color: #536171;
  }

  /* ---- SCROLLBAR ---- */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2630; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2e3a46; }
</style>
</head>
<body>

<div id="toolbar">
  <h1>Code Graph</h1>
  <div class="toolbar-sep"></div>
  <div id="search-wrap">
    <span class="search-icon">&#x1F50D;</span>
    <input type="text" id="search" placeholder="Search files or functions..." />
    <kbd>/</kbd>
  </div>
  <div class="module-toggles" id="module-toggles"></div>
  <div class="toolbar-actions">
    <button class="tool-btn" id="btn-fit" title="Fit to view (F)">&#x2922; Fit</button>
    <button class="tool-btn" id="btn-lock" title="Toggle layout lock (L)">&#x1F513;</button>
  </div>
</div>

<div id="graph-container">
  <svg id="graph"></svg>
  <div id="tooltip"></div>
  <div id="info-panel">
    <button class="close-btn" onclick="closePanel()">&times;</button>
    <div id="info-content"></div>
  </div>
  <div class="legend" id="legend"></div>
  <div id="minimap"><svg id="minimap-svg"></svg></div>
  <div id="keyboard-hint">
    <span><kbd>/</kbd> Search</span>
    <span><kbd>Esc</kbd> Close</span>
    <span><kbd>F</kbd> Fit view</span>
    <span><kbd>L</kbd> Lock layout</span>
  </div>
</div>

<div id="stats-bar"></div>

<script>
// ============ EMBEDDED DATA ============
const filesData = {
  "bots/dizzybot/tools/validate-documents.js": {"functions":15,"max_complexity":0,"hub_count":2,"community_ids":[0],"function_names":["validateTemplateField","validateRequiredFields","getDocumentType","validateStatus","validateNaming","validateDates","validatePaths","getInverseRelationType","parseDocument","validateBidirectionalLinks","validateDocument","findDocuments","generateSummary","main","printResults"]},
  "bots/dizzybot/tools/graph-stats.ts": {"functions":9,"max_complexity":0,"hub_count":3,"community_ids":[1,2,3,4,5,6],"function_names":["Relationship","Frontmatter","GraphStats","NodeInfo","normalizePath","dfs","calculateStats","findClusters","scanAllFiles"]},
  "bots/dizzybot/tools/graph-discover.ts": {"functions":8,"max_complexity":0,"hub_count":2,"community_ids":[7,8,9,10,11],"function_names":["Relationship","Frontmatter","GraphResult","Edge","normalizePath","discoverGraph","extractRelationships","getAbsolutePath"]},
  "src/access.ts": {"functions":4,"max_complexity":0,"hub_count":2,"community_ids":[12,13,14],"function_names":["parseThreadId","isAdmin","isRateLimited","isAllowed"]},
  "src/bot-context.ts": {"functions":5,"max_complexity":0,"hub_count":0,"community_ids":[15,16,17,18,19],"function_names":["ThreadSession","BotContext","PendingInputState","PendingEdit","BotInstance"]},
  "src/bot-loader.ts": {"functions":6,"max_complexity":0,"hub_count":0,"community_ids":[20],"function_names":["parseEnvFile","detectAdapters","parseStringIds","loadBotConfig","discoverBots","loadAllBots"]},
  "src/cards.ts": {"functions":10,"max_complexity":0,"hub_count":3,"community_ids":[14,21,22,23,24,25],"function_names":["QuestionOption","CardElement","ButtonElement","Question","CardChild","buildQuestionCard","getToolSummary","buildToolApprovalCard","todoIcon","buildTodoCard"]},
  "scripts/sync-bots.ts": {"functions":26,"max_complexity":0,"hub_count":4,"community_ids":[32,34,26,27,28,29,30],"function_names":["HostsConfig","SyncAction","FileInfo","SyncState","HostConfig","batchCopyFromServer","batchCopyToServer","showDiff","loadHostsConfig","getLocalFiles","hashFile","shouldIgnore","walk","validateBotName","getServerFiles","parseArgs","writeFileList","batchDeleteLocal","batchDeleteOnServer","calculateActions","updateSyncStateForFile","saveSyncState","loadSyncState","syncBot","main","ConflictResolution"]},
  "scripts/deploy.ts": {"functions":11,"max_complexity":0,"hub_count":1,"community_ids":[33,35,36,37],"function_names":["HostConfig","HostsConfig","log","parseArgs","validateName","ssh","loadHostsConfig","preFlight","buildLocally","deployToHost","main"]},
  "src/chat-tools.ts": {"functions":1,"max_complexity":0,"hub_count":0,"community_ids":[38],"function_names":["createChatToolsServer"]},
  "bots/dizzybot/tools/self-healing.js": {"functions":15,"max_complexity":0,"hub_count":4,"community_ids":[40],"function_names":["printResults","extractLinks","validateAllDocuments","getDocumentType","findOrphans","suggestParentDocuments","extractTitle","extractKeywords","calculateKeywordMatch","loadAllDocuments","healLinks","populateMissingFields","main","getFieldSuggestion","getConfidenceScore"]},
  "src/chat-handlers.ts": {"functions":1,"max_complexity":0,"hub_count":1,"community_ids":[12],"function_names":["registerChatHandlers"]},
  "src/input-resolver.ts": {"functions":2,"max_complexity":0,"hub_count":0,"community_ids":[12,14],"function_names":["resolveQuestionAnswer","resolveToolApproval"]},
  "src/claude-service.ts": {"functions":6,"max_complexity":0,"hub_count":0,"community_ids":[38,42,43,44,13],"function_names":["ClaudeStreamEvent","ClaudeContext","StreamClaudeParams","getLangfuse","flushTraces","streamClaude"]},
  "src/commands.ts": {"functions":11,"max_complexity":0,"hub_count":1,"community_ids":[12,45,14],"function_names":["CommandDeps","createCommandHandlers","cmdHelp","cmdClear","cmdStart","cmdCancel","cmdListen","handleCommand","handleProviderCommand","handleModelCommand","handleConfigCommand"]},
  "src/machine.ts": {"functions":1,"max_complexity":0,"hub_count":0,"community_ids":[46],"function_names":["ChatRequestMachine"]},
  "scripts/manage.ts": {"functions":7,"max_complexity":0,"hub_count":0,"community_ids":[48,49,33,47],"function_names":["HostConfig","HostsConfig","Command","usage","main","listBots","runSsh"]},
  "src/provider-manager.ts": {"functions":11,"max_complexity":0,"hub_count":1,"community_ids":[50,51,12,14],"function_names":["ProviderManager","constructor","getProvider","initSchema","setProvider","deleteProvider","listProviders","getDefaultProvider","setDefaultProvider","rowToProvider","close"]},
  "src/message-handler.ts": {"functions":2,"max_complexity":0,"hub_count":1,"community_ids":[14],"function_names":["saveAttachment","handleIncomingMessage"]},
  "src/scheduler-runner.ts": {"functions":8,"max_complexity":0,"hub_count":4,"community_ids":[41,52,53,14],"function_names":["createSchedulerSentMessage","executeScheduledTask","checkAndExecuteSchedules","toJSON","edit","removeReaction","addReaction","delete"]},
  "src/scheduler.ts": {"functions":21,"max_complexity":0,"hub_count":1,"community_ids":[64,13,14,52,54,55,56,57,58,59,60,61,62,63],"function_names":["CreateTaskInput","TaskScheduler","load","flush","getTask","pauseTask","mutateTask","createTask","getDueTasks","completeTask","cancelTask","reload","failTask","close","constructor","listTasks","updateSessionId","editTask","nextCronRun","resumeTask","completeExecution"]},
  "src/throttle.ts": {"functions":2,"max_complexity":0,"hub_count":0,"community_ids":[14],"function_names":["throttledEdit","flushPendingEdit"]},
  "src/renderer.ts": {"functions":5,"max_complexity":0,"hub_count":1,"community_ids":[65,14],"function_names":["ProgressSession","getCompleteSentences","buildProgressMessage","getToolDescription","buildCompletedResponse"]},
  "src/session.ts": {"functions":4,"max_complexity":0,"hub_count":1,"community_ids":[13,14],"function_names":["initSession","cleanupStaleSessions","cleanupSession","cleanupOldDataFiles"]},
  "src/types.ts": {"functions":15,"max_complexity":0,"hub_count":0,"community_ids":[66,67,68,69,70,71,72,73,74,75,76,77,78,79,80],"function_names":["ToolProgress","PendingInput","ChatRequestInput","ScheduledTask","BotConfig","ProviderConfig","ChatThread","ChatRequestContext","TokenUsage","TodoItem","ChatType","UserInputHandler","ChatRequestEvent","OpenDMFn","PermissionResult"]},
  "scripts/create.ts": {"functions":2,"max_complexity":0,"hub_count":0,"community_ids":[33],"function_names":["question","main"]},
  "bots/dizzybot/tools/graph-suggest.ts": {"functions":8,"max_complexity":0,"hub_count":0,"community_ids":[39,81,82,83,84,31],"function_names":["Relationship","NodeInfo","Frontmatter","Suggestion","normalizePath","extractTitle","scanGraph","findSuggestions"]},
  "src/index.ts": {"functions":6,"max_complexity":0,"hub_count":1,"community_ids":[13,14],"function_names":["createAdaptersForBot","createBot","main","stop","start","fetch"]}
};

const edgesData = [
  {"source":"scripts/sync-bots.ts","target":"scripts/deploy.ts","weight":4},
  {"source":"src/chat-handlers.ts","target":"src/commands.ts","weight":16},
  {"source":"src/chat-handlers.ts","target":"src/access.ts","weight":4},
  {"source":"src/chat-handlers.ts","target":"src/scheduler-runner.ts","weight":6},
  {"source":"src/chat-handlers.ts","target":"src/message-handler.ts","weight":2},
  {"source":"src/chat-handlers.ts","target":"src/input-resolver.ts","weight":4},
  {"source":"src/chat-handlers.ts","target":"src/provider-manager.ts","weight":2},
  {"source":"src/chat-handlers.ts","target":"src/session.ts","weight":2},
  {"source":"src/input-resolver.ts","target":"src/scheduler-runner.ts","weight":4},
  {"source":"src/input-resolver.ts","target":"src/cards.ts","weight":2},
  {"source":"src/claude-service.ts","target":"src/chat-tools.ts","weight":2},
  {"source":"src/commands.ts","target":"src/provider-manager.ts","weight":10},
  {"source":"src/commands.ts","target":"src/scheduler-runner.ts","weight":2},
  {"source":"src/commands.ts","target":"src/access.ts","weight":2},
  {"source":"src/commands.ts","target":"src/session.ts","weight":2},
  {"source":"scripts/manage.ts","target":"scripts/deploy.ts","weight":6},
  {"source":"src/message-handler.ts","target":"src/index.ts","weight":2},
  {"source":"src/message-handler.ts","target":"src/throttle.ts","weight":4},
  {"source":"src/message-handler.ts","target":"src/scheduler-runner.ts","weight":4},
  {"source":"src/message-handler.ts","target":"src/renderer.ts","weight":4},
  {"source":"src/message-handler.ts","target":"src/cards.ts","weight":6},
  {"source":"src/message-handler.ts","target":"src/session.ts","weight":4},
  {"source":"src/message-handler.ts","target":"src/input-resolver.ts","weight":4},
  {"source":"src/message-handler.ts","target":"src/access.ts","weight":2},
  {"source":"src/message-handler.ts","target":"src/provider-manager.ts","weight":2},
  {"source":"src/message-handler.ts","target":"src/commands.ts","weight":2},
  {"source":"src/scheduler-runner.ts","target":"src/throttle.ts","weight":4},
  {"source":"src/scheduler-runner.ts","target":"src/renderer.ts","weight":4},
  {"source":"src/scheduler-runner.ts","target":"src/session.ts","weight":4},
  {"source":"src/scheduler-runner.ts","target":"src/scheduler.ts","weight":10},
  {"source":"src/scheduler-runner.ts","target":"src/access.ts","weight":2},
  {"source":"src/scheduler-runner.ts","target":"src/provider-manager.ts","weight":2},
  {"source":"src/throttle.ts","target":"src/scheduler-runner.ts","weight":6},
  {"source":"src/session.ts","target":"src/scheduler-runner.ts","weight":4},
  {"source":"src/session.ts","target":"src/index.ts","weight":4},
  {"source":"src/session.ts","target":"src/provider-manager.ts","weight":2},
  {"source":"scripts/create.ts","target":"scripts/deploy.ts","weight":2},
  {"source":"src/index.ts","target":"src/commands.ts","weight":2},
  {"source":"src/index.ts","target":"src/scheduler.ts","weight":4},
  {"source":"src/index.ts","target":"src/provider-manager.ts","weight":2},
  {"source":"src/index.ts","target":"src/session.ts","weight":6},
  {"source":"src/index.ts","target":"src/access.ts","weight":2},
  {"source":"src/index.ts","target":"src/scheduler-runner.ts","weight":2},
  {"source":"src/index.ts","target":"src/chat-handlers.ts","weight":2},
  {"source":"src/index.ts","target":"src/claude-service.ts","weight":2},
  {"source":"src/index.ts","target":"src/bot-loader.ts","weight":2}
];

const summaryData = {
  total_nodes: 222,
  total_edges: 209,
  hub_files: ["parseDocument","validateDocument","normalizePath","dfs","findClusters","normalizePath","getAbsolutePath","parseThreadId","isAdmin","buildQuestionCard","getToolSummary","todoIcon","validateBotName","writeFileList","loadSyncState","syncBot","log","suggestParentDocuments","extractTitle","getFieldSuggestion","getConfidenceScore","registerChatHandlers","createCommandHandlers","getDefaultProvider","handleIncomingMessage","executeScheduledTask","checkAndExecuteSchedules","edit","delete","TaskScheduler","buildProgressMessage","cleanupSession","createBot"],
  circular_dependencies: []
};

// ============ MODULE DEFINITIONS ============
const moduleConfig = {
  "Core Runtime":       { color: "#58a6ff", files: ["src/index.ts","src/bot-context.ts","src/bot-loader.ts","src/types.ts"] },
  "Message Processing": { color: "#f78166", files: ["src/chat-handlers.ts","src/message-handler.ts","src/commands.ts","src/input-resolver.ts"] },
  "Claude Integration": { color: "#d2a8ff", files: ["src/claude-service.ts","src/machine.ts","src/chat-tools.ts"] },
  "Rendering":          { color: "#7ee787", files: ["src/renderer.ts","src/cards.ts","src/throttle.ts"] },
  "Infrastructure":     { color: "#f0883e", files: ["src/session.ts","src/access.ts","src/provider-manager.ts","src/scheduler.ts","src/scheduler-runner.ts"] },
  "Operations":         { color: "#79c0ff", files: ["scripts/deploy.ts","scripts/manage.ts","scripts/sync-bots.ts","scripts/create.ts"] },
  "Bot Tools":          { color: "#ffa657", files: ["bots/dizzybot/tools/validate-documents.js","bots/dizzybot/tools/graph-stats.ts","bots/dizzybot/tools/graph-discover.ts","bots/dizzybot/tools/self-healing.js","bots/dizzybot/tools/graph-suggest.ts"] }
};

// Build reverse map: file -> module
const fileToModule = {};
for (const [mod, cfg] of Object.entries(moduleConfig)) {
  for (const f of cfg.files) fileToModule[f] = mod;
}

// ============ BUILD GRAPH DATA ============
const nodes = Object.entries(filesData).map(([path, data]) => {
  const shortName = path.split('/').pop();
  const mod = fileToModule[path] || "Unknown";
  return {
    id: path, name: shortName, fullPath: path, module: mod,
    color: moduleConfig[mod]?.color || "#3d4752",
    functions: data.functions, maxComplexity: data.max_complexity,
    hubCount: data.hub_count, functionNames: data.function_names,
    radius: Math.max(14, Math.sqrt(data.functions) * 8),
    isHub: data.hub_count > 0
  };
});

const links = edgesData.map(e => ({ source: e.source, target: e.target, weight: e.weight }));
const maxWeight = Math.max(...links.map(l => l.weight));

// Compute in/out degree
const inDeps = {}, outDeps = {};
for (const l of edgesData) {
  if (!outDeps[l.source]) outDeps[l.source] = [];
  outDeps[l.source].push({ file: l.target, weight: l.weight });
  if (!inDeps[l.target]) inDeps[l.target] = [];
  inDeps[l.target].push({ file: l.source, weight: l.weight });
}

// Module visibility
const moduleVisible = {};
for (const mod of Object.keys(moduleConfig)) moduleVisible[mod] = true;

// ============ RENDER ============
const width = window.innerWidth;
const height = window.innerHeight - 90;
let layoutLocked = false;

const svg = d3.select("#graph").attr("width", width).attr("height", height);
const defs = svg.append("defs");

// Arrow markers per module color
for (const [mod, cfg] of Object.entries(moduleConfig)) {
  defs.append("marker")
    .attr("id", "arrow-" + mod.replace(/\s+/g, "-"))
    .attr("viewBox", "0 -4 10 8").attr("refX", 20).attr("refY", 0)
    .attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
    .append("path").attr("d", "M0,-3.5L8,0L0,3.5")
    .attr("fill", cfg.color).attr("fill-opacity", 0.5);
}
defs.append("marker").attr("id", "arrowhead")
  .attr("viewBox", "0 -4 10 8").attr("refX", 20).attr("refY", 0)
  .attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
  .append("path").attr("d", "M0,-3.5L8,0L0,3.5").attr("fill", "#3d4752");

// Glow filter for hubs
const glowFilter = defs.append("filter").attr("id", "hub-glow")
  .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
glowFilter.append("feFlood").attr("flood-color", "#f0883e").attr("flood-opacity", "0.4").attr("result", "color");
glowFilter.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "shadow");
const glowMerge = glowFilter.append("feMerge");
glowMerge.append("feMergeNode").attr("in", "shadow");
glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

const g = svg.append("g");

const zoom = d3.zoom().scaleExtent([0.1, 6])
  .on("zoom", (event) => { g.attr("transform", event.transform); updateMinimap(); });
svg.call(zoom);

// Layer groups
const hullGroup = g.append("g").attr("class", "hulls");
const linkGroup = g.append("g").attr("class", "links");
const nodeGroup = g.append("g").attr("class", "nodes");
const labelGroup = g.append("g").attr("class", "labels");

// Links — colored by source module
const linkElements = linkGroup.selectAll("path")
  .data(links).join("path").attr("class", "link")
  .attr("stroke", d => {
    const sid = typeof d.source === "object" ? d.source.id : d.source;
    const srcNode = nodes.find(n => n.id === sid);
    return srcNode ? srcNode.color : "#1e2630";
  })
  .attr("stroke-opacity", 0.2)
  .attr("stroke-width", d => Math.max(1, (d.weight / maxWeight) * 4))
  .attr("marker-end", d => {
    const sid = typeof d.source === "object" ? d.source.id : d.source;
    const srcNode = nodes.find(n => n.id === sid);
    return srcNode ? "url(#arrow-" + srcNode.module.replace(/\s+/g, "-") + ")" : "url(#arrowhead)";
  });

// Nodes
const nodeElements = nodeGroup.selectAll("circle")
  .data(nodes).join("circle")
  .attr("r", d => d.radius)
  .attr("fill", d => d.color)
  .attr("fill-opacity", 0.8)
  .attr("stroke", d => d.isHub ? "#f0883e" : d.color)
  .attr("stroke-width", d => d.isHub ? 2.5 : 1)
  .attr("stroke-opacity", d => d.isHub ? 0.9 : 0.3)
  .attr("filter", d => d.isHub ? "url(#hub-glow)" : null)
  .attr("cursor", "pointer")
  .on("click", (event, d) => { event.stopPropagation(); showInfoPanel(d); lockHighlight(d); })
  .on("dblclick", (event, d) => { event.stopPropagation(); zoomToNode(d); })
  .on("mouseover", (event, d) => { if (!highlightLocked) applyHighlight(d); showTooltip(event, d); })
  .on("mousemove", (event) => moveTooltip(event))
  .on("mouseout", () => { if (!highlightLocked) resetHighlight(); hideTooltip(); })
  .call(d3.drag().on("start", dragStarted).on("drag", dragged).on("end", dragEnded));

// Hub pulse rings
nodeGroup.selectAll(".hub-ring")
  .data(nodes.filter(n => n.isHub)).join("circle")
  .attr("class", "hub-ring")
  .attr("r", d => d.radius + 6)
  .attr("fill", "none")
  .attr("stroke", "#f0883e")
  .attr("stroke-width", 1.5)
  .attr("pointer-events", "none")
  .attr("opacity", 0);

const labelElements = labelGroup.selectAll("text")
  .data(nodes).join("text")
  .attr("class", "node-label").attr("dy", d => d.radius + 14)
  .text(d => d.name.replace(/\.(ts|js)$/, ''));

svg.on("click", () => { closePanel(); unlockHighlight(); });

// Force simulation with module clustering
const moduleCenters = {};
const modKeys = Object.keys(moduleConfig);
const cols = 3;
modKeys.forEach((mod, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  moduleCenters[mod] = {
    x: width * 0.18 + col * (width * 0.27),
    y: height * 0.22 + row * (height * 0.32)
  };
});

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(d => 130 - d.weight * 1.5).strength(d => 0.2 + d.weight * 0.02))
  .force("charge", d3.forceManyBody().strength(-320))
  .force("center", d3.forceCenter(width / 2, height / 2).strength(0.04))
  .force("collision", d3.forceCollide().radius(d => d.radius + 10))
  .force("cluster", clusterForce(0.18))
  .on("tick", ticked);

function clusterForce(strength) {
  let ns;
  function force(alpha) {
    for (const n of ns) {
      const center = moduleCenters[n.module];
      if (!center) continue;
      n.vx += (center.x - n.x) * strength * alpha;
      n.vy += (center.y - n.y) * strength * alpha;
    }
  }
  force.initialize = (nodes) => { ns = nodes; };
  return force;
}

let hullTickCounter = 0;
function ticked() {
  linkElements.attr("d", d => {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const tr = d.target.radius || 14;
    const ratio = Math.max(0, (dist - tr) / dist);
    const tx = d.source.x + dx * ratio;
    const ty = d.source.y + dy * ratio;
    const dr = dist * 1.8;
    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + tx + "," + ty;
  });

  nodeElements.attr("cx", d => d.x).attr("cy", d => d.y);
  labelElements.attr("x", d => d.x).attr("y", d => d.y);

  // Pulse rings follow hub nodes
  nodeGroup.selectAll(".hub-ring")
    .attr("cx", d => d.x).attr("cy", d => d.y);

  // Throttle hull updates (every 3 ticks)
  if (++hullTickCounter % 3 === 0) drawHulls();
}

function drawHulls() {
  const hullData = [];
  for (const [mod, cfg] of Object.entries(moduleConfig)) {
    if (!moduleVisible[mod]) continue;
    const modNodes = nodes.filter(n => n.module === mod);
    if (modNodes.length < 2) continue;
    const points = [];
    for (const n of modNodes) {
      const pad = n.radius + 22;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        points.push([n.x + Math.cos(a) * pad, n.y + Math.sin(a) * pad]);
      }
    }
    const hull = d3.polygonHull(points);
    if (hull) hullData.push({ mod, color: cfg.color, hull });
  }

  const paths = hullGroup.selectAll("path").data(hullData, d => d.mod);
  paths.enter().append("path")
    .attr("fill", d => d.color).attr("fill-opacity", 0.03)
    .attr("stroke", d => d.color).attr("stroke-opacity", 0.12)
    .attr("stroke-width", 1).attr("stroke-dasharray", "5,4")
    .merge(paths)
    .attr("d", d => "M" + d.hull.join("L") + "Z");
  paths.exit().remove();
}

function dragStarted(event) { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; }
function dragged(event) { event.subject.fx = event.x; event.subject.fy = event.y; }
function dragEnded(event) { if (!event.active) simulation.alphaTarget(0); if (!layoutLocked) { event.subject.fx = null; event.subject.fy = null; } }

// ============ TOOLTIP ============
const tooltip = document.getElementById("tooltip");

function showTooltip(event, d) {
  const outs = outDeps[d.id] || [];
  const ins = inDeps[d.id] || [];
  tooltip.innerHTML =
    '<div class="tt-name">' + d.name + '</div>' +
    '<div class="tt-module" style="background:' + d.color + '18;color:' + d.color + ';border:1px solid ' + d.color + '33">' + d.module + '</div>' +
    '<div class="tt-stats">' +
      '<div>Fn <span>' + d.functions + '</span></div>' +
      '<div>Out <span>' + outs.length + '</span></div>' +
      '<div>In <span>' + ins.length + '</span></div>' +
      (d.isHub ? '<div style="color:#f0883e">Hub</div>' : '') +
    '</div>' +
    '<div class="tt-hint">Click for details &middot; Double-click to zoom</div>';
  moveTooltip(event);
  tooltip.classList.add("visible");
}
function moveTooltip(event) {
  const x = event.clientX + 14;
  const y = event.clientY - 10;
  const r = tooltip.getBoundingClientRect();
  tooltip.style.left = (x + r.width > window.innerWidth ? event.clientX - r.width - 10 : x) + "px";
  tooltip.style.top = (y + r.height > window.innerHeight ? event.clientY - r.height - 10 : y) + "px";
}
function hideTooltip() { tooltip.classList.remove("visible"); }

// ============ HIGHLIGHT ============
let highlightLocked = false;
let lockedNode = null;

function lockHighlight(d) { highlightLocked = true; lockedNode = d; applyHighlight(d); }
function unlockHighlight() { highlightLocked = false; lockedNode = null; resetHighlight(); }

function applyHighlight(d) {
  const connectedIds = new Set([d.id]);
  links.forEach(l => {
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    if (sid === d.id) connectedIds.add(tid);
    if (tid === d.id) connectedIds.add(sid);
  });

  nodeElements
    .attr("fill-opacity", n => connectedIds.has(n.id) ? 1 : 0.08)
    .attr("stroke-opacity", n => connectedIds.has(n.id) ? 1 : 0.08);
  labelElements.attr("fill-opacity", n => connectedIds.has(n.id) ? 1 : 0.05);
  linkElements
    .attr("stroke-opacity", l => {
      const sid = typeof l.source === "object" ? l.source.id : l.source;
      const tid = typeof l.target === "object" ? l.target.id : l.target;
      return (sid === d.id || tid === d.id) ? 0.7 : 0.02;
    })
    .attr("stroke", l => {
      const sid = typeof l.source === "object" ? l.source.id : l.source;
      const tid = typeof l.target === "object" ? l.target.id : l.target;
      return (sid === d.id || tid === d.id) ? d.color : "#1e2630";
    });
}

function resetHighlight() {
  nodeElements.attr("fill-opacity", 0.8).attr("stroke-opacity", d => d.isHub ? 0.9 : 0.3);
  labelElements.attr("fill-opacity", 1);
  linkElements
    .attr("stroke-opacity", 0.2)
    .attr("stroke", d => {
      const sid = typeof d.source === "object" ? d.source.id : d.source;
      const srcNode = nodes.find(n => n.id === sid);
      return srcNode ? srcNode.color : "#1e2630";
    });
}

// ============ ZOOM TO NODE ============
function zoomToNode(d) {
  const scale = 2.5;
  const tx = width / 2 - d.x * scale;
  const ty = height / 2 - d.y * scale;
  svg.transition().duration(600).ease(d3.easeCubicOut)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function fitToView() {
  const bounds = g.node().getBBox();
  if (bounds.width === 0) return;
  const pad = 60;
  const scale = Math.min(width / (bounds.width + pad * 2), height / (bounds.height + pad * 2), 1.5);
  const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
  const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
  svg.transition().duration(600).ease(d3.easeCubicOut)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

// ============ INFO PANEL ============
function showInfoPanel(d) {
  const panel = document.getElementById("info-panel");
  const content = document.getElementById("info-content");
  const hubFns = d.functionNames.filter(fn => summaryData.hub_files.includes(fn));
  const outs = outDeps[d.id] || [];
  const ins = inDeps[d.id] || [];

  let html = '<h3>' + d.fullPath + '</h3>';
  html += '<span class="info-tag" style="background:' + d.color + '18;color:' + d.color + ';border:1px solid ' + d.color + '33">' + d.module + '</span>';

  html += '<div class="info-section" style="margin-top:14px"><h4>Metrics</h4>';
  html += metric("Functions", d.functions);
  html += metric("Hub Functions", d.hubCount);
  html += metric("Max Complexity", d.maxComplexity);
  html += metric("Communities", filesData[d.id]?.community_ids?.length || 0);
  html += metric("Outgoing Deps", outs.length);
  html += metric("Incoming Deps", ins.length);
  html += '</div>';

  if (hubFns.length > 0) {
    html += '<div class="info-section"><h4>Hub Functions</h4>';
    html += hubFns.map(fn => '<span class="info-tag" style="background:#f0883e18;color:#f0883e;border:1px solid #f0883e33">' + fn + '</span>').join(" ");
    html += '</div>';
  }

  html += '<div class="info-section"><h4>All Functions (' + d.functionNames.length + ')</h4>';
  html += '<div style="font-size:11px;color:#536171;line-height:1.8;font-family:JetBrains Mono,monospace;font-size:10px">' +
    d.functionNames.map(fn => {
      const isHub = summaryData.hub_files.includes(fn);
      return isHub ? '<strong style="color:#f0883e">' + fn + '</strong>' : fn;
    }).join('<span style="color:#1e2630"> &middot; </span>') + '</div></div>';

  if (outs.length > 0) {
    html += '<div class="info-section"><h4>Depends On (' + outs.length + ')</h4><div class="dep-list">';
    for (const dep of outs.sort((a,b) => b.weight - a.weight)) {
      html += '<div>' + d.name + ' <span class="dep-arrow">&rarr;</span> ' + dep.file.split('/').pop() + ' <span class="dep-weight">' + dep.weight + '</span></div>';
    }
    html += '</div></div>';
  }
  if (ins.length > 0) {
    html += '<div class="info-section"><h4>Depended On By (' + ins.length + ')</h4><div class="dep-list">';
    for (const dep of ins.sort((a,b) => b.weight - a.weight)) {
      html += '<div>' + dep.file.split('/').pop() + ' <span class="dep-arrow">&rarr;</span> ' + d.name + ' <span class="dep-weight">' + dep.weight + '</span></div>';
    }
    html += '</div></div>';
  }

  content.innerHTML = html;
  panel.classList.add("open");
  // Force reflow for transition
  requestAnimationFrame(() => { panel.style.display = "block"; panel.classList.add("open"); });
}

function metric(label, value) {
  return '<div class="info-metric"><span class="label">' + label + '</span><span class="value">' + value + '</span></div>';
}

function closePanel() {
  const panel = document.getElementById("info-panel");
  panel.classList.remove("open");
  setTimeout(() => { if (!panel.classList.contains("open")) panel.style.display = "none"; }, 250);
}

// ============ SEARCH ============
const searchInput = document.getElementById("search");
searchInput.addEventListener("input", function() {
  const q = this.value.toLowerCase().trim();
  if (!q) { if (!highlightLocked) resetHighlight(); return; }

  // Search in file names, paths, AND function names
  const matchIds = new Set();
  nodes.forEach(n => {
    if (n.name.toLowerCase().includes(q) || n.fullPath.toLowerCase().includes(q)) {
      matchIds.add(n.id);
    } else if (n.functionNames.some(fn => fn.toLowerCase().includes(q))) {
      matchIds.add(n.id);
    }
  });

  nodeElements
    .attr("fill-opacity", n => matchIds.has(n.id) ? 1 : 0.05)
    .attr("stroke-opacity", n => matchIds.has(n.id) ? 1 : 0.05);
  labelElements.attr("fill-opacity", n => matchIds.has(n.id) ? 1 : 0.05);
  linkElements.attr("stroke-opacity", l => {
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    return (matchIds.has(sid) && matchIds.has(tid)) ? 0.5 : 0.02;
  });
});

// ============ MODULE TOGGLES ============
const togglesDiv = document.getElementById("module-toggles");
for (const [mod, cfg] of Object.entries(moduleConfig)) {
  const count = cfg.files.length;
  const btn = document.createElement("button");
  btn.className = "module-btn";
  btn.textContent = mod + " " + count;
  btn.style.color = cfg.color;
  btn.style.borderColor = cfg.color + "44";
  btn.onclick = () => {
    moduleVisible[mod] = !moduleVisible[mod];
    btn.classList.toggle("inactive");
    updateVisibility();
  };
  togglesDiv.appendChild(btn);
}

function updateVisibility() {
  nodeElements.attr("display", d => moduleVisible[d.module] ? null : "none");
  labelElements.attr("display", d => moduleVisible[d.module] ? null : "none");
  linkElements.attr("display", d => {
    const s = typeof d.source === "object" ? d.source : nodes.find(n => n.id === d.source);
    const t = typeof d.target === "object" ? d.target : nodes.find(n => n.id === d.target);
    return (s && moduleVisible[s.module] && t && moduleVisible[t.module]) ? null : "none";
  });
  drawHulls();
  updateMinimap();
}

// ============ LEGEND ============
const legendDiv = document.getElementById("legend");
let legendHtml = "";
for (const [mod, cfg] of Object.entries(moduleConfig)) {
  const count = cfg.files.length;
  legendHtml += '<div class="legend-item"><div class="legend-dot" style="background:' + cfg.color + '"></div><span>' + mod + '</span><span class="legend-count">' + count + '</span></div>';
}
legendHtml += '<div class="legend-item" style="margin-top:6px;border-top:1px solid #1e2630;padding-top:6px"><div class="legend-dot" style="background:#f0883e;box-shadow:0 0 6px #f0883e"></div><span>Hub node</span></div>';
legendDiv.innerHTML = legendHtml;

// ============ STATS BAR ============
const totalFiles = Object.keys(filesData).length;
const totalFunctions = Object.values(filesData).reduce((s, f) => s + f.functions, 0);
const totalEdges = edgesData.length;
const hubCount = new Set(summaryData.hub_files).size;
const circularDeps = summaryData.circular_dependencies.length;

document.getElementById("stats-bar").innerHTML = [
  stat("Files", totalFiles),
  stat("Functions", totalFunctions),
  stat("Edges", totalEdges),
  stat("Hubs", hubCount),
  stat("Circular", circularDeps, circularDeps > 0),
  stat("Modules", Object.keys(moduleConfig).length)
].join("");

function stat(label, value, warn) {
  return '<div class="stat"><span class="stat-label">' + label + '</span><span class="stat-value' + (warn ? ' warn' : '') + '">' + value + '</span></div>';
}

// ============ MINIMAP ============
const mmSvg = d3.select("#minimap-svg");
const mmG = mmSvg.append("g");
const mmViewport = mmSvg.append("rect").attr("class", "viewport-rect");

function updateMinimap() {
  const bounds = g.node().getBBox();
  if (bounds.width === 0) return;

  const pad = 20;
  const mmW = 160, mmH = 100;
  const scaleX = mmW / (bounds.width + pad * 2);
  const scaleY = mmH / (bounds.height + pad * 2);
  const mmScale = Math.min(scaleX, scaleY);
  const offsetX = (mmW - bounds.width * mmScale) / 2 - bounds.x * mmScale;
  const offsetY = (mmH - bounds.height * mmScale) / 2 - bounds.y * mmScale;

  mmG.selectAll("circle").remove();
  mmG.selectAll("circle")
    .data(nodes.filter(n => moduleVisible[n.module]))
    .join("circle")
    .attr("cx", d => d.x * mmScale + offsetX)
    .attr("cy", d => d.y * mmScale + offsetY)
    .attr("r", 2)
    .attr("fill", d => d.color)
    .attr("fill-opacity", 0.7);

  // Viewport indicator
  const t = d3.zoomTransform(svg.node());
  const vx = (-t.x / t.k) * mmScale + offsetX;
  const vy = (-t.y / t.k) * mmScale + offsetY;
  const vw = (width / t.k) * mmScale;
  const vh = (height / t.k) * mmScale;
  mmViewport.attr("x", vx).attr("y", vy).attr("width", vw).attr("height", vh);
}

// Click minimap to navigate
document.getElementById("minimap").addEventListener("click", (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;

  const bounds = g.node().getBBox();
  const mmW = 160, mmH = 100;
  const scaleX = mmW / (bounds.width + 40);
  const scaleY = mmH / (bounds.height + 40);
  const mmScale = Math.min(scaleX, scaleY);
  const offsetX = (mmW - bounds.width * mmScale) / 2 - bounds.x * mmScale;
  const offsetY = (mmH - bounds.height * mmScale) / 2 - bounds.y * mmScale;

  const worldX = (mx - offsetX) / mmScale;
  const worldY = (my - offsetY) / mmScale;

  const t = d3.zoomTransform(svg.node());
  const tx = width / 2 - worldX * t.k;
  const ty = height / 2 - worldY * t.k;
  svg.transition().duration(400).ease(d3.easeCubicOut)
    .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(t.k));
});

// ============ TOOLBAR ACTIONS ============
document.getElementById("btn-fit").addEventListener("click", fitToView);

document.getElementById("btn-lock").addEventListener("click", function() {
  layoutLocked = !layoutLocked;
  this.innerHTML = layoutLocked ? "&#x1F512;" : "&#x1F513;";
  this.title = layoutLocked ? "Unlock layout (L)" : "Lock layout (L)";
  if (layoutLocked) {
    nodes.forEach(n => { n.fx = n.x; n.fy = n.y; });
    simulation.stop();
  } else {
    nodes.forEach(n => { n.fx = null; n.fy = null; });
    simulation.alpha(0.3).restart();
  }
});

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener("keydown", (e) => {
  // Ignore if typing in search
  if (e.target === searchInput) {
    if (e.key === "Escape") { searchInput.blur(); searchInput.value = ""; resetHighlight(); }
    return;
  }

  if (e.key === "/" || e.key === "s") { e.preventDefault(); searchInput.focus(); }
  if (e.key === "Escape") { closePanel(); unlockHighlight(); }
  if (e.key === "f" || e.key === "F") fitToView();
  if (e.key === "l" || e.key === "L") document.getElementById("btn-lock").click();
});

// Show keyboard hints briefly
const kbHint = document.getElementById("keyboard-hint");
kbHint.classList.add("show");
setTimeout(() => kbHint.classList.remove("show"), 4000);

// Initial fit after simulation settles
setTimeout(fitToView, 2000);

// Periodic minimap update
setInterval(updateMinimap, 500);

// Window resize
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight - 90;
  svg.attr("width", w).attr("height", h);
  simulation.force("center", d3.forceCenter(w / 2, h / 2).strength(0.04));
  simulation.alpha(0.1).restart();
});

// Start hub pulse animation after layout stabilizes
setTimeout(() => {
  function pulseHubs() {
    nodeGroup.selectAll(".hub-ring")
      .attr("opacity", 0.5)
      .attr("r", d => d.radius + 3)
      .transition().duration(2000).ease(d3.easeCubicOut)
      .attr("r", d => d.radius + 18)
      .attr("opacity", 0)
      .on("end", function() { if (this === nodeGroup.selectAll(".hub-ring").node()) setTimeout(pulseHubs, 1000); });
  }
  pulseHubs();
}, 3000);
</script>
</body>
</html>
