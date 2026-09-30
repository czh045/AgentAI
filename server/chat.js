import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  buildFallbackAnswer,
  selectRelevantChunks
} from "./local-rag.js";

// A small in-memory cache avoids rebuilding the embeddings every time the user
// asks another question about the same uploaded file.
const documentSessions = new Map();

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function responseToText(response) {
  if (typeof response.content === "string") {
    return response.content;
  }

  if (Array.isArray(response.content)) {
    return response.content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("");
  }

  return String(response.content ?? "");
}

export async function indexDocument(filePath) {
  const loader = new PDFLoader(filePath);
  const documents = await loader.load();

  if (documents.length === 0) {
    throw new Error("The PDF did not contain readable text.");
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 80
  });
  const chunks = await textSplitter.splitDocuments(documents);

  let vectorStore = null;
  if (hasOpenAiKey()) {
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY
    });
    vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);
  }

  const session = {
    filePath,
    pageCount: documents.length,
    chunkCount: chunks.length,
    chunks,
    vectorStore
  };
  documentSessions.set(filePath, session);
  return session;
}

async function getSession(filePath) {
  return documentSessions.get(filePath) ?? indexDocument(filePath);
}

export async function chat(filePath, query) {
  if (!filePath) {
    throw new Error("Upload a PDF before asking a question.");
  }
  if (!query?.trim()) {
    throw new Error("A question is required.");
  }

  const session = await getSession(filePath);
  const relevantDocs = session.vectorStore
    ? await session.vectorStore.similaritySearch(query, 4)
    : selectRelevantChunks(query, session.chunks, 4);

  if (!hasOpenAiKey()) {
    return {
      text: buildFallbackAnswer(query, relevantDocs),
      mode: "local-fallback",
      sources: relevantDocs.length
    };
  }

  const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");
  const prompt = PromptTemplate.fromTemplate(`
Use only the document context below to answer the question.
If the answer is not present, say that the document does not provide it.
Keep the answer concise, accurate, and under three sentences.

Document context:
{context}

Question: {question}

Helpful answer:
`);

  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-5",
    apiKey: process.env.OPENAI_API_KEY
  });
  const formattedPrompt = await prompt.format({ context, question: query });
  const response = await model.invoke(formattedPrompt);

  return {
    text: responseToText(response),
    mode: "openai-rag",
    sources: relevantDocs.length
  };
}

export function clearDocumentSession(filePath) {
  documentSessions.delete(filePath);
}

