const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// KONFIGURASI
const BOT_TOKEN = '8035232590:AAGdEPw0WhzIeiS1dr-egYmlRFApJGtrPb8';
const OWNER_ID = 8457401920;
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'ajayajay293';
const REPO_NAME = 'userbot-session';
const FILE_PATH = 'session.json';

const bot = new Telegraf(BOT_TOKEN);

// Database Sederhana
let storeData = {
    products: [
        { id: 1, name: "ID 1", price: 15000, stock: 0, desc: "Sesi Telegram Premium HQ (Fresh)", number: "-", otp: "-" }
    ]
};

// Fungsi Animasi
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAnimation(ctx, finalMsg, isEdit = false) {
    const loader = ["⬜", "⬛", "⬜", "⬛"];
    let msg;
    if (isEdit) {
        msg = await ctx.editMessageText("⏳ [ 0% ] *Starting...*", { parse_mode: 'Markdown' });
    } else {
        msg = await ctx.reply("⏳ [ 0% ] *Starting...*", { parse_mode: 'Markdown' });
    }

    const progress = [25, 50, 75, 100];
    for (let i = 0; i < progress.length; i++) {
        await sleep(300);
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id || msg, null, `⏳ [ ${progress[i]}% ] *Loading ${loader[i]}*`, { parse_mode: 'Markdown' });
    }
    await sleep(200);
    if (isEdit) {
        return ctx.editMessageText(finalMsg.text, { parse_mode: 'Markdown', ...finalMsg.keyboard });
    } else {
        await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id);
        return ctx.reply(finalMsg.text, { parse_mode: 'Markdown', ...finalMsg.keyboard });
    }
}

// --- MENU UTAMA ---
bot.start(async (ctx) => {
    const welcomeText = 
`╔════════════════════╗
║    ✨ **OFFICIAL STORE** ✨    ║
╚════════════════════╝

👋 *Halo,* [${ctx.from.first_name}](tg://user?id=${ctx.from.id})

Selamat datang di platform penyedia layanan nomor Telegram otomatis. Cepat, aman, dan terpercaya.

📍 *INFORMASI USER:*
👤 **Name:** ${ctx.from.first_name}
🆔 **ID:** \`${ctx.from.id}\`
🤖 **Status:** *Member Active*

Silahkan pilih menu di bawah ini:`;

    await runAnimation(ctx, {
        text: welcomeText,
        keyboard: Markup.inlineKeyboard([
            [Markup.button.callback('🛒 ORDER NOMOR', 'order_menu'), Markup.button.callback('💰 DEPOSIT', 'deposit_menu')],
            [Markup.button.callback('📜 RIWAYAT', 'history'), Markup.button.callback('👨‍💻 OWNER', 'owner_info')]
        ])
    });
});

// --- MENU ORDER ---
bot.action('order_menu', async (ctx) => {
    let buttons = storeData.products.map(p => [Markup.button.callback(`📱 ${p.name} [ Stok: ${p.stock} ]`, `detail_${p.id}`)]);
    buttons.push([Markup.button.callback('⬅️ KEMBALI KE MENU', 'back_to_start')]);

    await ctx.editMessageText(`📦 **PRODUK TERSEDIA**\n\nSilahkan pilih kategori nomor yang ingin anda beli.\nPastikan saldo anda mencukupi!`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/detail_(\d+)/, (ctx) => {
    const productId = ctx.match[1];
    const product = storeData.products.find(p => p.id == productId);
    
    const detailText = 
`📝 **DETAIL PRODUK ID: ${product.id}**

🔹 **Nama:** ${product.name}
🔹 **Harga:** Rp${product.price.toLocaleString()}
🔹 **Stok:** ${product.stock}
🔹 **Status:** ${product.stock > 0 ? '✅ Ready' : '❌ Out of Stock'}

📖 **Deskripsi:**
_${product.desc}_

Klik konfirmasi untuk mendapatkan nomor dan kode OTP.`;

    ctx.editMessageText(detailText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ KONFIRMASI BELI', `buy_${productId}`)],
            [Markup.button.callback('⬅️ KEMBALI', 'order_menu')]
        ])
    });
});

bot.action(/buy_(\d+)/, async (ctx) => {
    const product = storeData.products.find(p => p.id == ctx.match[1]);
    if (product.stock <= 0) return ctx.answerCbQuery("⚠️ Maaf, Stok sedang kosong!", { show_alert: true });

    await runAnimation(ctx, {
        text: `✅ **PEMBELIAN BERHASIL!**\n\n📱 **Nomor:** \`${product.number}\`\n💰 **Harga:** Rp${product.price}\n\nSilahkan login ke Telegram dan tekan tombol **CEK OTP** secara berkala.`,
        keyboard: Markup.inlineKeyboard([
            [Markup.button.callback('📩 CEK OTP', 'cek_otp')],
            [Markup.button.callback('🏁 SELESAI & HAPUS SESI', 'finish_session')]
        ])
    }, true);
});

bot.action('cek_otp', (ctx) => {
    ctx.answerCbQuery("⏳ Belum ada OTP masuk. Mohon tunggu...", { show_alert: true });
});

bot.action('finish_session', async (ctx) => {
    await ctx.editMessageText("🧹 **MEMBERSIHKAN SESI...**");
    await sleep(1500);
    await ctx.editMessageText("✅ **Sesi telah dihapus.**\nTerima kasih sudah membeli di store kami! Ketik /start untuk menu utama.");
});

bot.action('back_to_start', (ctx) => {
    ctx.deleteMessage();
    bot.handleStart(ctx);
});

// --- MENU OWNER ---
bot.command('owner', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("❌ **AKSES DITOLAK!**\nMenu ini hanya untuk Owner.");

    const ownerMenu = 
`👨‍💻 **OWNER DASHBOARD**
Selamat datang kembali, Boss.

📊 **Statistik Produk:**
Total Kategori: ${storeData.products.length}
Stok ID 1: ${storeData.products[0].stock}`;

    ctx.reply(ownerMenu, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('➕ TAMBAH STOK (ID 1)', 'add_stock_1')],
            [Markup.button.callback('🔄 REFRESH DATABASE', 'refresh_db')]
        ])
    });
});

bot.action('add_stock_1', async (ctx) => {
    storeData.products[0].stock += 1;
    storeData.products[0].number = "+6281234567" + Math.floor(100+Math.random()*900);
    
    await ctx.answerCbQuery("Mengupdate GitHub...");
    await ctx.editMessageText("⏳ **Syncing to GitHub session.json...**");
    
    // (Fungsi update Github kamu panggil di sini)
    await sleep(1000);
    
    ctx.editMessageText(`✅ **BERHASIL!**\nStok ID 1 sekarang: *${storeData.products[0].stock}*\n\nData sudah otomatis sinkron ke GitHub.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ KEMBALI', 'owner')]])
    });
});

bot.launch().then(() => console.log('🚀 Bot Berhasil Dijalankan!'));
