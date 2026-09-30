import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getJson } from "serpapi";
import { z } from "zod";

dotenv.config();

const server = new McpServer({
  name: "serpapi-search",
  version: "1.0.0"
});

// This is the MCP SERVER from Lesson 49. It exposes one standard tool named
// search_web. The client never calls SerpAPI directly.
server.registerTool(
  "search_web",
  {
    description: "Search the web using SerpAPI and return concise organic results.",
    inputSchema: {
      query: z.string().min(2).describe("The web search query"),
      num: z.number().int().min(1).max(10).optional().describe("Result count")
    }
  },
  async ({ query, num = 5 }) => {
    if (!process.env.SERPAPI_KEY?.trim()) {
      return {
        content: [{
          type: "text",
          text: "Web search is not configured. Add SERPAPI_KEY to server/.env to enable the MCP search tool."
        }]
      };
    }

    try {
      const results = await getJson({
        engine: "google",
        q: query,
        num,
        api_key: process.env.SERPAPI_KEY
      });
      const organicResults = (results.organic_results ?? []).slice(0, num).map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify(organicResults.length > 0 ? organicResults : results)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Web search failed: ${error.message}`
        }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SerpAPI MCP Server is running on stdio.");
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});

