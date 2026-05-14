const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');
const extractPath = path.join(rootDir, 'lib', 'extract.ts');
const excelPath = path.join(rootDir, 'lib', 'excel.ts');

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: filePath
  }).outputText;

  const mod = new Module(filePath, module.parent);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  mod._compile(compiled, filePath);
  return mod.exports;
}

const { extractToukiFields, normalizeOcrTextForExtractionWithReport } = loadTypeScriptModule(extractPath);
const { buildCsv } = loadTypeScriptModule(excelPath);

const cases = [
  {
    name: '通常の土地登記',
    text: `
表題部
所在 東京都千代田区丸の内一丁目
地番 100番1
地積 123.45㎡
権利部
甲区
順位番号 1
原因 平成30年1月10日売買
所有者 山田太郎
`,
    expected: {
      location: '東京都千代田区丸の内一丁目',
      number: '100番1',
      area: '123.45㎡',
      buildingArea: '',
      owner: '山田太郎',
      ownersHistoryIncludes: ['山田太郎']
    }
  },
  {
    name: '建物あり',
    text: `
表題部
所在 東京都中央区銀座二丁目
地番 200番2
地積 88.10㎡
床面積 76.54㎡
権利部
甲区
順位番号 1
原因 令和1年5月20日売買
所有者 佐藤花子
`,
    expected: {
      location: '東京都中央区銀座二丁目',
      number: '200番2',
      area: '88.10㎡',
      buildingArea: '76.54㎡',
      owner: '佐藤花子',
      ownersHistoryIncludes: ['佐藤花子']
    }
  },
  {
    name: '甲区に所有権移転が複数ある',
    text: `
表題部
所在 神奈川県横浜市中区本町三丁目
地番 300番3
地積 150.00㎡
権利部
甲区
順位番号 1
原因 平成20年4月1日売買
所有者 鈴木一郎
順位番号 2
原因 令和3年6月15日移転
所有者 田中次郎
`,
    expected: {
      location: '神奈川県横浜市中区本町三丁目',
      number: '300番3',
      area: '150.00㎡',
      buildingArea: '',
      owner: '田中次郎',
      ownersHistoryIncludes: ['鈴木一郎', '田中次郎']
    }
  },
  {
    name: '抹消エントリがある',
    text: `
表題部
所在 埼玉県さいたま市浦和区常盤四丁目
地番 400番4
地積 99.99㎡
権利部
甲区
順位番号 1
原因 平成25年3月3日売買
所有者 高橋三郎
順位番号 2
原因 抹消
所有者 抹消太郎
順位番号 3
原因 令和2年2月2日売買
所有者 伊藤四郎
`,
    expected: {
      location: '埼玉県さいたま市浦和区常盤四丁目',
      number: '400番4',
      area: '99.99㎡',
      buildingArea: '',
      owner: '伊藤四郎',
      ownersHistoryIncludes: ['高橋三郎', '伊藤四郎'],
      ownersHistoryExcludes: ['抹消太郎']
    }
  },
  {
    name: '仮登記がある',
    text: `
表題部
所在 千葉県船橋市本町五丁目
地番 500番5
地積 70.01㎡
権利部
甲区
順位番号 1
原因 仮登記
所有者 仮登記太郎
順位番号 2
原因 令和4年8月8日売買
所有者 本登記花子
`,
    expected: {
      location: '千葉県船橋市本町五丁目',
      number: '500番5',
      area: '70.01㎡',
      buildingArea: '',
      owner: '本登記花子',
      ownersHistoryIncludes: ['本登記花子'],
      ownersHistoryExcludes: ['仮登記太郎']
    }
  },
  {
    name: '複数所有者がある',
    text: `
表題部
所在 大阪府大阪市北区梅田一丁目
地番 600番6
地積 210.21㎡
権利部
甲区
順位番号 1
原因 令和5年1月5日売買
所有者 山本太郎
所有者 山本花子
`,
    expected: {
      location: '大阪府大阪市北区梅田一丁目',
      number: '600番6',
      area: '210.21㎡',
      buildingArea: '',
      owner: '山本太郎 / 山本花子',
      ownersHistoryIncludes: ['山本太郎', '山本花子']
    }
  },
  {
    name: 'OCR由来の空白・改行崩れがある',
    text: `
表 題 部
所 在
福岡県福岡市博多区博多駅前一丁目
地 番
700番7
地 積
55.55㎡

権 利 部
甲 區
順位番号   1
原 因   令和6年7月7日   売買
所 有 者   中村七郎
`,
    expected: {
      location: '福岡県福岡市博多区博多駅前一丁目',
      number: '700番7',
      area: '55.55㎡',
      buildingArea: '',
      owner: '中村七郎',
      ownersHistoryIncludes: ['中村七郎']
    }
  },
  {
    name: 'OCR崩れの英数字ノイズを誤抽出しない',
    text: `
表題部
所在 Pts HiR * 44 8 FIRREOR EROTHT
地番 FOBRX sqagsiz
権利部
甲区
順位番号 1
原因 所有権保存 昭和44年受付第1234号
所有者 所有権保存 昭和44年受付第1234号
`,
    expected: {
      location: '',
      number: '',
      area: '',
      buildingArea: '',
      owner: '',
      rawIncludes: ['FIRREOR EROTHT', '所有権保存']
    }
  },
  {
    name: 'OCRの1文字空白崩れから安全に抽出する',
    text: `
表 題 部
所 在 福 島 県 郡 山 市 駅 前 一 丁 目
地 番 53-3
地 積 101.20㎡

権 利 部
甲 区
順 位 番 号 1
所 有 権 移 転
原 因 令 和 2 年 1 月 3 0 日 売 買
権 利 者 田 村 和 也
`,
    expected: {
      location: '福島県郡山市駅前一丁目',
      number: '53-3',
      area: '101.20㎡',
      buildingArea: '',
      owner: '田村和也',
      ownersHistoryIncludes: ['所有権移転', '原因: 令和2年1月30日売買', '田村和也'],
      ownersHistoryExcludes: ['所有権移転 / 原因']
    }
  },
  {
    name: 'OCR誤認識を補正して履歴と法人所有者を拾う',
    text: `
表 題 部
所 在 福 島 県 郡 山 市 大 槻 町 字 葉 山 下
地 番 §3-1
地 積 88.00㎡

権 利 部
甲 区
順 位 番 号 2
所 有 権 秘 転
原 因 令 大 2 年 1 月 3 0 日 売 質
能 利 者 株 式 会 社 ア ー ネ ス ト ワ ン
共 有 者 田 村 和 也 持 分 2 分 の 1
`,
    expected: {
      location: '福島県郡山市大槻町字葉山下',
      number: '53-1',
      area: '88.00㎡',
      buildingArea: '',
      owner: '株式会社アーネストワン / 田村和也',
      ownersHistoryIncludes: ['所有権移転', '原因: 令和2年1月30日売買', '株式会社アーネストワン'],
      ownersHistoryExcludes: ['原因令和2年1月30日売買']
    }
  },
  {
    name: '乙区と共同担保目録を確定候補から除外する',
    text: `
表題部
所在
地番
地積

権利部
甲区
順位番号ーー登記の目的 受付年月日 権利者その他の事項
第1号
所有権移転
原因 令和2年1月30日売買
所有者 東京都西東京市北原町三丁目2番22
第2号
所有権一部移転
原因 令和2年7月27日売買
共有者 郡山市大槻町字西ノ宮西86番地の2
持分38分の1

権利部（乙区）
抵当権設定
抵当権者 株式会社危険銀行
金銭消費貸借

共同担保目録
郡山市大槻町字葉山下2番21 の土地
2番22
`,
    expected: {
      location: '',
      number: '',
      area: '',
      buildingArea: '',
      owner: '',
      ownersHistoryIncludes: ['所有権移転', '所有権一部移転', '原因: 令和2年1月30日売買'],
      ownersHistoryExcludes: ['株式会社危険銀行', '郡山市大槻町字葉山下2番21']
    }
  },
  {
    name: '危険なOCR候補は確定フィールドに採用しない',
    text: `
2020/09/04 現用の情報です
表題部
5㎡
権利部
甲区
順位番号ーー登記の目的 受付年月日 権利者その他の事項
第1号
所有権移転
原因 令和2年1月30日 売買
所有者 株式会社アーネストワン
所有者 B2548% んかも東京都西東京市北原町三丁目2番22
第2号
持分一部移転
原因 令和2年8月28日 売買
共有者 % B 伸子床攻会社アーネストワン
持分38分の1
権利部（乙区）
抵当権設定
共同担保目録
郡山市大槻町字葉山下2番21 の土地
`,
    expected: {
      location: '',
      number: '',
      area: '',
      buildingArea: '',
      owner: '',
      ownersHistoryIncludes: ['所有権移転', '持分一部移転', '原因: 令和2年1月30日売買', '株式会社アーネストワン'],
      ownersHistoryExcludes: [
        '遷委番号ーー登記の目的',
        '% B 伸子床攻会社アーネストワン',
        'B2548% んかも東京都西東京市北原町三丁目2番22',
        '抵当権設定',
        '郡山市大槻町字葉山下2番21'
      ]
    }
  },
  {
    name: '登記簿OCR語彙と数値崩れを正規化する',
    text: `
表 題 部
所 在 都山市大機町字茶山下
地 番 §3-1
地 積 88.00㎡
権 利 部
甲 區
遷委番号ーー登記の日的受付年月日 権利者その他の事頂
第2S48号
所有権秘転
原囚 令大2年1月30日 売質
所有省 林式会社 アー ネ ス トワン
第2128 9号
所有権一部移云
原回 信和2年7月27日 沈質
能利者 波違太郎
3 8 分 の 1
抵当挫
共同#保
`,
    expected: {
      location: '郡山市大槻町字葉山下',
      number: '53-1',
      area: '88.00㎡',
      buildingArea: '',
      owner: '',
      ownersHistoryIncludes: [
        '所有権移転',
        '所有権一部移転',
        '受付: 第2548号',
        '受付: 第21289号',
        '原因: 令和2年1月30日売買',
        '株式会社アーネストワン'
      ],
      ownersHistoryExcludes: ['波違太郎', '抵当権', '共同担保'],
      rawIncludes: [
        '順位番号',
        '第2548号',
        '第21289号',
        '38分の1',
        '郡山市大槻町字葉山下',
        '株式会社アーネストワン'
      ]
    }
  },
  {
    name: '実PDF風OCR崩れから表題部と甲区履歴を統合抽出する',
    text: `
2020/09/04 10:18 現用の情報です
填地の表示
所奉 郡山市大衝町字茶山下 地 番 S3-1 地 積 88.00㎡
原因及びその日付 登記の日付

権 利 部
甲 區
WESS Mow BRd Ana 2th22
遷委番号ーー登記の日的 受付年月日 受付番号 権利者その他の事通
第2S48号
所有権秘転 受信 令和2年1月30日
原囚 令大2年1月30日 売暫
所有省 令和2年6月19日 / 林式会社アー ネ ス トワン
第2128 9号
所有権一部移云
原回 信和2年7月27日 沈質
共有者 波違太郎
3 8 分 の 1
権利部（乙区）
抵当挫
共同#保
`,
    expected: {
      location: '郡山市大槻町字葉山下',
      number: '53-1',
      area: '88.00㎡',
      buildingArea: '',
      owner: '',
      ownersHistoryIncludes: [
        '所有権移転',
        '所有権一部移転',
        '原因: 令和2年1月30日売買',
        '株式会社アーネストワン'
      ],
      ownersHistoryExcludes: [
        '令和2年6月19日 / 株式会社アーネストワン',
        'WESS',
        'Mow',
        'BRd Ana',
        '2th22',
        '抵当権',
        '共同担保',
        '波違太郎'
      ],
      rawIncludes: [
        '土地の表示',
        '所在郡山市大槻町字葉山下',
        '地番 53-1',
        '地積88.00㎡',
        '順位番号',
        '第2548号',
        '第21289号',
        '38分の1'
      ]
    }
  },
  {
    name: '建物表示と地図番号混在でも確定値を取り違えない',
    text: `
建物の表示
所在 東京都港区芝公園四丁目 地図番号 999 地番 800番8 地積 120.50㎡
種類 居宅 構造 木造 床面積 1階 61.10㎡
権利部
甲区
第3001号
所有権保存
原因 令和5年5月5日保存
所有者 佐々木五郎
`,
    expected: {
      location: '東京都港区芝公園四丁目',
      number: '800番8',
      area: '120.50㎡',
      buildingArea: '61.10㎡',
      owner: '佐々木五郎',
      ownersHistoryIncludes: ['所有権保存', '受付: 第3001号', '佐々木五郎'],
      ownersHistoryExcludes: ['地図番号 999']
    }
  }
];

function assertEqual(errors, label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label}: expected "${expected}", got "${actual}"`);
  }
}

function assertIncludes(errors, label, actualValues, expectedValues = []) {
  const joined = actualValues.join('\n');
  for (const expected of expectedValues) {
    if (!joined.includes(expected)) {
      errors.push(`${label}: expected to include "${expected}", got ${JSON.stringify(actualValues)}`);
    }
  }
}

function assertExcludes(errors, label, actualValues, excludedValues = []) {
  const joined = actualValues.join('\n');
  for (const excluded of excludedValues) {
    if (joined.includes(excluded)) {
      errors.push(`${label}: expected not to include "${excluded}", got ${JSON.stringify(actualValues)}`);
    }
  }
}

let failed = 0;

for (const testCase of cases) {
  const actual = extractToukiFields(testCase.text);
  const expected = testCase.expected;
  const errors = [];

  assertEqual(errors, 'location', actual.location, expected.location);
  assertEqual(errors, 'number', actual.number, expected.number);
  assertEqual(errors, 'area', actual.area, expected.area);
  assertEqual(errors, 'buildingArea', actual.buildingArea, expected.buildingArea);
  assertEqual(errors, 'owner', actual.owner, expected.owner);
  assertIncludes(errors, 'ownersHistory', actual.ownersHistory, expected.ownersHistoryIncludes);
  assertExcludes(errors, 'ownersHistory', actual.ownersHistory, expected.ownersHistoryExcludes);
  assertIncludes(errors, 'raw', [actual.raw], expected.rawIncludes);

  if (errors.length > 0) {
    failed += 1;
    console.error(`\nFAIL ${testCase.name}`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    console.error('  actual:', JSON.stringify(actual, null, 2));
  } else {
    console.log(`PASS ${testCase.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${cases.length} extract checks failed.`);
  process.exit(1);
}

const csv = buildCsv({
  owner: '佐々木五郎',
  location: '東京都港区芝公園四丁目',
  number: '800番8',
  area: '120.50㎡',
  buildingArea: '61.10㎡',
  ownersHistory: ['所有権保存 受付: 第3001号 権利者: 佐々木五郎'],
  raw: 'preview',
  diagnostics: '混入禁止'
});

if (csv.includes('diagnostics') || csv.includes('混入禁止')) {
  console.error('\nFAIL CSV出力に診断データを混入しない');
  process.exit(1);
}
console.log('PASS CSV出力に診断データを混入しない');

console.log(`\n${cases.length} extract checks passed.`);
