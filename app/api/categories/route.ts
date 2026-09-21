import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    const categories = await queryD1('SELECT * FROM categories ORDER BY name ASC');
    const parsed = categories.map((c: any) => ({
      ...c,
      fields: typeof c.fields === 'string' ? JSON.parse(c.fields) : c.fields,
    }));
    return NextResponse.json({ categories: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, codePrefix, fields } = body;

    if (!name || !codePrefix) {
      return NextResponse.json({ error: 'Name and code prefix are required' }, { status: 400 });
    }

    const id = name.trim();
    const fieldsJson = JSON.stringify(fields || []);

    await queryD1(
      'INSERT INTO categories (id, name, code_prefix, fields) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, code_prefix = excluded.code_prefix, fields = excluded.fields',
      [id, id, codePrefix.toUpperCase(), fieldsJson]
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
