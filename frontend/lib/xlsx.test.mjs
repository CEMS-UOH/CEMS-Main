// Unit tests for xlsx.ts and download.ts. Run: cd frontend && npm run test:lib
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 as nodeCrc32 } from 'node:zlib';
import { buildXlsx, columnName, crc32, safeSheetName } from './xlsx.ts';
import { safeFileName } from './download.ts';

/** Reads a stored zip back: [{ name, data, crcOk }] from the central directory. */
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, 'end of central directory');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50, 'central header');
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    assert.equal(view.getUint32(local, true), 0x04034b50, 'local header');
    const start = local + 30 + view.getUint16(local + 26, true);
    const data = bytes.subarray(start, start + size);
    files.push({ name, text: new TextDecoder().decode(data), crcOk: nodeCrc32(data) === crc });
    at += 46 + nameLength;
  }
  return files;
}

const sheet = {
  name: 'الحضور: ورشة [AI]',
  rtl: true,
  columns: [{ header: 'الاسم', width: 28 }, { header: 'Email' }, { header: 'Seats' }],
  rows: [
    ['سارة أحمد', 'sara@uoh.edu.sa', 1],
    ['Tom & "Jerry" <x>', null, 2.5],
    ['=HYPERLINK("http://x")', 'bad\u0001char', 0],
  ],
};

test('crc32 matches Node zlib', () => {
  for (const text of ['', 'a', 'hello world', 'ورشة عمل'.repeat(50)]) {
    const bytes = new TextEncoder().encode(text);
    assert.equal(crc32(bytes), nodeCrc32(bytes));
  }
});

test('columnName: A..Z, AA, AZ, BA', () => {
  assert.deepEqual([0, 25, 26, 51, 52, 701, 702].map(columnName), ['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
});

test('safeSheetName drops the characters Excel forbids and keeps 31 characters', () => {
  assert.equal(safeSheetName('a/b\\c?d*e[f]g:h'), 'a b c d e f g h');
  assert.equal(safeSheetName('x'.repeat(40)).length, 31);
  assert.equal(safeSheetName('  '), 'Sheet1');
});

test('buildXlsx: every Office part is there, intact', () => {
  const files = unzip(buildXlsx(sheet, new Date(2026, 10, 24, 10, 30)));
  assert.deepEqual(
    files.map((f) => f.name),
    ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']
  );
  assert.ok(files.every((f) => f.crcOk), 'every CRC is right');
});

test('buildXlsx: header styled, RTL, frozen, text escaped, numbers as numbers', () => {
  const xml = unzip(buildXlsx(sheet)).find((f) => f.name === 'xl/worksheets/sheet1.xml').text;
  assert.match(xml, /rightToLeft="1"/);
  assert.match(xml, /state="frozen"/);
  assert.match(xml, /<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">الاسم<\/t>/);
  assert.match(xml, /Tom &amp; &quot;Jerry&quot; &lt;x&gt;/);
  assert.match(xml, /<c r="C3"><v>2.5<\/v><\/c>/);
  assert.ok(!xml.includes('\u0001'), 'control characters are dropped');
  // A formula-looking string stays text (inline string), never a formula (<f>).
  assert.ok(!xml.includes('<f>'));
  assert.ok(!xml.includes('r="B3"'), 'an empty cell is left out');
  const workbook = unzip(buildXlsx(sheet)).find((f) => f.name === 'xl/workbook.xml').text;
  assert.match(workbook, /name="الحضور  ورشة  AI"/);
});

test('safeFileName keeps Arabic, removes path characters, never empty', () => {
  assert.equal(safeFileName('ورشة عمل: AI / 2026'), 'ورشة-عمل-AI-2026');
  assert.equal(safeFileName('   '), 'event');
  assert.equal(safeFileName('a'.repeat(100)).length, 60);
});

test('dates become real Excel dates in the given offset, styled as date and time', async () => {
  const { excelSerial } = await import('./xlsx.ts');
  assert.equal(excelSerial(new Date('1899-12-30T00:00:00Z')), 0);
  assert.equal(excelSerial(new Date('2026-11-24T15:00:00Z'), 180), 46350.75); // 18:00 in Riyadh
  const files = unzip(
    buildXlsx({ name: 'd', columns: [{ header: 'When' }], rows: [[new Date('2026-11-24T15:00:00Z')], [new Date('nope')]], utcOffsetMinutes: 180 })
  );
  const xml = files.find((f) => f.name === 'xl/worksheets/sheet1.xml').text;
  assert.match(xml, /<c r="A2" s="2"><v>46350.75<\/v><\/c>/);
  assert.ok(!xml.includes('r="A3"'), 'an invalid date is left empty');
  assert.match(files.find((f) => f.name === 'xl/styles.xml').text, /formatCode="yyyy-mm-dd hh:mm"/);
});
