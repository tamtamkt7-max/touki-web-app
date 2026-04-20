export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { extractToukiFields } from '@/lib/extract';
import { buildWorkbook } from '@/lib/excel';

function hasEnoughText(text: string) {
  return text.replace(/\s/g, '').length >= 20;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body: { rawText?: string } = await req.json();
      const rawText = String(body?.rawText || '');

      if (!hasEnoughText(rawText)) {
        return Response.json(
          { error: 'PDFから十分な文字を読み取れませんでした。' },
          { status: 400 }
        );
      }

      const fields = extractToukiFields(rawText);
      return Response.json({ fields });
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return Response.json({ error: 'PDFが見つかりません。' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

      const parsed = await pdfParse(buffer);
      const rawText = String(parsed?.text || '');

      if (!hasEnoughText(rawText)) {
        return Response.json(
          { error: 'サーバー側でも文字を十分に読み取れませんでした。' },
          { status: 400 }
        );
      }

      const fields = extractToukiFields(rawText);
      return Response.json({ fields });
    }

    return Response.json(
      { error: '対応していない送信形式です。' },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: '解析に失敗しました。' },
      { status: 500 }
    );
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
        'Content-Disposition': 'attachment; filename="touki-output.xlsx"'
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: 'Excelの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
