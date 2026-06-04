#!/usr/bin/env npx tsx
/**
 * Semantic search across mental models using pre-computed embeddings.
 * Uses snowflake-arctic-embed-xs for query embedding, cosine similarity against embeddings.json.
 *
 * Usage: bun run search-models.ts "how to break down complex problems"
 * Options:
 *   --top N    Number of results (default: 5)
 *   --json     Output as JSON
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

const SCRIPT_DIR = import.meta.dirname;
const MODEL_ID = "Snowflake/snowflake-arctic-embed-xs";
const EMBEDDINGS_FILE = join(SCRIPT_DIR, "embeddings.json");

// Auto-install dependencies if missing
const nodeModules = join(SCRIPT_DIR, "node_modules");
if (!existsSync(nodeModules)) {
  console.error("Installing dependencies...");
  execSync("npm install --silent", { cwd: SCRIPT_DIR, stdio: "inherit" });
}

const { pipeline } = await import("@huggingface/transformers");

interface ModelEmbedding {
  id: string;
  title: string;
  volume: string;
  file: string;
  vector: number[];
}

interface SearchResult {
  rank: number;
  title: string;
  volume: string;
  file: string;
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function parseArgs(args: string[]): { query: string; top: number; json: boolean } {
  let top = 5;
  let json = false;
  const queryParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--top" && args[i + 1]) {
      top = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--json") {
      json = true;
    } else {
      queryParts.push(args[i]);
    }
  }

  return { query: queryParts.join(" "), top, json };
}

async function main() {
  const args = process.argv.slice(2);
  const { query, top, json } = parseArgs(args);

  if (!query) {
    console.error("Usage: bun run search-models.ts \"your query here\" [--top N] [--json]");
    process.exit(1);
  }

  // Load pre-computed embeddings
  const raw = await readFile(EMBEDDINGS_FILE, "utf-8");
  const models: ModelEmbedding[] = JSON.parse(raw);

  // Embed the query
  const embedder = await pipeline("feature-extraction", MODEL_ID);
  const output = await embedder(query, { pooling: "cls", normalize: true });
  const queryVector = Array.from(output.data as Float32Array);

  // Compute similarities
  const scored = models.map((m) => ({
    title: m.title,
    volume: m.volume,
    file: m.file,
    score: cosineSimilarity(queryVector, m.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  const results: SearchResult[] = scored.slice(0, top).map((s, i) => ({
    rank: i + 1,
    ...s,
    score: Math.round(s.score * 10000) / 10000,
  }));

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\nQuery: "${query}"\n`);
    for (const r of results) {
      const volLabel = r.volume.replace(/^volume-\d+-/, "").replace(/-/g, " ");
      console.log(`  ${r.rank}. ${r.title} (${volLabel}) — score: ${r.score}`);
    }
    console.log(`\n${results.length} results shown.`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
