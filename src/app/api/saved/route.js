import Redis from 'ioredis';

let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}
const KV_KEY = 'house_hunter_saved_items';

export async function GET(req) {
  try {
    // If Redis is not configured, return an empty array to prevent crashing
    if (!redis) {
      console.warn("Redis is not configured. Returning empty list.");
      return Response.json([]);
    }
    const data = await redis.get(KV_KEY);
    const items = data ? JSON.parse(data) : [];
    return Response.json(items);
  } catch (error) {
    console.error('KV GET Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!redis) {
      return Response.json({ error: '請確認已設定 Redis。' }, { status: 500 });
    }

    const { action, item, id, newStatus, localItems } = await req.json();
    const data = await redis.get(KV_KEY);
    let currentItems = data ? JSON.parse(data) : [];

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

    await redis.set(KV_KEY, JSON.stringify(currentItems));
    return Response.json({ success: true, items: currentItems });
  } catch (error) {
    console.error('KV POST Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
