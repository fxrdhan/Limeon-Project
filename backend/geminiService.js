const {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} = require("@google/genai");
const dotenv = require("dotenv");

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getGeminiResponse(imageFilePath, prompt) {
    const image = await ai.files.upload({
        file: imageFilePath,
    });

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
            createUserContent([prompt, createPartFromUri(image.uri, image.mimeType)]),
        ],
        generationConfig: {
            temperature: 0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
        },
    });

    return response.text;
}

module.exports = { getGeminiResponse };
