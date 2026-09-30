# Agent AI 项目总览

这不是“聊天框接一个 AI”那么简单，而是一个能清楚展示 AI 工程流程的小型全栈项目。它把一个 PDF 变成可以提问的知识库，并把“从文档里找答案”和“调用外部工具找信息”分开呈现。

## 1. 这个项目解决什么问题

假设你上传一份课程讲义、产品说明书或论文。普通聊天模型可能会凭自己的训练数据回答，容易跑题或编造。这个项目先从你上传的 PDF 里找最相关的文字，再让模型只基于这些文字作答。这一类做法叫 RAG，完整名称是 Retrieval-Augmented Generation，中文常译为“检索增强生成”。

同时，文档不一定包含所有最新信息。例如你问“这个技术最近有什么新闻”，PDF 中可能没有答案。因此项目还演示了 MCP：后端通过一个标准化工具接口调用 `search_web`，得到搜索结果后再交给模型概括。

## 2. 两条回答链路

```text
问题
 |
 +--> RAG 文档链路
 |     PDF -> 文字 -> chunk -> 检索 -> 上下文 -> 文档答案
 |
 +--> MCP 工具链路
       MCP client -> search_web tool -> SerpAPI -> 搜索结果 -> 工具答案
```

网页同时显示：

- RAG answer：应该只回答上传 PDF 中找得到的内容。
- MCP answer：来自 MCP 工具调用；未配置 SerpAPI 时会明确提示，而不是虚构联网结果。

这正是答辩时最重要的一句话：RAG 解决“基于私有文档回答”，MCP 解决“让 Agent 用标准方式调用外部能力”。

## 3. 目录为什么这样放

老师要求 `server` 放在项目根目录，而不是放在 React 的 `src` 里面。原因是它们是两个不同的运行程序：

```text
AgentAI/
  src/       React 源代码，只能在浏览器中运行
  server/    Node.js / Express 源代码，只能在服务器进程中运行
```

React 不能安全地读取 API Key，也不应该直接读写磁盘。PDF、OpenAI Key、SerpAPI Key、MCP 子进程都属于后端职责。

## 4. 首次学习顺序

1. 先看 `server/server.js`，理解 HTTP 请求如何进来。
2. 再看 `server/chat.js`，理解 PDF 如何变成可检索的文本块。
3. 看 `src/App.js` 和三个 components，理解前端如何上传、提问和展示。
4. 最后看 `server/mcp-server.js` 和 `server/chat-mcp.js`，理解 MCP server 与 client 的分工。

不要尝试第一天就背完所有 import。每次只沿着一条请求路径读：例如“上传 PDF”或“问一个问题”。

## 5. 一次提问到底发生了什么

用户在 React 输入问题，例如：

```text
What is task decomposition?
```

然后依次发生：

1. `ChatComposer.js` 调用 `onAsk(question)`。
2. `App.js` 调用 `api.js` 中的 `askQuestion`。
3. Axios 对 Express 发出 `POST http://localhost:5001/chat`。
4. `server.js` 并行调用 `chat.js` 和 `chat-mcp.js`。
5. `chat.js` 从当前 PDF 检索相关 chunk，生成 `ragAnswer`。
6. `chat-mcp.js` 启动或复用 MCP client，调用 `search_web`，生成 `mcpAnswer`。
7. Express 返回 JSON。
8. React 把 JSON 放进 `conversation` state。
9. `ConversationView.js` 画出用户问题、蓝色文档答案和绿色 MCP 答案。

## 6. 这个版本相比课堂最重要的增强

课堂代码的目的主要是展示概念，因此通常假设“文件一定上传成功、Key 一定存在、外部服务一定可用”。项目版不应该这样假设。本项目额外处理了：

- 只接受 PDF，且限制 10 MB。
- 上传前、提问前都检查必要条件。
- `.env` 被 `.gitignore` 忽略。
- 未配 OpenAI Key 时仍能用本地关键词检索。
- 未配 SerpAPI Key 时 MCP 工具返回配置提示。
- RAG 失败不会让 MCP 结果消失，MCP 失败也不会阻止 RAG 结果。
- 提供 `node:test` 单元测试来验证本地检索排序。

这些不是“为了让代码变复杂”，而是让程序从课堂演示更接近真实可运行服务。

