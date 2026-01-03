
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

/**
 * Initialize the Gemini API client.
 * Guidelines: Always use process.env.API_KEY directly.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

/**
 * Scores a lead using gemini-3-pro-preview for complex reasoning tasks.
 */
export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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

    // Extract text and trim as recommended by Gemini API guidelines.
    const text = response.text?.trim();
    if (!text) return { score: 0, reasoning: "No response from AI", intent: "Low" };
    
    try {
      // Handle potential markdown formatting in the response.
      const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parsing Error:", parseError, text);
      return { score: 0, reasoning: "Failed to parse AI scoring data", intent: "Low" };
    }
  } catch (error) {
    console.error("Score Error:", error);
    return { score: 0, reasoning: "Error analyzing lead", intent: "Low" };
  }
};

/**
 * Generates an outreach message using gemini-3-flash-preview for basic text tasks.
 */
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
    // Property access .text instead of .text() per guidelines.
    return response.text?.trim() || "Hi, I'd love to connect!";
  } catch (error) {
    console.error("Outreach generation error:", error);
    return "Hi, I'd love to connect!";
  }
};

/**
 * Chat with an assistant about leads using gemini-3-flash-preview for general assistance.
 */
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
    console.error("Chat error:", error);
    return "Service temporarily unavailable.";
  }
};
