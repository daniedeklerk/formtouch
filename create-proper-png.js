// Create a proper 1x1 transparent PNG
import fs from 'fs';
import { Buffer } from 'buffer';

// 1x1 transparent PNG in hex
// PNG signature: 89 50 4E 47 0D 0A 1A 0A
// IHDR chunk: 00 00 00 0D (13 bytes) + 49 48 44 52 (IHDR) + 00 00 00 01 (width) + 00 00 00 01 (height) + 08 02 00 00 00
// IDAT chunk: 00 00 00 0C (12 bytes) + 49 44 41 54 (IDAT) + 78 9C 63 00 01 00 00 05 00 01 0D 0A 2D B4 (compressed data)
// IEND chunk: 00 00 00 00 (0 bytes) + 49 45 4E 44 (IEND) + AE 42 60 82 (CRC)

const pngHex = '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63000100000500010d0a2db40000000049454e44ae426082';

const pngBuffer = Buffer.from(pngHex, 'hex');

// Convert to base64
const base64Data = pngBuffer.toString('base64');
console.log('Proper PNG base64:', base64Data);
console.log('Base64 length:', base64Data.length);

// Save the PNG file to verify
fs.writeFileSync('test-transparent.png', pngBuffer);
console.log('Saved test-transparent.png for verification');

// Test the data URL
const dataUrl = `data:image/png;base64,${base64Data}`;
console.log('Data URL:', dataUrl);

// Verify it's a valid PNG
const signature = pngBuffer.slice(0, 8);
const expectedSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
console.log('PNG signature valid:', signature.equals(expectedSignature));
