require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SETTINGS_ID = '11111111-1111-1111-1111-111111111111';
const SESSION_DIR = path.join(__dirname, '.wwebjs_auth', 'session-wabot-worker');
const SESSION_BUCKET = 'whatsapp-sessions';

console.log('Starting WaBot AI Worker...');

// ==================== SESSION BACKUP / RESTORE ====================

async function backupSession() {
  try {
    const sessionPath = path.join(SESSION_DIR, 'session.json');
    if (!fs.existsSync(sessionPath)) return;
    const sessionData = fs.readFileSync(sessionPath, 'utf-8');
    const { error } = await supabase.storage
      .from(SESSION_BUCKET)
      .upload('session.json', sessionData, { contentType: 'application/json', upsert: true });
    if (error) console.log('⚠️ Session backup failed:', error.message);
    else console.log('✅ Session backed up to Supabase.');
  } catch (err) {
    console.log('⚠️ Session backup error:', err.message);
  }
}

async function restoreSession() {
  try {
    const { data, error } = await supabase.storage.from(SESSION_BUCKET).download('session.json');
    if (error || !data) {
      console.log('ℹ️ No saved session found. Will show QR code.');
      return false;
    }
    const text = await data.text();
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(path.join(SESSION_DIR, 'session.json'), text, 'utf-8');
    console.log('✅ Session restored from Supabase.');
    return true;
  } catch (err) {
    console.log('⚠️ Session restore error:', err.message);
    return false;
  }
}

// ==================== BOT SETTINGS ====================

async function ensureBotSettingsRow() {
  const { data } = await supabase.from('bot_settings').select('id').eq('id', SETTINGS_ID).maybeSingle();
  if (!data) {
    await supabase.from('bot_settings').insert([{
      id: SETTINGS_ID, is_bot_enabled: false, session_status: 'disconnected', qr_code: null
    }]);
    console.log('✅ bot_settings row created.');
  }
}

// ==================== WHATSAPP CLIENT ====================

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-infobars',
      '--disable-dev-shm-usage', '--no-first-run', '--disable-gpu',
      '--disable-extensions', '--disable-background-networking',
      '--js-flags=--max-old-space-size=256',
      '--max-wait-for-ready=10000',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-default-apps',
      '--no-default-browser-check',
      '--disable-component-update',
      '--disable-sync',
      '--disable-breakpad',
    ],
    defaultViewport: null,
  }
});

client.on('qr', async (qr) => {
  console.log('\n========================================');
  console.log('  QR CODE - SCAN WITH WHATSAPP');
  console.log('========================================\n');
  qrcode.generate(qr, { small: true });
  for (let i = 1; i <= 5; i++) {
    const { error } = await supabase
      .from('bot_settings')
      .upsert({ id: SETTINGS_ID, session_status: 'waiting_qr', qr_code: qr }, { onConflict: 'id' });
    if (!error) { console.log('✅ QR saved to Supabase.'); return; }
    if (i < 5) await new Promise(r => setTimeout(r, i * 2000));
  }
});

client.on('ready', async () => {
  console.log('\n✅ WHATSAPP CONNECTED!\n');
  await supabase
    .from('bot_settings')
    .update({ session_status: 'connected', is_bot_enabled: true, qr_code: null })
    .eq('id', SETTINGS_ID);
  backupSession();
});

client.on('authenticated', () => console.log('🔐 Authenticated!'));

client.on('auth_failure', async (msg) => {
  console.error('❌ Auth failure:', msg);
  await supabase.from('bot_settings').update({ session_status: 'auth_failure', qr_code: null }).eq('id', SETTINGS_ID);
  retryCount = 0;
  client.destroy().catch(() => {}).finally(() => setTimeout(startClient, 3000));
});

client.on('error', async (err) => {
  console.error('❌ Client error:', err.message);
  await supabase.from('bot_settings').update({ session_status: 'error' }).eq('id', SETTINGS_ID);
});

client.on('disconnected', async (reason) => {
  console.log('⚠️ Disconnected:', reason);
  await supabase.from('bot_settings').update({ session_status: 'disconnected', qr_code: null }).eq('id', SETTINGS_ID);
  retryCount = 0;
  client.destroy().catch(() => {}).finally(() => setTimeout(startClient, 5000));
});

// ==================== BOT AUTO-REPLY ====================

const messageQueue = [];
const MAX_CONCURRENT_REPLIES = 3;
let activeReplies = 0;

async function processNextMessage() {
  if (messageQueue.length === 0 || activeReplies >= MAX_CONCURRENT_REPLIES) return;
  activeReplies++;
  const msg = messageQueue.shift();

  try {
    const { data: settings } = await supabase
      .from('bot_settings').select('is_bot_enabled').eq('id', SETTINGS_ID).single();
    if (!settings?.is_bot_enabled) { activeReplies--; processNextMessage(); return; }

    const { data: training } = await supabase
      .from('ai_training').select('*').limit(1).maybeSingle();

    const delay = Math.floor(Math.random() * (10000 - 3000 + 1) + 3000);
    setTimeout(async () => {
      try {
        const chat = await msg.getChat();
        chat.sendStateTyping();
        const typingDuration = Math.floor(Math.random() * 4000) + 3000;
        await new Promise(r => setTimeout(r, typingDuration));
        chat.clearState();
        let reply = `Hello! Thank you for your message. You said: "${msg.body}". Our team will get back to you shortly.`;
        if (training?.company_details) {
          reply = `Hello! Thank you for reaching out to ${training.company_details}. You said: "${msg.body}". Our team will get back to you shortly.`;
        }
        await client.sendMessage(msg.from, reply);
        console.log(`✅ Replied to ${msg.from}`);
      } catch (e) { console.log('❌ Reply error:', e.message); }
      activeReplies--;
      processNextMessage();
    }, delay);
  } catch (err) {
    console.log('❌ Message handler error:', err.message);
    activeReplies--;
    processNextMessage();
  }
}

client.on('message', async (msg) => {
  if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) return;
  if (msg.fromMe) return;
  console.log(`📩 Message from ${msg.from}: ${msg.body}`);
  messageQueue.push(msg);
  processNextMessage();
});

// ==================== CAMPAIGN PROCESSING ====================

let isProcessingCampaign = false;

async function processPendingCampaigns() {
  if (isProcessingCampaign) return;
  try { if (!client.info?.wid) return; } catch (e) { return; }

  isProcessingCampaign = true;
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns').select('*').eq('status', 'pending')
      .order('created_at', { ascending: true }).limit(1);

    if (error || !campaigns || campaigns.length === 0) { isProcessingCampaign = false; return; }

    const campaign = campaigns[0];
    console.log(`\n🚀 Starting campaign: ${campaign.id}`);

    await supabase.from('campaigns').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', campaign.id);

    const PAGE_SIZE = 500;
    let contacts = [];
    {
      let page = 0;
      while (true) {
        let contactQuery = supabase.from('contacts').select('id,name,phone_number,group_name,last_used_date')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (campaign.target_group && campaign.target_group !== 'All Contacts') {
          contactQuery = contactQuery.eq('group_name', campaign.target_group);
        }
        const { data: batch } = await contactQuery;
        if (!batch || batch.length === 0) break;
        contacts = contacts.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        page++;
      }
    }

    if (!contacts || contacts.length === 0) {
      await supabase.from('campaigns').update({ status: 'completed', sent_count: 0, failed_count: 0, total_count: 0 }).eq('id', campaign.id);
      console.log('No contacts found.');
      isProcessingCampaign = false;
      return;
    }

    const { data: template } = await supabase.from('templates').select('*').eq('id', campaign.template_id).single();
    if (!template) {
      await supabase.from('campaigns').update({ status: 'failed', error: 'Template not found' }).eq('id', campaign.id);
      console.log('Template not found!');
      isProcessingCampaign = false;
      return;
    }

    const total = contacts.length;
    let sent = 0, failed = 0;
    console.log(`Sending to ${total} contacts (${campaign.min_delay}s-${campaign.max_delay}s delay)...`);
    console.log(`Template image_url: ${template.image_url || 'NONE'}`);

    for (let i = 0; i < total; i++) {
      const { data: cur } = await supabase.from('campaigns').select('status').eq('id', campaign.id).single();
      if (cur?.status === 'cancelled') { console.log('Campaign cancelled.'); break; }

      const contact = contacts[i];
      const phone = contact.phone_number.replace(/[^0-9]/g, '');
      const chatId = `${phone}@c.us`;
      const message = template.content.replace(/\{\{\s*name\s*\}\}/g, contact.name || 'there');

      try {
        const chat = await client.getChatById(chatId);

        // Simulate typing
        await chat.sendStateTyping();
        const typingDuration = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(r => setTimeout(r, typingDuration));
        await chat.clearState();

        if (template.image_url) {
          try {
            const media = await MessageMedia.fromUrl(template.image_url, { unsafeMime: true });
            await client.sendMessage(chatId, media, { caption: message });
          } catch (mediaErr) {
            console.log(`⚠️ Media failed, sending text only: ${mediaErr.message}`);
            await client.sendMessage(chatId, message);
          }
        } else {
          await client.sendMessage(chatId, message);
        }
        sent++;
        await supabase.from('contacts').update({ last_used_date: new Date().toISOString() }).eq('id', contact.id);
        console.log(`✅ [${i + 1}/${total}] Sent to ${contact.name}`);
      } catch (err) {
        failed++;
        console.log(`❌ [${i + 1}/${total}] Failed: ${contact.name} - ${err.message}`);
      }

      await supabase.from('campaigns').update({
        sent_count: sent, failed_count: failed, total_count: total,
        progress: Math.round(((i + 1) / total) * 100),
      }).eq('id', campaign.id);

      if (i < total - 1) {
        // Base delay between messages
        const minMs = (campaign.min_delay || 40) * 1000;
        const maxMs = (campaign.max_delay || 150) * 1000;
        let waitMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

        // Add extra pause every 5-8 messages (human break)
        if (sent % Math.floor(Math.random() * 4) + 5 === 0) {
          const breakMs = Math.floor(Math.random() * 60000) + 30000;
          console.log(`☕ Taking a break (${Math.round(breakMs / 1000)}s)...`);
          await new Promise(r => setTimeout(r, breakMs));
        }

        // Longer delay after every 15-25 messages (extended break)
        if (sent % Math.floor(Math.random() * 11) + 15 === 0) {
          const longBreak = Math.floor(Math.random() * 180000) + 120000;
          console.log(`🚶 Extended break (${Math.round(longBreak / 1000)}s)...`);
          await new Promise(r => setTimeout(r, longBreak));
        }

        console.log(`⏳ Waiting ${Math.round(waitMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    await supabase.from('campaigns').update({
      status: 'completed', sent_count: sent, failed_count: failed,
      total_count: total, progress: 100, completed_at: new Date().toISOString(),
    }).eq('id', campaign.id);
    console.log(`\n✅ Campaign done! Sent: ${sent}, Failed: ${failed}, Total: ${total}`);
  } catch (err) { console.error('❌ Campaign error:', err.message); }
  isProcessingCampaign = false;
}

setInterval(processPendingCampaigns, 10000);

// ==================== START ====================

function removeLockFile() {
  const lockPath = path.join(SESSION_DIR, 'session', 'lockfile');
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
      console.log('🧹 Removed stale lockfile.');
    } catch (e) {
      console.log('⚠️ Could not remove lockfile:', e.message);
    }
  }
}

function killStaleBrowsers() {
  try {
    const result = execSync(
      'wmic process where "CommandLine like \'%puppeteer%\' or CommandLine like \'%whatsapp-web.js%\'" get ProcessId 2>nul',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const pids = result.split(/\r?\n/).filter(l => /^\d+$/.test(l.trim()));
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid.trim()} /F`, { stdio: 'ignore' }); } catch (_) {}
    }
    if (pids.length > 0) console.log(`🧹 Killed ${pids.length} stale Puppeteer process(es).`);
  } catch (_) {}
}

let retryCount = 0;
const MAX_RETRIES = 10;
let retryTimer = null;

function startClient() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  removeLockFile();
  console.log('Initializing WhatsApp client...');
  client.initialize().then(() => {
    retryCount = 0;
  }).catch((e) => {
    console.error('❌ Init error:', e.message);
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ Max retries (${MAX_RETRIES}) reached. Stopping reconnection attempts. Restart the worker to try again.`);
      return;
    }
    const delay = Math.min(30000, 5000 * Math.pow(2, retryCount - 1));
    console.log(`⚠️ Retrying in ${Math.round(delay / 1000)}s (attempt ${retryCount}/${MAX_RETRIES})...`);
    retryTimer = setTimeout(startClient, delay);
  });
}

(async () => {
  killStaleBrowsers();
  await ensureBotSettingsRow();
  await restoreSession();
  startClient();
})();

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await client.destroy().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await client.destroy().catch(() => {});
  process.exit(0);
});
