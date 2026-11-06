import { unzipSync, zipSync } from 'three/addons/libs/fflate.module.js';

const align = (n, size = 4) => Math.ceil(n / size) * size;
const field = (bytes, table, index) => {
  const vtable = table - bytes.readInt32LE(table);
  const slot = 4 + index * 2;
  return slot < bytes.readUInt16LE(vtable) && bytes.readUInt16LE(vtable + slot) ? table + bytes.readUInt16LE(vtable + slot) : 0;
};
const target = (bytes, address) => address ? address + bytes.readUInt32LE(address) : 0;
const vectorTables = (bytes, address) => {
  const vector = target(bytes, address);
  return vector ? Array.from({ length: bytes.readUInt32LE(vector) }, (_, i) => target(bytes, vector + 4 + i * 4)) : [];
};
const string = (bytes, address) => { const at = target(bytes, address); return at ? bytes.toString('utf8', at + 4, at + 4 + bytes.readUInt32LE(at)) : ''; };

export function attachTaskMetadata(liteBytes, referenceBytes) {
  const lite = Buffer.from(liteBytes), reference = Buffer.from(referenceBytes);
  if (lite.toString('ascii', 4, 8) !== 'TFL3') throw new Error('Not a TFLite model.');
  const root = lite.readUInt32LE(0), refRoot = reference.readUInt32LE(0);
  const referenceBuffers = vectorTables(reference, field(reference, refRoot, 4));
  const metadata = vectorTables(reference, field(reference, refRoot, 6)).find((entry) => string(reference, field(reference, entry, 0)) === 'TFLITE_METADATA');
  if (!metadata) throw new Error('Reference Tasks model has no preprocessing metadata.');
  const metadataBuffer = referenceBuffers[reference.readUInt32LE(field(reference, metadata, 1))];
  const dataVector = target(reference, field(reference, metadataBuffer, 0));
  const data = reference.subarray(dataVector + 4, dataVector + 4 + reference.readUInt32LE(dataVector));

  const buffers = vectorTables(lite, field(lite, root, 4));
  const oldMetadata = vectorTables(lite, field(lite, root, 6)).filter((entry) => string(lite, field(lite, entry, 0)) !== 'TFLITE_METADATA');
  // Add a new root/table prefix and metadata buffer. Existing graph/tensor bytes
  // and all their internal relative pointers stay unchanged, shifted by 16-byte alignment.
  const rootTable = 28, buffersVector = 64;
  const metadataVector = buffersVector + 4 + (buffers.length + 1) * 4;
  const metadataVtable = metadataVector + 4 + (oldMetadata.length + 1) * 4;
  const metadataTable = metadataVtable + 8;
  const nameString = metadataTable + 12;
  const name = Buffer.from('TFLITE_METADATA');
  const bufferVtable = align(nameString + 4 + name.length + 1);
  const bufferTable = bufferVtable + 8;
  const prefix = align(bufferTable + 8, 16);
  const metadataData = align(prefix + lite.length);
  const result = Buffer.alloc(align(metadataData + 4 + data.length));
  result.writeUInt32LE(rootTable, 0); result.write('TFL3', 4, 'ascii');
  result.writeUInt16LE(20, 8); result.writeUInt16LE(36, 10);
  result.writeInt32LE(rootTable - 8, rootTable);
  const pointer = (at, to) => result.writeUInt32LE(to - at, at);
  for (let i = 0; i < 8; i++) {
    const source = field(lite, root, i), address = rootTable + 4 + i * 4;
    if (!source && i !== 4 && i !== 6) continue;
    result.writeUInt16LE(4 + i * 4, 12 + i * 2);
    if (i === 0) result.writeUInt32LE(lite.readUInt32LE(source), address);
    else pointer(address, i === 4 ? buffersVector : i === 6 ? metadataVector : prefix + target(lite, source));
  }
  result.writeUInt32LE(buffers.length + 1, buffersVector);
  buffers.forEach((table, i) => pointer(buffersVector + 4 + i * 4, prefix + table));
  pointer(buffersVector + 4 + buffers.length * 4, bufferTable);
  result.writeUInt32LE(oldMetadata.length + 1, metadataVector);
  oldMetadata.forEach((table, i) => pointer(metadataVector + 4 + i * 4, prefix + table));
  pointer(metadataVector + 4 + oldMetadata.length * 4, metadataTable);
  result.writeUInt16LE(8, metadataVtable); result.writeUInt16LE(12, metadataVtable + 2);
  result.writeUInt16LE(4, metadataVtable + 4); result.writeUInt16LE(8, metadataVtable + 6);
  result.writeInt32LE(8, metadataTable); pointer(metadataTable + 4, nameString);
  result.writeUInt32LE(buffers.length, metadataTable + 8);
  result.writeUInt32LE(name.length, nameString); name.copy(result, nameString + 4);
  result.writeUInt16LE(6, bufferVtable); result.writeUInt16LE(8, bufferVtable + 2); result.writeUInt16LE(4, bufferVtable + 4);
  result.writeInt32LE(8, bufferTable); pointer(bufferTable + 4, metadataData);
  lite.copy(result, prefix); result.writeUInt32LE(data.length, metadataData); data.copy(result, metadataData + 4);

  // Associated labels must accompany the copied metadata. Adjust ZIP offsets for
  // the TFLite prefix, as in the official self-extracting model files.
  const files = unzipSync(referenceBytes);
  const archive = Buffer.from(zipSync(files, { level: 0 }));
  const end = archive.length - 22;
  let central = archive.readUInt32LE(end + 16);
  const count = archive.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    archive.writeUInt32LE(archive.readUInt32LE(central + 42) + result.length, central + 42);
    central += 46 + archive.readUInt16LE(central + 28) + archive.readUInt16LE(central + 30) + archive.readUInt16LE(central + 32);
  }
  archive.writeUInt32LE(archive.readUInt32LE(end + 16) + result.length, end + 16);
  return Buffer.concat([result, archive]);
}
