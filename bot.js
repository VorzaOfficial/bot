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

// nih code nya