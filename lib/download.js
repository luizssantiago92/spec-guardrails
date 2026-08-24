import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { assertSafeDownloadUrl } from "./constants.js";
import { assertSafeWriteTarget, removeFileSafe } from "./fs-utils.js";

/** A stalled mirror should fail the install instead of hanging it. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Harness assets are markdown and small scripts; anything larger is suspect. */
const MAX_ASSET_BYTES = 2 * 1024 * 1024;

/** Cap redirect chains so a malicious mirror cannot loop forever. */
const MAX_REDIRECTS = 10;

function limitSize(url, limit) {
  let received = 0;

  return new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;

      if (received > limit) {
        callback(
          new Error(
            `Download failed: ${url} exceeds the ${limit}-byte asset limit`,
          ),
        );
        return;
      }

      callback(null, chunk);
    },
  });
}

/**
 * Follow redirects manually so every hop re-validates the HTTPS/localhost policy.
 *
 * @param {string} startUrl
 * @returns {Promise<Response>}
 */
async function fetchWithSafeRedirects(startUrl) {
  let current = assertSafeDownloadUrl(startUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response;

    try {
      response = await fetch(current, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "manual",
      });
    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new Error(
          `Download failed: ${current} timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
      }
      throw new Error(
        `Download failed: unable to reach ${current} (${err.message})`,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(
          `Download failed: redirect ${response.status} from ${current} with no Location`,
        );
      }

      let next;
      try {
        next = new URL(location, current).href;
      } catch {
        throw new Error(
          `Download failed: invalid redirect Location from ${current}`,
        );
      }

      try {
        current = assertSafeDownloadUrl(next, current);
      } catch (err) {
        throw new Error(
          `Download failed: redirect from ${startUrl} to disallowed URL (${err.message})`,
        );
      }
      continue;
    }

    return response;
  }

  throw new Error(
    `Download failed: too many redirects while fetching ${startUrl}`,
  );
}

export async function downloadToFile(url, destPath, options = {}) {
  await assertSafeWriteTarget(destPath, options);

  const response = await fetchWithSafeRedirects(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }

  if (!response.body) {
    throw new Error(`Download failed: empty response body from ${url}`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ASSET_BYTES) {
    throw new Error(
      `Download failed: ${url} exceeds the ${MAX_ASSET_BYTES}-byte asset limit`,
    );
  }

  const body = Readable.fromWeb(response.body);
  const fileStream = createWriteStream(destPath);

  try {
    await pipeline(body, limitSize(url, MAX_ASSET_BYTES), fileStream);
  } catch (err) {
    await removeFileSafe(destPath);
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(`Permission denied: cannot write ${destPath}`);
    }
    throw err;
  }
}
