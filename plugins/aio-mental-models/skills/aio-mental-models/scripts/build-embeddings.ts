#!/usr/bin/env npx tsx
/**
 * Pre-compute embeddings for all mental model markdown files.
 * Uses snowflake-arctic-embed-xs (384-dim) via @huggingface/transformers (local, no API key).
 *
 * Usage: bun run build-embeddings.ts
 * Output: embeddings.json in the same directory
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

// Auto-install dependencies if missing
const SCRIPT_DIR_INIT = import.meta.dirname;
if (!existsSync(join(SCRIPT_DIR_INIT, "node_modules"))) {
  console.error("Installing dependencies...");
  execSync("npm install --silent", { cwd: SCRIPT_DIR_INIT, stdio: "inherit" });
}

const { pipeline } = await import("@huggingface/transformers");

const SCRIPT_DIR = import.meta.dirname;
const SKILL_DIR = join(SCRIPT_DIR, "..");
const MODEL_ID = "Snowflake/snowflake-arctic-embed-xs";
const OUTPUT_FILE = join(SCRIPT_DIR, "embeddings.json");

const VOLUMES = [
  "volume-1-general-thinking",
  "volume-2-physics-chemistry-biology",
  "volume-3-systems-mathematics",
  "volume-4-economics-art",
];

interface ModelEmbedding {
  id: string;
  title: string;
  volume: string;
  file: string;
  vector: number[];
}

async function extractTitle(content: string): Promise<string> {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Unknown";
}

async function main() {
  console.log(`Loading embedding model: ${MODEL_ID}...`);
  const embedder = await pipeline("feature-extraction", MODEL_ID);

  const results: ModelEmbedding[] = [];

  for (const volume of VOLUMES) {
    const volDir = join(SKILL_DIR, volume);
    let files: string[];
    try {
      files = (await readdir(volDir)).filter((f) => f.endsWith(".md")).sort();
    } catch {
      console.warn(`Skipping ${volume}: directory not found`);
      continue;
    }

    for (const file of files) {
      const filePath = join(volDir, file);
      const content = await readFile(filePath, "utf-8");
      const title = await extractTitle(content);

      console.log(`  Embedding: ${title} (${file})`);

      const output = await embedder(content, { pooling: "cls", normalize: true });
      const vector = Array.from(output.data as Float32Array);

      results.push({
        id: basename(file, ".md"),
        title,
        volume,
        file: `${volume}/${file}`,
        vector,
      });
    }
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nDone! ${results.length} models embedded → ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
