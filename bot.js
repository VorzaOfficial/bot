bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = String(query.from.id);
    const nama = query.from.first_name || 'User';
    const data = query.data;
    const isAdmin = userId === String(config.ownerId);

    bot.answerCallbackQuery(query.id); 

    if (data === 'close_menu') { bot.deleteMessage(chatId, query.message.message_id).catch(()=>{}); }
    
    // PILIHAN DEPOSIT CUSTOM
    if (data === 'depo_custom') {
        let db = loadDB(); db.users[userId].state = 'wait_depo_nominal'; saveDB(db);
        bot.deleteMessage(chatId, query.message.message_id).catch(()=>{});
        bot.sendMessage(chatId, "📝 <b>Silakan ketik nominal deposit Anda:</b>\n*(Contoh: 15000 atau 25000)*", { parse_mode: 'HTML', reply_markup: { keyboard: [[{text: '❌ Batal Deposit'}]], resize_keyboard: true } });
    }

    // PILIHAN DEPOSIT FIXED
    if (data.startsWith('deposelect_')) {
        const nominal = parseInt(data.split('_')[1]);
        let db = loadDB(); db.users[userId].pendingDepo = nominal; db.users[userId].state = 'wait_proof'; saveDB(db);
        bot.deleteMessage(chatId, query.message.message_id).catch(()=>{});
        sendPaymentInstruction(chatId, nominal);
    }

    if (data.startsWith('acc_') && isAdmin) {
        const parts = data.split('_'); const targetUser = parts[1]; const nominal = parseInt(parts[2]);
        let db = loadDB();
        if(db.users[targetUser]) {
            db.users[targetUser].saldo += nominal; saveDB(db);
            // LOG DEPOSIT DI ACC ADMIN
            bot.editMessageCaption(`${P_EMOJI.check} <b>SUKSES ACC!</b> Saldo ${toRupiah(nominal)} telah ditambahkan ke <code>${targetUser}</code>`, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'HTML' });
            
            // LOG NOTIF MERIAH KE USER
            const notifUser = `${P_EMOJI.party} <b>DEPOSIT BERHASIL DISETUJUI!</b> ${P_EMOJI.party}\n${DIVIDER}\n\n<blockquote>💸 <b>Nominal Masuk:</b> ${toRupiah(nominal)}\n💰 <b>Saldo Saat Ini:</b> ${toRupiah(db.users[targetUser].saldo)}</blockquote>\n\n${P_EMOJI.rocket} <i>Terima kasih telah topup! Saldo sudah siap digunakan untuk membeli akun.</i>`;
            bot.sendMessage(targetUser, notifUser, {parse_mode: 'HTML'});
            
          const waktu = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
          });
          const RdXMsg = `${P_EMOJI.party} <b>DEPOSIT BERHASIL</b> ${P_EMOJI.party}\n\n<blockquote>💸 <b>Nominal Deposit: ${toRupiah(nominal)}</b>\n💰 <b>Saldo Saat Ini: ${toRupiah(db.users[targetUser].saldo)}</b>\n<b>👤 Buyer: ${query.from.username || "No Name"}\n🕐 Waktu: ${waktu}</b></blockquote>\n\n<b><i>✅ Saldo Buyer Sudah Ditambahkan otomatis.</i></b>`;
          const logOptions = {
            parse_mode: "HTML", 
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🚀 Deposit Sekarang", 
                      url: `https://t.me/${config.botUsername.replace('@', '')}?start=start`, 
                      style: "success"
                    }
                  ]
                ]
              }
            };
          
          if (config.channelLog) {
            bot.sendMessage(config.channelLog, RdXMsg, logOptions).catch(()=>{});
          }
          if (config.channelLog2) {
                bot.sendMessage(config.channelLog2, logChannel, logOptions).catch(()=>{});
          }
          if (config.channelLog3) {
                bot.sendMessage(config.channelLog3, logChannel, logOptions).catch(()=>{});
          }
        }
    }
    if (data.startsWith('reject_') && isAdmin) {
        const targetUser = data.split('_')[1];
        bot.editMessageCaption(`❌ <b>DITOLAK ADMIN</b>\n<b>Bukti Transfer Harus yang jelas!</b>`, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'HTML' });
        bot.sendMessage(targetUser, `${P_EMOJI.warn} <b>DEPOSIT DITOLAK</b>\nMohon maaf, bukti transfer Anda ditolak oleh Admin. Pastikan foto jelas dan transfer sesuai nominal. Hubungi CS untuk bantuan.`, {parse_mode: 'HTML'});
    }

    // MENU ADMIN INLINE
    if (isAdmin) {
        if (data === 'admin_stats') {
            let db = loadDB(); 
            const usersArray = Object.values(db.users);
            
            let totalUser = usersArray.length;
            let totalSaldoEndap = 0;
            let totalTransaksi = 0;
            let totalOmzet = 0;

            usersArray.forEach(user => {
                totalSaldoEndap += user.saldo;
                totalTransaksi += user.orders.length;
                user.orders.forEach(order => {
                    if (config.hargaAkun[order.kategori]) {
                        totalOmzet += config.hargaAkun[order.kategori];
                    }
                });
            });

            const statsMsg = `${P_EMOJI.stats} <b>LAPORAN STATISTIK BISNIS</b> ${P_EMOJI.stats}\n${DIVIDER}\n\n👥 <b>Total Pengguna:</b> ${totalUser} User\n🛒 <b>Total Akun Terjual:</b> ${totalTransaksi} Transaksi\n\n${P_EMOJI.money} <b>Estimasi Omzet Kotor:</b> ${toRupiah(totalOmzet)}\n💳 <b>Total Saldo Mengendap:</b> ${toRupiah(totalSaldoEndap)}\n\n<i>*Omzet dihitung berdasarkan riwayat transaksi dan harga kategori saat ini.</i>`;
            bot.sendMessage(chatId, statsMsg, {parse_mode: 'HTML'});
        }
        if (data === 'admin_stock') {
            const stocks = loadStock(); let txt = `📦 <b>DETAIL STOK SAAT INI:</b>\n\n`;
            for(let kat in config.hargaAkun) txt += `${P_EMOJI.check} ${kat}: <b>${(stocks[kat] || []).length} Akun</b>\n`;
            bot.sendMessage(chatId, txt, {parse_mode: 'HTML'});
        }
        if (data === 'admin_bc') {
            let db = loadDB(); db.users[userId].state = 'wait_bc'; saveDB(db);
            bot.sendMessage(chatId, `${P_EMOJI.broadcast} <b>BROADCAST PESAN</b>\n\nSilakan ketik pesan yang ingin Anda kirimkan ke seluruh pengguna bot.\n\n*(Ketik ❌ Batal untuk membatalkan)*`, {parse_mode: 'HTML', reply_markup: { keyboard: [[{text: '❌ Batal'}]], resize_keyboard: true }});
        }
        if (data === 'admin_addstock_auto') {
            let catButtons = []; let row = [];
            for (let kat in config.hargaAkun) {
                row.push({ text: `📁 ${kat}`, callback_data: `setkat_${kat}`, style: 'primary' });
                if(row.length === 2) { catButtons.push(row); row = []; }
            }
            if(row.length > 0) catButtons.push(row);
            bot.sendMessage(chatId, "➕ <b>PILIH KATEGORI STOK</b>", {parse_mode: 'HTML', reply_markup: { inline_keyboard: catButtons }});
        }
        if (data.startsWith('setkat_')) {
            const kat = data.split('_')[1]; authStates[userId] = { kategori: kat };
            let db = loadDB(); db.users[userId].state = 'wait_addstock_phone'; saveDB(db);
            bot.sendMessage(chatId, `📱 <b>KATEGORI: ${kat}</b>\nKirim Nomor HP (Contoh: <b>+62812...</b>)`, {parse_mode: 'HTML', reply_markup: { keyboard: [[{text: '❌ Batal'}]], resize_keyboard: true }});
        }
    }

    // === PROSES USER BELI AKUN ===
    if (data.startsWith('buy_') && data !== 'buy_bulk') {
        const kategori = data.split('_')[1];
        let db = loadDB(); 
        let stocks = loadStock();

        if (!stocks[kategori] || stocks[kategori].length === 0) return bot.sendMessage(chatId, `<b>❌ Yah Stok ${kategori} sedang kosong</b>\n\n<i>Hubungi Owner untuk segera restock sekarang.</i>`, 
          { 
            parse_mode: "HTML", 
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Hubungi Owner (untuk restock)", 
                      url: `https://t.me/${config.supportUsername.replace('@', '')}`, 
                      style: "success"
                    }
                  ]
                ]
              }
            }
          );
        
        if (db.users[userId].saldo < config.hargaAkun[kategori]) return bot.answerCallbackQuery(query.id, {text: `❌ Saldo kurang! Harga: ${toRupiah(config.hargaAkun[kategori])}\nIsi Saldo Terlebih dahulu.`, show_alert: true});

        db.users[userId].saldo -= config.hargaAkun[kategori];
        const akunData = stocks[kategori].shift(); 
        const parts = akunData.split('|');
        const phone = parts[0]; 
        const sessionStr = parts[1]; 
        const pw = parts[2] || "Tidak Ada, Nomor tersebut tidak ada password";
        
        const orderTimeISO = new Date().toISOString();
        db.users[userId].orders.push({ kategori, phone, sessionStr, pw, waktu: orderTimeISO });
        saveDB(db); saveStock(stocks);

        bot.sendMessage(chatId, `${P_EMOJI.check} <b>PEMBELIAN BERHASIL!</b>\n\nTerima kasih! Sisa Saldo: <b>${toRupiah(db.users[userId].saldo)}</b>\n\n📱 <b>Nomor Telegram:</b>\n<code>${phone}</code>\n${P_EMOJI.lock} <b>Password 2FA:</b> <code>${pw}</code>\n\n👉 <i>Login ke Telegram sekarang, lalu klik tombol <b>📩 Tarik OTP</b>. Jika sudah sukses masuk, klik <b>🔴 Hapus Sesi Bot</b> agar akun Anda aman 100%.</i>`, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [
                [{ text: '📩 Tarik OTP Telegram', callback_data: `otp_${userId}_${db.users[userId].orders.length - 1}`, style: 'success' }]
            ]}
        });

        // LOG LAPORAN OWNER (PRIVATE)
        const notifOwner = `${P_EMOJI.cart} <b>LAPORAN PEMBELIAN BARU</b> ${P_EMOJI.cart}\n${DIVIDER}\n\n👤 Pembeli: <a href="tg://user?id=${userId}">${nama}</a> (<code>${userId}</code>)\n📂 Kategori: <b>${kategori}</b>\n📱 Nomor: <code>${phone}</code>\n💸 Harga: <b>${toRupiah(config.hargaAkun[kategori])}</b>\n\n<i>Sisa Stok ${kategori}: ${stocks[kategori].length} Akun</i>`;
        bot.sendMessage(config.ownerId, notifOwner, {parse_mode: 'HTML'}).catch(()=>{});

        // LOG CHANNEL SOLD OUT MERIAH KE 2 CHANNEL
        if (config.channelLog) {
            const maskedPhone = phone.length > 8 ? phone.substring(0, 6) + "****" + phone.substring(phone.length - 3) : phone;
            const botUserUrl = `https://t.me/${config.botUsername.replace('@', '')}?start=start`;
            const ownerUrl = `https://t.me/${config.supportUsername.replace('@', '')}`;
            const waktu = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta"
        });
            
            const logChannel = `${P_EMOJI.party} <b>ORDERAN NOKTEL BERHASIL!</b> ${P_EMOJI.party}\n${DIVIDER}\n\n<blockquote>${P_EMOJI.cart} <b>Detail Pesanan:</b>\n👤 Pembeli: <b>${nama}</b>\n📂 Kategori: <b>${kategori}</b>\n📱 Nomor: <code>${maskedPhone || "-"}</code>\n${P_EMOJI.money} Harga: <b>${toRupiah(config.hargaAkun[kategori])}</b>\n📦 Sisa Stok: <b>${stocks[kategori].length} Akun</b>\n<b>🕐 Waktu: ${waktu}</b></blockquote>`;
            
            const logOptions = {
                parse_mode: 'HTML', disable_web_page_preview: true,
                reply_markup: { 
                    inline_keyboard: [
                      [
                        {
                          text: "🚀 Order Sekarang!", 
                          url: botUserUrl, 
                          style: 'success'
                        }
                      ]
                    ] 
                }
            };

            bot.sendMessage(config.channelLog, logChannel, logOptions).catch(()=>{});
            
            // Kirim ke Channel ke-2 jika ada
            if (config.channelLog2) {
                bot.sendMessage(config.channelLog2, logChannel, logOptions).catch(()=>{});
            }
            if (config.channelLog3) {
                bot.sendMessage(config.channelLog3, logChannel, logOptions).catch(()=>{});
            }
           const filesToBackup = ['./database.json', './stock.json'];
        for (const file of filesToBackup) {
            if (fs.existsSync(file)) {
                await bot.sendDocument(config.ownerId, file, {caption: `Backup: ${file}`}).catch(()=>{});
        }
      }
    }
}

    if (data === 'buy_bulk') bot.sendMessage(chatId, "💬 Ingin memborong? Hubungi admin di " + config.supportUsername);

    // === USER TARIK OTP ===
    if (data.startsWith('otp_')) {
        const parts = data.split('_');
        if (parts[1] !== userId) return bot.answerCallbackQuery(query.id, {text: "⚠️ Ini pesanan orang lain!", show_alert: true});
        
        const orderIndex = parseInt(parts[2]);
        let db = loadDB(); const orderInfo = db.users[userId].orders[orderIndex];
        if (!orderInfo || !orderInfo.sessionStr) return bot.answerCallbackQuery(query.id, {text: "❌ Sesi bot sudah dihapus/tidak valid.", show_alert: true});

        const loadingMsg = await bot.sendMessage(chatId, "⏳ <i>Menarik OTP dari server Telegram, mohon tunggu...</i>", {parse_mode: 'HTML'});

        const otpCode = await fetchOTP(orderInfo.sessionStr, orderInfo.waktu);
        
        if (otpCode.length === 5 && !isNaN(otpCode)) {
            const safeOtp = otpCode.split('').join(' ');
            await bot.editMessageText(`📩 <b>KODE OTP TELEGRAM:</b>\n\n👉 <code>${safeOtp}</code> 👈\n\n(Hapus spasi saat memasukkan ke Telegram)\n\nSilahkan Pencet <b>🔴 Hapus Sesi Bot (Logout)</b> Untuk logout otomatis melalui bot.`, {
    chat_id: chatId,
      message_id: loadingMsg.message_id,
        parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Salin Code OTP",
                  copy_text: { text: safeOtp }, 
                  style: "success"
                }
              ],
              [
                { 
                  text: '🔴 Hapus Sesi Bot (Logout)', 
                  callback_data: `logoutbot_${userId}_${db.users[userId].orders.length - 1}`, 
                  style: 'danger' 
                }
              ]
            ]
          }
        }
      );
        } else {
            await bot.editMessageText(otpCode, {
                chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'HTML'
            });
        }
    }

    // === USER HAPUS SESI BOT (LOGOUT) ===
    if (data.startsWith('logoutbot_')) {
        const parts = data.split('_');
        if (parts[1] !== userId) return bot.answerCallbackQuery(query.id, {text: "⚠️ Ini pesanan orang lain!", show_alert: true});
        
        const orderIndex = parseInt(parts[2]);
        let db = loadDB(); const orderInfo = db.users[userId].orders[orderIndex];
        if (!orderInfo || !orderInfo.sessionStr) return bot.answerCallbackQuery(query.id, {text: "✅ Sesi sudah terhapus sebelumnya.", show_alert: true});

        const loadingMsg = await bot.sendMessage(chatId, "⏳ <i>Sedang menghapus jejak bot dari akun...</i>", {parse_mode: 'HTML'});
        
        try {
            const client = new TelegramClient(new StringSession(orderInfo.sessionStr), config.apiId, config.apiHash, { connectionRetries: 1 });
            await client.connect();
            await client.invoke(new Api.auth.LogOut()); 
            await client.disconnect();
        } catch (e) {}

        db.users[userId].orders[orderIndex].sessionStr = null; saveDB(db);

        await bot.editMessageText(`${P_EMOJI.check} <b>SESI BOT BERHASIL DIHAPUS!</b>\n\nBot sudah memutus akses secara permanen dari akun tersebut. Akun sekarang 100% aman dan hanya ada di perangkat Anda.\n\n<b>${P_EMOJI.warn} Berikut Cara Mengamankan Akun:\n• Aktifkan Verifikasi 2 Langkah (A2F)\n• Aktifkan Kata Sandi\n• Aktifkan Email Pemulihan (Surel)</b>\n\n<blockquote><b>💫 Terimakasih Telah Membeli Akun Di ${config.botUsername}, jangan lupa order kembali!.</b></blockquote>`, {chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'HTML'});
    }
    
    if (data === "check_join") {
      try {
        const CHANNEL_USERNAME = config.channelLink || "@InformationNoktelVorza";
        const member = await bot.getChatMember(CHANNEL_USERNAME, query.from.id);
        const cek = ["member", "administrator", "creator"];
      if (cek.includes(member.status)) {
        await bot.answerCallbackQuery(query.id, {
          text: "✅ Verifikasi Berhasil! Terimakasih Telah Join Channel Kami.", 
          show_alert: true
        });
        
        await bot.deleteMessage(query.message.chat.id, query.message.message_id);
        
        return bot.sendMessage(query.message.chat.id, "✅ Terimakasih telah join channel kami, sekarang anda bisa memakai bot.");
      }
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Lu Belum Join Channel!", 
          show_alert: true
        });
          return bot.sendMessage(chatId, "<b>❌ Lu Belum Join Channel!!</b>", { parse_mode: "HTML" });
      } catch (err) {
        console.log(err.message);
      }
    }
  }); 
