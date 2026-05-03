import { kv } from '@vercel/kv';

const KV_KEY = 'house_hunter_saved_items';

export async function GET(req) {
  try {
    // If KV is not configured, return an empty array to prevent crashing
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      console.warn("Vercel KV is not configured. Returning empty list.");
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
      return Response.json({ error: "Vercel KV is not configured yet." }, { status: 500 });
    }

    const { action, item, id, newStatus } = await req.json();
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
