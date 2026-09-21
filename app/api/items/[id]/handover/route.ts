import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { toUserId, notes } = body;

    const existing = await queryD1(
      `SELECT i.*, u.user_name FROM items i LEFT JOIN users u ON i.assigned_user_id = u.id WHERE i.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = existing[0];
    const fromName = item.user_name || 'Storage / Pool';

    let toName = 'Storage / Pool';
    if (toUserId) {
      const u = await queryD1('SELECT user_name FROM users WHERE id = ?', [toUserId]);
      if (u.length > 0) toName = u[0].user_name;
    }

    const newStatus = toUserId ? 'In Use' : 'In Storage';

    await queryD1(
      `UPDATE items SET assigned_user_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [toUserId || null, newStatus, id]
    );

    const logId = 'log-' + Date.now().toString(36);
    await queryD1(
      'INSERT INTO handover_logs (id, item_id, from_user, to_user, notes) VALUES (?, ?, ?, ?, ?)',
      [logId, id, fromName, toName, (notes || 'Equipment Handover').trim()]
    );

    return NextResponse.json({ success: true, toName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
