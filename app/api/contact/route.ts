import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '');
    const email = String(body?.email || '');
    const message = String(body?.message || '');

    if (!name || !email || !message) {
      return Response.json({ error: '必須項目が不足しています。' }, { status: 400 });
    }

    return Response.json({
      ok: true,
      message: 'お問い合わせを受け付けました。'
    });
  } catch {
    return Response.json({ error: '送信に失敗しました。' }, { status: 500 });
  }
}
