import {
  ApiOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  RobotOutlined
} from "@ant-design/icons";
import { Alert, Button, Layout, Tag, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { askQuestion, clearDocument, getHealth } from "./api";
import ChatComposer from "./components/ChatComposer";
import ConversationView from "./components/ConversationView";
import PdfUploader from "./components/PdfUploader";

const { Header, Content } = Layout;

function Capability({ icon, title, text, enabled }) {
  return (
    <div className="capability">
      <span className={`capability-icon ${enabled ? "is-ready" : ""}`}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <Tag color={enabled ? "green" : "default"}>{enabled ? "Ready" : "Optional"}</Tag>
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const refreshHealth = useCallback(async () => {
    try {
      const result = await getHealth();
      setHealth(result);
      setServerError("");
      if (result.document && !documentInfo) {
        setDocumentInfo(result.document);
      }
    } catch (error) {
      setServerError(`Cannot reach the Express server on port 5001: ${error.message}`);
    }
  }, [documentInfo]);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const latestAnswer = useMemo(
    () => [...conversation].reverse().find((turn) => turn.answer)?.answer,
    [conversation]
  );

  const handleUploaded = (uploadedDocument) => {
    setDocumentInfo(uploadedDocument);
    setConversation([]);
    refreshHealth();
  };

  const handleClearDocument = async () => {
    try {
      await clearDocument();
      setDocumentInfo(null);
      setConversation([]);
      message.success("The active document context was cleared.");
      refreshHealth();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleAsk = useCallback(async (question) => {
    const id = crypto.randomUUID();
    setConversation((previous) => [...previous, { id, question, answer: null }]);
    setIsLoading(true);

    try {
      const answer = await askQuestion(question);
      setConversation((previous) => previous.map((turn) => (
        turn.id === id ? { ...turn, answer } : turn
      )));
    } catch (error) {
      const answer = {
        ragAnswer: error.message,
        ragMode: "error",
        mcpAnswer: "The MCP call was not attempted because the chat request failed.",
        mcpMode: "error"
      };
      setConversation((previous) => previous.map((turn) => (
        turn.id === id ? { ...turn, answer } : turn
      )));
      message.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="brand">
          <span className="brand-mark"><RobotOutlined /></span>
          <div>
            <strong>Agent AI</strong>
            <span>PDF RAG and MCP tool-use lab</span>
          </div>
        </div>
        <div className="header-status">
          <Tag icon={<CheckCircleOutlined />} color={health?.status === "UP" ? "green" : "default"}>
            {health?.status === "UP" ? "Server online" : "Checking server"}
          </Tag>
          <Button type="text" onClick={refreshHealth}>Refresh</Button>
        </div>
      </Header>

      <Content className="app-content">
        <section className="intro-band">
          <div>
            <p className="eyebrow">LESSONS 46-49</p>
            <h1>Turn a PDF into a grounded AI conversation.</h1>
            <p>
              Upload a document, retrieve relevant chunks for RAG, and compare that answer with
              an MCP tool call for optional web-search context.
            </p>
          </div>
          <div className="capability-list">
            <Capability
              icon={<FileTextOutlined />}
              title="PDF retrieval"
              text={health?.openAiConfigured ? "OpenAI embeddings enabled" : "Local keyword fallback enabled"}
              enabled
            />
            <Capability
              icon={<ApiOutlined />}
              title="OpenAI generation"
              text="Add OPENAI_API_KEY for model-backed answers"
              enabled={health?.openAiConfigured}
            />
            <Capability
              icon={<GlobalOutlined />}
              title="MCP web search"
              text="Add SERPAPI_KEY to enable the search_web tool"
              enabled={health?.serpApiConfigured}
            />
          </div>
        </section>

        {serverError && (
          <Alert
            className="server-alert"
            type="warning"
            showIcon
            message="Backend unavailable"
            description={serverError}
          />
        )}

        <PdfUploader
          documentInfo={documentInfo}
          onUploaded={handleUploaded}
          onCleared={handleClearDocument}
        />

        <section className="conversation-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONVERSATION</p>
              <h2>Compare document retrieval with tool use</h2>
            </div>
            {documentInfo && <Tag color="blue">{documentInfo.originalName}</Tag>}
          </div>
          <ConversationView conversation={conversation} isLoading={isLoading} />
        </section>
      </Content>

      <footer className="composer-footer">
        <ChatComposer
          disabled={!documentInfo || Boolean(serverError)}
          isLoading={isLoading}
          latestAnswer={latestAnswer}
          onAsk={handleAsk}
        />
      </footer>
    </Layout>
  );
}

