import { getGeminiResponse as originalGetGeminiResponse } from "./geminiService.js";
import { metricsReporter } from "./middleware.js";
import path from "path";

export async function getGeminiResponse(
  imageFilePath: string,
  prompt: string,
): Promise<string> {
  const fileName = path.basename(imageFilePath);

  return await metricsReporter.trackGeminiRequest(
    "gemini-api-call",
    () => originalGetGeminiResponse(imageFilePath, prompt),
    fileName,
    imageFilePath,
  );
}
