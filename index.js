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

// Database Sementara (Akan diisi dari GitHub)
let storeData = {
    products: [
        { id: 1, name: "ID 1", price: 15000, stock: 0, desc: "Sesi Telegram Premium HQ", number: "-", otp: "-" }
    ]
};

// Fungsi Animasi Loading
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendLoading(ctx, text) {
    const loader = ["|", "/", "-", "\\"];
    let { message_id } = await ctx.reply("⌛ [ 0% ] Menghubungkan...");
    
    for (let i = 1; i <= 4; i++) {
        await sleep(400);
        await ctx.telegram.editMessageText(ctx.chat.id, message_id, null, `⌛ [ ${i * 25}% ] ${loader[i-1]} ${text}`);
    }
    await sleep(300);
    return message_id;
}

// --- FUNGSI GITHUB (Update Session.json) ---
async function updateGithubData() {
    try {
        const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const res = await axios.get(getUrl, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        const updatedContent = Buffer.from(JSON.stringify(storeData, null, 2)).toString('base64');
        
        await axios.put(getUrl, {
            message: "Update stock via bot",
            content: updatedContent,
            sha: res.data.sha
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        return true;
    } catch (e) {
        console.error("Github Error:", e.response?.data || e.message);
        return false;
    }
}

// --- USER MENU ---
bot.start(async (ctx) => {
    await ctx.replyWithPhoto('https://via.placeholder.com/800x400.png?text=TELEGRAM+STORE', {
        caption: `✨ *SELAMAT DATANG DI STORE* ✨\n\nPlatform penyedia nomor Telegram terbaik.\n\n🆔 User ID: \`${ctx.from.id}\`\n📅 Status: *Online*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🛒 ORDER NOMOR', 'order_menu')],
            [Markup.button.callback('💰 DEPOSIT SALDO', 'deposit_menu')]
        ])
    });
});

bot.action('order_menu', async (ctx) => {
    let buttons = storeData.products.map(p => [Markup.button.callback(`📱 ID ${p.id} - [ Stok: ${p.stock} ]`, `detail_${p.id}`)]);
    await ctx.editMessageCaption('📦 *DAFTAR PRODUK TERSEDIA*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/detail_(\d+)/, (ctx) => {
    const productId = ctx.match[1];
    const product = storeData.products.find(p => p.id == productId);
    
    ctx.editMessageCaption(`📝 *DETAIL PRODUK ID ${product.id}*\n\n🔹 *Nama:* ${product.name}\n🔹 *Harga:* Rp${product.price.toLocaleString()}\n🔹 *Deskripsi:* ${product.desc}\n🔹 *Stok:* ${product.stock} Tersedia`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 BELI SEKARANG', `buy_${productId}`)],
            [Markup.button.callback('⬅️ KEMBALI', 'order_menu')]
        ])
    });
});

bot.action(/buy_(\d+)/, async (ctx) => {
    const product = storeData.products.find(p => p.id == ctx.match[1]);
    if (product.stock <= 0) return ctx.answerCbQuery("⚠️ Stok Habis!");

    await sendLoading(ctx, "Memproses transaksi...");
    
    ctx.reply(`✅ *TRANSAKSI BERHASIL*\n\n📱 *Nomor:* \`${product.number}\`\n📑 *Deskripsi:* ${product.desc}\n\nSilahkan klik tombol di bawah untuk cek OTP.`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('📩 CEK OTP', 'cek_otp')],
            [Markup.button.callback('🏁 SELESAI (HAPUS SESI)', 'finish_session')]
        ])
    });
});

bot.action('cek_otp', (ctx) => {
    ctx.answerCbQuery("Menunggu OTP masuk...", { show_alert: true });
});

bot.action('finish_session', async (ctx) => {
    await ctx.reply("🧹 Menghapus sesi dan keluar...");
    await sleep(1000);
    ctx.reply("👋 Terima kasih telah menggunakan layanan kami.");
});

// --- OWNER MENU (ID: 8457401920 ONLY) ---
bot.command('owner', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("🚫 Akses Ditolak. Anda bukan owner.");

    ctx.reply('👨‍💻 *OWNER DASHBOARD*\nSilahkan kelola stok produk Anda.', 
        Markup.inlineKeyboard([
            [Markup.button.callback('➕ ADD NOMOR / UPDATE STOK', 'add_number_menu')],
            [Markup.button.callback('📊 LIHAT DATA JSON', 'view_json')]
        ])
    );
});

bot.action('add_number_menu', (ctx) => {
    let buttons = storeData.products.map(p => [Markup.button.callback(`Update ID ${p.id}`, `edit_flow_${p.id}`)]);
    ctx.editMessageText('Pilih ID produk yang ingin ditambah:', Markup.inlineKeyboard(buttons));
});

bot.action(/edit_flow_(\d+)/, async (ctx) => {
    const id = ctx.match[1];
    const index = storeData.products.findIndex(p => p.id == id);
    
    // Animasi Penambahan Stok
    const mid = await sendLoading(ctx, "Mengupdate Database GitHub...");
    
    // Update Data
    storeData.products[index].stock += 1;
    storeData.products[index].name = "Telegram ID 1 Premium";
    storeData.products[index].price = 15000;
    storeData.products[index].number = "+628123456789"; // Contoh
    storeData.products[index].otp = "12345";

    const success = await updateGithubData();
    
    if (success) {
        await ctx.telegram.editMessageText(ctx.chat.id, mid, null, `✅ *BERHASIL UPDATE ID ${id}*\n\nStok Baru: ${storeData.products[index].stock}\nData tersimpan ke GitHub session.json`, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, mid, null, `❌ Gagal update ke GitHub. Cek Token/Repo!`);
    }
});

bot.launch().then(() => console.log('🚀 Bot Store Online!'));
