import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf8');
const apiKey = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY=')).split('=')[1];

const ai = new GoogleGenAI({ apiKey: apiKey });

async function test() {
  const finalContents = [
    "Tell me what is in this image.",
    {
      inlineData: {
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png"
      }
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalContents,
      config: {
        responseMimeType: "application/json"
      }
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error with gemini-2.5-flash:", err.message);
  }
}

test();
