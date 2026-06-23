// ─── Type coercions between Oracle and JS ─────────────────────────────────

export function boolVal(v) {
  return v === 1 || v === '1' || v === true;
}

export function toOracleBool(v) {
  return v ? 1 : 0;
}

export function parseJson(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return v; }
}

export function toJsonStr(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// ─── Row processors ───────────────────────────────────────────────────────

export function processProduct(row) {
  if (!row) return null;
  return { ...row, is_active: boolVal(row.is_active) };
}

export function processFeature(row) {
  if (!row) return null;
  return { ...row, is_available: boolVal(row.is_available) };
}

export function processIP(row) {
  if (!row) return null;
  return {
    ...row,
    custom_commercial_fields: parseJson(row.custom_commercial_fields) ?? [],
  };
}

export function processSupport(row) {
  if (!row) return null;
  return { ...row, faq: parseJson(row.faq) };
}

export function processSpec(row) {
  if (!row) return null;
  return {
    ...row,
    openapi_json:       parseJson(row.openapi_json),
    input_parameters:   parseJson(row.input_parameters),
    output_parameters:  parseJson(row.output_parameters),
  };
}

// ─── Dynamic UPDATE builder ───────────────────────────────────────────────
// Returns { sets: ['col = :col', ...], params: { col: val, ... } }
// clobJsonFields → value is JSON.stringify'd before binding
// boolFields     → value is converted to 0/1

export function buildUpdate(body, allowedFields, clobJsonFields = [], boolFields = []) {
  const sets = [];
  const params = {};
  for (const field of allowedFields) {
    if (!(field in body)) continue;
    let val = body[field];
    if (clobJsonFields.includes(field)) val = toJsonStr(val);
    else if (boolFields.includes(field)) val = toOracleBool(val);
    sets.push(`${field} = :${field}`);
    params[field] = val ?? null;
  }
  if (!sets.length) return null;
  sets.push('updated_at = :updated_at');
  params.updated_at = new Date();
  return { sets, params };
}

// ─── Oracle error → HTTP status ───────────────────────────────────────────

export function oraHttpStatus(err) {
  if (err.errorNum === 1)    return 409; // ORA-00001 unique constraint
  if (err.errorNum === 2291) return 400; // ORA-02291 FK parent missing
  if (err.errorNum === 2292) return 400; // ORA-02292 FK child exists
  return 500;
}
