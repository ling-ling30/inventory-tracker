import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    const items = await queryD1(`
      SELECT 
        i.*,
        u.user_name as assigned_user_name,
        u.job_title as assigned_user_title,
        u.department as assigned_user_dept,
        c.name as category_name
      FROM items i
      LEFT JOIN users u ON i.assigned_user_id = u.id
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY i.created_at DESC
    `);

    // Fetch handover history for each item
    const logs = await queryD1('SELECT * FROM handover_logs ORDER BY created_at DESC');

    const formatted = items.map((item: any) => {
      const itemLogs = logs
        .filter((l: any) => l.item_id === item.id)
        .map((l: any) => ({
          id: l.id,
          date: l.created_at ? l.created_at.split(' ')[0] : '',
          from: l.from_user,
          to: l.to_user,
          notes: l.notes,
        }));

      return {
        id: item.id,
        assetTag: item.asset_tag,
        category: item.category_id,
        status: item.status,
        assignedUserId: item.assigned_user_id,
        location: item.location,
        notes: item.notes,
        details: typeof item.details === 'string' ? JSON.parse(item.details || '{}') : item.details,
        assignedUserName: item.assigned_user_name,
        assignedUserTitle: item.assigned_user_title,
        assignedUserDept: item.assigned_user_dept,
        history: itemLogs,
      };
    });

    return NextResponse.json({ items: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetTag, category, status, assignedUserId, location, notes, details } = body;

    if (!assetTag || !category) {
      return NextResponse.json({ error: 'Asset Tag and Category are required' }, { status: 400 });
    }

    const id = 'itm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const detailsJson = JSON.stringify(details || {});
    const finalStatus = assignedUserId ? 'In Use' : (status || 'In Storage');

    await queryD1(
      `INSERT INTO items (id, asset_tag, category_id, status, assigned_user_id, location, notes, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        assetTag.trim(),
        category,
        finalStatus,
        assignedUserId || null,
        (location || '').trim(),
        (notes || '').trim(),
        detailsJson,
      ]
    );

    // If initial assignment was made, create initial handover log
    if (assignedUserId) {
      const user = await queryD1('SELECT user_name FROM users WHERE id = ?', [assignedUserId]);
      const toName = user[0]?.user_name || 'Assigned User';
      const logId = 'log-' + Date.now().toString(36);

      await queryD1(
        'INSERT INTO handover_logs (id, item_id, from_user, to_user, notes) VALUES (?, ?, ?, ?, ?)',
        [logId, id, 'Storage / Pool', toName, 'Initial assignment on creation']
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
