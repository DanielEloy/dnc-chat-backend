// backend/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'https://myprojectsdanieleloy.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Debug completo do diretório
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("=== DEBUG DO DIRETÓRIO ===");
console.log("📁 __dirname:", __dirname);
console.log("📁 __filename:", __filename);
console.log("📁 Diretório atual:", process.cwd());

// Listar arquivos no diretório atual
try {
  const files = fs.readdirSync(__dirname);
  console.log("📋 Arquivos no diretório backend:");
  files.forEach(file => console.log("   -", file));
} catch (err) {
  console.error("❌ Erro ao listar arquivos:", err.message);
}

// Carrega contexto dos projetos
let PROJECT_CONTEXT = "";
try {
  // Tentativa 1: Caminho relativo
  const projectsPath = join(__dirname, 'projects.json');
  console.log(`📁 Tentando carregar: ${projectsPath}`);
  
  const raw = fs.readFileSync(projectsPath, 'utf8');
  const pj = JSON.parse(raw);
  
  PROJECT_CONTEXT = `Daniel Eloy é um desenvolvedor Full Stack com os seguintes projetos:

${(pj.projects || [])
  .map((p, index) => 
    `PROJETO ${index + 1}: ${p.name}
Descrição: ${p.description}
Tipo: ${p.type}
Tecnologias: ${p.technologies || 'HTML, CSS, JavaScript'}
URL: ${p.url_network || 'Não disponível'}
---`
  )
  .join("\n")}`;
  
  console.log("✅ Projects.json carregado com sucesso!");
  console.log(`📊 ${pj.projects?.length || 0} projetos carregados`);
  
} catch (err) {
  console.error("❌ Erro ao carregar projects.json:", err.message);
  
  // Tentativa 2: Caminho absoluto alternativo
  try {
    const altPath = join(process.cwd(), 'projects.json');
    console.log(`🔄 Tentativa alternativa: ${altPath}`);
    
    const raw = fs.readFileSync(altPath, 'utf8');
    const pj = JSON.parse(raw);
    
    PROJECT_CONTEXT = `Daniel Eloy - Projetos (${pj.projects?.length || 0} projetos carregados)`;
    console.log("✅ Projects.json carregado via caminho alternativo!");
    
  } catch (err2) {
    console.error("❌ Falha na tentativa alternativa:", err2.message);
    
    // Fallback manual
    PROJECT_CONTEXT = `Daniel Eloy é um desenvolvedor Full Stack com 10 projetos incluindo Portfólio, Certificados, e desafios técnicos usando HTML, CSS, JavaScript, React, Node.js e TypeScript.`;
    console.log("🔄 Usando contexto manual de fallback");
  }
}

// Resto do código permanece igual...
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === "")
      return res.status(400).json({ error: "Mensagem vazia" });

    const full_prompt = `${PROJECT_CONTEXT}

PERGUNTA: ${message}

Responda de forma técnica e específica sobre os projetos do Daniel:`;

    console.log(`💬 Chat: "${message}"`);

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
      (data.candidates?.[0]?.content?.parts?.[0]?.text) ||
      "⚠️ Não consegui gerar resposta";

    return res.json({
      response: bot_response,
      timestamp: new Date().toISOString(),
      status: "success",
    });
  } catch (err) {
    console.error("Erro /api/chat:", err.message);
    return res.status(500).json({ 
      error: "Erro interno ao gerar resposta",
      status: "error" 
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "DNC Chat API - Daniel Eloy",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});