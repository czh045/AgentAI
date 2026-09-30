# Lesson 46：Express 后端与 PDF RAG

这一课的目标是：建立一个运行在 `5001` 端口的 Express 服务，让 React 能上传 PDF，并通过 `/chat` 询问文档内容。

## 1. 后端的入口：`server/server.js`

先看最上面的 import：

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
```

- `express`：创建 HTTP 服务与路由。
- `cors`：允许 `localhost:3000` 上的 React 浏览器访问 `localhost:5001`。
- `dotenv`：读取 `.env` 里的 Key。
- `multer`：处理浏览器上传的 `multipart/form-data` 文件。

接下来：

```js
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
```

`dotenv.config()` 必须在读取 `process.env.OPENAI_API_KEY` 之前执行。`express.json()` 让 Express 能读懂 `POST /chat` 时传来的 JSON，例如：

```json
{ "question": "What is RAG?" }
```

## 2. 为什么文件上传必须使用 Multer

普通 JSON 只能传文本、数字、数组、对象。PDF 是二进制文件，浏览器需要把它包进 `FormData`：

```js
const formData = new FormData();
formData.append("file", file);
```

后端的：

```js
app.post("/upload", upload.single("file"), async (req, res, next) => {
```

表示只读取名为 `file` 的一个上传字段。上传成功后，Multer 把文件信息放在 `req.file`。

项目里额外给 Multer 配置了三件事：

1. `fileFilter`：拒绝非 PDF。
2. `fileSize`：最多 10 MB，避免一个请求占满磁盘或内存。
3. `filename`：用时间戳加 UUID 保存，不直接使用用户原始文件名，防止同名文件覆盖。

课件使用的是 Multer 1.x；项目版本使用兼容的 Multer 2.x，因为 1.x 已有不建议继续使用的安全告警。你学习的概念与本项目的 `upload.single("file")` 写法没有变化。

## 3. 上传后并不只是“保存文件”

这段逻辑是关键：

```js
const session = await indexDocument(req.file.path);
currentDocument = {
  filePath: req.file.path,
  originalName: req.file.originalname,
  pageCount: session.pageCount,
  chunkCount: session.chunkCount
};
```

`indexDocument` 位于 `chat.js`。它会在上传时提前完成 PDF 解析和切分。这样用户第一次提问时不需要再等一遍完整解析。

`currentDocument` 代表课堂项目中的“当前活动文档”。它存在内存里，因此重启 Node 服务后会消失；这对课堂单用户演示足够，但生产系统会把文档元数据放进数据库或对象存储。

## 4. `chat.js` 的五步 RAG 流程

### 第一步：读取 PDF

```js
const loader = new PDFLoader(filePath);
const documents = await loader.load();
```

`PDFLoader` 把 PDF 的每一页转换成 LangChain `Document` 对象。对象主要有：

- `pageContent`：本页可读取的文字。
- `metadata`：页码、来源文件等辅助信息。

扫描版 PDF 如果只有图片、没有文本层，`PDFLoader` 可能读不到内容。这不是代码坏了，而是需要 OCR 的另一类问题。

### 第二步：切分 chunk

```js
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 80
});
const chunks = await textSplitter.splitDocuments(documents);
```

不能把整本 PDF 原封不动塞给模型，原因有两个：

1. 上下文会过长，速度和成本都不好。
2. 无关文字越多，模型越难聚焦。

`chunkSize: 500` 表示每块大约 500 个字符。`chunkOverlap: 80` 让相邻 chunk 有重叠，避免一句话刚好被截断在边界。

### 第三步：建立向量检索

当 `OPENAI_API_KEY` 存在时：

```js
const embeddings = new OpenAIEmbeddings({ apiKey });
const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);
```

Embedding 不是回答问题的聊天模型，而是把文字变成数字向量。语义接近的句子会在向量空间中更接近。`MemoryVectorStore` 是把这些向量存在 Node 进程内存中，重启服务就消失。

### 第四步：检索相关文段

```js
const relevantDocs = await session.vectorStore.similaritySearch(query, 4);
```

这句表示根据用户问题找最相近的 4 段文档。注意：检索不是“让模型猜”，而是从上传文档中选候选上下文。

### 第五步：用上下文回答

```js
const formattedPrompt = await prompt.format({ context, question: query });
const response = await model.invoke(formattedPrompt);
```

Prompt 里明确规定：

- 只使用传入 document context。
- 文档没有的内容就说明没有。
- 最多三句，保持简洁。

这叫 grounding，也就是把回答约束在可信来源上。

## 5. 为什么还写了 `local-rag.js`

OpenAI Embedding 与 Chat Model 都需要 Key，并且可能产生费用。为了让你不配 Key 也能演示完整流程，本项目提供了本地检索：

```js
const relevantDocs = selectRelevantChunks(query, session.chunks, 4);
```

它做的事情是：

1. `tokenize` 把问题转成小写关键词。
2. 去掉部分常见词，例如 `what`、`how`、`the`。
3. 在每个 chunk 中统计关键词出现次数。
4. 依据分数排序，选前几个 chunk。

这不是语义向量检索，因此“student loan”和“education funding”这类不同词但相近含义的情况会比较弱。不过它足够让你理解“检索先发生，生成后发生”的整体结构。

## 6. `/chat` 为什么同时跑两条任务

`server.js` 中使用：

```js
const [ragResult, mcpResult] = await Promise.allSettled([
  chat(currentDocument.filePath, question),
  chatMCP(question)
]);
```

`Promise.allSettled` 的好处是两个任务独立结算：

- PDF RAG 成功但 SerpAPI 没配：用户仍能看到 RAG 答案。
- MCP 成功但 PDF 解析失败：用户仍能看到 MCP 信息。

不要使用 `Promise.all` 来处理这种“可部分成功”的功能，因为其中一个失败会导致整个请求直接抛错。

## 7. 用 Postman 测试 Lesson 46

先启动后端：

```powershell
cd Z:\Program\java\AgentAI\server
npm.cmd run start
```

测试健康检查：

```text
GET http://localhost:5001/health
```

上传：

```text
POST http://localhost:5001/upload
Body -> form-data
key: file
type: File
value: 任意可公开的 PDF
```

提问：

```text
GET http://localhost:5001/chat?question=What%20is%20the%20main%20topic%3F
```

如果没上传 PDF，得到 `409` 是正确行为，不是错误。它说明后端没有让“没有上下文的 RAG”假装成功。
