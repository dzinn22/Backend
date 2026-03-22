import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 🔑 COLOQUE SUA KEY AQUI
const API_KEY = process.env.OPENAI_API_KEY;

// 🧠 CHAT IA
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Erro IA" });
  }
});


// 🖼️ IA COM IMAGEM (base64)
app.post("/image", async (req, res) => {
  try {
    const { image } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Analise essa imagem" },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }]
      })
    });

    const data = await response.json();
    res.json(data);

  } catch {
    res.status(500).json({ error: "Erro imagem" });
  }
});


app.get("/", (req, res) => {
  res.send("🔥 ZR GPT API ONLINE");
});

app.listen(3000, () => console.log("🚀 rodando na porta 3000"));