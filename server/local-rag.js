// This module is deliberately dependency-free so the fallback retrieval path can
// be tested without an API key or a vector database.

const STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "for",
  "from",
  "have",
  "how",
  "into",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "with",
  "would",
  "you"
]);

export function tokenize(text = "") {
  const latinTokens = text
    .toLowerCase()
    .match(/[a-z0-9]{2,}/g)
    ?.filter((token) => !STOP_WORDS.has(token)) ?? [];

  // English words are separated by spaces, while Chinese sentences are not.
  // Two-character CJK terms give the local fallback a useful signal without
  // requiring an embedding API key.
  const chineseCharacters = text.match(/[\u3400-\u9fff]/g) ?? [];
  const chineseTokens = chineseCharacters.length === 1
    ? chineseCharacters
    : chineseCharacters
      .slice(0, -1)
      .map((character, index) => character + chineseCharacters[index + 1]);

  return [...new Set([...latinTokens, ...chineseTokens])];
}

export function scoreChunk(question, chunk) {
  const questionTokens = new Set(tokenize(question));
  const chunkText = chunk.pageContent.toLowerCase();

  return [...questionTokens].reduce((score, token) => {
    const matches = chunkText.split(token).length - 1;
    return score + matches;
  }, 0);
}

export function selectRelevantChunks(question, chunks, limit = 4) {
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(question, chunk) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}

export function buildFallbackAnswer(question, chunks) {
  if (chunks.length === 0) {
    return "I could not find matching text in the uploaded document. Try using a more specific keyword from the PDF.";
  }

  const excerpt = chunks
    .map((chunk) => chunk.pageContent.replace(/\s+/g, " ").trim())
    .join(" ")
    .slice(0, 900);

  return [
    "Local retrieval mode is active because OPENAI_API_KEY is not configured.",
    `For your question "${question}", the most relevant uploaded text is:`,
    excerpt
  ].join("\n\n");
}
