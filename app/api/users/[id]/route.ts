import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userName, jobTitle, department } = body;

    await queryD1(
      'UPDATE users SET user_name = ?, job_title = ?, department = ? WHERE id = ?',
      [userName.trim(), jobTitle.trim(), (department || 'General').trim(), id]
    );

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
    // Set assigned items back to in storage
    await queryD1(
      "UPDATE items SET assigned_user_id = NULL, status = 'In Storage' WHERE assigned_user_id = ?",
      [id]
    );
    await queryD1('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
