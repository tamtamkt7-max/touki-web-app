import { NextRequest } from 'next/server';
import pdf from 'pdf-parse';
import { extractToukiFields } from '@/lib/extract';
import { applyTemplate, templateMap, type ExtractedFields } from '@/lib/templates';
import { buildWorkbook } from '@/lib/excel';

function makeTemplate(fields: ExtractedFields, templateKey = 'standard') {
  const tpl = templateMap[(templateKey as keyof typeof templateMap)] ?? templateMap.standard;
  return applyTemplate(tpl, fields);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    const fields = extractToukiFields(body.ocrText || '');
    return Response.json({ fields, template: makeTemplate(fields, body.templateKey) });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const templateKey = String(formData.get('templateKey') || 'standard');

  if (!file) {
    return Response.json({ error: 'PDFがありません。' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parsed = await pdf(buffer);
  const fields = extractToukiFields(parsed.text || '');

  return Response.json({ fields, template: makeTemplate(fields, templateKey) });
}

export async function PUT(req: NextRequest) {
  const { fields, subject, body } = await req.json() as { fields: ExtractedFields; subject: string; body: string };
  const workbook = buildWorkbook(fields, subject, body);
  return new Response(workbook, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="touki-output.xlsx"'
    }
  });
}
