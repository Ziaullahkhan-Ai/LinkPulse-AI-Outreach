
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Senior Sales Intelligence Architect.
      OBJECTIVE: Qualify this LinkedIn lead.
      CONTEXT: High-end B2B SaaS target. Look for "High Intent" (authority roles, scaling indicators, relevant industry).
      DATA: 
      Name: ${lead.name}
      Headline: ${lead.headline}
      Company: ${lead.company}
      Activity: ${lead.recentPost || 'No recent activity available'}

      TASK: Provide a JSON response with:
      - score (0-100)
      - reasoning (1-2 sentences why this score)
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

  return JSON.parse(response.text);
};

export const generateOutreach = async (lead: Lead): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Relationship Builder (Anti-Spam expert).
      OBJECTIVE: Write a non-salesy, personalized LinkedIn message.
      RULES: Max 3 sentences. No fluff. No "I hope you are well". Focus on a specific observation from their headline or post.
      DATA: ${lead.name} at ${lead.company}. Bio: ${lead.headline}. Recent Activity: ${lead.recentPost}
    `,
  });

  return response.text.trim();
};

export const chatWithAssistant = async (message: string, leadsContext: Lead[]): Promise<string> => {
  const leadSummary = leadsContext.map(l => `${l.name} (${l.company}) - Score: ${l.score || 'N/A'}, Status: ${l.status}`).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: LinkPulse Sales Strategist.
      CONTEXT: You are assisting a user managing their LinkedIn leads. 
      CURRENT LEADS IN SYSTEM:
      ${leadSummary}

      USER MESSAGE: ${message}

      TASK: Answer the user's question. If they ask about specific leads, refer to the data provided. Be professional, concise, and helpful.
    `,
  });

  return response.text.trim();
};
