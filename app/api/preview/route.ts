import { NextRequest, NextResponse } from 'next/server';
import { parseMarkdownToHtml } from '@/lib/converters/styles';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json();
    if (typeof markdown !== 'string') {
      return NextResponse.json({ success: false, error: 'Markdown string required' }, { status: 400 });
    }

    const html = parseMarkdownToHtml(markdown);
    return NextResponse.json({ success: true, html });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Preview generation failed' }, { status: 500 });
  }
}
