import { kv } from '@vercel/kv';

const KV_KEY = 'house_hunter_saved_items';

export async function GET(req) {
  try {
    // If KV is not configured, return an empty array to prevent crashing
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      const keys = Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS'));
      console.warn(`Vercel KV is not configured. Found env keys: ${keys.join(', ')}`);
      return Response.json([]);
    }
    const items = await kv.get(KV_KEY) || [];
    return Response.json(items);
  } catch (error) {
    console.error('KV GET Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      const keys = Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS'));
      return Response.json({ error: `請確認已設定 Vercel KV。目前環境變數僅有: ${keys.length ? keys.join(', ') : '無'}` }, { status: 500 });
    }

    const { action, item, id, newStatus, localItems } = await req.json();
    let currentItems = await kv.get(KV_KEY) || [];

    if (action === 'add') {
      // Prevent duplicates if accidentally submitted twice
      if (!currentItems.find(i => i.id === item.id)) {
        currentItems = [item, ...currentItems];
      }
    } else if (action === 'update_status') {
      currentItems = currentItems.map(i => i.id === id ? { ...i, status: newStatus } : i);
    } else if (action === 'update_commute') {
      currentItems = currentItems.map(i => i.id === item.id ? { ...i, commuteInfo: item.commuteInfo } : i);
    } else if (action === 'delete') {
      currentItems = currentItems.filter(i => i.id !== id);
    } else if (action === 'sync') {
      if (Array.isArray(localItems)) {
        const existingIds = new Set(currentItems.map(i => i.id));
        const itemsToSync = localItems.filter(i => !existingIds.has(i.id));
        currentItems = [...itemsToSync, ...currentItems];
      }
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    await kv.set(KV_KEY, currentItems);
    return Response.json({ success: true, items: currentItems });
  } catch (error) {
    console.error('KV POST Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
