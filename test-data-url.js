// Test the exact data URL that's failing
const base64Data = 'aVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFFQUFBQUJDQVlBQUFBZkZjU0pBQUFBRFVsRVFWUjQybU5rWVBoZkR3QUNod0dBNjBlNmtnQUFBQUJKUlU1RXJrSmdnZz09';
const dataUrl = `data:image/png;base64,${base64Data}`;

console.log('Testing data URL:');
console.log('Base64 length:', base64Data.length);
console.log('Data URL length:', dataUrl.length);
console.log('Data URL:', dataUrl);

// Check for any problematic characters
console.log('\nChecking for problematic characters:');
const problematicChars = ['\n', '\r', '\t', ' ', '"', "'", '<', '>'];
problematicChars.forEach(char => {
  if (dataUrl.includes(char)) {
    console.log(`Found problematic character: ${JSON.stringify(char)} at position ${dataUrl.indexOf(char)}`);
  }
});

// Test if it's valid base64
try {
  const buffer = Buffer.from(base64Data, 'base64');
  console.log('\nBase64 validation:');
  console.log('✅ Base64 is valid');
  console.log('Buffer length:', buffer.length);
  
  // Check if it starts with PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const bufferSignature = buffer.slice(0, 8);
  console.log('PNG signature expected:', pngSignature.toString('hex'));
  console.log('Buffer signature:', bufferSignature.toString('hex'));
  console.log('Signatures match:', pngSignature.equals(bufferSignature));
  
} catch (error) {
  console.log('❌ Base64 is invalid:', error.message);
}
