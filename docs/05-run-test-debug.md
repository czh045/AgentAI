# 运行、测试与排错手册

## 1. 第一次安装

在项目根目录：

```powershell
cd Z:\Program\java\AgentAI
npm.cmd install --legacy-peer-deps
```

再安装后端：

```powershell
cd server
npm.cmd install --legacy-peer-deps
cd ..
```

为什么要分两次？因为根目录的 React 与 `server` 的 Express/LangChain 各有自己的 `package.json` 和 `node_modules`。

## 2. 不配置任何 API Key 也能启动

直接运行：

```powershell
npm.cmd run dev
```

然后打开：

```text
http://localhost:3000
```

此时：

- React 页面可打开。
- 可以上传文字型 PDF。
- 可以用 local fallback 查找关键词相关文字。
- MCP 区域会告诉你没有配置 SerpAPI。

这是预期行为，不是失败。

## 3. 何时配置 `.env`

要用 OpenAI embedding 和模型回答时：

1. 在 `server` 目录复制 `.env.example` 为 `.env`。
2. 填入 `OPENAI_API_KEY`。
3. 重新启动 Express。

要用真实联网搜索时，再填 `SERPAPI_KEY`。

请确认 `.gitignore` 中有：

```text
server/.env
server/uploads/*
```

这表示真实 Key 和你上传的 PDF 不会进入 Git。

## 4. 正确的启动结果

终端应该有两组输出：

```text
Compiled successfully
```

和：

```text
Agent AI server is running at http://localhost:5001
```

若只看到第一句，说明 React 启动了、Express 没启动。若只看到第二句，说明后端启动了、前端没启动。

## 5. 测试

运行纯后端本地检索测试：

```powershell
npm.cmd run test:server
```

这些测试不需要 PDF、不需要 OpenAI Key、不需要 SerpAPI Key。它们验证：

- 文本如何被 tokenize。
- 包含关键词的 chunk 得到更高分。
- 检索返回最相关 chunk。
- 本地 fallback 明确标记自己没有调用 OpenAI。

构建 React：

```powershell
npm.cmd run build
```

成功说明 JSX、import 和 CSS 均能被生产构建工具处理。

## 6. Postman 测试顺序

导入 `postman/AgentAI.postman_collection.json`。

1. `GET /health`：确认 Express 活着。
2. `POST /upload`：Body 选 form-data，字段名必须是 `file`。
3. `POST /chat`：JSON body：

```json
{
  "question": "What is the central topic of this document?"
}
```

4. `DELETE /document`：清掉当前上传状态。

注意：`/chat` 只能在上传 PDF 后调用。得到 409 的含义是“没有 active document”，不是系统崩溃。

## 7. 常见错误

### `Cannot reach the Express server on port 5001`

原因：后端没有启动，或端口被其他程序占用。

排查：

```powershell
Test-NetConnection localhost -Port 5001
```

重新启动：

```powershell
npm.cmd run server
```

### `Only PDF files are accepted`

原因：上传的不是 PDF，或者文件扩展名错误。上传 `.pdf` 文件即可。

### `The PDF did not contain readable text`

原因：很多扫描件 PDF 只有图片，不含可复制文字。需要 OCR 后再上传，或选一份文字型 PDF。

### `OPENAI_API_KEY` 配了但仍显示 local fallback

检查：

1. `.env` 是否放在 `AgentAI/server/.env`，不是根目录。
2. Key 前后没有多余引号或空格。
3. 修改 `.env` 后是否重启 `npm.cmd run server`。

### MCP answer 显示没有配置 web search

这是 `SERPAPI_KEY` 缺失的正常提示。填写 Key 并重启后端。

### `EADDRINUSE`

说明端口已经被其他程序占用。找进程：

```powershell
Get-NetTCPConnection -LocalPort 5001 -State Listen | Select-Object OwningProcess
```

如果是你之前启动的 AgentAI，回到那个终端按 Ctrl+C。不要随便结束陌生进程。

## 8. 你应该真正学会什么

完成后你应能不用背代码地回答：

1. 为什么 PDF 要先切 chunk？
2. Embedding 和 Chat Model 分别做什么？
3. 为什么 API Key 一定放服务端 `.env`？
4. MCP server 与 MCP client 的职责有什么区别？
5. 为什么 `Promise.allSettled` 比 `Promise.all` 更适合本项目？
6. Voice 模式为什么大部分逻辑在浏览器，而不是 Express？

这些问题比“记住某个 import”更接近项目答辩与实习面试会问的内容。

## 9. 安装时看到 deprecated 提示怎么办

当前项目为了和课程保持一致，使用 `react-scripts`（Create React App）和 LangChain 的社区模块。npm 可能报告它们的维护状态，这不等于安装失败；先看最后是否出现 `added ... packages`。

本项目已经主动把上传中间件从课件的 Multer 1.x 升级到 2.x。之后如果你自己做新项目，前端可以优先选择 Vite，后端可以继续保留 Express；但这份 Agent AI 作业保留 CRA 结构，方便你逐节对照 Lesson 46-49。
