
// Convert ArrayBuffer to hex string
export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a UNIX timestamp ~1 min in the future
export function getExpiry(): number {
  return Math.floor(Date.now() / 1000) + 60;
}

// HMAC-SHA256 via Web Crypto API
export async function hmacSHA256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  return toHex(signature);
}

// Build the signature per Phemex spec: HMAC_SHA256(path + query + expiry + body)
export async function sign(path: string, queryString = '', body = ''): Promise<{ expiry: number; signature: string }> {
  const apiSecret = Deno.env.get('PHEMEX_API_SECRET');
  if (!apiSecret) {
    throw new Error('PHEMEX_API_SECRET not configured');
  }

  const expiry = getExpiry();
  // For signature: path + queryString (without ?) + expiry + body
  const signatureQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  const payload = path + signatureQuery + expiry + body;
  const signature = await hmacSHA256(apiSecret, payload);

  return { expiry, signature };
}
