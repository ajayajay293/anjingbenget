const { Telegraf, Markup, Scenes, session } = require('telegraf');
const axios = require('axios');

// --- KONFIGURASI ---
const BOT_TOKEN = '8035232590:AAGdEPw0WhzIeiS1dr-egYmlRFApJGtrPb8';
const OWNER_ID = 8457401920;
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'ajayajay293';
const REPO_NAME = 'userbot-session';
const FILE_PATH = 'session.json';

// --- DATABASE RAM ---
let storeData = { products: [] };

// --- FUNGSI GITHUB (FULL WORK) ---
async function syncToGithub() {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const { data } = await axios.get(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        const content = Buffer.from(JSON.stringify(storeData, null, 2)).toString('base64');
        await axios.put(url, {
            message: "Update Session via Bot",
            content: content,
            sha: data.sha
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
        return true;
    } catch (e) {
        console.error("Github Sync Error");
        return false;
    }
}

// --- SCENE ADD NOMOR (STEP BY STEP) ---
const addNumberScene = new Scenes.WizardScene(
    'ADD_NUMBER_SCENE',
    (ctx) => {
        ctx.reply("📝 **LANGKAH 1:**\nMasukkan **Nama/Label** untuk tombol nomor ini (Misal: ID 1 Premium):", { parse_mode: 'Markdown' });
        ctx.wizard.state.formData = {};
        return ctx.wizard.next();
    },
    (ctx) => {
        ctx.wizard.state.formData.name = ctx.message.text;
        ctx.reply("📱 **LANGKAH 2:**\nKirimkan **Nomor Telegram** (Misal: +62812xxx):");
        return ctx.wizard.next();
    },
    (ctx) => {
        ctx.wizard.state.formData.number = ctx.message.text;
        ctx.reply("🔑 **LANGKAH 3:**\nMasukkan **OTP / Deskripsi Tambahan**:");
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.wizard.state.formData.otp = ctx.message.text;
        const data = ctx.wizard.state.formData;

        const loadingMsg = await ctx.reply("⏳ **SINKRONISASI GITHUB...**\n[ 0% ] Menyiapkan Data...");
        
        // Simpan ke RAM
        storeData.products.push({
            id: Date.now(),
            name: data.name,
            number: data.number,
            otp: data.otp,
            price: 15000,
            stock: 1,
            desc: "Akun Telegram Fresh"
        });

        // Push ke GitHub
        const success = await syncToGithub();
        
        if (success) {
            await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, 
                `✅ **BERHASIL DITAMBAHKAN!**\n\n👤 Nama: ${data.name}\n📱 Nomor: ${data.number}\n🔑 OTP: ${data.otp}\n\nStok otomatis bertambah dan sinkron ke GitHub.`, 
                { parse_mode: 'Markdown' });
        } else {
            ctx.reply("❌ Gagal sinkron ke GitHub. Periksa Token Anda!");
        }
        return ctx.scene.leave();
    }
);

const bot = new Telegraf(BOT_TOKEN);
const stage = new Scenes.Stage([addNumberScene]);
bot.use(session());
bot.use(stage.middleware());

// --- MENU UTAMA ---
bot.start(async (ctx) => {
    const startMsg = `
╔════════════════════╗
      🛒 **TELE-STORE PREMIUM**
╚════════════════════╝

Selamat datang, **${ctx.from.first_name}**!
Silahkan pilih menu layanan kami di bawah.

🔹 **Status:** 🟢 Online
🔹 **User ID:** \`${ctx.from.id}\``;

    ctx.reply(startMsg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ BELI NOMOR', 'order_menu')],
            [Markup.button.callback('💳 DEPOSIT', 'deposit_menu')],
            [Markup.button.callback('👨‍💻 OWNER', 'owner_info')]
        ])
    });
});

bot.action('order_menu', (ctx) => {
    if (storeData.products.length === 0) return ctx.answerCbQuery("❌ Belum ada stok!", { show_alert: true });
    
    let buttons = storeData.products.map(p => [Markup.button.callback(`📱 ${p.name} (${p.stock})`, `detail_${p.id}`)]);
    ctx.editMessageText("📦 **DAFTAR NOMOR TERSEDIA**\n\nPilih nomor yang ingin Anda beli:", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
});

bot.action(/detail_(\d+)/, (ctx) => {
    const product = storeData.products.find(p => p.id == ctx.match[1]);
    ctx.editMessageText(`
📝 **DETAIL PRODUK**
━━━━━━━━━━━━━━━
👤 **Nama:** ${product.name}
💰 **Harga:** Rp${product.price}
📊 **Stok:** ${product.stock}
📜 **Desc:** ${product.desc}
━━━━━━━━━━━━━━━`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🛒 BELI SEKARANG', `buy_${product.id}`)],
            [Markup.button.callback('⬅️ KEMBALI', 'order_menu')]
        ])
    });
});

// --- OWNER COMMAND ---
bot.command('owner', (ctx) => {
    if (ctx.from.id !== OWNER_ID) return ctx.reply("🚫 Akses Ditolak!");
    ctx.reply("👨‍💻 **ADMIN PANEL**\nSilahkan pilih aksi:", Markup.inlineKeyboard([
        [Markup.button.callback('➕ ADD NOMOR BARU', 'start_add_flow')],
        [Markup.button.callback('🗑️ RESET DATA', 'reset_data')]
    ]));
});

bot.action('start_add_flow', (ctx) => {
    ctx.deleteMessage();
    ctx.scene.enter('ADD_NUMBER_SCENE');
});

bot.launch().then(() => console.log("Bot Full Work Started!"));
