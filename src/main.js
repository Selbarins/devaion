/**
 * Devaion · Aion 2 Tracker
 * Entry point – currently boots a clean foundation.
 * Full tracker UI will be ported in the next commits.
 */

import { hasSupabase, loadAll, getSyncStatus } from './storage.js';

console.log('%cDevaion v5.1', 'color:#ff2a44;font-weight:bold');
console.log('Supabase:', hasSupabase ? 'configured' : 'not configured (local only)');

async function boot() {
  const cloudData = await loadAll();

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="topbar">
      <div class="logo">DEV<span>AION</span></div>
      <div class="nav">
        <button class="on">Setup</button>
      </div>
      <div class="clocks">
        <div class="sync-status ${hasSupabase ? 'synced' : ''}">
          ${hasSupabase ? 'Cloud ready' : 'Local only'}
        </div>
      </div>
    </div>

    <main>
      <div class="panel" style="margin-top: 24px; text-align: center;">
        <h2 style="margin-bottom: 16px;">Repository is live</h2>
        <p style="color: var(--mut); margin-bottom: 20px; line-height: 1.7;">
          Structure + Supabase integration are ready.<br>
          Next step: port the full tracker (missions, goals, Odyle, events…).
        </p>

        <div class="odyle-box" style="max-width: 480px; margin: 0 auto 24px;">
          <div class="res">
            <b style="color: ${hasSupabase ? 'var(--ok)' : 'var(--warn)'}">
              ${hasSupabase ? 'YES' : 'NO'}
            </b>
            <small>Supabase</small>
          </div>
          <div class="res">
            <b>${cloudData._source}</b>
            <small>Data source</small>
          </div>
          <div class="res">
            <b>${getSyncStatus()}</b>
            <small>Sync status</small>
          </div>
        </div>

        <p style="font-size: 13px; color: var(--muted); margin-bottom: 20px;">
          Once you add your Supabase keys in Vercel (or locally in <code>.env</code>),
          the tracker will sync automatically.
        </p>

        <a href="https://github.com/Selbarins/devaion" target="_blank"
           style="color: var(--neon); font-weight: 600;">
          View on GitHub →
        </a>
      </div>

      <div class="panel">
        <h2>Next actions</h2>
        <ol style="color: var(--mut); line-height: 1.8; padding-left: 20px; font-size: 14px;">
          <li>Create a Supabase project and run <code>supabase/migrations/001_init.sql</code></li>
          <li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel</li>
          <li>Tell me to port the full original tracker UI into this structure</li>
        </ol>
      </div>
    </main>

    <footer>PERSONAL TRACKER · LOCAL + SUPABASE · v5.1</footer>
  `;
}

boot();
