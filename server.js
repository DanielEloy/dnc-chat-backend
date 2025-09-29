// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'https://certificadosdanieleloy.netlify.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Carrega contexto dos projetos (frontend/projects.json)
let PROJECT_CONTEXT = "";
try {
  const path = new URL("../frontend/projects.json", import.meta.url);
  const raw = fs.readFileSync(path, "utf8");
  const pj = JSON.parse(raw);
  PROJECT_CONTEXT =
    "Lista de projetos:\n" +
    (pj.projects || [])
      .map((p) => `- ${p.name}: ${p.description}`)
      .join("\n");
} catch (err) {
  PROJECT_CONTEXT = "";
  console.warn(
    "Aviso: não foi possível carregar projects.json. Adicione manualmente o contexto se precisar."
  );
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "")
      return res.status(400).json({ error: "Mensagem vazia" });

    const full_prompt = `${PROJECT_CONTEXT}

PERGUNTA DO USUÁRIO: ${message}

Com base nos projetos listados acima, responda de forma específica e técnica:`;

    const payload = {
      contents: [{ parts: [{ text: full_prompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
        topP: 0.8,
      },
    };

    const full_url = `${BASE_URL}?key=${API_KEY}`;

    const response = await axios.post(full_url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const data = response.data || {};
    const bot_response =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text) ||
      "⚠️ Não consegui gerar resposta";

    return res.json({
      response: bot_response,
      timestamp: new Date().toISOString(),
      status: "success",
    });
  } catch (err) {
    console.error("Erro /api/chat:", err?.response?.data || err.message || err);
    return res
      .status(500)
      .json({ error: "Erro interno ao gerar resposta", status: "error" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "DNC Chat API - Daniel Eloy",
    projects: 10,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
