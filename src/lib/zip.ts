/** Minimal uncompressed ZIP for a small family of self-contained SVG files. */
export function storedZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const write16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const write32 = (view: DataView, at: number, value: number) => view.setUint32(at, value >>> 0, true);
  const crc32 = (bytes: Uint8Array): number => {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
    return (crc ^ -1) >>> 0;
  };
  for (const file of files) {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    write32(lv, 0, 0x04034b50); write16(lv, 4, 20); write16(lv, 6, 0x0800);
    write16(lv, 8, 0); write32(lv, 14, checksum); write32(lv, 18, file.bytes.length); write32(lv, 22, file.bytes.length);
    write16(lv, 26, name.length); local.set(name, 30);
    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    write32(cv, 0, 0x02014b50); write16(cv, 4, 20); write16(cv, 6, 20); write16(cv, 8, 0x0800);
    write16(cv, 10, 0); write32(cv, 16, checksum); write32(cv, 20, file.bytes.length); write32(cv, 24, file.bytes.length);
    write16(cv, 28, name.length); write32(cv, 42, offset); entry.set(name, 46);
    parts.push(local, file.bytes); central.push(entry);
    offset += local.length + file.bytes.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  write32(ev, 0, 0x06054b50); write16(ev, 8, files.length); write16(ev, 10, files.length);
  write32(ev, 12, centralSize); write32(ev, 16, offset);
  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...parts, ...central, end]) { output.set(part, cursor); cursor += part.length; }
  return output;
}
