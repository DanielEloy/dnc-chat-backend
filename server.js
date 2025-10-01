// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { logger } from './utils/logger.js';

// ================== CONFIGURAÇÃO INICIAL ==================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.GEMINI_API_KEY || "";
const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Suporte a JSON e CORS
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://myprojectsdanieleloy.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
logger.info('Servidor iniciado com sucesso!', logger);
// ================== RESOLUÇÃO DE DIRETÓRIOS ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ================== CONTEXTO DE PROJETOS ==================
let PROJECT_CONTEXT = "";

function carregarContexto() {
  try {
    const projectsPath = join(__dirname, "projects.json");
    const raw = fs.readFileSync(projectsPath, "utf8");
    const pj = JSON.parse(raw);

    PROJECT_CONTEXT = `Daniel Eloy é um desenvolvedor Full Stack com os seguintes projetos:\n\n${pj.projects
      .map((p, index) => {
        const docInfo = p.readme
          ? `📚 README/Documentação: ${p.readme}\n`
          : p.documentation
          ? `📚 Documentação: ${p.documentation}\n`
          : "";

        const urlInfo = `🌐 URL Principal: ${
          p.url_network || "Não disponível"
        }${p.url_network_secund ? `\n🔗 URL Secundária: ${p.url_network_secund}` : ""}`;

        return `🎯 PROJETO ${index + 1}: ${p.name}
📝 Descrição: ${p.description}
🏷️ Tipo: ${p.type}
🛠️ Tecnologias: ${p.technologies || "HTML, CSS, JavaScript"}
${urlInfo}
${docInfo}---`;
      })
      .join("\n")}

INSTRUÇÕES PARA RESPOSTAS FORMATADAS:
🎯 **OBJETIVO**
🛠️ **TECNOLOGIAS**
⚡ **FUNCIONALIDADES**
🔗 **ACESSO**
💪 **HABILIDADES**
⚠️ Referencie README para detalhes técnicos.`;

    logger.success(
      `✅ Contexto carregado com sucesso: ${pj.projects?.length || 0} projetos`
    );
  } catch (err) {
    logger.error("❌ Erro ao carregar projects.json:", err.message);
    PROJECT_CONTEXT =
      "Daniel Eloy é um desenvolvedor Full Stack com projetos em HTML, CSS, JavaScript, React, Node.js e TypeScript.";
  }
}

carregarContexto();

// ================== ROTAS ==================

// Rota principal de chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }

    const full_prompt = `${PROJECT_CONTEXT}

PERGUNTA DO USUÁRIO: "${message}"

**INSTRUÇÕES DE FORMATAÇÃO CRÍTICAS:**
- Use **MARKDOWN** para toda a resposta
- Formate em **SEÇÕES CLARAS** com **TÍTULOS EM NEGRITO**
- Use **APENAS** os seguintes ícones: 🎯🛠️⚡🔗💪📚
- **NUNCA** use emojis aleatórios ou diferentes destes
- Estruture assim:

🎯 **OBJETIVO PRINCIPAL**\n
[Descrição do objetivo]

🛠️ **TECNOLOGIAS UTILIZADAS**\n 
- [Lista de tecnologias]

⚡ **FUNCIONALIDADES DESTACADAS**\n
- [Lista de funcionalidades]

🔗 **ACESSO AO PROJETO**\n
[Links e informações de acesso]

💪 **HABILIDADES DESENVOLVIDAS**\n
- [Lista de habilidades]

📚 **DOCUMENTAÇÃO**\n
[Informações sobre README ou documentação]

**IMPORTANTE:**\n Seja específico sobre tecnologias e forneça links quando disponíveis.`;

    const payload = {
      contents: [{ parts: [{ text: full_prompt }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.7, topP: 0.8 },
    };

    const { data } = await axios.post(`${BASE_URL}?key=${API_KEY}`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    const resposta =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ Não consegui gerar uma resposta no momento.";

    res.json({
      response: resposta,
      timestamp: new Date().toISOString(),
      status: "success",
    });
  } catch (err) {
    logger.error("❌ Erro /api/chat:", err.message);

    const statusMap = {
      ECONNREFUSED: [503, "Serviço indisponível"],
      429: [429, "Muitas requisições, aguarde."],
      400: [400, "Erro na solicitação. Verifique a chave da API."],
    };

    const [status, msg] =
      statusMap[err.code] ||
      statusMap[err.response?.status] || [500, "Erro interno no servidor"];

    res.status(status).json({
      error: msg,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
      status: "error",
    });
  }
});

// Rota: projetos resumidos
app.get("/api/projects", (req, res) => {
  try {
    const projectsPath = join(__dirname, "projects.json");
    const pj = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

    const stats = {
      total: pj.projects?.length || 0,
      with_readme: pj.projects?.filter((p) => p.readme).length || 0,
    };

    res.json({
      stats,
      projects:
        pj.projects?.map((p) => ({
          name: p.name,
          type: p.type,
          url: p.url_network,
          has_readme: !!p.readme,
        })) || [],
    });
  } catch {
    res.status(500).json({ error: "Erro ao carregar projetos" });
  }
});

// Rota: healthcheck
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "DNC Chat API - Daniel Eloy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    gemini_api: !!API_KEY,
  });
});

// ================== SERVIDOR ==================
app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`🔗 Health: http://localhost:${PORT}/api/health`);
  logger.info(`📊 Projetos: http://localhost:${PORT}/api/projects`);
  logger.info(`💬 Chat: POST http://localhost:${PORT}/api/chat`);
});
