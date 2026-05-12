import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Extract URL from text
function extractUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Fetch and parse webpage content
async function fetchWebpageContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (!response.ok) return null;
    
    const html = await response.text();
    const finalUrl = response.url; // Get the final redirected URL
    const $ = cheerio.load(html);
    
    // Extract multiple images
    let imageUrls = [];
    
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      if (ogImage.startsWith('http')) {
        imageUrls.push(ogImage);
      } else {
        imageUrls.push(new URL(ogImage, finalUrl).toString());
      }
    }
    
    $('img').each((i, el) => {
      // Prioritize lazy-loaded attributes over src
      let src = $(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src');
      if (!src) return;
      if (src.startsWith('data:')) return; // ignore base64 inline images
      
      const srcLower = src.toLowerCase();
      // Basic filter to ignore logos, icons, and tracking pixels
      if (srcLower.includes('icon') || srcLower.includes('logo') || srcLower.includes('avatar') || srcLower.includes('svg') || srcLower.includes('pixel') || srcLower.includes('blank')) {
        return;
      }
      
      if (!src.startsWith('http')) {
        try {
          src = new URL(src, finalUrl).toString();
        } catch (e) {
          return;
        }
      }
      
      if (!imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    });
    
    // Also extract hidden images from JS/JSON state
    const urlRegex = /(?:https?:)?\/\/[^"'\s\\>]+/gi;
    const allUrls = html.match(urlRegex) || [];
    const hiddenImages = allUrls.filter(u => 
      u.match(/\.(jpg|jpeg|png|webp)/i) || 
      u.includes('/image/') || 
      u.includes('photo') || 
      u.includes('cloudfps') ||
      u.includes('yccdn')
    ).map(u => {
      let url = u.replace(/\\u002F/g, '/').replace(/&amp;/g, '&').replace(/[\)\}\];"']+$/, '');
      if (url.startsWith('//')) {
        url = 'https:' + url;
      }
      return url;
    });
    
    for (let src of hiddenImages) {
      // Basic filter again
      if (src.toLowerCase().includes('icon') || src.toLowerCase().includes('logo') || src.endsWith(');') || src.endsWith(')')) {
          continue;
      }
      if (!imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    }
    
    // Ensure uniqueness and limit to 50 images to retain as many photos as possible
    imageUrls = [...new Set(imageUrls)].slice(0, 50);
    console.log('Final Image URLs extracted:', imageUrls);
    
    // Extract title and meta description
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    
    // Extract window.__INITIAL_STATE__ or __NUXT__ which contains the SPA data for 591
    let stateData = '';
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && (scriptContent.includes('__INITIAL_STATE__') || scriptContent.includes('__NUXT__'))) {
        stateData += scriptContent + '\n';
      }
    });

    // Remove unwanted elements
    $('style, iframe, svg, footer, header, nav, script').remove();
    
    // Get text and clean it up
    let text = $('body').text();
    text = text.replace(/\s+/g, ' ').trim();
    
    let combinedText = `網頁標題: ${title}\n網頁描述: ${metaDescription}\n\n網頁內文:\n${text}\n\n系統隱藏資料 (JSON/State):\n${stateData}`;
    
    // Limit to 30000 characters to prevent prompt overflow but ensure we get the SPA state
    return {
      text: combinedText.substring(0, 30000),
      imageUrls: imageUrls
    };
  } catch (error) {
    console.error("Error fetching webpage:", error);
    return null;
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      return Response.json({ error: '尚未設定 GEMINI_API_KEY' }, { status: 500 });
    }
    
    // Check for URLs in address or description
    const urlInAddress = extractUrl(data.address || '');
    const urlInDescription = extractUrl(data.description || '');
    const urlInUrlField = extractUrl(data.url || '');
    const targetUrl = urlInUrlField || urlInAddress || urlInDescription;
    
    let webpageContent = '';
    let parsedNotice = '';
    let scrapedImageUrls = [];

    if (targetUrl) {
      console.log("Fetching URL:", targetUrl);
      const result = await fetchWebpageContent(targetUrl);
      if (result) {
        webpageContent = `\n\n=== 以下為系統自動從網址 (${targetUrl}) 抓取的網頁內容 ===\n${result.text}\n==================\n`;
        parsedNotice = `(已成功解析網址內容)`;
        scrapedImageUrls = result.imageUrls;
      } else {
        parsedNotice = `(網址解析失敗，僅使用輸入文字)`;
      }
    }

    const prompt = `
你是一位專業的房地產分析師。請根據以下房屋資訊${data.screenshots?.length > 0 ? '（包含使用者上傳的房屋照片/截圖）' : ''}，進行客觀且深度的優缺點分析、整理基本資料，並且**根據該地址的區域行情，推估最新的實價登錄價格區間，進行開價比對**。

請以 JSON 格式回傳，格式必須嚴格符合以下結構：
{
  "basicInfo": {
    "名稱或地址": "...",
    "社區名稱": "請盡可能提取出這間房屋所屬的建案或社區名稱，若無則填『未提供』",
    "詳細地址": "提取最精確的地點(如行政區+路名)，專供地圖搜尋，不要包含建案名稱或其他文字",
    "總價": "...",
    "單價": "...",
    "總坪數": "...",
    "公設比": "如果網頁未標示，請用『共有部分』除以『總建坪(總坪數)』計算並以百分比(%)呈現",
    "格局": "...",
    "屋齡": "...",
    "樓層": "...",
    "型態/用途": "...",
    "車位": "如果網頁或截圖中有標示車位(如：平面車位、機械車位等)請填寫，若無則填『未提供』",
    "最近捷運站": "根據地址找出最近的捷運站名，並推估騎機車到該站的通勤時間 (例如：'象山站 (騎機車約 5 分鐘)')"
  },
  "priceAnalysis": {
    "estimatedMarketPrice": "預估該區域近期實價登錄單價區間 (例如：約 60~65 萬/坪)",
    "comparison": "比對本物件開價與區域實價登錄行情，給出具體的議價建議與價差分析 (約50字)"
  },
  "pros": ["優點1", "優點2", ...],
  "cons": ["缺點或抗性1", "缺點或抗性2", ...],
  "summary": "整體評估建議，字數約100字",
  "score": 85
}
(備註：如果某些基本資料無法從提供的資訊中取得，請直接填寫 "未提供"，請確保回傳純 JSON 格式)
${data.screenshots?.length > 0 ? '*(注意：請務必仔細閱讀使用者上傳的截圖，並將截圖中的價格、坪數、優缺點描述等資訊整合進您的分析與 JSON 輸出中)*' : ''}

房屋資訊：
社區名稱：${data.communityName || '未提供'}
詳細地址：${data.address || '未提供'}
總價：${data.price ? data.price + ' 萬' : '未提供'}
坪數：${data.size ? data.size + ' 坪' : '未提供'}
屋齡：${data.age ? data.age + ' 年' : '未提供'}
樓層：${data.floor || '未提供'}
其他描述：${data.description || '無'} ${parsedNotice}
${webpageContent}
`;

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash-8b'
    ];

    let finalContents = [prompt];
    
    if (data.screenshots && data.screenshots.length > 0) {
      for (const base64Str of data.screenshots) {
        const matches = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          finalContents.push({
            inlineData: {
              data: matches[2],
              mimeType: matches[1]
            }
          });
        }
      }
    }

    let responseText = null;
    let aiResult = null;
    let errorLog = [];

    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Trying model ${modelName} (attempt ${attempt})...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: finalContents,
            config: {
              responseMimeType: "application/json"
            }
          });
          responseText = response.text;
          
          // Attempt to parse immediately so we can retry if it's invalid JSON
          aiResult = JSON.parse(responseText);
          break; // success, break out of attempt loop
        } catch (err) {
          errorLog.push(`${modelName}(try${attempt}): ${err.message}`);
          console.log(`Model ${modelName} attempt ${attempt} failed:`, err.message);
          // Wait a bit before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
      if (aiResult) break; // success, break out of model loop
    }

    if (!aiResult) {
      throw new Error(`分析失敗，詳細錯誤日誌: ${errorLog.join(' | ')}`);
    }
    
    return Response.json({
      ...aiResult,
      imageUrls: scrapedImageUrls,
      sourceUrl: targetUrl
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return Response.json({ error: `分析失敗: ${error.message}` }, { status: 500 });
  }
}
