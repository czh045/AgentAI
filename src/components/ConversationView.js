import { GlobalOutlined, RobotOutlined } from "@ant-design/icons";
import { Empty, Spin, Tag } from "antd";

function AnswerBlock({ icon, label, mode, children, tone }) {
  return (
    <div className={`answer-block answer-${tone}`}>
      <div className="answer-meta">
        {icon}
        <span>{label}</span>
        {mode && <Tag>{mode}</Tag>}
      </div>
      <p>{children}</p>
    </div>
  );
}

export default function ConversationView({ conversation, isLoading }) {
  if (!isLoading && conversation.length === 0) {
    return (
      <section className="conversation-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Your document Q&A will appear here."
        />
      </section>
    );
  }

  return (
    <section className="conversation" aria-live="polite">
      {conversation.map((turn) => (
        <article className="conversation-turn" key={turn.id}>
          <div className="question-bubble">{turn.question}</div>
          {turn.answer ? (
            <div className="answer-stack">
              <AnswerBlock
                icon={<RobotOutlined />}
                label="RAG answer from the uploaded document"
                mode={turn.answer.ragMode}
                tone="document"
              >
                {turn.answer.ragAnswer}
              </AnswerBlock>
              <AnswerBlock
                icon={<GlobalOutlined />}
                label="MCP answer using the web-search tool"
                mode={turn.answer.mcpMode}
                tone="web"
              >
                {turn.answer.mcpAnswer}
              </AnswerBlock>
            </div>
          ) : (
            <div className="answer-pending">
              <Spin size="small" /> Retrieving document context and calling the MCP tool...
            </div>
          )}
        </article>
      ))}
      {isLoading && <div className="loading-row"><Spin /> Agent AI is working...</div>}
    </section>
  );
}

