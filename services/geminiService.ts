
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

// Safe initialization of the Gemini API
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will not work.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Senior Sales Intelligence Architect.
      OBJECTIVE: Qualify this LinkedIn lead based on potential ROI and conversion probability.
      CONTEXT: High-end B2B SaaS target. Look for authority roles (Director+), scaling indicators, or relevant industry pain points.
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

  return JSON.parse(response.text || '{}');
};

export const generateOutreach = async (lead: Lead): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Relationship Builder (Anti-Spam expert).
      OBJECTIVE: Write a non-salesy, personalized LinkedIn message.
      RULES: Max 3 sentences. No fluff. No "I hope you are well". Focus on a specific observation from their headline or post.
      DATA: ${lead.name} at ${lead.company}. Bio: ${lead.headline}. Recent Activity: ${lead.recentPost}
      GOAL: Spark curiosity or a low-friction question.
    `,
  });

  return response.text?.trim() || "Hi, I'd love to connect and learn more about your work at " + lead.company;
};

export const chatWithAssistant = async (message: string, leadsContext: Lead[]): Promise<string> => {
  const ai = getAI();
  const leadSummary = leadsContext.length > 0 
    ? leadsContext.slice(0, 10).map(l => `- ${l.name} (${l.company}): Score ${l.score || 'Unscored'}, Status ${l.status}`).join('\n')
    : "No leads currently in the database.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: LinkPulse Sales Strategist & Outreach Coach.
      CONTEXT: You are assisting a user managing their LinkedIn lead pipeline. You have access to their top 10 leads:
      ${leadSummary}

      USER MESSAGE: ${message}

      TASK: Answer the user's question with actionable sales advice. Be professional, concise, and encourage best practices. If they ask about specific leads, use the context provided.
    `,
  });

  return response.text?.trim() || "I'm sorry, I'm having trouble processing that request right now. How else can I help with your sales strategy?";
};
