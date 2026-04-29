export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    // Determine a fake referer based on the image URL to bypass strict hotlink protections
    let referer = 'https://www.google.com/';
    if (imageUrl.includes('ycut') || imageUrl.includes('ychouse') || imageUrl.includes('yungching')) {
      referer = 'https://buy.yungching.com.tw/';
    } else if (imageUrl.includes('sinyi')) {
      referer = 'https://www.sinyi.com.tw/';
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    
    return new Response(buffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return new Response('Error fetching image', { status: 500 });
  }
}
