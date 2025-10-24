if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
} 
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Ініціалізація бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// URL webhook n8n
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_GET_ACCESS_URL = process.env.N8N_WEBHOOK_GET_ACCESS_URL;
const N8N_WEBHOOK_GET_FILE_STRUCTURE = process.env.N8N_WEBHOOK_GET_FILE_STRUCTURE;
const N8N_WEBHOOK_GET_FILE_MENU = process.env.N8N_WEBHOOK_GET_FILE_MENU;

console.log('🤖 Бот запущено!');

// Обробка всіх повідомлень
bot.onText(/\/start/, async (msg) => {
    try {
        const response = await axios.post(N8N_WEBHOOK_GET_ACCESS_URL, {
            message: msg
        }); 

        console.log('✅ Дані відправлено в n8n:', response.status);

    } catch {
        console.error('❌ Помилка при відправці в n8n:', error.message);
        bot.sendMessage(msg.chat.id, '❌ Помилка обробки повідомлення');
    }
})

bot.onText("Завантажити файл 📨", async (msg) => {
    // try {
    //     const response = await axios.post(N8N_WEBHOOK_GET_FILE_STRUCTURE, {
    //         message: msg
    //     }); 

    //     console.log('✅ Дані відправлено в n8n:', response.status);

    // } catch {
    //     console.error('❌ Помилка при відправці в n8n:', error.message);
    //     bot.sendMessage(msg.chat.id, '❌ Помилка обробки повідомлення');
    // }

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
})


bot.on('callback_query', async (query) => {
    const data = query.data;
    const chatId = query.message.chat.id;
    
    // Прибираємо "загрузка"
    await bot.answerCallbackQuery(query.id);
    
    if (data === 'menu_cmd_folder_1') {
        bot.sendMessage(chatId, '📁 Ви обрали Папку 1');
    } 
    else if (data === 'menu_cmd_folder_2') {
        bot.sendMessage(chatId, '📁 Ви обрали Папку 2');
    }
    else if (data === 'menu_cmd_file_1') {
        bot.sendMessage(chatId, '📄 Ви обрали Файл 1');
    }
    else if (data === 'menu_cmd_settings') {
        bot.sendMessage(chatId, '⚙️ Налаштування...');
    }
    else if (data === 'menu_cmd_close') {
        // Видаляємо повідомлення з кнопками
        bot.deleteMessage(chatId, query.message.message_id);
    }
});

/*
bot.on('message', async (msg) => {
  console.log('📩 Отримано повідомлення:', msg);
  
  try {
    // Відправка даних в n8n
    const response = await axios.post(N8N_WEBHOOK_URL, {
      message: msg
    });
    
    console.log('✅ Дані відправлено в n8n:', response.status);
    
    // Відправка підтвердження користувачу
    bot.sendMessage(msg.chat.id, '✅ Повідомлення отримано та відправлено в n8n!');
    
  } catch (error) {
    console.error('❌ Помилка при відправці в n8n:', error.message);
    bot.sendMessage(msg.chat.id, '❌ Помилка обробки повідомлення');
  }
});
*/

// Простий HTTP сервер для Railway
app.get('/', (req, res) => {
  res.send('🤖 Telegram Bot is running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порту ${PORT}`);
});