/**
 * Semantic search across 137 software architecture articles
 * Uses HuggingFace Snowflake Arctic Embed XS (384-dim, local)
 *
 * Usage:
 *   npx tsx search-patterns.ts "how to handle service failures"
 *   npx tsx search-patterns.ts "database scaling" --top 3
 *   npx tsx search-patterns.ts "event driven" --json
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const VOLUME_LABELS: Record<string, string> = {
  "volume-01-foundations": "Foundations",
  "volume-02-architecture-styles": "Architecture Styles",
  "volume-03-cloud-design-patterns": "Cloud Design Patterns",
  "volume-04-resilience": "Resilience & Reliability",
  "volume-05-data-architecture": "Data Architecture",
  "volume-06-domain-driven-design": "Domain-Driven Design",
  "volume-07-api-integration": "API & Integration",
  "volume-08-distributed-systems": "Distributed Systems",
  "volume-09-operations-delivery": "Operations & Delivery",
  "volume-10-modern-paradigms": "Modern Paradigms",
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ensureDeps() {
  try {
    await import("@huggingface/transformers");
  } catch {
    console.error("Installing dependencies (first run only)...");
    execSync("npm install", { cwd: __dirname, stdio: "inherit" });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help") {
    console.log("Usage: npx tsx search-patterns.ts <query> [--top N] [--json]");
    console.log('  npx tsx search-patterns.ts "handling failures in microservices"');
    console.log('  npx tsx search-patterns.ts "data consistency" --top 3 --json');
    process.exit(0);
  }

  let query = "";
  let topN = 5;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--top" && args[i + 1]) {
      topN = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--json") {
      jsonOutput = true;
    } else {
      query += (query ? " " : "") + args[i];
    }
  }

  await ensureDeps();

  const { pipeline } = await import("@huggingface/transformers");

  // Load pre-computed embeddings
  const embeddingsPath = join(__dirname, "embeddings.json");
  let embeddings: ModelEmbedding[];
  try {
    embeddings = JSON.parse(readFileSync(embeddingsPath, "utf-8"));
  } catch {
    console.error("embeddings.json not found. Run: npx tsx build-embeddings.ts");
    process.exit(1);
  }

  // Generate query embedding
  const extractor = await pipeline(
    "feature-extraction",
    "Snowflake/snowflake-arctic-embed-xs",
    { dtype: "fp32" }
  );

  const queryPrefix = "Represent this sentence for searching relevant passages: ";
  const output = await extractor(queryPrefix + query, {
    pooling: "cls",
    normalize: true,
  });
  const queryVector = Array.from(output.data as Float32Array);

  // Rank by cosine similarity
  const results: SearchResult[] = embeddings
    .map((emb) => ({
      rank: 0,
      title: emb.title,
      volume: emb.volume,
      file: emb.file,
      score: cosineSimilarity(queryVector, emb.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\nQuery: "${query}"\n`);
    for (const r of results) {
      const volLabel = VOLUME_LABELS[r.volume] || r.volume;
      console.log(
        `  ${r.rank}. ${r.title} (${volLabel}) — score: ${r.score.toFixed(4)}`
      );
    }
    console.log(`\n${results.length} results shown.`);
  }
}

main().catch(console.error);
