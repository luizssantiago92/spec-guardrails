/** @typedef {string} DomainSlug */

export const FEATURE_ID_PATTERN = /^\d{3}-[a-z0-9][a-z0-9-]*$/;

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isValidFeatureId(id) {
  return FEATURE_ID_PATTERN.test(id);
}

/**
 * @param {string} name
 * @returns {DomainSlug}
 */
export function slugifyDomain(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const DOMAIN_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * @param {string} raw
 * @returns {DomainSlug}
 */
export function assertSafeDomainSlug(raw) {
  if (/[/\\]|\.\./.test(raw)) {
    throw new Error(`Invalid domain slug: ${raw}`);
  }
  const slug = slugifyDomain(raw);
  if (!slug || !DOMAIN_SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid domain slug: ${raw}`);
  }
  return slug;
}
