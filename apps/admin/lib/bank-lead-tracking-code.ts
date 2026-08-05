// The bank hands the tracking code back verbatim as utm_content=TRUE<8 digits>
// (see @truelend/reference's bankApplyProducts.buildApplyUrl). Case-insensitive
// since spreadsheet re-exports have been seen to upper/lower-case values.
const TRACKING_CODE_RE = /^TRUE(\d{8})$/i;

/** Extracts the 8-digit tracking code from a CSV row's utm_content cell, or undefined if it's not one of ours. */
export function extractTrackingCode(utmContent: string): string | undefined {
  return TRACKING_CODE_RE.exec(utmContent.trim())?.[1];
}
