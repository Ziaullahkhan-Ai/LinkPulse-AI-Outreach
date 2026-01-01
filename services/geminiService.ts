
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * REMARKABLE PROMPT STRUCTURE:
 * 1. Role: Senior Sales Intelligence Architect
 * 2. Objective: Analyze lead data to determine intent and score potential ROI.
 * 3. Context: We want high-intent B2B leads, not spray-and-pray.
 * 4. Data: Lead profile snippet and recent activity.
 */

export const scoreLead = async (lead: Partial<Lead>): Promise<{ score: number; reasoning: string; intent: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Senior Sales Intelligence Architect & Lead Analyst.
      OBJECTIVE: Qualify this LinkedIn lead based on their profile and activity.
      CONTEXT: We are a high-end B2B SaaS company. We only want to reach out to people who show "High Intent" (recent hiring, relevant posts, specific pain points mentioned, or authority roles).
      DATA: 
      Name: ${lead.name}
      Headline: ${lead.headline}
      Company: ${lead.company}
      Activity: ${lead.recentPost || 'No recent activity available'}

      TASK: Provide a JSON response with:
      - score (0-100)
      - reasoning (1-2 sentences)
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

  const result = JSON.parse(response.text);
  return result;
};

export const generateOutreach = async (lead: Lead): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      ROLE: Human-Centric Relationship Builder (Anti-Spam specialist).
      OBJECTIVE: Write a personalized, non-salesy LinkedIn outreach message.
      CONTEXT: The goal is to start a conversation, NOT to sell. Use the context of their recent post or profile headline.
      RULES: No "I hope this finds you well", no "I saw your profile and was impressed", no pitch in the first message. Be brief, specific, and genuinely curious.
      DATA: 
      Lead: ${lead.name}
      Company: ${lead.company}
      Bio: ${lead.headline}
      Context/Post: ${lead.recentPost || 'Profile headline'}

      TASK: Write a 2-3 sentence LinkedIn connection note or message.
    `,
  });

  return response.text.trim();
};
