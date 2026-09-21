import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    const users = await queryD1('SELECT * FROM users ORDER BY user_name ASC');
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userName, jobTitle, department } = body;

    if (!userName || !jobTitle) {
      return NextResponse.json({ error: 'User Name and Job Title are required' }, { status: 400 });
    }

    const id = 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    await queryD1(
      'INSERT INTO users (id, user_name, job_title, department) VALUES (?, ?, ?, ?)',
      [id, userName.trim(), jobTitle.trim(), (department || 'General').trim()]
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
