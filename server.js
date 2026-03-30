import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const API_KEY = process.env.OPENAI_API_KEY;

// Verificação da key
if (!API_KEY) {
  console.log("❌ ERRO: OPENAI_API_KEY não foi encontrada no .env");
}

// =======================
// 🧠 CHAT IA (GPT-4o-mini)
// =======================
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Você precisa enviar { messages: [...] }"
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7
      })
    });

    const data = await response.json();

    // Se OpenAI retornar erro
    if (!response.ok) {
      console.log("❌ ERRO OPENAI /chat:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Erro desconhecido da OpenAI",
        full: data
      });
    }

    const reply = data.choices?.[0]?.message?.content || "Sem resposta.";

    // Retorno limpo pro frontend
    res.json({
      reply,
      raw: data
    });

  } catch (err) {
    console.log("❌ ERRO SERVIDOR /chat:", err);
    res.status(500).json({ error: "Erro interno no servidor (chat)" });
  }
});


// =======================
// 🖼️ IA COM IMAGEM
// =======================
app.post("/image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "Você precisa enviar { image: 'data:image/png;base64,...' }"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analise essa imagem detalhadamente." },
              { type: "input_image", image_url: image }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("❌ ERRO OPENAI /image:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Erro desconhecido da OpenAI",
        full: data
      });
    }

    // Extrair resposta do responses API
    const reply =
      data.output?.[0]?.content?.find(c => c.type === "output_text")?.text ||
      data.output_text ||
      "Sem resposta.";

    res.json({
      reply,
      raw: data
    });

  } catch (err) {
    console.log("❌ ERRO SERVIDOR /image:", err);
    res.status(500).json({ error: "Erro interno no servidor (image)" });
  }
});


// =======================
// 🔥 STATUS ONLINE
// =======================
app.get("/", (req, res) => {
  res.send("🔥 ZR GPT API ONLINE");
});


// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 rodando na porta " + PORT));
