import TelegramBot from "node-telegram-bot-api";
import { config } from "dotenv";

config()
const API_KEY_BOT = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(API_KEY_BOT, { polling: true })


const gameOption = {
  reply_markup: {
    inline_keyboard: [
      [{text: '7', callback_data:'7'},{text: '8', callback_data:'8'},{text: '9', callback_data:'9'}],
      [{text: '4', callback_data:'4'},{text: '5', callback_data:'5'},{text: '6', callback_data:'6'}],
      [{text: '1', callback_data:'1'},{text: '2', callback_data:'2'},{text: '3', callback_data:'3'}],
      [{text: '0', callback_data:'0'}]
    ]
  }
}
function start() {
  const chats ={}
  bot.setMyCommands([
    { command: '/start', description: 'Running a bot' },
    { command: '/game', description: 'Game' }
  ])

  bot.on('message', async msg => {
    const text = msg.text;
    const chatId = msg.chat.id;
   
    if (text === '/start') {
      return await bot.sendMessage(chatId, `You wrote to me ${text}`)
    }
    if (text === '/game') {
      await bot.sendMessage(chatId, 'Now I will guess a number from 0-9')
      const randomNumber = Math.floor(Math.random()*10);
      chats[chatId] = randomNumber;
      console.log(gameOption);
      
      return await bot.sendMessage(chatId,"Guess", gameOption)
    }

    return await bot.sendMessage(chatId, 'I dont understand you')
  })

  bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    console.log(callbackQuery);
    bot.answerCallbackQuery(callbackQuery.id, {
        text: "It's working"
    })
  });
}
start()