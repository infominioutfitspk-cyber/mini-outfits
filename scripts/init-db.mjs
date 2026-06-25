/**
 * init-db.mjs
 * 
 * Applies SUPER_MASTER_SCHEMA.sql to any Supabase project.
 * Reads SUPABASE_PROJECT_REF and SUPABASE_MGMT_TOKEN from .env.local
 * 
 * Usage: node scripts/init-db.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dependency on dotenv)
const envPath = resolve(__dirname, '..', '.env.local');
let envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }
  }
} catch {
  console.error('ERROR: .env.local not found. Create one with SUPABASE_PROJECT_REF and SUPABASE_MGMT_TOKEN');
  process.exit(1);
}

const PROJECT_REF = envVars.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF;
const MGMT_TOKEN = envVars.SUPABASE_MGMT_TOKEN || process.env.SUPABASE_MGMT_TOKEN;

if (!PROJECT_REF || !MGMT_TOKEN) {
  console.error('ERROR: SUPABASE_PROJECT_REF and SUPABASE_MGMT_TOKEN must be set in .env.local');
  process.exit(1);
}

const schemaPath = resolve(__dirname, '..', 'supabase', 'schema', 'SUPER_MASTER_SCHEMA.sql');
const sql = readFileSync(schemaPath, 'utf-8');

console.log(`Applying SUPER_MASTER_SCHEMA.sql to project: ${PROJECT_REF}...`);

const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MGMT_TOKEN}`
  },
  body: JSON.stringify({ query: sql })
});

const text = await response.text();
if (response.ok) {
  console.log('SUCCESS: Schema applied');
  process.exit(0);
} else {
  console.error('FAILED:', response.status, text);
  process.exit(1);
}
