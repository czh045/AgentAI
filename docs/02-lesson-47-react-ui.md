# Lesson 47：React 上传与问答界面

这一课解决的是“后端已经有接口，浏览器怎么把它用成产品”。React 不直接处理 RAG 或 API Key；它负责收集用户操作、调用后端、保存页面状态、显示结果。

## 1. 根目录 `package.json`

根目录和 `server/package.json` 是两个不同文件，因为前端和后端是两个 Node 项目。

最重要的 scripts：

```json
{
  "dev": "concurrently \"npm start\" \"npm run server\"",
  "server": "npm --prefix server run start",
  "start": "react-scripts start"
}
```

- `npm.cmd start`：只启动 React，默认端口 3000。
- `npm.cmd run server`：只启动 Express，端口 5001。
- `npm.cmd run dev`：用 `concurrently` 同时运行两者。

在 Windows PowerShell 中使用 `npm.cmd` 比直接使用 `npm` 更稳，因为部分电脑的 PowerShell execution policy 会阻止 `npm.ps1`。

## 2. `src/api.js`：唯一的 HTTP 出口

前端不应该在每个组件里到处写 `axios.post("http://...")`。因此把请求集中在 `api.js`：

```js
export async function uploadPdf(file, onUploadProgress) { ... }
export async function askQuestion(question) { ... }
export async function clearDocument() { ... }
```

这样做的优点：

- URL 从 `localhost:5001` 改成 AWS 后，只改一个地方。
- 统一超时与错误解析。
- React 组件更专注于界面，而不是 HTTP 细节。

`readError` 会优先读取后端的 JSON `error` 字段，因此用户看到的是“Upload a PDF before asking a question”，而不是难读的 Axios 错误对象。

## 3. `App.js`：页面状态中心

`App.js` 的核心 state：

```js
const [health, setHealth] = useState(null);
const [documentInfo, setDocumentInfo] = useState(null);
const [conversation, setConversation] = useState([]);
const [isLoading, setIsLoading] = useState(false);
```

逐个理解：

- `health`：后端健康状态和 Key 是否已配置。
- `documentInfo`：当前 PDF 的名称、页数、chunk 数。
- `conversation`：所有问答记录。
- `isLoading`：某个问题正在等待答案时为 `true`。

React 的原则是：会影响页面显示的数据，必须放在 state 中。不要直接修改 DOM 来画答案。

## 4. 上传组件 `PdfUploader.js`

Ant Design 的 `Dragger` 给用户拖拽区域，但真正的上传逻辑由：

```js
customRequest={customRequest}
```

接管。它不会使用默认上传方式，而是调用我们自己的 `uploadPdf(file)`。

上传完成后：

```js
onUploaded(response.document);
```

把文档信息交回父组件 `App.js`。这叫“状态提升”：子组件负责具体操作，父组件保存共享状态。

## 5. 提问组件 `ChatComposer.js`

文本提问流程：

```text
TextArea 输入
  -> submitQuestion()
  -> onAsk(value)
  -> App.handleAsk()
  -> api.askQuestion()
  -> POST /chat
```

输入框使用 Ctrl+Enter 发送，而普通 Enter 允许换行。因为 PDF 问题有时不止一行，例如“请比较第 2 章与第 4 章的定义”。

按钮在以下情况下禁用：

- 未上传 PDF。
- 后端不可达。
- 问题为空。
- 当前请求仍在进行。

这类禁用状态比“点击后才报错”更符合真实产品体验。

## 6. 对话列表 `ConversationView.js`

一次成功响应类似：

```json
{
  "question": "What is RAG?",
  "ragAnswer": "....",
  "ragMode": "local-fallback",
  "mcpAnswer": "....",
  "mcpMode": "mcp-tool-only"
}
```

组件把它分成两块：

- 蓝色左边框：`RAG answer from the uploaded document`
- 绿色左边框：`MCP answer using the web-search tool`

不要把两者混成一个答案。它们可信来源不同：

- RAG 应由 PDF 支撑。
- MCP 依赖外部工具和外部数据。

## 7. React 里异步状态为什么要先放“空答案”

`handleAsk` 先插入：

```js
{ id, question, answer: null }
```

这样用户点击发送后立刻能看到自己的问题和 loading 状态。等后端返回，再用 `map` 找到相同 id 并填入答案。

这比“等所有请求完成才显示一整块问答”体验更好，也避免连续提问时不知道哪个答案对应哪个问题。

## 8. Lesson 47 自测

1. 打开 `http://localhost:3000`。
2. 先不上传文件，确认输入框提示要上传。
3. 上传公开 PDF。
4. 问一个 PDF 内容易回答的问题。
5. 观察页面同时出现蓝色和绿色答案。
6. 点击 `Clear document`，确认对话和当前文档状态清空。

如果网页显示 “Cannot reach the Express server on port 5001”，说明 React 已启动但 Express 没启动。回到项目根目录执行：

```powershell
npm.cmd run server
```

