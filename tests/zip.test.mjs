import test from 'node:test';
import assert from 'node:assert/strict';
import { storedZip } from '../src/lib/zip.ts';

test('batch archive writes UTF-8 filenames and valid ZIP headers', () => {
  const bytes = storedZip([{ name: 'study_order.svg', bytes: new TextEncoder().encode('<svg/>') }]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 14, true), 1);
  assert.ok(new TextDecoder().decode(bytes).includes('study_order.svg'));
});
