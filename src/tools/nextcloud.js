/**
 * Nextcloud file management tool
 * Lists files and folders in a Nextcloud directory.
 */

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://localhost:8001';
const NEXTCLOUD_USERNAME = process.env.NEXTCLOUD_USERNAME || 'admin';
const NEXTCLOUD_PASSWORD = process.env.NEXTCLOUD_PASSWORD || 'admin';

/**
 * Build basic auth header for Nextcloud
 */
function getAuthHeader() {
  const credentials = Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * @param {object} args - Tool arguments
 * @param {string} [args.path='/'] - Directory path to list
 * @param {string} [args.depth=1] - Max depth (1=shallow, 3=recursive)
 */
export async function nextcloudFilesList({ path = '/', depth = 1 }) {
  console.log(`[nextcloud] Listing path: "${path}"`);

  // Use WebDAV PROPFIND to list directory contents
  const response = await fetch(`${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USERNAME}${path}`, {
    method: 'PROPFIND',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/xml',
      Depth: String(depth),
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:displayname/>
          <d:getcontenttype/>
          <d:getcontentlength/>
          <d:getlastmodified/>
          <d:resourcetype/>
        </d:prop>
      </d:propfind>`,
  });

  if (!response.ok) {
    throw new Error(`Nextcloud listing failed: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Parse WebDAV XML response
  const items = parseWebDavResponse(xmlText);

  if (items.length === 0) {
    return {
      path,
      message: 'Directory is empty or not accessible',
      files: [],
    };
  }

  return {
    path,
    totalItems: items.length,
    files: items,
  };
}

/**
 * Parse WebDAV XML response into a clean file list
 * @param {string} xml
 */
function parseWebDavResponse(xml) {
  const items = [];
  // Match each <d:response> block
  const responseRegex = /<d:response>([\s\S]*?)<\/d:response>/g;
  let match;

  while ((match = responseRegex.exec(xml)) !== null) {
    const block = match[1];

    const hrefMatch = /<d:href>([\s\S]*?)<\/d:href>/.exec(block);
    const displayMatch = /<d:displayname>([\s\S]*?)<\/d:displayname>/.exec(block);
    const contentTypeMatch = /<d:getcontenttype>([\s\S]*?)<\/d:getcontenttype>/.exec(block);
    const lengthMatch = /<d:getcontentlength>([\s\S]*?)<\/d:getcontentlength>/.exec(block);
    const lastModMatch = /<d:getlastmodified>([\s\S]*?)<\/d:getlastmodified>/.exec(block);
    const collectionMatch = /<d:collection>([\s\S]*?)<\/d:collection>/.exec(block);

    const href = hrefMatch ? decodeURIComponent(hrefMatch[1].trim()) : '';
    const name = displayMatch ? displayMatch[1].trim() : href.split('/').pop() || 'unknown';
    const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
    const length = lengthMatch ? parseInt(lengthMatch[1].trim(), 10) : 0;
    const lastModified = lastModMatch ? lastModMatch[1].trim() : '';
    const isDirectory = collectionMatch !== null;

    items.push({
      name,
      path: href,
      type: isDirectory ? 'directory' : 'file',
      mimeType: contentType,
      size: length,
      lastModified,
    });
  }

  return items;
}