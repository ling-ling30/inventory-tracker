import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const items = await queryD1(
      `SELECT i.*, u.user_name as assigned_user_name, u.job_title as assigned_user_title, u.department as assigned_user_dept
       FROM items i
       LEFT JOIN users u ON i.assigned_user_id = u.id
       WHERE i.id = ?`,
      [id]
    );

    if (items.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = items[0];
    const logs = await queryD1(
      'SELECT * FROM handover_logs WHERE item_id = ? ORDER BY created_at DESC',
      [id]
    );

    return NextResponse.json({
      item: {
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
        history: logs.map((l: any) => ({
          id: l.id,
          date: l.created_at ? l.created_at.split(' ')[0] : '',
          from: l.from_user,
          to: l.to_user,
          notes: l.notes,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { assetTag, category, status, assignedUserId, location, notes, details } = body;

    // Check existing item to detect if assignee changed
    const existing = await queryD1(
      `SELECT i.*, u.user_name FROM items i LEFT JOIN users u ON i.assigned_user_id = u.id WHERE i.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const prevItem = existing[0];
    const prevUserId = prevItem.assigned_user_id;
    const prevUserName = prevItem.user_name || 'Storage / Pool';

    const detailsJson = JSON.stringify(details || {});
    const finalStatus = assignedUserId ? 'In Use' : (status || 'In Storage');

    await queryD1(
      `UPDATE items 
       SET asset_tag = ?, category_id = ?, status = ?, assigned_user_id = ?, location = ?, notes = ?, details = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        assetTag.trim(),
        category,
        finalStatus,
        assignedUserId || null,
        (location || '').trim(),
        (notes || '').trim(),
        detailsJson,
        id,
      ]
    );

    // If assignee changed, record a handover log automatically
    if (assignedUserId !== prevUserId) {
      let newUserName = 'Storage / Pool';
      if (assignedUserId) {
        const newUser = await queryD1('SELECT user_name FROM users WHERE id = ?', [assignedUserId]);
        if (newUser.length > 0) newUserName = newUser[0].user_name;
      }

      const logId = 'log-' + Date.now().toString(36);
      await queryD1(
        'INSERT INTO handover_logs (id, item_id, from_user, to_user, notes) VALUES (?, ?, ?, ?, ?)',
        [
          logId,
          id,
          prevUserName,
          newUserName,
          assignedUserId ? 'Assigned via item update' : 'Unassigned and returned to storage',
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await queryD1('DELETE FROM handover_logs WHERE item_id = ?', [id]);
    await queryD1('DELETE FROM items WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
