function base64UrlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeDataForUrl(data: string): Promise<string> {
  const inputBytes = new TextEncoder().encode(data);

  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(inputBytes);
  writer.close();

  const compressed = await new Response(cs.readable).arrayBuffer();

  return base64UrlEncode(new Uint8Array(compressed));
}

export async function decodeUrlData(encoded: string): Promise<string> {
  const compressedBytes = base64UrlDecode(encoded);

  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();

  const decompressedPromise = await new Response(ds.readable).arrayBuffer();

  return new TextDecoder().decode(decompressedPromise);
}
