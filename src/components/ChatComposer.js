import {
  AudioOutlined,
  MessageOutlined,
  SendOutlined,
  SoundOutlined,
  StopOutlined
} from "@ant-design/icons";
import { Button, Input, Space, Tooltip, message } from "antd";
import SpeechRecognition, {
  useSpeechRecognition
} from "react-speech-recognition";
import Speech from "speak-tts";
import { useEffect, useRef, useState } from "react";

const { TextArea } = Input;

export default function ChatComposer({
  disabled,
  isLoading,
  latestAnswer,
  onAsk
}) {
  const [question, setQuestion] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speaker, setSpeaker] = useState(null);
  const submittedTranscript = useRef("");
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  useEffect(() => {
    const speech = new Speech();
    speech
      .init({
        volume: 1,
        lang: "en-US",
        rate: 1,
        pitch: 1,
        splitSentences: false
      })
      .then(() => setSpeaker(speech))
      .catch(() => {
        // Voice output is optional; text chat remains fully available.
      });
  }, []);

  useEffect(() => {
    if (isRecording && !listening && transcript.trim() && transcript !== submittedTranscript.current) {
      submittedTranscript.current = transcript;
      setIsRecording(false);
      onAsk(transcript);
      resetTranscript();
    }
  }, [isRecording, listening, onAsk, resetTranscript, transcript]);

  useEffect(() => {
    if (!voiceMode || !speaker || !latestAnswer?.ragAnswer) {
      return;
    }
    speaker.speak({
      text: latestAnswer.ragAnswer,
      queue: false
    }).catch(() => {
      // Browser speech synthesis can be unavailable on some devices.
    });
  }, [latestAnswer, speaker, voiceMode]);

  const submitQuestion = async () => {
    const value = question.trim();
    if (!value || isLoading || disabled) {
      return;
    }
    setQuestion("");
    await onAsk(value);
  };

  const toggleVoiceMode = () => {
    setVoiceMode((enabled) => !enabled);
    setIsRecording(false);
    SpeechRecognition.stopListening();
    resetTranscript();
  };

  const toggleRecording = () => {
    if (!browserSupportsSpeechRecognition) {
      message.warning("This browser does not support speech recognition.");
      return;
    }
    if (!isMicrophoneAvailable) {
      message.warning("Allow microphone access in the browser before recording.");
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
      return;
    }

    submittedTranscript.current = "";
    resetTranscript();
    setIsRecording(true);
    SpeechRecognition.startListening({
      continuous: false,
      language: "en-US"
    });
  };

  return (
    <section className="composer-panel" aria-label="Ask a question">
      <div className="composer-copy">
        <span className="composer-icon"><MessageOutlined /></span>
        <div>
          <strong>Ask your document</strong>
          <span>
            {disabled
              ? "Upload and index a PDF to begin."
              : voiceMode
                ? "Voice mode reads the document answer aloud."
                : "Press Ctrl+Enter or use Send."}
          </span>
        </div>
      </div>

      <div className="composer-controls">
        {!voiceMode && (
          <TextArea
            aria-label="Question for the uploaded PDF"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={disabled}
            placeholder="For example: What is task decomposition?"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onPressEnter={(event) => {
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                submitQuestion();
              }
            }}
          />
        )}
        <Space size={8}>
          <Tooltip title="Toggle voice conversation mode">
            <Button
              icon={<SoundOutlined />}
              type={voiceMode ? "primary" : "default"}
              danger={voiceMode}
              onClick={toggleVoiceMode}
            >
              Voice
            </Button>
          </Tooltip>
          {voiceMode && (
            <Tooltip title={listening ? "Stop and send recording" : "Record a spoken question"}>
              <Button
                icon={listening ? <StopOutlined /> : <AudioOutlined />}
                danger={listening}
                disabled={disabled || isLoading}
                onClick={toggleRecording}
              >
                {listening ? "Stop" : "Record"}
              </Button>
            </Tooltip>
          )}
          {!voiceMode && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={isLoading}
              disabled={disabled || !question.trim()}
              onClick={submitQuestion}
            >
              Send
            </Button>
          )}
        </Space>
      </div>

      {voiceMode && (
        <p className="recording-status">
          {listening ? `Listening: ${transcript || "start speaking..."}` : "Voice mode is ready."}
        </p>
      )}
    </section>
  );
}

