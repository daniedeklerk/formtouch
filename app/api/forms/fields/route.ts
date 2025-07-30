import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('formId');

  if (!formId) {
    return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
  }

  try {
    const fields = await db.getFormFields(parseInt(formId));
    return NextResponse.json({ fields });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch form fields' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { formId, field } = await request.json();
    const savedField = await db.saveFormField(formId, field);
    return NextResponse.json({ field: savedField });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save form field' }, { status: 500 });
  }
}
