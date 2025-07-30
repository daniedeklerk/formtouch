import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('formId');

  if (!formId) {
    return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
  }

  try {
    const pages = await db.getFormPages(parseInt(formId));
    
    // Convert Buffer image data to base64 string
    const pagesWithBase64 = pages.map(page => ({
      ...page,
      image_data: page.image_data.toString('base64')
    }));
    
    return NextResponse.json({ pages: pagesWithBase64 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch form pages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { formId, pageNumber, imageData } = await request.json();
    const page = await db.saveFormPage(formId, pageNumber, Buffer.from(imageData, 'base64'));
    return NextResponse.json({ page });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save form page' }, { status: 500 });
  }
}
