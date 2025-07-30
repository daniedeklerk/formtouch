// Test the base64 data from the database
const base64Data = 'aVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFFQUFBQUJDQVlBQUFBZkZjU0ppBQUFBRFVsRVFWUjQybU5rWVBoZkR3QUNod0dBNjBlNmtnQUFBQUJKUlU1RXJrSmdnZz09';

console.log('Testing base64 data:');
console.log('Length:', base64Data.length);
console.log('First 50 chars:', base64Data.substring(0, 50));

// Try to create a data URL and test it
const dataUrl = `data:image/png;base64,${base64Data}`;
console.log('Data URL:', dataUrl);

// Test if it's valid base64
try {
  const buffer = Buffer.from(base64Data, 'base64');
  console.log('Buffer length:', buffer.length);
  console.log('Buffer as string:', buffer.toString('latin1').substring(0, 20));
} catch (error) {
  console.error('Invalid base64:', error);
}
