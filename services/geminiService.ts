import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeModelImage = async (base64Image: string, promptText: string): Promise<string> => {
  try {
    // Remove data URL prefix if present (e.g. "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: promptText
          }
        ]
      },
      config: {
        systemInstruction: "You are an expert 3D printing engineer and industrial designer. Analyze the provided image of a 3D model. Provide concise, technical insights about geometry, potential 3D printing challenges (overhangs, bed adhesion), and guess what the object is.",
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster visual analysis
      }
    });

    return response.text || "No analysis could be generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to analyze image.");
  }
};
