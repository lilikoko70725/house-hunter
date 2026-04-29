import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const data = await req.json();
    const { origin, destination } = data;
    
    if (!origin || !destination) {
      return Response.json({ error: '起點或終點未提供' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      return Response.json({ error: '尚未設定 GEMINI_API_KEY' }, { status: 500 });
    }

    const prompt = `
請扮演專業的地圖系統。請告訴我從台灣的「${origin}」開車到「${destination}」大約需要多少車程時間。
請直接回傳簡短的文字結果，例如「約 15 分鐘」或「約 1 小時 10 分鐘」。不要包含其他多餘的解釋或標點符號。
`;

    const modelsToTry = [
      'gemini-3.1-flash',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    let responseText = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          responseText = response.text;
          break; // success
        } catch (err) {
          console.log(`Commute API - Model ${modelName} attempt ${attempt} failed:`, err.message);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      if (responseText) break; // success
    }

    if (!responseText) {
      throw new Error(`所有模型均無法完成推估。`);
    }

    return Response.json({
      time: responseText.trim()
    });

  } catch (error) {
    console.error("Commute API Error:", error);
    return Response.json({ error: `推估失敗` }, { status: 500 });
  }
}
