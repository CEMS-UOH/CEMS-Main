// Minimal QR Code encoder (ISO/IEC 18004) for the booking ticket (FR-05). OWNER: Role 4.
//
// Why not a package: the ticket only ever encodes the API's booking token (24 random bytes as
// base64url = 32 ASCII chars), and drawing it here keeps the token in the browser - it is never
// sent to a third-party QR image service. Byte mode, error correction level M, versions 1-10
// (up to ~213 bytes). Algorithm after Project Nayuki's reference implementation (MIT).
// Checked module-for-module against that implementation for 467 payloads (1-213 bytes, all
// ten versions) and decoded back with OpenCV; qr.test.mjs pins reference symbols for v1/v3/v8.

const ECC_CODEWORDS_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_ECC_BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;
const FORMAT_BITS_M = 0; // error correction level M

export type QrMatrix = { size: number; dark: boolean[][] };

/** Bits available for data + ECC in a symbol of this version (excludes function patterns). */
function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const numDataCodewords = (version: number) =>
  Math.floor(numRawDataModules(version) / 8) -
  ECC_CODEWORDS_PER_BLOCK_M[version] * NUM_ECC_BLOCKS_M[version];

/** Byte-mode character count indicator length (8 bits up to version 9, 16 from version 10). */
const countBits = (version: number) => (version <= 9 ? 8 : 16);

// --- Reed-Solomon over GF(2^8), primitive polynomial 0x11D ---

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

/** Splits the data into blocks, adds ECC to each, and interleaves them (spec 7.6). */
function addEccAndInterleave(data: number[], version: number): number[] {
  const numBlocks = NUM_ECC_BLOCKS_M[version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK_M[version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = rsDivisor(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0); // padding so all blocks line up; skipped below
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function alignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

const getBit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

function maskApplies(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Penalty score (spec 7.8.3) used to choose the most scannable mask. */
function penalty(dark: boolean[][], size: number): number {
  let score = 0;
  const lines: boolean[][] = [];
  for (let y = 0; y < size; y++) lines.push(dark[y]);
  for (let x = 0; x < size; x++) lines.push(dark.map((row) => row[x]));

  for (const line of lines) {
    // Rule 1: runs of 5+ same-colored modules.
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) {
        run++;
      } else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    // Rule 3: finder-like 1:1:3:1:1 pattern with 4 light modules on either side.
    for (let i = 0; i + 11 <= size; i++) {
      const s = line.slice(i, i + 11).map((d) => (d ? '1' : '0')).join('');
      if (s === '10111010000' || s === '00001011101') score += 40;
    }
  }

  // Rule 2: 2x2 blocks of one color.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = dark[y][x];
      if (c === dark[y][x + 1] && c === dark[y + 1][x] && c === dark[y + 1][x + 1]) score += 3;
    }
  }

  // Rule 4: balance of dark and light modules.
  const darkCount = dark.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const total = size * size;
  const k = Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1;
  score += k * 10;
  return score;
}

/** Encodes text (UTF-8, byte mode, ECC level M) into a QR module matrix. Throws if too long. */
export function encodeQr(text: string): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = 1;
  for (; version <= MAX_VERSION; version++) {
    if (4 + countBits(version) + bytes.length * 8 <= numDataCodewords(version) * 8) break;
  }
  if (version > MAX_VERSION) throw new RangeError('QR payload too long');

  // Data bits: mode (0100 = byte) + count + payload, then terminator and padding.
  const capacityBits = numDataCodewords(version) * 8;
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, countBits(version));
  for (const b of bytes) append(b, 8);
  append(0, Math.min(4, capacityBits - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) append(pad, 8);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    dataCodewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  const codewords = addEccAndInterleave(dataCodewords, version);

  // Matrix with function patterns.
  const size = version * 4 + 17;
  const dark: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );
  const setFunction = (x: number, y: number, isDark: boolean) => {
    dark[y][x] = isDark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0); // timing patterns
    setFunction(i, 6, i % 2 === 0);
  }

  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  const align = alignmentPositions(version, size);
  const last = align.length - 1;
  align.forEach((ay, i) => {
    align.forEach((ax, j) => {
      // Skip the three corners taken by the finder patterns.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  const drawFormatBits = (mask: number) => {
    const data = (FORMAT_BITS_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const formatBits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) setFunction(8, i, getBit(formatBits, i));
    setFunction(8, 7, getBit(formatBits, 6));
    setFunction(8, 8, getBit(formatBits, 7));
    setFunction(7, 8, getBit(formatBits, 8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, getBit(formatBits, i));

    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, getBit(formatBits, i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, getBit(formatBits, i));
    setFunction(8, size - 8, true); // the always-dark module
  };
  drawFormatBits(0); // reserves the format areas; redrawn once the mask is chosen

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const versionBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(versionBits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, bit);
      setFunction(b, a, bit);
    }
  }

  // Codewords in the zig-zag order (spec 7.7.3).
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
          dark[y][x] = getBit(codewords[bitIndex >>> 3], 7 - (bitIndex & 7));
          bitIndex++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunction[y][x] && maskApplies(mask, x, y)) dark[y][x] = !dark[y][x];
      }
    }
  };

  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormatBits(mask);
    const score = penalty(dark, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(mask); // XOR again to undo
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);

  return { size, dark };
}

/** SVG path data for the dark modules, offset by a quiet-zone border (in modules). */
export function qrPath(matrix: QrMatrix, border: number): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.dark[y][x]) parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }
  }
  return parts.join('');
}
