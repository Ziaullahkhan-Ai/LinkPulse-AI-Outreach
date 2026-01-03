import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types.ts";

/**
 * Standard factory for obtaining a Gemini API instance.
 * Strictly uses process.env.API_KEY.
 */
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

/**
 * Deep analysis of lead potential using Gemini 3 Pro with Thinking Budget.
 */
export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Analyze this LinkedIn prospect for high-ticket B2B networking.
        
        PROSPECT:
        Name: ${lead.name}
        Headline: ${lead.headline}
        Company: ${lead.company}

        EVALUATION CRITERIA:
        1. Authority: Title decision-making power.
        2. Relevance: Strategic fit for B2B partnerships.
        3. Reciprocity: Likelihood of responding to high-value networking.

        Respond in JSON format.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { 
              type: Type.NUMBER, 
              description: "A priority score from 0-100." 
            },
            reasoning: { 
              type: Type.STRING, 
              description: "Short justification for the score." 
            },
            intent: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High"],
              description: "Estimated engagement likelihood." 
            },
          },
          required: ["score", "reasoning", "intent"]
        }
      }
    });

    const jsonStr = response.text?.trim() || '{}';
    const data = JSON.parse(jsonStr);
    
    return {
      score: data.score ?? 0,
      reasoning: data.reasoning ?? "Analysis complete.",
      intent: data.intent ?? "Low"
    };
  } catch (error) {
    console.error("Scoring error:", error);
    return { score: 0, reasoning: "AI analysis interrupted.", intent: "Low" };
  }
};

/**
 * Generates non-salesy, personalized outreach using Gemini 3 Flash.
 */
export const generateOutreach = async (lead: Lead): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Write a short (max 25 words) LinkedIn connection request for ${lead.name}.
        Headline: ${lead.headline} at ${lead.company}.
        
        RULES:
        - Human tone. No sales pitch.
        - No "I see you work at...".
        - Mention a specific curiosity about their field or company mission.
        - Low-friction ending.
      `,
    });
    return response.text?.trim() || `Hi ${lead.name}, I've been following the work at ${lead.company} and would love to connect.`;
  } catch (error) {
    return `Hi ${lead.name}, I'm interested in the mission at ${lead.company} and would love to connect.`;
  }
};

/**
 * Strategic chat advisor using Gemini 3 Flash.
 */
export const chatWithAssistant = async (message: string, leads: Lead[]): Promise<string> => {
  try {
    const ai = getAI();
    const topLeads = leads
      .filter(l => (l.score || 0) > 60)
      .slice(0, 5)
      .map(l => `${l.name} (${l.company})`)
      .join(", ");
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are the LinkPulse Strategy Engine.
        Context: User has ${leads.length} leads. Top prospects: ${topLeads || 'None analyzed yet'}.
        User asks: ${message}
        
        Provide punchy, tactical networking advice.
      `,
    });
    return response.text?.trim() || "I'm ready to help you optimize your outreach strategy.";
  } catch (error) {
    return "Strategic advisory is currently in maintenance. Please try again shortly.";
  }
};