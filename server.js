import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const publicDir = path.join(
  __dirname,
  "public"
);

app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir));

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

const systemPrompt = `
You are NA MUSAMMAN AI GLOBAL, a helpful multilingual AI assistant.

The application interface is English ONLY.

Always answer in the same language used by the user:
- Hausa question → simple Hausa answer
- English question → English answer
- Mixed Hausa and English → understand and respond naturally.

Be accurate, clear, respectful and concise.

Help with:
- General questions
- News writing
- Translation
- Summaries
- School work
- Social media captions
- Content creation
- Ideas

Do not pretend to have live news unless live browsing is actually connected.
`;

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(client),
    app: "NA MUSAMMAN AI GLOBAL"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message =
      String(req.body?.message || "").trim();

    const previous =
      Array.isArray(req.body?.history)
        ? req.body.history
        : [];

    if (!message) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (!client) {
      return res.status(503).json({
        error:
          "OpenAI API key is not configured."
      });
    }

    const input = [
      {
        role: "developer",
        content: systemPrompt
      },

      ...previous.slice(-12).map((m) => ({
        role:
          m.role === "assistant"
            ? "assistant"
            : "user",
        content: String(
          m.content || ""
        )
      })),

      {
        role: "user",
        content: message
      }
    ];

    const response =
      await client.responses.create({
        model:
          process.env.OPENAI_MODEL ||
          "gpt-5-mini",
        input
      });

    res.json({
      answer:
        response.output_text ||
        "No answer received."
    });

  } catch (error) {

    console.error(
      "AI request failed:",
      error?.message || error
    );

    res.status(500).json({
      error:
        "AI connection error. Please try again."
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(
    path.join(
      publicDir,
      "index.html"
    )
  );
});

const port =
  Number(
    process.env.PORT || 3000
  );

app.listen(port, () => {
  console.log(
    `NA MUSAMMAN AI GLOBAL running on port ${port}`
  );
});
