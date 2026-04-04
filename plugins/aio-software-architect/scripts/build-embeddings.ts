/**
 * Pre-compute embeddings for all architecture articles
 * Generates embeddings.json for semantic search
 *
 * Usage: npx tsx build-embeddings.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");

interface ModelEmbedding {
  id: string;
  title: string;
  volume: string;
  file: string;
  vector: number[];
}

async function ensureDeps() {
  try {
    await import("@huggingface/transformers");
  } catch {
    console.error("Installing dependencies (first run only)...");
    execSync("npm install", { cwd: __dirname, stdio: "inherit" });
  }
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function extractSearchText(content: string): string {
  // Extract title + first ~500 chars of meaningful content for embedding
  const lines = content.split("\n");
  const meaningful: string[] = [];
  let charCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("---") || trimmed.startsWith(">")) continue;
    if (trimmed.startsWith("#")) {
      meaningful.push(trimmed.replace(/^#+\s*/, ""));
    } else {
      meaningful.push(trimmed);
    }
    charCount += trimmed.length;
    if (charCount > 1500) break;
  }

  return meaningful.join(" ");
}

async function main() {
  await ensureDeps();

  const { pipeline } = await import("@huggingface/transformers");

  console.log("Loading embedding model: Snowflake/snowflake-arctic-embed-xs...");
  const extractor = await pipeline(
    "feature-extraction",
    "Snowflake/snowflake-arctic-embed-xs",
    { dtype: "fp32" }
  );

  const embeddings: ModelEmbedding[] = [];
  const volumeDirs = readdirSync(PLUGIN_ROOT)
    .filter((d) => d.startsWith("volume-"))
    .sort();

  for (const volDir of volumeDirs) {
    const volPath = join(PLUGIN_ROOT, volDir);
    if (!statSync(volPath).isDirectory()) continue;

    const files = readdirSync(volPath)
      .filter((f) => f.endsWith(".md"))
      .sort();

    for (const file of files) {
      const filePath = join(volPath, file);
      const content = readFileSync(filePath, "utf-8");
      const title = extractTitle(content);
      const searchText = extractSearchText(content);
      const id = basename(file, ".md");

      console.log(`  Embedding: ${title} (${file})`);

      const output = await extractor(searchText, {
        pooling: "cls",
        normalize: true,
      });

      embeddings.push({
        id,
        title,
        volume: volDir,
        file: `${volDir}/${file}`,
        vector: Array.from(output.data as Float32Array),
      });
    }
  }

  const outPath = join(__dirname, "embeddings.json");
  writeFileSync(outPath, JSON.stringify(embeddings, null, 0));
  console.log(`\nDone! ${embeddings.length} articles embedded → embeddings.json`);
}

main().catch(console.error);
