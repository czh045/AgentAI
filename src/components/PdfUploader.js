import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Progress, Upload, message } from "antd";
import { useState } from "react";
import { uploadPdf } from "../api";

const { Dragger } = Upload;

export default function PdfUploader({ documentInfo, onUploaded, onCleared }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const customRequest = async ({ file, onSuccess, onError }) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      const error = new Error("Please select a PDF file.");
      onError(error);
      message.error(error.message);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const response = await uploadPdf(file, (event) => {
        if (event.total) {
          setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      onUploaded(response.document);
      onSuccess(response, file);
      message.success(`${file.name} was indexed successfully.`);
    } catch (error) {
      onError(error);
      message.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="document-panel" aria-label="PDF document upload">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DOCUMENT CONTEXT</p>
          <h2>Upload one PDF to ground the conversation</h2>
        </div>
        {documentInfo && (
          <Button onClick={onCleared} danger>
            Clear document
          </Button>
        )}
      </div>

      <Dragger
        accept=".pdf,application/pdf"
        disabled={uploading}
        maxCount={1}
        multiple={false}
        showUploadList={false}
        customRequest={customRequest}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag a PDF into this area</p>
        <p className="ant-upload-hint">
          The document stays on your local development server. Do not upload private or restricted files.
        </p>
        <Button icon={<UploadOutlined />} disabled={uploading}>
          Select PDF
        </Button>
      </Dragger>

      {uploading && <Progress percent={progress} status="active" showInfo />}

      {documentInfo && (
        <div className="document-status">
          <strong>{documentInfo.originalName}</strong>
          <span>{documentInfo.pageCount} pages</span>
          <span>{documentInfo.chunkCount} searchable chunks</span>
        </div>
      )}
    </section>
  );
}

