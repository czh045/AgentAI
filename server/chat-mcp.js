import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client = null;
let transport = null;
let connectionPromise = null;

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

async function ensureConnected() {
  if (client && transport) {
    return;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    client = new Client({
      name: "agentai-chat-client",
      version: "1.0.0"
    });
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(__dirname, "mcp-server.js")],
      env: process.env
    });
    await client.connect(transport);
  })();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export async function chatMCP(query) {
  if (!query?.trim()) {
    throw new Error("A question is required for web search.");
  }

  try {
    await ensureConnected();
    const toolResult = await client.callTool({
      name: "search_web",
      arguments: { query, num: 5 }
    });
    const searchResults = toolResult.content?.[0]?.text ?? "No web-search result was returned.";

    // The tool call still happens without OpenAI. This makes the MCP boundary
    // observable for learning and gives a useful configuration message.
    if (!process.env.OPENAI_API_KEY?.trim()) {
      return {
        text: `MCP tool response:\n${searchResults}`,
        mode: "mcp-tool-only"
      };
    }

    const prompt = PromptTemplate.fromTemplate(`
Summarize these web-search results for the user's question.
Only use the supplied results. Mention uncertainty when results are incomplete.
Keep the answer under three sentences.

Question: {question}
Search results: {searchResults}

Helpful answer:
`);
    const model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-5",
      apiKey: process.env.OPENAI_API_KEY
    });
    const response = await model.invoke(await prompt.format({ query, searchResults }));

    return {
      text: responseToText(response),
      mode: "mcp-openai-summary"
    };
  } catch (error) {
    await closeMcpClient();
    throw error;
  }
}

export async function closeMcpClient() {
  if (client) {
    try {
      await client.close();
    } catch {
      // Cleanup should not hide the original request error.
    }
  }
  client = null;
  transport = null;
  connectionPromise = null;
}

