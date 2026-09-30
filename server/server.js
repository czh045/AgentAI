import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chat, clearDocumentSession, indexDocument } from "./chat.js";
import { chatMCP, closeMcpClient } from "./chat-mcp.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5001);
const uploadDirectory = resolve("uploads");

await mkdir(uploadDirectory, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const safeExtension = extname(file.originalname).toLowerCase() || ".pdf";
    callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    callback(isPdf ? null : new Error("Only PDF files are accepted."), isPdf);
  }
});

let currentDocument = null;

function normalizeOriginalFilename(fileName) {
  try {
    return Buffer.from(fileName, "latin1").toString("utf8");
  } catch {
    return fileName;
  }
}

function requireQuestion(req, res) {
  const question = (req.query.question ?? req.body?.question ?? "").trim();
  if (!question) {
    res.status(400).json({ error: "A non-empty question is required." });
    return null;
  }
  return question;
}

async function discardDocument(document) {
  if (!document) {
    return;
  }

  clearDocumentSession(document.filePath);
  try {
    await unlink(document.filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not remove uploaded PDF ${document.filePath}: ${error.message}`);
    }
  }
}

app.get("/health", (_req, res) => {
  res.json({
    status: "UP",
    document: currentDocument
      ? {
          originalName: currentDocument.originalName,
          pageCount: currentDocument.pageCount,
          chunkCount: currentDocument.chunkCount
        }
      : null,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    serpApiConfigured: Boolean(process.env.SERPAPI_KEY?.trim())
  });
});

app.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Attach one PDF file in the form field named file." });
      return;
    }

    const session = await indexDocument(req.file.path);
    const previousDocument = currentDocument;
    currentDocument = {
      id: randomUUID(),
      filePath: req.file.path,
      originalName: normalizeOriginalFilename(req.file.originalname),
      pageCount: session.pageCount,
      chunkCount: session.chunkCount,
      uploadedAt: new Date().toISOString()
    };
    await discardDocument(previousDocument);

    res.status(201).json({
      message: "PDF uploaded and indexed successfully.",
      document: {
        id: currentDocument.id,
        originalName: currentDocument.originalName,
        pageCount: currentDocument.pageCount,
        chunkCount: currentDocument.chunkCount,
        uploadedAt: currentDocument.uploadedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

async function answerQuestion(req, res, next) {
  const question = requireQuestion(req, res);
  if (!question) {
    return;
  }
  if (!currentDocument) {
    res.status(409).json({ error: "Upload a PDF before asking a question." });
    return;
  }

  try {
    // RAG and MCP are independent capabilities. A missing web-search key should
    // not prevent the document answer from being returned.
    const [ragResult, mcpResult] = await Promise.allSettled([
      chat(currentDocument.filePath, question),
      chatMCP(question)
    ]);

    res.json({
      question,
      ragAnswer: ragResult.status === "fulfilled"
        ? ragResult.value.text
        : `Document answer unavailable: ${ragResult.reason.message}`,
      ragMode: ragResult.status === "fulfilled" ? ragResult.value.mode : "error",
      mcpAnswer: mcpResult.status === "fulfilled"
        ? mcpResult.value.text
        : `MCP answer unavailable: ${mcpResult.reason.message}`,
      mcpMode: mcpResult.status === "fulfilled" ? mcpResult.value.mode : "error"
    });
  } catch (error) {
    next(error);
  }
}

app.get("/chat", answerQuestion);
app.post("/chat", answerQuestion);

app.delete("/document", (_req, res) => {
  const documentToClear = currentDocument;
  currentDocument = null;
  discardDocument(documentToClear)
    .then(() => res.status(204).send())
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: "The document session was cleared, but its file could not be removed." });
    });
});

app.use((error, _req, res, _next) => {
  const status = error instanceof multer.MulterError ? 400 : 500;
  console.error(error);
  res.status(status).json({
    error: error.message || "The server could not process this request."
  });
});

const server = app.listen(port, () => {
  console.log(`Agent AI server is running at http://localhost:${port}`);
});

async function shutdown() {
  await closeMcpClient();
  server.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
