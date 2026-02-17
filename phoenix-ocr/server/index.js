import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Root route for testing
app.get("/", (req, res) => {
  res.send("Phoenix OCR Backend Running");
});

const GEMINI_MODEL = "gemini-1.5-flash";


// OCR endpoint
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, systemInstruction, imageBase64 } = req.body;

    const parts = [{ text: prompt || "Extract text from this image." }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      });
    }

    const payload = {
      contents: [{ role: "user", parts }],
      systemInstruction: {
        parts: [{ text: systemInstruction || "" }],
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    // DEBUG LOG
    console.log("Gemini OCR Response:", JSON.stringify(data));

    if (!data || data.error) {
      return res.status(500).json({
        error: data?.error?.message || "Gemini API error",
      });
    }

    const extractedText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "NO_TEXT_RETURNED";

    res.json({ text: extractedText });
  } catch (err) {
    console.error("Gemini OCR Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Document Detection Endpoint
app.post("/api/detect-document", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: "Classify this document type." },
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log("Gemini Detection Response:", JSON.stringify(data));

    const detectedType =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Other";

    res.json({
      documentType: detectedType,
      confidence: "high",
      suggestedFields: [],
    });
  } catch (err) {
    console.error("Document Detection Error:", err);
    res.status(500).json({
      error: err.message,
      documentType: "Other",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
