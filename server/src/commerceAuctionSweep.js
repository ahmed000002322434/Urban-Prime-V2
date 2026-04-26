import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { runAuctionLifecycleSweep } from './commerceRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = Array.from(
  new Set(
    [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '../.env.local'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../../.env.local'),
      process.env.DOTENV_PATH
    ]
      .filter(Boolean)
      .map((candidate) => path.resolve(candidate))
  )
);

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const writeAuditLog = async ({ actorUserId, action, entityType, entityId, details = {} }) => {
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (error) {
    console.warn('Auction sweep audit log failed:', error?.message || error);
  }
};

runAuctionLifecycleSweep(supabase, writeAuditLog)
  .then(() => {
    console.log('Auction lifecycle sweep completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auction lifecycle sweep failed:', error);
    process.exit(1);
  });
