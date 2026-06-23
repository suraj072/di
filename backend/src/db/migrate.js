import 'dotenv/config';
import { initPool, closePool, exec } from './index.js';

// Wrap a CREATE TABLE/INDEX statement so it is idempotent (ORA-00955 = name already used)
function ifNotExists(ddl) {
  return `
    BEGIN
      EXECUTE IMMEDIATE '${ddl.replace(/'/g, "''")}';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE = -955 THEN NULL;
        ELSE RAISE;
        END IF;
    END;`;
}

const TABLES = [
  {
    name: 'users',
    sql: ifNotExists(`
      CREATE TABLE users (
        id            VARCHAR2(36)  NOT NULL,
        email         VARCHAR2(255) NOT NULL,
        password_hash VARCHAR2(255) NOT NULL,
        full_name     VARCHAR2(255),
        avatar_url    VARCHAR2(1000),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT users_pk       PRIMARY KEY (id),
        CONSTRAINT users_email_uk UNIQUE (email)
      )
    `),
  },
  {
    name: 'user_roles',
    sql: ifNotExists(`
      CREATE TABLE user_roles (
        id         VARCHAR2(36) NOT NULL,
        user_id    VARCHAR2(36) NOT NULL,
        role       VARCHAR2(10) DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT user_roles_pk      PRIMARY KEY (id),
        CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT user_roles_role_ck CHECK (role IN ('admin','user'))
      )
    `),
  },
  {
    name: 'initiatives',
    sql: ifNotExists(`
      CREATE TABLE initiatives (
        id          VARCHAR2(36)   NOT NULL,
        name        VARCHAR2(500)  NOT NULL,
        description CLOB,
        overview    CLOB,
        category    VARCHAR2(255),
        status      VARCHAR2(50)   DEFAULT 'active',
        logo_url    VARCHAR2(2000),
        parent_id   VARCHAR2(36),
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT init_pk        PRIMARY KEY (id),
        CONSTRAINT init_parent_fk FOREIGN KEY (parent_id) REFERENCES initiatives(id) ON DELETE SET NULL
      )
    `),
  },
  {
    name: 'partners',
    sql: ifNotExists(`
      CREATE TABLE partners (
        id            VARCHAR2(36)  NOT NULL,
        name          VARCHAR2(500) NOT NULL,
        logo_url      VARCHAR2(2000),
        website       VARCHAR2(2000),
        partner_type  VARCHAR2(100),
        status        VARCHAR2(50)  DEFAULT 'active',
        contact_name  VARCHAR2(255),
        contact_email VARCHAR2(255),
        contact_phone VARCHAR2(50),
        support_email VARCHAR2(255),
        support_phone VARCHAR2(50),
        support_hours VARCHAR2(255),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT partners_pk PRIMARY KEY (id)
      )
    `),
  },
  {
    name: 'products',
    sql: ifNotExists(`
      CREATE TABLE products (
        id            VARCHAR2(36)  NOT NULL,
        name          VARCHAR2(500) NOT NULL,
        description   VARCHAR2(4000),
        category      VARCHAR2(255),
        is_active     NUMBER(1,0)   DEFAULT 1 NOT NULL,
        display_order NUMBER(10,0)  DEFAULT 0,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT products_pk         PRIMARY KEY (id),
        CONSTRAINT products_active_ck  CHECK (is_active IN (0,1))
      )
    `),
  },
  {
    name: 'initiative_partners',
    sql: ifNotExists(`
      CREATE TABLE initiative_partners (
        id                       VARCHAR2(36)   NOT NULL,
        initiative_id            VARCHAR2(36)   NOT NULL,
        partner_id               VARCHAR2(36)   NOT NULL,
        integration_cost         NUMBER(18,4),
        annual_cost              NUMBER(18,4),
        pricing_per_call         NUMBER(18,6),
        pricing_unit             VARCHAR2(100),
        currency                 VARCHAR2(10),
        billing_contact          VARCHAR2(255),
        sla_percentage           NUMBER(5,2),
        terms_and_conditions     CLOB,
        api_version              VARCHAR2(50),
        api_documentation        CLOB,
        api_notes                CLOB,
        uat_api_key              VARCHAR2(500),
        production_api_key       VARCHAR2(500),
        api_request_sample       CLOB,
        api_response_sample      CLOB,
        media_type               VARCHAR2(50)   DEFAULT 'video',
        media_title              VARCHAR2(500),
        media_url                VARCHAR2(2000),
        media_description        VARCHAR2(4000),
        custom_commercial_fields CLOB,
        partner_rank             NUMBER(10,0),
        created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT ip_pk          PRIMARY KEY (id),
        CONSTRAINT ip_init_fk     FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE,
        CONSTRAINT ip_partner_fk  FOREIGN KEY (partner_id)   REFERENCES partners(id)    ON DELETE CASCADE
      )
    `),
  },
  {
    name: 'api_documents',
    sql: ifNotExists(`
      CREATE TABLE api_documents (
        id                    VARCHAR2(36)   NOT NULL,
        initiative_partner_id VARCHAR2(36)   NOT NULL,
        title                 VARCHAR2(500)  NOT NULL,
        file_path             VARCHAR2(1000) NOT NULL,
        file_name             VARCHAR2(500)  NOT NULL,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT ad_pk    PRIMARY KEY (id),
        CONSTRAINT ad_ip_fk FOREIGN KEY (initiative_partner_id) REFERENCES initiative_partners(id) ON DELETE CASCADE
      )
    `),
  },
  {
    name: 'partner_features',
    sql: ifNotExists(`
      CREATE TABLE partner_features (
        id                    VARCHAR2(36)   NOT NULL,
        initiative_partner_id VARCHAR2(36)   NOT NULL,
        feature_name          VARCHAR2(2000) NOT NULL,
        is_available          NUMBER(1,0)    DEFAULT 1 NOT NULL,
        notes                 CLOB,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT pf_pk          PRIMARY KEY (id),
        CONSTRAINT pf_ip_fk       FOREIGN KEY (initiative_partner_id) REFERENCES initiative_partners(id) ON DELETE CASCADE,
        CONSTRAINT pf_avail_ck    CHECK (is_available IN (0,1))
      )
    `),
  },
  {
    name: 'initiative_partner_products',
    sql: ifNotExists(`
      CREATE TABLE initiative_partner_products (
        id                    VARCHAR2(36)  NOT NULL,
        initiative_partner_id VARCHAR2(36)  NOT NULL,
        product_id            VARCHAR2(36)  NOT NULL,
        usage_status          VARCHAR2(100),
        implementation_date   TIMESTAMP,
        notes                 VARCHAR2(4000),
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT ipp_pk         PRIMARY KEY (id),
        CONSTRAINT ipp_ip_fk      FOREIGN KEY (initiative_partner_id) REFERENCES initiative_partners(id) ON DELETE CASCADE,
        CONSTRAINT ipp_product_fk FOREIGN KEY (product_id)            REFERENCES products(id)            ON DELETE CASCADE
      )
    `),
  },
  {
    name: 'support_details',
    sql: ifNotExists(`
      CREATE TABLE support_details (
        id                       VARCHAR2(36)  NOT NULL,
        initiative_partner_id    VARCHAR2(36)  NOT NULL,
        production_contact_name  VARCHAR2(255),
        production_contact_email VARCHAR2(255),
        production_contact_phone VARCHAR2(50),
        sandbox_contact          VARCHAR2(2000),
        known_issues             CLOB,
        faq                      CLOB,
        created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT sd_pk    PRIMARY KEY (id),
        CONSTRAINT sd_ip_uk UNIQUE (initiative_partner_id),
        CONSTRAINT sd_ip_fk FOREIGN KEY (initiative_partner_id) REFERENCES initiative_partners(id) ON DELETE CASCADE
      )
    `),
  },
  {
    name: 'api_specifications',
    sql: ifNotExists(`
      CREATE TABLE api_specifications (
        id                    VARCHAR2(36) NOT NULL,
        initiative_partner_id VARCHAR2(36) NOT NULL,
        version               VARCHAR2(50) DEFAULT '1.0',
        openapi_json          CLOB,
        input_parameters      CLOB,
        output_parameters     CLOB,
        created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT aspec_pk    PRIMARY KEY (id),
        CONSTRAINT aspec_ip_fk FOREIGN KEY (initiative_partner_id) REFERENCES initiative_partners(id) ON DELETE CASCADE
      )
    `),
  },
];

const INDEXES = [
  { name: 'idx_init_parent_id',   sql: 'CREATE INDEX idx_init_parent_id   ON initiatives(parent_id)' },
  { name: 'idx_ip_initiative_id', sql: 'CREATE INDEX idx_ip_initiative_id ON initiative_partners(initiative_id)' },
  { name: 'idx_ip_partner_id',    sql: 'CREATE INDEX idx_ip_partner_id    ON initiative_partners(partner_id)' },
  { name: 'idx_ad_ip_id',         sql: 'CREATE INDEX idx_ad_ip_id         ON api_documents(initiative_partner_id)' },
  { name: 'idx_pf_ip_id',         sql: 'CREATE INDEX idx_pf_ip_id         ON partner_features(initiative_partner_id)' },
  { name: 'idx_ipp_ip_id',        sql: 'CREATE INDEX idx_ipp_ip_id        ON initiative_partner_products(initiative_partner_id)' },
  { name: 'idx_sd_ip_id',         sql: 'CREATE INDEX idx_sd_ip_id         ON support_details(initiative_partner_id)' },
].map(({ name, sql }) => ({ name: `Index: ${name}`, sql: ifNotExists(sql) }));

const TRIGGERS = [
  { table: 'users',                        name: 'trg_users_upd' },
  { table: 'initiatives',                  name: 'trg_init_upd' },
  { table: 'partners',                     name: 'trg_partners_upd' },
  { table: 'products',                     name: 'trg_products_upd' },
  { table: 'initiative_partners',          name: 'trg_ip_upd' },
  { table: 'api_documents',               name: 'trg_ad_upd' },
  { table: 'partner_features',            name: 'trg_pf_upd' },
  { table: 'initiative_partner_products',  name: 'trg_ipp_upd' },
  { table: 'support_details',             name: 'trg_sd_upd' },
  { table: 'api_specifications',          name: 'trg_aspec_upd' },
].map(({ table, name }) => ({
  name: `Trigger: ${name}`,
  sql: `
    CREATE OR REPLACE TRIGGER ${name}
    BEFORE UPDATE ON ${table}
    FOR EACH ROW
    BEGIN
      :NEW.updated_at := SYSTIMESTAMP;
    END;`,
}));

const run = async () => {
  await initPool();
  const oracledb = (await import('oracledb')).default;
  const conn = await oracledb.getConnection({
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
  });

  try {
    console.log('Running Oracle DDL migrations...\n');
    const steps = [...TABLES, ...INDEXES, ...TRIGGERS];

    for (const { name, sql } of steps) {
      try {
        await conn.execute(sql);
        console.log(`  ✓ ${name}`);
      } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        throw err;
      }
    }

    await conn.commit();
    console.log('\n✓ All tables, indexes, and triggers created successfully.');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.close();
    await closePool();
  }
};

run();
