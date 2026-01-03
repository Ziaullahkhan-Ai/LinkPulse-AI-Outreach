
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

/**
 * Initialize the Gemini API client.
 * Guidelines: Always use process.env.API_KEY directly.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze this LinkedIn prospect for B2B relevance:
        Name: ${lead.name}
        Headline: ${lead.headline}
        Company: ${lead.company}

        Return a JSON object: { "score": 0-100, "reasoning": "string", "intent": "Low"|"Medium"|"High" }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            intent: { type: Type.STRING },
          },
          required: ["score", "reasoning", "intent"]
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : { score: 0, reasoning: "No data", intent: "Low" };
  } catch (error) {
    console.error("Score Error:", error);
    return { score: 0, reasoning: "Error analyzing lead", intent: "Low" };
  }
};

export const generateOutreach = async (lead: Lead): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Write a friendly, short (2-3 sentence) LinkedIn message for ${lead.name} at ${lead.company}.
        Tone: Professional but conversational. No sales fluff.
      `,
    });
    return response.text?.trim() || "Hi, I'd love to connect!";
  } catch (error) {
    return "Hi, I'd love to connect!";
  }
};

export const chatWithAssistant = async (message: string, leadsContext: Lead[]): Promise<string> => {
  try {
    const ai = getAI();
    const context = leadsContext.slice(0, 5).map(l => `${l.name} (${l.company})`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User message: ${message}\nContext leads: ${context}`,
    });
    return response.text?.trim() || "I'm ready to help with your outreach.";
  } catch (error) {
    return "Service temporarily unavailable.";
  }
};
