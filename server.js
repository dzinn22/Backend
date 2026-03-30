import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.log("❌ ERRO: OPENAI_API_KEY não foi encontrada no Render (.env).");
}

/* =======================================================
   🧠 CHAT NORMAL (resposta completa)
======================================================= */
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
        messages,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("❌ ERRO OPENAI /chat:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Erro desconhecido da OpenAI",
        full: data
      });
    }

    const reply = data.choices?.[0]?.message?.content || "Sem resposta.";

    res.json({ reply });

  } catch (err) {
    console.log("❌ ERRO SERVIDOR /chat:", err);
    res.status(500).json({ error: "Erro interno no servidor (chat)" });
  }
});


/* =======================================================
   ⚡ CHAT STREAM (igual ChatGPT digitando)
   Endpoint: POST /chat-stream
   Resposta: SSE (text/event-stream)
======================================================= */
app.post("/chat-stream", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Você precisa enviar { messages: [...] }"
      });
    }

    // headers SSE
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // força enviar
    res.flushHeaders?.();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      res.write(`data: ${JSON.stringify({ error: errData.error?.message || "Erro OpenAI" })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const dataStr = line.replace("data:", "").trim();

        if (dataStr === "[DONE]") {
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const token = json.choices?.[0]?.delta?.content;

          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }

        } catch (e) {
          // ignora erros de parse
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.log("❌ ERRO SERVIDOR /chat-stream:", err);
    res.write(`data: ${JSON.stringify({ error: "Erro interno no servidor (stream)" })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});


/* =======================================================
   🖼️ IA COM IMAGEM
======================================================= */
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

    const reply =
      data.output?.[0]?.content?.find(c => c.type === "output_text")?.text ||
      data.output_text ||
      "Sem resposta.";

    res.json({ reply });

  } catch (err) {
    console.log("❌ ERRO SERVIDOR /image:", err);
    res.status(500).json({ error: "Erro interno no servidor (image)" });
  }
});


/* =======================================================
   🔥 STATUS ONLINE
======================================================= */
app.get("/", (req, res) => {
  res.send("🔥 ZR GPT API ONLINE");
});


/* =======================================================
   🚀 START SERVER
======================================================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 rodando na porta " + PORT));
