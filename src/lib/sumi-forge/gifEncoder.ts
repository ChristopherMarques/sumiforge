/**
 * Técnica #12: Codificador Binário GIF89a LZW Completo
 * Quantização de paleta 6x6x6 (216 cores) + índice dedicado de transparência (255),
 * Graphics Control Extension (0x21 0xF9) com Disposal Method = 2 (Restore to Background),
 * e compressão LZW de código variável (9 a 12 bits) sem dependências externas.
 */
export function encodeAnimatedGIF89a(
  frames: ImageData[],
  width: number,
  height: number,
  fps: number
): Uint8Array {
  const bytes: number[] = [];
  const writeByte = (b: number) => bytes.push(b & 0xff);
  const writeShort = (s: number) => {
    bytes.push(s & 0xff);
    bytes.push((s >> 8) & 0xff);
  };
  const writeAscii = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xff);
    }
  };

  // Header GIF89a
  writeAscii('GIF89a');
  writeShort(width);
  writeShort(height);

  // Global Color Table Flag = 1, Color Resolution = 7, Sort = 0, Size of GCT = 7 (256 colors)
  writeByte(0xf7);
  writeByte(255); // Background color index (transparent)
  writeByte(0); // Pixel aspect ratio

  // Global Color Table: 6x6x6 web-safe cube (indices 0..215), rest padded to 255
  for (let i = 0; i < 256; i++) {
    if (i < 216) {
      const r = Math.floor(i / 36);
      const g = Math.floor((i % 36) / 6);
      const b = i % 6;
      writeByte(Math.round((r * 255) / 5));
      writeByte(Math.round((g * 255) / 5));
      writeByte(Math.round((b * 255) / 5));
    } else {
      writeByte(0);
      writeByte(0);
      writeByte(0);
    }
  }

  // Netscape 2.0 Application Extension for Infinite Looping
  writeByte(0x21);
  writeByte(0xff);
  writeByte(11);
  writeAscii('NETSCAPE2.0');
  writeByte(3);
  writeByte(1);
  writeShort(0); // Loop forever
  writeByte(0);

  const delayCs = Math.max(2, Math.round(100 / Math.max(1, fps)));

  for (const frame of frames) {
    // Graphics Control Extension (0x21 0xF9)
    writeByte(0x21);
    writeByte(0xf9);
    writeByte(4);
    // Disposal Method = 2 (Restore to Background -> 0b00001000 = 0x08) | Transparent Color Flag = 1 (0x01) => 0x09
    writeByte(0x09);
    writeShort(delayCs);
    writeByte(255); // Transparent color index
    writeByte(0);

    // Image Descriptor
    writeByte(0x2c);
    writeShort(0);
    writeShort(0);
    writeShort(width);
    writeShort(height);
    writeByte(0x00); // No local color table

    // Quantize pixels to indices [0..215] or 255 (transparent)
    const indexed = new Uint8Array(width * height);
    const data = frame.data;
    for (let p = 0; p < width * height; p++) {
      const idx = p * 4;
      const a = data[idx + 3];
      if (a < 48) {
        indexed[p] = 255;
      } else {
        const r5 = Math.min(5, Math.round((data[idx] * 5) / 255));
        const g5 = Math.min(5, Math.round((data[idx + 1] * 5) / 255));
        const b5 = Math.min(5, Math.round((data[idx + 2] * 5) / 255));
        indexed[p] = r5 * 36 + g5 * 6 + b5;
      }
    }

    // LZW Compression (minCodeSize = 8)
    const minCodeSize = 8;
    writeByte(minCodeSize);
    const lzwBlocks = lzwEncode(indexed, minCodeSize);
    for (let i = 0; i < lzwBlocks.length; i++) {
      writeByte(lzwBlocks[i]);
    }
    writeByte(0x00); // Block terminator
  }

  // Trailer
  writeByte(0x3b);
  return new Uint8Array(bytes);
}

function lzwEncode(indexedPixels: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;

  // Dictionary mapping (prefix << 8 | suffix) -> code
  const dict = new Map<number, number>();
  const outBytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const subBlock: number[] = [];

  const flushSubBlock = () => {
    if (subBlock.length > 0) {
      outBytes.push(subBlock.length);
      for (let i = 0; i < subBlock.length; i++) {
        outBytes.push(subBlock[i]);
      }
      subBlock.length = 0;
    }
  };

  const emitCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      subBlock.push(bitBuffer & 0xff);
      if (subBlock.length === 255) {
        flushSubBlock();
      }
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };

  emitCode(clearCode);
  let prefix = indexedPixels[0];

  for (let i = 1; i < indexedPixels.length; i++) {
    const suffix = indexedPixels[i];
    const key = (prefix << 8) | suffix;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      emitCode(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode > 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
      } else {
        emitCode(clearCode);
        dict.clear();
        codeSize = minCodeSize + 1;
        nextCode = endCode + 1;
      }
      prefix = suffix;
    }
  }

  emitCode(prefix);
  emitCode(endCode);
  if (bitCount > 0) {
    subBlock.push(bitBuffer & 0xff);
  }
  flushSubBlock();
  return outBytes;
}
