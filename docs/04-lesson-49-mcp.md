# Lesson 49：Model Context Protocol（MCP）工具调用

## 1. Agent 和普通聊天有什么不同

普通聊天模型的输入是文本，输出也是文本。Agent 除了给出文字，还可以为了完成任务调用工具，例如：

- 搜索网页。
- 查询数据库。
- 读日历。
- 创建 GitHub issue。
- 控制公司内部系统。

课件用三点描述 Agent：

1. 有目标。
2. 能通过工具和外部世界交互。
3. 可以使用短期或长期记忆。

本项目目标很明确：回答用户问题；外部工具是 `search_web`；当前上传 PDF 和本次对话就是短期状态。

## 2. MCP 解决什么问题

如果每个模型、每个工具、每个公司都自定义调用格式，客户端会非常难集成。MCP 提供一套标准思路：

```text
MCP client 发现工具 -> 调用工具 -> 得到结构化 content
MCP server 注册工具 -> 验证输入 -> 执行真实外部能力 -> 返回 content
```

重点：MCP 不是搜索引擎，也不是 LLM。它是“工具与 Agent 之间的标准通信层”。

## 3. 本项目的 MCP 架构

```text
React
  -> Express /chat
    -> chat-mcp.js               MCP client
       -> stdio child process
          -> mcp-server.js       MCP server
             -> search_web tool
                -> SerpAPI
```

`stdio` 指标准输入输出。MCP client 启动一个 Node 子进程，双方不通过 HTTP，而是通过进程的标准输入输出通信。这是本地 MCP 的常见学习方式。

## 4. `mcp-server.js`：工具提供者

创建服务器：

```js
const server = new McpServer({
  name: "serpapi-search",
  version: "1.0.0"
});
```

注册工具：

```js
server.registerTool("search_web", { ... }, async ({ query, num }) => { ... });
```

工具需要三个部分：

1. 工具名：`search_web`。
2. 描述：告诉模型或调用方这工具能做什么。
3. 输入 schema：用 Zod 约束 `query` 和 `num`。

例如：

```js
query: z.string().min(2)
```

表示少于两个字符的查询不合法。输入验证应该在工具边界做，而不是假设调用方永远正确。

## 5. `chat-mcp.js`：工具使用者

这里的 `ensureConnected()` 非常值得理解。它只在第一次请求时启动 MCP server：

```js
transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(__dirname, "mcp-server.js")]
});
await client.connect(transport);
```

`process.execPath` 是当前 Node 可执行文件路径，比把命令写死成 `"node"` 更稳。

连接成功后，真正调用工具：

```js
const toolResult = await client.callTool({
  name: "search_web",
  arguments: { query, num: 5 }
});
```

这句就是“Agent 使用工具”的核心。不是 React 调 SerpAPI，也不是 LLM 直接访问网页，而是后端 MCP client 调 MCP server。

## 6. 为什么还要模型概括搜索结果

SerpAPI 返回的是搜索结果数组，里面可能有标题、链接、snippet。对用户而言，这些原始 JSON 不够友好。因此有 OpenAI Key 时，项目会做第二步：

```text
工具原始结果 -> Prompt -> ChatOpenAI -> 简短总结
```

但必须区分两个事实：

- 搜索工具提供外部数据。
- LLM 负责把数据组织成自然语言。

没有 `OPENAI_API_KEY` 时，项目不会假装模型概括过，而会显示原始 MCP 工具信息或配置提示。

## 7. 配置 SerpAPI

在 `server/.env` 写：

```text
SERPAPI_KEY=你的真实密钥
```

不要写在 `src/App.js`，不要上传 GitHub，原因是浏览器代码任何人都能下载查看。

启动后问一个外部问题，例如：

```text
What are recent applications of model context protocol?
```

然后在浏览器 DevTools 或服务器控制台观察：

```text
React -> /chat -> chatMCP -> MCP child process -> search_web
```

## 8. 答辩时如何解释 MCP

可以这样说：

> In this project, MCP is the standard boundary between my agent backend and an external search capability. The Express server acts as an MCP client, while a separate child process exposes a validated `search_web` tool. This separation means I can replace the search provider later without changing the React UI or the PDF RAG pipeline.

中文意思：

> 在这个项目中，MCP 是 Agent 后端和外部搜索能力之间的标准边界。Express 作为 MCP client，独立子进程提供带输入校验的 `search_web` 工具。这样将来替换搜索服务时，不需要改 React 界面或 PDF RAG 主流程。

