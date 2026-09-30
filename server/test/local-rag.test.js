import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackAnswer,
  scoreChunk,
  selectRelevantChunks,
  tokenize
} from "../local-rag.js";

const chunks = [
  { pageContent: "Task decomposition breaks a complex goal into smaller steps." },
  { pageContent: "Vector embeddings let software compare semantic meaning." },
  { pageContent: "MCP standardizes how an agent calls external tools." }
];

test("tokenize removes common words and normalizes case", () => {
  assert.deepEqual(tokenize("What Is MCP and how does it work?"), ["is", "mcp", "does", "it", "work"]);
});

test("scoreChunk ranks text that contains question keywords", () => {
  assert.ok(scoreChunk("What is task decomposition?", chunks[0]) > 0);
  assert.equal(scoreChunk("What is task decomposition?", chunks[1]), 0);
});

test("selectRelevantChunks returns the closest matching document chunk", () => {
  const selected = selectRelevantChunks("Explain MCP external tools", chunks, 2);
  assert.equal(selected.length, 1);
  assert.equal(selected[0], chunks[2]);
});

test("buildFallbackAnswer makes the no-API-key behavior explicit", () => {
  const answer = buildFallbackAnswer("What is MCP?", [chunks[2]]);
  assert.match(answer, /Local retrieval mode is active/);
  assert.match(answer, /standardizes how an agent calls external tools/i);
});

test("local retrieval can rank Chinese document text without an API key", () => {
  const chineseChunks = [
    { pageContent: "任务分解把复杂目标拆分为更小、更容易执行的步骤。" },
    { pageContent: "模型上下文协议用于让智能体调用外部工具。" }
  ];

  assert.ok(tokenize("什么是任务分解？").includes("任务"));
  const selected = selectRelevantChunks("任务分解是什么？", chineseChunks, 1);
  assert.equal(selected[0], chineseChunks[0]);
});
