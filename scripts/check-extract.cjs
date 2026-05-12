const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');
const extractPath = path.join(rootDir, 'lib', 'extract.ts');

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

const { extractToukiFields } = loadTypeScriptModule(extractPath);

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

console.log(`\n${cases.length} extract checks passed.`);
