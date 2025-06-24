import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import "dotenv/config";
import fs from "fs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const config = {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
  responseMimeType: "text/plain",
};

export async function getGeminiResponse(
  imageFilePath: string,
  prompt: string,
): Promise<string> {
  try {
    const { default: mime } = await import("mime");
    const model = "gemini-2.0-flash";

    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(imageFilePath);
    const mimeType = mime.getType(imageFilePath) || "image/png";
    const base64Image = imageBuffer.toString("base64");

    const contents = [
      {
        role: "user" as const,
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error getting Gemini response:", error);
    throw error;
  }
}
