if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// ІНІЦІАЛІЗАЦІЯ БОТА З POLLING
// ======================================
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: {
        interval: 300,      // Інтервал опитування (мс)
        autoStart: true,    // Автостарт
        params: {
            timeout: 10     // Таймаут long polling (сек)
        }
    }
});

// URL для n8n webhooks
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_GET_ACCESS_URL = process.env.N8N_WEBHOOK_GET_ACCESS_URL;
const N8N_WEBHOOK_GET_FILE_STRUCTURE = process.env.N8N_WEBHOOK_GET_FILE_STRUCTURE;
const N8N_WEBHOOK_GET_FILE_MENU = process.env.N8N_WEBHOOK_GET_FILE_MENU;

console.log('🤖 Бот запущено!');
console.log('📡 Polling активний:', bot.isPolling());

// ======================================
// ВИДАЛЕННЯ WEBHOOK (КРИТИЧНО!)
// ======================================
bot.deleteWebHook({ drop_pending_updates: true }).then((result) => {
    console.log('✅ Webhook видалено:', result);
}).catch(err => {
    console.error('⚠️ Помилка видалення webhook:', err.message);
});

// Перевірка статусу webhook через 2 секунди
setTimeout(async () => {
    try {
        const info = await bot.getWebHookInfo();
        console.log('📊 Webhook Info:', JSON.stringify(info, null, 2));
        
        if (info.url) {
            console.log('⚠️ УВАГА! Webhook активний:', info.url);
            console.log('🔄 Видаляємо повторно...');
            await bot.deleteWebHook({ drop_pending_updates: true });
        } else {
            console.log('✅ Webhook відсутній - polling працює');
        }
    } catch (err) {
        console.error('❌ Помилка перевірки webhook:', err.message);
    }
}, 2000);

// ======================================
// ОБРОБКА ПОМИЛОК POLLING
// ======================================
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.code, error.message);
    
    // Якщо конфлікт з webhook - видаляємо його
    if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        console.log('🔄 Конфлікт webhook виявлено! Видаляємо...');
        bot.deleteWebHook({ drop_pending_updates: true }).then(() => {
            console.log('✅ Webhook видалено після конфлікту');
        });
    }
});

// ======================================
// КОМАНДА /start
// ======================================
bot.onText(/\/start/, async (msg) => {
    console.log('▶️ /start від:', msg.from.first_name, msg.from.id);
    
    const chatId = msg.chat.id;
    
    try {
        // Відправка в n8n (якщо потрібно)
        if (N8N_WEBHOOK_GET_ACCESS_URL) {
            const response = await axios.post(N8N_WEBHOOK_GET_ACCESS_URL, {
                message: msg
            });
            console.log('✅ Дані /start відправлено в n8n:', response.status);
        }
        
        // Відповідь користувачу
        bot.sendMessage(chatId, 
            '👋 Привіт! Я бот для роботи з файлами.\n\n' +
            'Використовуйте команди:\n' +
            '/menu - Головне меню\n' +
            '/help - Допомога'
        );
        
    } catch (error) {
        console.error('❌ Помилка /start:', error.message);
        bot.sendMessage(chatId, '❌ Помилка обробки команди');
    }
});

// ======================================
// КОМАНДА /menu
// ======================================
bot.onText(/\/menu/, (msg) => {
    console.log('📋 /menu від:', msg.from.first_name);
    
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, '📁 Головне меню:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📁 Папка 1', callback_data: 'menu_cmd_folder_1' },
                    { text: '📁 Папка 2', callback_data: 'menu_cmd_folder_2' }
                ],
                [
                    { text: '📄 Файл 1', callback_data: 'menu_cmd_file_1' }
                ],
                [
                    { text: '⚙️ Налаштування', callback_data: 'menu_cmd_settings' },
                    { text: '❌ Закрити', callback_data: 'menu_cmd_close' }
                ]
            ]
        }
    });
});

// ======================================
// ТЕКСТ "Завантажити файл 📨"
// ======================================
bot.onText(/Завантажити файл/, (msg) => {
    console.log('📨 "Завантажити файл" від:', msg.from.first_name);
    
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, 'Оберіть опцію:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📁 Папка 1', callback_data: 'menu_cmd_folder_1' },
                    { text: '📁 Папка 2', callback_data: 'menu_cmd_folder_2' }
                ],
                [
                    { text: '📄 Файл 1', callback_data: 'menu_cmd_file_1' }
                ],
                [
                    { text: '⚙️ Налаштування', callback_data: 'menu_cmd_settings' },
                    { text: '❌ Закрити', callback_data: 'menu_cmd_close' }
                ]
            ]
        }
    });
});

// ======================================
// ОБРОБКА CALLBACK_QUERY (КНОПКИ)
// ======================================
bot.on('callback_query', async (query) => {
    console.log('=================================');
    console.log('🔔 CALLBACK_QUERY');
    console.log('ID:', query.id);
    console.log('Data:', query.data);
    console.log('User:', query.from.first_name, query.from.id);
    console.log('=================================');
    
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    
    try {
        // ⚠️ КРИТИЧНО: Відповідаємо на callback (прибирає "загрузка")
        await bot.answerCallbackQuery(query.id);
        console.log('✅ answerCallbackQuery відправлено');
        
        // Обробка різних кнопок
        if (data === 'menu_cmd_folder_1') {
            console.log('→ Папка 1');
            bot.sendMessage(chatId, '📁 Ви обрали Папку 1\n\nТут будуть файли...');
            
            // Відправка в n8n (якщо потрібно)
            if (N8N_WEBHOOK_GET_FILE_MENU) {
                await axios.post(N8N_WEBHOOK_GET_FILE_MENU, {
                    action: 'folder_1',
                    user: query.from
                });
            }
        }
        else if (data === 'menu_cmd_folder_2') {
            console.log('→ Папка 2');
            bot.sendMessage(chatId, '📁 Ви обрали Папку 2\n\nТут будуть файли...');
            
            if (N8N_WEBHOOK_GET_FILE_MENU) {
                await axios.post(N8N_WEBHOOK_GET_FILE_MENU, {
                    action: 'folder_2',
                    user: query.from
                });
            }
        }
        else if (data === 'menu_cmd_file_1') {
            console.log('→ Файл 1');
            bot.sendMessage(chatId, '📄 Ви обрали Файл 1\n\n📥 Завантажую...');
        }
        else if (data === 'menu_cmd_settings') {
            console.log('→ Налаштування');
            
            // Редагуємо повідомлення з новими кнопками
            bot.editMessageText('⚙️ Налаштування:', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔔 Сповіщення', callback_data: 'settings_notifications' }
                        ],
                        [
                            { text: '🌐 Мова', callback_data: 'settings_language' }
                        ],
                        [
                            { text: '⬅️ Назад', callback_data: 'back_to_main' }
                        ]
                    ]
                }
            });
        }
        else if (data === 'menu_cmd_close') {
            console.log('→ Закрити меню');
            bot.deleteMessage(chatId, messageId);
            bot.sendMessage(chatId, '✅ Меню закрито');
        }
        else if (data === 'back_to_main') {
            console.log('→ Назад до головного меню');
            
            bot.editMessageText('📁 Головне меню:', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📁 Папка 1', callback_data: 'menu_cmd_folder_1' },
                            { text: '📁 Папка 2', callback_data: 'menu_cmd_folder_2' }
                        ],
                        [
                            { text: '📄 Файл 1', callback_data: 'menu_cmd_file_1' }
                        ],
                        [
                            { text: '⚙️ Налаштування', callback_data: 'menu_cmd_settings' },
                            { text: '❌ Закрити', callback_data: 'menu_cmd_close' }
                        ]
                    ]
                }
            });
        }
        else {
            console.log('⚠️ Невідома команда callback:', data);
            bot.sendMessage(chatId, '⚠️ Невідома команда');
        }
        
    } catch (error) {
        console.error('❌ Помилка callback_query:', error.message);
        bot.sendMessage(chatId, '❌ Помилка обробки');
    }
});

// ======================================
// ОБРОБКА ЗВИЧАЙНИХ ТЕКСТОВИХ ПОВІДОМЛЕНЬ
// ======================================
bot.on('text', async (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    // Ігноруємо команди (вони обробляються окремо)
    if (text.startsWith('/')) return;
    
    // Ігноруємо "Завантажити файл" (обробляється окремо)
    if (text.includes('Завантажити файл')) return;
    
    console.log('📩 Текст від', msg.from.first_name + ':', text);
    
    // Можна відправити в n8n для обробки
    if (N8N_WEBHOOK_URL) {
        try {
            await axios.post(N8N_WEBHOOK_URL, {
                message: msg
            });
            console.log('✅ Повідомлення відправлено в n8n');
        } catch (error) {
            console.error('❌ Помилка n8n:', error.message);
        }
    }
    
    // Відповідь користувачу
    bot.sendMessage(chatId, `Ви написали: "${text}"\n\nВикористовуйте /menu для відкриття меню`);
});

// ======================================
// ОБРОБКА ФОТО
// ======================================
bot.on('photo', async (msg) => {
    console.log('📸 Фото від:', msg.from.first_name);
    
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, '📸 Фото отримано!\n\n📤 Обробляю...');
    
    // Відправка в n8n якщо потрібно
    if (N8N_WEBHOOK_URL) {
        try {
            await axios.post(N8N_WEBHOOK_URL, {
                type: 'photo',
                message: msg
            });
        } catch (error) {
            console.error('❌ Помилка n8n:', error.message);
        }
    }
});

// ======================================
// ОБРОБКА ДОКУМЕНТІВ
// ======================================
bot.on('document', async (msg) => {
    console.log('📄 Документ від:', msg.from.first_name);
    
    const chatId = msg.chat.id;
    const fileName = msg.document.file_name;
    
    bot.sendMessage(chatId, `📄 Документ "${fileName}" отримано!\n\n📤 Обробляю...`);
    
    // Відправка в n8n якщо потрібно
    if (N8N_WEBHOOK_URL) {
        try {
            await axios.post(N8N_WEBHOOK_URL, {
                type: 'document',
                message: msg
            });
        } catch (error) {
            console.error('❌ Помилка n8n:', error.message);
        }
    }
});

// ======================================
// HTTP СЕРВЕР ДЛЯ RAILWAY
// ======================================
app.get('/', (req, res) => {
    res.send(`
        <h1>🤖 Telegram Bot is running!</h1>
        <p>Polling: ${bot.isPolling()}</p>
        <p>Time: ${new Date().toISOString()}</p>
    `);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        polling: bot.isPolling(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

// ======================================
// GRACEFUL SHUTDOWN
// ======================================
process.on('SIGINT', () => {
    console.log('🛑 Зупинка бота...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Зупинка бота...');
    bot.stopPolling();
    process.exit(0);
});