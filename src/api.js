import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
});

function readError(error) {
  return error.response?.data?.error || error.message || "The request failed.";
}

export async function getHealth() {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function uploadPdf(file, onUploadProgress) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress
    });
    return response.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function askQuestion(question) {
  try {
    const response = await api.post("/chat", { question });
    return response.data;
  } catch (error) {
    throw new Error(readError(error));
  }
}

export async function clearDocument() {
  try {
    await api.delete("/document");
  } catch (error) {
    throw new Error(readError(error));
  }
}

