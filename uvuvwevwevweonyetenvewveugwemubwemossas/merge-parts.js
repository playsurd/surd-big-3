
async function fetchPart(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch "${url}": ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * 
 *
 * @param {string}   baseUrl      
 * @param {number}   partCount    
 * @param {function} [onProgress] 
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchAndMergeAllParts(baseUrl, partCount, onProgress) {
  const urls = Array.from({ length: partCount }, (_, i) => `${baseUrl}.part${i + 1}`);
  console.log(`[merge-parts] Fetching ${partCount} part(s) for: ${baseUrl}\n   ` + urls.join("\n   "));

  let completed = 0;
  const buffers = await Promise.all(
    urls.map((url) =>
      fetchPart(url).then((buf) => {
        completed++;
        if (onProgress) onProgress(completed / partCount);
        return buf;
      })
    )
  );

  const totalBytes = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of buffers) {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  console.log(`[merge-parts] Merged ${partCount} part(s) → ${totalBytes} bytes  (${baseUrl})`);
  return merged.buffer;
}

/**
 * 
 *
 * @param {object}   config               
 * @param {string}   buildUrl             
 * @param {function} [onOverallProgress] 
 * @returns {Promise<{ dataBlob: string, wasmBlob: string }>}
 */
async function patchUnityConfigWithMergedParts(config, buildUrl, onOverallProgress) {
  const report = (phase, p) => {
    if (onOverallProgress) {
      onOverallProgress(phase === "data" ? p * 0.6 : 0.6 + p * 0.4);
    }
  };

  const dataBuf = await fetchAndMergeAllParts(
    `${buildUrl}/fatty.data`,
    4,                          
    (p) => report("data", p)
  );
  const dataBlob = URL.createObjectURL(new Blob([dataBuf]));
  config.dataUrl = dataBlob;
  console.log("[merge-parts] config.dataUrl → Blob URL (data, 4 parts)");

  const wasmBuf = await fetchAndMergeAllParts(
    `${buildUrl}/fatty.wasm`,
    2,                        
    (p) => report("wasm", p)
  );
  const wasmBlob = URL.createObjectURL(new Blob([wasmBuf], { type: "application/wasm" }));
  config.codeUrl = wasmBlob;
  console.log("[merge-parts] config.codeUrl → Blob URL (wasm, 2 parts)");

  return { dataBlob, wasmBlob };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fetchAndMergeAllParts, patchUnityConfigWithMergedParts };
}