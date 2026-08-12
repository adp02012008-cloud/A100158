// src/utils/dateUtils.js

/**
 * Formats any date string or object safely into YYYY-MM-DD for HTML5 <input type="date"> elements.
 * Prevents browser warning: 'The specified value "21/02/2026" does not conform to the required format, "yyyy-MM-dd".'
 */
export function formatDateForInput(dateVal) {
  if (!dateVal) return "";
  const str = String(dateVal).trim();
  if (!str) return "";

  // 1. If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. Handle DD/MM/YYYY or DD-MM-YYYY (e.g. "21/02/2026" or "21-02-2026")
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const padDay = day.padStart(2, "0");
    const padMonth = month.padStart(2, "0");
    return `${year}-${padMonth}-${padDay}`;
  }

  // 3. Handle YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const padDay = day.padStart(2, "0");
    const padMonth = month.padStart(2, "0");
    return `${year}-${padMonth}-${padDay}`;
  }

  // 4. Try JS Date parsing (e.g. ISO string "2026-02-21T00:00:00.000Z")
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}
