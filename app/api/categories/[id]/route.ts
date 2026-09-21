import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Delete items in this category first
    await queryD1('DELETE FROM items WHERE category_id = ?', [id]);
    await queryD1('DELETE FROM categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
