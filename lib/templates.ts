export type ExtractedFields = {
  propertyName: string;
  location: string;
  lotNumber: string;
  landArea: string;
  buildingArea: string;
  usage: string;
  owner: string;
};

export const templateMap = {
  standard: {
    label: '基本案内',
    subject: '【物件情報のご案内】{{propertyName}}',
    body: `お世話になっております。\n\n下記物件についてご案内いたします。\n\n物件名：{{propertyName}}\n所在：{{location}}\n地番：{{lotNumber}}\n敷地面積：{{landArea}}\n建物面積：{{buildingArea}}\n用途：{{usage}}\n所有者：{{owner}}\n\nご確認よろしくお願いいたします。`
  },
  owner: {
    label: '所有者案内向け',
    subject: '【所有者確認】{{propertyName}}',
    body: `お世話になっております。\n\n登記資料をもとに、下記のとおり整理しました。\n\n所在：{{location}}\n地番：{{lotNumber}}\n敷地面積：{{landArea}}\n所有者：{{owner}}\n\n必要であれば原本をもとに再確認いたします。`
  },
  internal: {
    label: '社内共有用',
    subject: '社内共有｜{{propertyName}}',
    body: `社内共有です。\n\n物件名：{{propertyName}}\n所在：{{location}}\n地番：{{lotNumber}}\n土地：{{landArea}}\n建物：{{buildingArea}}\n用途：{{usage}}\n所有者：{{owner}}\n\n※ 数値・表記は原本照合を前提にしてください。`
  }
} as const;

export function applyTemplate(template: {subject: string; body: string}, fields: ExtractedFields) {
  const replace = (input: string) => input.replace(/{{(\w+)}}/g, (_, key) => {
    return (fields as Record<string, string>)[key] ?? '';
  });
  return {
    subject: replace(template.subject),
    body: replace(template.body)
  };
}
