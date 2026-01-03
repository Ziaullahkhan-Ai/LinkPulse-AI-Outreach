
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

/**
 * Initialize the Gemini API client.
 * Always use process.env.API_KEY directly as per guidelines.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

/**
 * Qualify a lead by analyzing profile details and recent activity.
 * Returns a score, reasoning, and intent level.
 */
export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ROLE: Senior Sales Intelligence Architect.
        OBJECTIVE: Qualify this LinkedIn lead based on potential ROI and conversion probability.
        DATA: 
        Name: ${lead.name}
        Headline: ${lead.headline}
        Company: ${lead.company}
        Activity: ${lead.recentPost || 'No recent activity available'}

        TASK: Provide a JSON response with:
        - score (0-100)
        - reasoning (1-2 sentences why this score was given)
        - intent (Low, Medium, High)
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
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error in scoreLead:", error);
    return { score: 0, reasoning: "Error analyzing lead. Please check configuration.", intent: "Low" };
  }
};

/**
 * Generate a highly personalized LinkedIn outreach message.
 */
export const generateOutreach = async (lead: Lead): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ROLE: Relationship Builder.
        OBJECTIVE: Write a non-salesy, personalized LinkedIn message. Max 3 sentences.
        DATA: ${lead.name} at ${lead.company}. Bio: ${lead.headline}. Activity: ${lead.recentPost}
      `,
    });

    return response.text?.trim() || `Hi ${lead.name}, I'd love to connect!`;
  } catch (error) {
    console.error("Error in generateOutreach:", error);
    return `Hi ${lead.name}, I saw your profile and would love to connect.`;
  }
};

/**
 * Chat with a sales strategist about current leads.
 */
export const chatWithAssistant = async (message: string, leadsContext: Lead[]): Promise<string> => {
  try {
    const ai = getAI();
    const leadSummary = leadsContext.length > 0 
      ? leadsContext.slice(0, 5).map(l => `- ${l.name} (${l.company}): ${l.score || 'Unscored'}`).join('\n')
      : "No leads currently.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ROLE: Sales Strategist.
        CONTEXT: You have access to these leads:
        ${leadSummary}

        USER MESSAGE: ${message}
      `,
    });

    return response.text?.trim() || "I'm processing that. How else can I help?";
  } catch (error) {
    console.error("Error in chatWithAssistant:", error);
    return "I'm having trouble connecting to my strategist brain right now.";
  }
};
