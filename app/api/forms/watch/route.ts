import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function POST(request: Request) {
  try {
    const { name, folderPath } = await request.json();
    const form = await db.createForm(name, folderPath);
    return NextResponse.json({ form });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create form from folder' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { name, lastModified } = await request.json();
    const forms = await db.searchForms(name);
    if (forms.length > 0) {
      const form = await db.updateForm(forms[0].id, {
        last_modified: lastModified
      });
      return NextResponse.json({ form });
    }
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update form from folder' }, { status: 500 });
  }
}
