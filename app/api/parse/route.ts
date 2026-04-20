export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { extractToukiFields } from '@/lib/extract';
import { buildWorkbook } from '@/lib/excel';

export async function POST(req: NextRequest) {
  try {
    const body: { rawText?: string } = await req.json();
    const rawText = String(body?.rawText || '');

    if (!rawText.trim()) {
      return Response.json(
        { error: 'PDFから文字を読み取れませんでした。' },
        { status: 400 }
      );
    }

    const fields = extractToukiFields(rawText);
    return Response.json({ fields });
  } catch {
    return Response.json({ error: '解析に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload: {
      fields: {
        location?: string;
        number?: string;
        area?: string;
        buildingArea?: string;
        owner?: string;
        ownersHistory?: string[];
        raw?: string;
      };
    } = await req.json();

    const workbook = buildWorkbook(payload.fields, '', '');

    return new Response(workbook, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="touki-output.xlsx"',
      },
    });
  } catch {
    return Response.json({ error: 'Excelの作成に失敗しました。' }, { status: 500 });
  }
}
