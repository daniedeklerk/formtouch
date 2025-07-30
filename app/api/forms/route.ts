import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  try {
    const forms = query ? await db.searchForms(query) : await db.getForms();
    return NextResponse.json({ forms });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, folderPath } = body;
    const form = await db.createForm(name, folderPath);
    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, updates } = body;
    const form = await db.updateForm(id, updates);
    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
  }
}
