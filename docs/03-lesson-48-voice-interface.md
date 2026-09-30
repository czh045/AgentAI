# Lesson 48：语音交互

语音功能不是让后端处理录音文件。本项目使用浏览器原生能力：浏览器把语音识别成文本，再把文本像普通问题一样发送给 Express；收到答案后，浏览器再朗读文本。

## 1. 两个依赖分别做什么

```text
react-speech-recognition
```

负责语音转文本。它包装浏览器 Speech Recognition API，让 React 更容易读取：

- `transcript`：当前识别到的文本。
- `listening`：是否正在录音。
- `browserSupportsSpeechRecognition`：浏览器是否支持。
- `isMicrophoneAvailable`：用户是否允许麦克风。

```text
speak-tts
```

负责文本转语音。它调用浏览器 Speech Synthesis 能力，把 RAG 文档答案朗读出来。

## 2. 为什么声音模式在前端

麦克风权限属于浏览器。若把录音发到后端，需要额外处理：

- 音频编码与文件体积。
- 隐私和用户同意。
- 语音识别云服务的费用。
- 音频删除策略。

课堂目标是“语音对话 UI”，所以本项目让浏览器只传最终识别出的文字问题。这样后端还是只理解普通 JSON：

```json
{ "question": "What is task decomposition?" }
```

## 3. `ChatComposer.js` 的关键状态

```js
const [voiceMode, setVoiceMode] = useState(false);
const [isRecording, setIsRecording] = useState(false);
const [speaker, setSpeaker] = useState(null);
```

- `voiceMode`：用户是否打开 Voice 模式。
- `isRecording`：本次点击是否正在等待语音结果。
- `speaker`：初始化完成的 TTS 对象。

初始化朗读器：

```js
const speech = new Speech();
speech.init({ lang: "en-US", rate: 1, pitch: 1 });
```

`useEffect(..., [])` 只有组件第一次显示时执行一次，所以不会每次渲染都重新创建语音对象。

## 4. 录音如何变成提问

点击 Record 后：

```js
SpeechRecognition.startListening({
  continuous: false,
  language: "en-US"
});
```

`continuous: false` 表示本项目使用“一次说一句”的模式，而不是无限持续监听。识别结束时，下面的 effect 发现：

```js
isRecording && !listening && transcript.trim()
```

于是调用：

```js
onAsk(transcript);
```

因此语音输入和键盘输入最终进入同一个 `App.handleAsk`，不会产生两套后端逻辑。

## 5. 回答为什么只读 RAG answer

语音模式里优先朗读：

```js
latestAnswer.ragAnswer
```

因为 RAG answer 与用户上传的文档绑定，可信边界更明确。MCP 回答可能包含搜索摘要、配置提示或外部信息，默认不自动朗读能降低干扰。

## 6. 常见问题

### 点击 Record 没反应

检查浏览器地址栏是否禁止了麦克风。允许后刷新页面再试。

### 提示 browser does not support speech recognition

换 Chrome 或 Edge。不同浏览器对 Web Speech API 的支持不同。

### 识别的是中文还是英文

当前课程代码设置 `language: "en-US"`，因此适合英文提问。若要做中文版本，改为：

```js
language: "zh-CN"
```

同时把 `speak-tts` 的 `lang` 改为 `zh-CN`。真实产品还应让用户在 UI 中选语言。

### 没有声音

检查电脑音量、浏览器自动播放限制与系统是否有可用语音。文字问答仍然能正常使用。

