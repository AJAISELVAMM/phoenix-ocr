const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://phoenix-ocr.onrender.com"
    : "";

export const callGemini = async (prompt, systemInstruction = "", imageBase64 = null) => {
  const response = await fetch(`${API_BASE}/api/gemini`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      systemInstruction,
      imageBase64,
    }),
  });

  if (!response.ok) throw new Error("API failed");

  const data = await response.json();
  return data.text;
};

// Detect document type from image
export const detectDocumentType = async (imageBase64) => {
  const response = await fetch(`${API_BASE}/api/detect-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64,
    }),
  });

  if (!response.ok) throw new Error("Document detection failed");

  const data = await response.json();
  return data;
};
