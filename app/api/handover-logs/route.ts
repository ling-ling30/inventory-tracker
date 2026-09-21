import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    const logs = await queryD1(`
      SELECT 
        h.id,
        h.item_id,
        h.from_user,
        h.to_user,
        h.notes,
        h.created_at,
        i.asset_tag,
        i.status,
        i.category_id,
        i.details
      FROM handover_logs h
      LEFT JOIN items i ON h.item_id = i.id
      ORDER BY h.created_at DESC
    `);

    const formatted = logs.map((l: any) => {
      let details = {};
      try {
        details = typeof l.details === 'string' ? JSON.parse(l.details || '{}') : (l.details || {});
      } catch (e) {}

      let title = l.asset_tag || 'Item';
      if (details) {
        title = (details as any).brand || (details as any).item || (details as any).provider_name || title;
      }

      return {
        id: l.id,
        date: l.created_at ? l.created_at.split(' ')[0] : '',
        assetTag: l.asset_tag || '—',
        itemTitle: title,
        category: l.category_id || '—',
        from: l.from_user,
        to: l.to_user,
        status: l.status || '—',
        notes: l.notes || '',
      };
    });

    return NextResponse.json({ logs: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
