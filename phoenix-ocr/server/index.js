import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// Document type detection prompt
const DOCUMENT_DETECTION_PROMPT = `Analyze this document and classify it into ONE of these categories:
- Invoice/Bill
- Resume/CV
- Prescription/Medical
- ID Card (Aadhar, Passport, Driver's License)
- Business Card
- Contract/Legal
- Academic Certificate
- Handwritten Note
- Newspaper/Article
- Other

Return ONLY the category name, nothing else.`;

const DOCUMENT_DETECTION_SYSTEM = "You are a document classification expert. Analyze visual elements, layout, and content to identify document type.";

// Enhanced OCR prompt for better extraction
const ENHANCED_OCR_PROMPT = `Extract all readable text from this image.
Preserve formatting such as headings, lists, tables.
Correct obvious OCR mistakes.
Return clean, structured output.
If this is a specific document type (invoice, resume, prescription), organize the extracted information appropriately.`;

// OCR endpoint
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, systemInstruction, imageBase64 } = req.body;

    const parts = [{ text: prompt }];

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

    res.json({
      text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Gemini failed" });
  }
});

// Document type detection endpoint
app.post("/api/detect-document", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const parts = [
      { text: DOCUMENT_DETECTION_PROMPT },
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      },
    ];

    const payload = {
      contents: [{ role: "user", parts }],
      systemInstruction: {
        parts: [{ text: DOCUMENT_DETECTION_SYSTEM }],
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
    const detectedType = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Other";

    // Map to standardized categories
    const categoryMap = {
      "invoice": "Invoice/Bill",
      "bill": "Invoice/Bill",
      "receipt": "Invoice/Bill",
      "resume": "Resume/CV",
      "cv": "Resume/CV",
      "prescription": "Prescription/Medical",
      "medical": "Prescription/Medical",
      "prescription/medical": "Prescription/Medical",
      "id card": "ID Card",
      "aadhar": "ID Card",
      "passport": "ID Card",
      "driver's license": "ID Card",
      "business card": "Business Card",
      "contract": "Contract/Legal",
      "legal": "Contract/Legal",
      "certificate": "Academic Certificate",
      "academic": "Academic Certificate",
      "handwritten": "Handwritten Note",
      "note": "Handwritten Note",
      "newspaper": "Newspaper/Article",
      "article": "Newspaper/Article",
    };

    const normalizedType = detectedType.toLowerCase();
    const mappedType = categoryMap[normalizedType] || detectedType;

    // Get formatting suggestions based on document type
    const formatPrompt = `This document is a ${mappedType}. Provide a brief JSON structure (just 3-5 key fields) that would be relevant for this document type. For example:
- Invoice: ["Invoice Number", "Date", "Total Amount", "Vendor"]
- Resume: ["Name", "Email", "Skills", "Experience"]
- Prescription: ["Doctor Name", "Patient Name", "Medications", "Date"]

Return ONLY the JSON array, no other text.`;

    const formatPayload = {
      contents: [{ role: "user", parts: [{ text: formatPrompt }] }],
    };

    const formatResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatPayload),
      }
    );

    const formatData = await formatResponse.json();
    const suggestedFields = formatData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";

    res.json({
      documentType: mappedType,
      confidence: "high",
      suggestedFields: suggestedFields,
    });
  } catch (err) {
    console.error("Document detection error:", err);
    res.status(500).json({ error: "Document detection failed", documentType: "Other" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
