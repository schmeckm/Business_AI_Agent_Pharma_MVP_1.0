export const EU = new Set(["DE","FR","IT","ES","AT","BE","NL","PL","SE","FI","DK","IE","PT","CZ","HU","RO","SK","SI","HR","BG","LU","LT","LV","EE","GR","CY","MT"]);
export const normalizeId = (s) => String(s || "").trim().toUpperCase();
export const fmtOrder = (o) => `${o.id} | FG=${o.fg} | Country=${o.country} | Bulk=${o.bulkMaterial} | Qty=${o.qtyRequired}`;
export const checkTRIC = (lot, c) => Array.isArray(lot.tric) && lot.tric.includes(c);
export const checkATP  = (req, qty) => Number(qty) >= Number(req ?? 0);
export const checkRMSL = (pct, c, minEU=60, minROW=80) => Number(pct) >= (EU.has(String(c).toUpperCase()) ? minEU : minROW);
