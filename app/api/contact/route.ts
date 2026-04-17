import { NextRequest } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (apiKey && to) {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'noreply@example.com',
      to,
      subject: '登記ひろい機｜問い合わせ',
      text: `name: ${name}\nemail: ${email}\n\n${message}`
    });
    return Response.json({ ok: true, message: 'お問い合わせを送信しました。' });
  }

  return Response.json({ ok: true, message: '問い合わせ機能は仮設定です。環境変数を入れるとメール通知できます。' });
}
