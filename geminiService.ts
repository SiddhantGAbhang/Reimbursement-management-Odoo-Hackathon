import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const extractExpenseFromImage = async (base64Image: string) => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Extract expense details from this receipt image. Return a JSON object with:
            - amount (number)
            - currency (string, ISO code like USD, EUR, INR)
            - date (string, YYYY-MM-DD)
            - category (string, e.g., Food, Travel, Supplies)
            - description (string, summary of items)
            - merchantName (string)
            If a field is not found, use null.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  return JSON.parse(response.text || "{}");
};

export const getChatResponse = async (history: any[], message: string, context: string) => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: `You are Odoo Exp Assistant. Use the following user expense context to answer the question: ${context}` },
          ...history.map(h => ({ text: `${h.role}: ${h.text}` })),
          { text: `user: ${message}` }
        ]
      }
    ]
  });
  const response = await model;
  return response.text;
};

export const getRiskAssessment = async (expense: any) => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `Analyze this expense for fraud or anomalies. Return a JSON object with:
            - riskScore (0-100)
            - recommendation (string: Approve, Review, or Reject)
            - reasoning (string: detailed explanation)
            - flags (array of strings: e.g., "High Amount", "Duplicate Potential")
            
            Expense: ${JSON.stringify(expense)}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });
  const response = await model;
  return JSON.parse(response.text || "{}");
};
