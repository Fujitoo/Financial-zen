import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "./types";

// Initialize Gemini with the provided API Key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const MODEL_FAST = "gemini-3-flash-preview"; 
const MODEL_PRO = "gemini-3-pro-preview"; 

/**
 * Parses natural language into a structured transaction object.
 * Optimized for speed and low-latency interaction.
 */
export async function parseTransactionWithAI(input: string): Promise<{ transaction: Partial<Transaction>, rawResponse: string }> {
  const systemInstruction = `
    You are a financial transaction parser. 
    Convert natural language into a structured JSON object.
    
    Rules:
    - Extract amount (number), currency (USD/EUR/etc), merchant, and category.
    - Infer the 'date' in ISO 8601 (YYYY-MM-DD). If "today" or unspecified, use current date.
    - Category must be one of: Food, Transport, Utilities, Entertainment, Health, Shopping, Other.
    - Set 'isRecurring' to true for words like "monthly", "subscription", "rent".
  `;

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: input,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          merchant: { type: Type.STRING },
          category: { type: Type.STRING },
          date: { type: Type.STRING },
          description: { type: Type.STRING },
          isRecurring: { type: Type.BOOLEAN },
          tags: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["amount", "currency", "category", "date"]
      }
    }
  });

  const text = response.text || "{}";
  let data: Partial<Transaction> = {};
  
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
  }

  return {
    transaction: data,
    rawResponse: text
  };
}

/**
 * Advanced Receipt Scanner using Vision-enabled Gemini Flash.
 */
export async function scanReceiptWithAI(base64Image: string, mimeType: string): Promise<Partial<Transaction>> {
  const systemInstruction = `
    Extract data from this receipt into JSON:
    - merchant, amount (number), currency, date (YYYY-MM-DD), category.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      { text: "Extract receipt JSON." }
    ],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          merchant: { type: Type.STRING },
          category: { type: Type.STRING },
          date: { type: Type.STRING },
        },
        required: ["amount", "currency", "merchant", "date"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {};
  }
}

/**
 * Hyper-intelligent Financial Coach using Gemini 3 Pro reasoning.
 */
export async function askFinancialCoach(history: Transaction[], query: string): Promise<string> {
  const context = JSON.stringify(history.slice(0, 50)); 
  
  const response = await ai.models.generateContent({
    model: MODEL_PRO,
    contents: `Transaction History: ${context}\n\nUser Inquiry: ${query}`,
    config: {
      systemInstruction: "You are 'Zen Oracle', a master of financial trends. Use deep reasoning to identify hidden spending patterns. Be concise, slightly futuristic, and highly insightful. Always use markdown formatting for clarity.",
      thinkingConfig: {
        thinkingBudget: 16384 // Reserve budget for complex financial reasoning
      }
    }
  });

  return response.text || "Synchronicity lost. Please repeat the query.";
}
