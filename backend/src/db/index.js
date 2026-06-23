import oracledb from 'oracledb';

// Return CLOB columns as plain JS strings automatically
oracledb.fetchAsString = [oracledb.CLOB];

let pool;

export async function initPool() {
  if (pool) return pool;
  pool = await oracledb.createPool({
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin:       2,
    poolMax:       10,
    poolIncrement: 1,
  });
  console.log('Oracle connection pool created.');
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.close(0);
    pool = undefined;
  }
}

// Lowercase all column names returned by Oracle (Oracle returns them in UPPERCASE)
function normalize(rows) {
  return rows.map(row =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
  );
}

// Single-statement query with autoCommit (use for SELECT, INSERT, UPDATE, DELETE)
export async function query(sql, params = {}) {
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
    });
    if (result.rows) result.rows = normalize(result.rows);
    return result;
  } finally {
    await conn.close();
  }
}

// Execute within an existing connection (use inside transaction())
export async function exec(conn, sql, params = {}) {
  const result = await conn.execute(sql, params, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    autoCommit: false,
  });
  if (result.rows) result.rows = normalize(result.rows);
  return result;
}

// Wrap multiple statements in a single commit/rollback transaction
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}
