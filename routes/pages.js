const { urlencoded, json } = require('body-parser');
const express = require("express");
const { request } = require("express");
const flash = require('connect-flash');
const session = require('express-session');
const MemoryStore = require('memorystore')(session)
const path = require("path");
const cors = require("cors");
const bodyParser = require('body-parser');
const adminloggedin = require("../controllers/adminloggedin");
const agentloggedin = require("../controllers/agentloggedin");
const router = express.Router();
router.use(urlencoded({ extended: true }));
router.use(json());
const db = require("./db-config");
const bcrypt = require("bcrypt");
const { OpenAI } = require('@langchain/openai');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { Translate } = require('@google-cloud/translate').v2;
// const chat = new ChatOpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo' },);

const { PineconeClient } = require('@pinecone-database/pinecone');
const { VectorDBQAChain, ConversationalRetrievalQAChain } = require('langchain/chains');
const { PDFLoader } = require('langchain/document_loaders/fs/pdf');
const { SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate } = require('@langchain/core/prompts');

const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
const { LLMChain } = require("langchain/chains");
const { BufferMemory } = require("langchain/memory");
const { formatDocumentsAsString } = require("langchain/util/document");
const { Document } = require("@langchain/core/documents");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");
const { BaseMessage } = require("@langchain/core/messages");
const { Pinecone } = require("@pinecone-database/pinecone");
const { PineconeStore } = require('@langchain/pinecone');
router.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  secret: 'keyboard cat'
}));
require('dotenv').config();
const Sequelize = require('sequelize');
const { DateTime } = require('luxon');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: "mysql",
  dialectModule: require('mysql2'),
});


const chat = new ChatOpenAI({ temperature: 0, modelName: 'gpt-3.5-turbo' },);



var GoldRates = sequelize.define('gold_rates', {
  gold_rate_22k: Sequelize.TEXT,
  old_gold_exchange_rate: Sequelize.TEXT,
  gold_coin_price: Sequelize.TEXT,
}, {
  timestamps: false, tableName: 'gold_rates'
});

var Agents = sequelize.define('other_agent_details', {
  user_id: Sequelize.INTEGER,
  name: Sequelize.TEXT,
  phone: Sequelize.TEXT,
  status: Sequelize.TEXT,
  profile_picture: Sequelize.TEXT
}, {
  timestamps: false, tableName: 'other_agent_details'
});

var ChatHeader = sequelize.define('live_agent_chat_header', {
  message_id: Sequelize.TEXT,
  agent: Sequelize.TEXT,
  language: Sequelize.TEXT,
  rating: Sequelize.TEXT,
  feedback: Sequelize.TEXT,
  status: Sequelize.TEXT
}, {
  timestamps: false, tableName: 'live_agent_chat_header'
});
var ChatTimer = sequelize.define('live_chat_timer', {
  message_id: Sequelize.TEXT,
  agent: Sequelize.TEXT,
  time: Sequelize.DOUBLE,
}, {
  timestamps: false, tableName: 'live_chat_timer'
});
var BotChats = sequelize.define('chat_bot_chats', {
  message_id: Sequelize.INTEGER,
  language: Sequelize.TEXT,
  message: Sequelize.TEXT,
  message_sent_by: Sequelize.TEXT,
}, {
  timestamps: false, tableName: 'chat_bot_chats'
});
var LiveChatChat = sequelize.define('live_agent_chat_chats', {
  message_id: Sequelize.TEXT,
  sent_by: Sequelize.TEXT,
  message: Sequelize.TEXT,
  sent_to_user: Sequelize.TEXT,
  viewed_by_agent: Sequelize.TEXT,
}, {
  timestamps: false, tableName: 'live_agent_chat_chats'
});
var VideoChats = sequelize.define('video_chat_history', {
  chat_id: Sequelize.TEXT,
  message: Sequelize.TEXT,
  sent_by: Sequelize.TEXT,
  viewed_by_admin: Sequelize.TEXT,
}, {
  tableName: 'video_chat_history'
});
var AudioChats = sequelize.define('audio_chat_history', {
  chat_id: Sequelize.TEXT,
  message: Sequelize.TEXT,
  sent_by: Sequelize.TEXT,
  viewed_by_admin: Sequelize.TEXT,
}, {
  tableName: 'audio_chat_history'
});
router.use(bodyParser.json());
router.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const translate = new Translate();
const client = new speech.SpeechClient();
const clienttext = new textToSpeech.TextToSpeechClient();
router.use(session({
  secret: 'flashblog',
  saveUninitialized: true,
  resave: true
}));
router.use(flash());
router.get('/', (req, res) => {
  res.render(path.join(__dirname, '../views/index.ejs'));
});
router.post('/test-audio', (req, res) => {
  /**
* TODO(developer): Uncomment the following lines before running the sample.
*/
  const encoding = 'LINEAR16';
  const sampleRateHertz = 16000;
  const languageCode = 'en-US';

  const request = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: false, // If you want interim results, set this to true
  };

  // Create a recognize stream
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', data =>
      process.stdout.write(
        data.results[0] && data.results[0].alternatives[0]
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : '\n\nReached transcription time limit, press Ctrl+C\n'
      )
    );

  // Start recording and send the microphone input to the Speech API.
  // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0,
      // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
      verbose: false,
      recordProgram: 'rec', // Try also "arecord" or "sox"
      silence: '10.0',
    })
    .stream()
    .on('error', console.error)
    .pipe(recognizeStream);
  var response_data = new Promise((resolve, reject) => {
    recognizeStream
      .on('data', data => {
        const transcript = data.results[0].alternatives[0].transcript;
        resolve(transcript);
      })
      .on('error', error => {
        console.error(error);
        reject(error);
      })
  });

  console.log('Listening, press Ctrl+C to stop.');
  console.log('Out Put : ' + recognizeStream);
  console.log('Response Data : ' + response_data);
  return res.json({ recognizeStream, response_data })
});
router.get('/admin', (req, res) => {
  res.render("admin-login.ejs")
});
router.get('/admin-dashboard', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    res.render("admin-dashboard.ejs", { admin_login_details: req.admin_login_details })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/add-admin', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    res.render("add-admin.ejs", { admin_login_details: req.admin_login_details })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/manage-admins', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    db.query('SELECT * FROM other_admin_details', function (err, admins) {
      if (err) throw err;
      res.render('manage-admins.ejs', { admins: admins, admin_login_details: req.admin_login_details });
    });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/edit-admin/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    db.query('SELECT * FROM other_admin_details WHERE user_id = ' + $user_id + '', function (err, admin_details) {
      if (err) throw err;
      db.query('SELECT * FROM users WHERE id = ' + $user_id + '', function (err2, login_details) {
        if (err2) throw err2;
        res.render('edit-admin.ejs', { admin_details: admin_details[0], login_details: login_details[0], admin_login_details: req.admin_login_details });
      });
    });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/deactivate-admin/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    db.query('UPDATE other_admin_details SET status = "inactive" WHERE user_id = "' + $user_id + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      db.query('UPDATE users SET status = "inactive" WHERE id = "' + $user_id + '"', async (Err3, result3) => {
        if (Err3) throw Err3;
        res.redirect("/manage-admins");
      })
    })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/activate-admin/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    db.query('UPDATE other_admin_details SET status = "active" WHERE user_id = "' + $user_id + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      db.query('UPDATE users SET status = "active" WHERE id = "' + $user_id + '"', async (Err3, result3) => {
        if (Err3) throw Err3;
        res.redirect("/manage-admins");
      })
    })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/add-agent', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    const successMessage = req.flash('success')[0];
    const errorMessage = req.flash('error')[0];
    res.render("add-agent.ejs", { admin_login_details: req.admin_login_details, successMessage: successMessage, errorMessage: errorMessage })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/manage-agents', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    db.query('SELECT * FROM other_agent_details', function (err, agents) {
      if (err) throw err;
      res.render('manage-agents.ejs', { agents: agents, admin_login_details: req.admin_login_details });
    });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/live-chat-history', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    res.render('live-chat-history.ejs', { admin_login_details: req.admin_login_details });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/view-agent-chats/:id', adminloggedin, async (req, res) => {
  if (req.admin_login_details) {
    $agent_id = req.params.id;
    const agent = await Agents.findAll({
      where: {
        user_id: $agent_id
      }
    });
    const chat_count = await ChatHeader.count({
      where: {
        agent: $agent_id
      }
    });
    const timer = await ChatTimer.findAll({
      where: {
        agent: $agent_id
      }
    });
    const chats = await ChatHeader.findAll({
      where: {
        agent: $agent_id
      }
    });
    res.render('view-agent-chats.ejs', { agent: agent, admin_login_details: req.admin_login_details, chat_count: chat_count, timer: timer, chats: chats });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/view-agent-feedbacks/:id', adminloggedin, async (req, res) => {
  if (req.admin_login_details) {
    $agent_id = req.params.id;
    const agent = await Agents.findAll({
      where: {
        user_id: $agent_id
      }
    });
    const chats = await ChatHeader.findAll({
      where: {
        agent: $agent_id,
        feedback: {
          [Sequelize.Op.ne]: null
        }
      }
    });
    res.render('view-agent-feedbacks.ejs', { agent: agent, admin_login_details: req.admin_login_details, chats: chats });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/edit-agent/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    const successMessage = req.flash('success2')[0];
    const errorMessage = req.flash('error2')[0];
    db.query('SELECT * FROM other_agent_details WHERE user_id = ' + $user_id + '', function (err, agent_details) {
      if (err) throw err;
      db.query('SELECT * FROM users WHERE id = ' + $user_id + '', function (err2, login_details) {
        if (err2) throw err2;
        db.query('SELECT * FROM agent_languages WHERE user_id = ' + $user_id + '', function (err3, languages) {
          if (err3) throw err3;
          res.render('edit-agent.ejs', { agent_details: agent_details[0], login_details: login_details[0], admin_login_details: req.admin_login_details, languages: languages, successMessage: successMessage, errorMessage: errorMessage });
        })

      });
    });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/deactivate-agent/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    db.query('UPDATE other_agent_details SET status = "inactive" WHERE user_id = "' + $user_id + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      db.query('UPDATE users SET status = "inactive" WHERE id = "' + $user_id + '"', async (Err3, result3) => {
        if (Err3) throw Err3;
        res.redirect("/manage-agents");
      })
    })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/activate-agent/:id', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    $user_id = req.params.id;
    db.query('UPDATE other_agent_details SET status = "active" WHERE user_id = "' + $user_id + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      db.query('UPDATE users SET status = "active" WHERE id = "' + $user_id + '"', async (Err3, result3) => {
        if (Err3) throw Err3;
        res.redirect("/manage-agents");
      })
    })
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/update-gold-rates', adminloggedin, async (req, res) => {
  if (req.admin_login_details) {
    const rates = await GoldRates.findOne({
      where: {
        id: 1
      }
    });
    res.render('update-gold-rates.ejs', { rates: rates, admin_login_details: req.admin_login_details });
  }
  else {
    res.redirect("/admin");
  }
});

router.get('/agent', (req, res) => {
  res.render("agent-login.ejs")
});
router.get('/agent-dashboard', agentloggedin, (req, res) => {
  if (req.agent_login_details) {
    res.render("agent-dashboard.ejs", { agent_login_details: req.agent_login_details })
  }
  else {
    res.redirect("/agent");
  }
});
router.get('/agent-profile/:id', agentloggedin, (req, res) => {
  if (req.agent_login_details) {
    $user_id = req.params.id;
    db.query('SELECT * FROM other_agent_details WHERE user_id = ' + $user_id + '', function (err, agent_details) {
      if (err) throw err;
      db.query('SELECT * FROM users WHERE id = ' + $user_id + '', function (err2, login_details) {
        if (err2) throw err2;
        res.render('agent-profile.ejs', { agent_details: agent_details[0], login_details: login_details[0], agent_login_details: req.agent_login_details });
      });
    });
  }
  else {
    res.redirect("/admin");
  }
});

// const data = {
//   "What is the price of 22kt gold sovereign (pawn | 8g) today?": `Dear Madam/Sir, The price of 22kt gold sovereign (pawn | 8g) is ${gold_rate_22k} as of today (${currentTime.toLocaleString(DateTime.TIME_SIMPLE)}). This doesn't include labor charges.
//   (T&C apply)

//   Thank you
//   `,
//   "Where are your showrooms located?": `Dear Madam/Sir, We have 3 showrooms. 
//   Bambalapitiya - No 173, Galle Road, Colombo 4.
//   Negombo - No 242, Main Street, Negombo.
//   Kandy - No 86, Colombo Street, Kandy.

//   Please contact us on 0112 586949 for more details.

//   Thank you
//   `,
//   "What are your opening hours?": `Dear Madam/Sir, Our hours are as below:
//   Bambalapitiya: 10.00 am till 6.15pm from Monday to Saturday (Open last Sunday till 4.00pm)
//   Negombo and Kandy: 10.00 am till 6.15pm from Monday to Saturday & 10.00am till 4.00pm on Sunday

//   Thank you
//   `,
//   "What is the rate for exchanging old gold jewelry?": `Dear Madam/Sir,
//   We exchange Old Gold jewellery for the rate of ${old_gold_exchange_rate} for 1 Sovereign. You can exchange Old Gold & buy new Items for that rate.

//   (Conditions apply)

//   Thank you        
//   `,
//   "What is the rate of one sovereign (pawn | 8g) gold coin today?": `Dear Madam/Sir,
//   We exchange Old Gold jewellery for the rate of ${gold_coin_price} for 1 Sovereign. You can exchange Old Gold & buy new Items for that rate.

//   (Conditions apply)

//   Thank you        
//   `,
//   "How can overseas customers connect with you?": `Dear Madam/Sir, 

//   Overseas customers can now connect with us from a virtual meeting.
//   Please click on the “Virtual Appointments”  icon and schedule a zoom meeting with us. One of our well-trained sales team members will reach you to assist you and discuss your requirements.

//   Thank you
//   `,
//   "Do you make custom-made jewelry?": `Yes we do.`,
//   "Can I get a quotation for a custom-made jewelry?": `Dear Madam/Sir,
//   Sorry, We don't share quotations from this. Please have an virtual meeting with us or kindly visit one of our main branches at Bambalapitiya, Negombo & Kandy to get a quotation. 

//   Thank you        
//   `,
// };

// const variables = {
//   "22ktGoldRate": gold_rate_22k,
//   "OldGoldExchangeRate": old_gold_exchange_rate,
//   "GoldCoinPrice": gold_coin_price
// }
router.post("/translate-to-english-api", async (req, res) => {
  const user_message = req.body.user_Message;
  const language = req.body.language;
  const id = req.body.chatId;
  let api_response = "";
  let selectedLanguage = 'en';

  if (language == 'Sinhala') {
    selectedLanguage = 'si'
  }
  else if (language === 'Arabic') {
    selectedLanguage = 'ar'
  }
  else if (language === 'Tamil') {
    selectedLanguage = 'ta'
  }
  else {
    selectedLanguage = 'en'
  }
  db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: user_message, message_sent_by: 'customer', viewed_by_admin: 'no' }, async (Err3, result3) => {
    if (Err3) throw Err3;

  });


  const answer = data[userQuestion];

  if (answer) {
    api_response = answer;
  }
  else{
    const model = new OpenAI(
      {
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.8
      }
  
    );
    try {
      let [translationsToEng] = await translate.translate(user_message, 'en');
      translationsToEng = Array.isArray(translationsToEng) ? translationsToEng : [translationsToEng];
      /** ===================================================== */
  
      const question = translationsToEng.toString();
      console.log("question : ", question);
  
      const promptInfoCheck = `Is "${question}" is asking about your name or asking about who developed you? if it is about name just say "name", if it is about your developer just say "developer", if it is not about name or developer just say "other" ? Do not use any other punctuation or words in the answer.`;
      // const resInfo = await model.call(promptInfoCheck);
      const resInfo =  await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: promptInfoCheck,
        temperature: 1.00,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        });
      console.log(resInfo.trim());
  
      if (resInfo.trim() === 'Name') {
        const nameTxt = "My name is Raja Jewellers GPT"
        console.log(nameTxt);
        api_response = nameTxt;
      }
      else if (resInfo.trim() === 'Developer') {
        const devTxt = "My developer is ABC Company"
        console.log(devTxt);
        api_response = devTxt;
      }
      else {
        const model2 = new OpenAI(
          {
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.8
          }
  
        );
        const promptGreetingCheck = `Is "${question}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`;
  
        const resGreet = await model2.call(promptGreetingCheck);
        console.log(resGreet);
  
        if (resGreet === "Yes") {
          const promptGreet = `Friendly reply to: ${question} and do Not ask any questions.`;
          const responseG = await model2.call(promptGreet);
          api_response = responseG;
        }
        else {
  
          const pinecone = new Pinecone();
          await pinecone.init({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
          });
          const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  
          const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings({}),
            { pineconeIndex, namespace: process.env.PINECONE_NAME_SPACE }
          );
  
          const model_buffer = new ChatOpenAI({
            temperature: 0.8,
            modelName: 'gpt-3.5-turbo-16k'
          });
  
          const chain = ConversationalRetrievalQAChain.fromLLM(
            model_buffer,
            vectorStore.asRetriever(),
            {
              memory: new BufferMemory({
                memoryKey: "chat_history",
              }),
            }
          );
  
          const responseLast = await chain.call({ question: `${question}` });
          api_response = responseLast.text;
  
        }
      }
  
  
  
      /** ===================================================== */
  
  
      try {
        let [responseToEng] = await translate.translate(api_response, selectedLanguage);
        responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
        db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          if (Err3) throw Err3;
  
        })
  
        return res.json({ status: "success", bot_reply: responseToEng.toString() });
  
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
      }
  
  
  
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error });
    }
  }
  
  
});
/*router.post("/translate-to-language",async(req, res)=>{
    const resultMessage = req.body.resultMessage;
    const language = req.body.language;
    const id = req.body.chatId;
    let selectedLanguage = 'en'

    if (language == 'Sinhala'){
        selectedLanguage = 'si'
    }
    else if(language === 'Tamil'){
        selectedLanguage = 'ta'
    }
    else{
        selectedLanguage = 'en'
    }
    
    try {
        let [translationsToEng] = await translate.translate(resultMessage, selectedLanguage);
        translationsToEng = Array.isArray(translationsToEng) ? translationsToEng : [translationsToEng];
        console.log(translationsToEng)
        res.json({ translationsToEng })
        db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:translationsToEng.join(' '), message_sent_by:'bot'}, async (Err3, result3) =>{
            if(Err3) throw Err3;
            
        })
        translationsToEng = '';
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})*/
router.get('/conversation-history', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    db.query('SELECT DISTINCT message_id FROM chat_bot_chats', function (err, chats) {
      if (err) throw err;
      res.render('conversation-history.ejs', { chats: chats, admin_login_details: req.admin_login_details });
    });
  }
  else {
    res.redirect("/admin");
  }
});
router.post("/live-chat-user", async (req, res) => {
  const user_message = req.body.user_Message;
  const chatId = req.body.chatId;
  const language = req.body.language;

  try {
    db.query('SELECT * FROM live_agent_chat_header WHERE message_id = ?', [chatId], async (Err, result) => {
      if (!result[0]) {
        db.query('INSERT INTO live_agent_chat_header SET ?', { message_id: chatId, agent: 'unassigned', language: language, status: 'live' }, async (Err2, result2) => {
          if (Err2) throw Err2;
          db.query('INSERT INTO live_agent_chat_chats SET ?', { message_id: chatId, sent_by: 'customer', message: user_message, viewed_by_agent: 'no' }, async (Err3, result3) => {
            if (Err3) throw Err3;
          })
        })
      }
      else {
        db.query('INSERT INTO live_agent_chat_chats SET ?', { message_id: chatId, sent_by: 'customer', message: user_message, viewed_by_agent: 'no' }, async (Err4, result4) => {
          if (Err4) throw Err4;
        })
      }
    })
    const success = "Added"
    res.json({ success })
  } catch (error) {

  }
})
router.post("/live-chat-agent", async (req, res) => {
  const chatId = req.body.chatId;

  try {
    db.query('SELECT * FROM live_agent_chat_header WHERE message_id = ? LIMIT 1', [chatId], function (err, chat_header_result) {
      if (err) throw err;
      db.query('SELECT * FROM live_agent_chat_chats WHERE message_id = ? AND sent_by = ? AND sent_to_user = ? ORDER BY id DESC LIMIT 1', [chatId, "agent", "no"], function (err2, chat_body_result) {
        if (err2) throw err2;
        if (chat_header_result[0]) {
          db.query('SELECT * FROM other_agent_details WHERE user_id = ? LIMIT 1', [chat_header_result[0].agent], function (err2, agent_details) {
            if (agent_details[0]) {
              var agent_name = agent_details[0].name;
              var profile_picture = agent_details[0].profile_picture;
            }
            else {
              var agent_name = null;
              var profile_picture = null;
            }
            if (chat_body_result[0]) {
              var agent_message = chat_body_result[0].message;
              db.query('UPDATE live_agent_chat_chats SET sent_to_user = "yes" WHERE id = "' + chat_body_result[0].id + '"', async (Err2, result2) => {
                if (Err2) throw Err2;
              });
            }
            else {
              var agent_message = null;
            }
            var agent_id = chat_header_result[0].agent;
            var chat_status = chat_header_result[0].status;
            var is_time_out = chat_header_result[0].is_time_out;
            res.json({ agent_id, chat_status, agent_message, agent_name, profile_picture, is_time_out });
          })

        }
        else {
          var agent_id = null;
          var chat_status = null;
          var agent_message = null;
          var agent_name = null;
          var profile_picture = null;
          var is_time_out = null;
          res.json({ agent_id, chat_status, agent_message, agent_name, profile_picture, is_time_out });
        }


      });

    });



  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
})
router.post("/save-rating", async (req, res) => {
  const ratingValue = req.body.ratingValue;
  const feedbackMessage = req.body.feedbackMessage;
  const chatId = req.body.chatId;

  try {
    db.query('UPDATE live_agent_chat_header SET rating = "' + ratingValue + '", feedback = "' + feedbackMessage + '" WHERE message_id = "' + chatId + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      res.json({ status: "success" })
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
})
router.get('/live-chats', agentloggedin, (req, res) => {
  if (req.agent_login_details) {
    db.query('SELECT * FROM live_agent_chat_header WHERE agent = ? AND status = ?', ['unassigned', 'live'], function (err, chats) {
      if (err) throw err;
      db.query('SELECT * FROM agent_languages WHERE user_id = ?', [req.agent_login_details.id], function (err2, languages) {
        if (err2) throw err2;
        res.render('live-chats.ejs', { chats: chats, agent_login_details: req.agent_login_details, languages: languages });
      })

    });
  }
  else {
    res.redirect("/agent");
  }
});
let transcript = '';
router.post("/recording-start", async (req, res) => {
  const chatId = req.body.chatId;
  const apiType = req.body.apiType;
  let userMessageTime = new Date().toLocaleTimeString()
  //res.json({ chatId, apiType, userMessageTime })
  try {
    if (!transcript) {
      transcript = await speechRecognition();
      console.log("Transcript =====> " + transcript);
    }
    //add transcript to db
    if (apiType == "video") {
      VideoChats.create({
        chat_id: chatId,
        message: transcript,
        sent_by: "customer",
        viewed_by_admin: "no",
      });
    }
    else {
      AudioChats.create({
        chat_id: chatId,
        message: transcript,
        sent_by: "customer",
        viewed_by_admin: "no",
      });
    }
    res.json({ transcript, userMessageTime, status: "success" })
    transcript = "";
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

})


const speechRecognition = async () => {
  //return "speech running";
  const encoding = 'LINEAR16';
  const sampleRateHertz = 16000;
  const languageCode = 'en-US';

  const request = {
    config: {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
    },
    interimResults: false,
  };

  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error);


  const recorderStream = recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0,
      endOnSilence: true,
      verbose: false,
      recordProgram: 'rec',
      silence: '10.0',
    })
    .stream()
    .on('error', console.error);

  recorderStream.pipe(recognizeStream);


  return new Promise((resolve, reject) => {
    recognizeStream
      .on('data', data => {
        const transcript = data.results[0].alternatives[0].transcript;
        resolve(transcript);
      })
      .on('error', error => {
        console.error(error);
        reject(error);
      })
  });
};

router.post("/get-video", async (req, res) => {
  const message = req.body.resultMessage;
  console.log("message from user : ", message);
  let avatarVideoId = '';
  let avatarVideoURL = '';

  try {
    const responseData = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        "accept": 'application/json',
        'Authorization': `Basic ${process.env.DID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "driver_url": "bank://lively",
        "script": {
          "provider": {
            "type": "microsoft",
            "voice_id": "Jenny"
          },
          "input": `${message}`,
          "type": "text"
        },
        "source_url": "https://clips-presenters.d-id.com/amy/image.png"
      })
    })
    const responseDataJson = await responseData.json();
    avatarVideoId = responseDataJson.id;
    console.log("first call id: ", avatarVideoId);
    url = `https://api.d-id.com/talks/${avatarVideoId}`
    console.log(url)

    // send second API request after 20 seconds
    setTimeout(async () => {
      const responseVideoData = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Basic ${process.env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      const responseVideoDataJson = await responseVideoData.json();
      console.log("url: ", responseVideoDataJson);
      avatarVideoURL = responseVideoDataJson.result_url;
      // avatarVideoURL = responseVideoDataJson.source_url;
      console.log("id result: ", responseVideoDataJson);
      console.log("avatarVideoURL: ", avatarVideoURL);
      console.log(responseVideoDataJson.result_url);
      res.json({ avatarVideoURL });
    }, 10000); // 20 seconds delay

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
})
router.post("/switch-to-live-agent", async (req, res) => {
  const chatId = req.body.chatId;

  try {
    const chat_main = await BotChats.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('language')), 'language'], 'message'],
      where: {
        message_id: chatId
      }
    });

    const chats = await BotChats.findAll({
      where: {
        message_id: chatId
      },
      order: [['id', 'ASC']]
    });

    ChatHeader.create({
      message_id: chatId,
      language: chat_main[0].language,
      status: "live",
      agent: "unassigned",
    })
    for (var c = 0; c < chats.length; c++) {

      LiveChatChat.create({
        message_id: chatId,
        sent_by: chats[c].message_sent_by,
        message: chats[c].message,

      })
    }
    BotChats.destroy({
      where: {
        message_id: chatId
      }
    })
    const success = "Success"
    res.json({ success })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
})
router.post("/video-chatGpt-response", async (req, res) => {
  const user_question = req.body.question;
  const chatId = req.body.chatId;
  var finalResponse;
  try {


    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Is "${user_question}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
      temperature: 0.8,
    });

    var info_result = completion.data.choices[0].text;
    if (info_result.toLowerCase().includes("name")) {
      finalResponse = "My name is DFCC GPT.";
    }
    else if (info_result.toLowerCase().includes("age")) {
      finalResponse = "I'm 20 years old";
    }
    else if (info_result.toLowerCase().includes("country")) {
      finalResponse = "I live in Sri Lanka";
    }
    else {
      const completion_2 = await openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt: `Is "${user_question}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
        temperature: 0.8,
      });
      var greeting_result = completion_2.data.choices[0].text;
      if (greeting_result.toLowerCase().includes("yes")) {
        const completion_3 = await openai.createCompletion({
          model: "gpt-3.5-turbo-instruct",
          prompt: `Simple Friendly reply to: ${translationsToEng}. Do not describe the greeting in the reply or ask questions.`,
          temperature: 0.8,
        });
        finalResponse = completion_3.data.choices[0].text;
      }
      else {
        const client = new PineconeClient();
        await client.init({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENVIRONMENT,
        });
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

        const vectorStore = await PineconeStore.fromExistingIndex(
          new OpenAIEmbeddings(),
          { pineconeIndex, namespace: process.env.PINECONE_NAME_SPACE }
        );

        const model = new OpenAI({
          temperature: 0,
          modelName: 'gpt-3.5-turbo',
        });
        const translationPrompt = ChatPromptTemplate.fromPromptMessages([
          SystemMessagePromptTemplate.fromTemplate(
            `You are an AI assistant providing helpful advice. You are given the following extracted parts of a long document and a question. Provide a conversational answer based on the context provided.
                      You should only provide hyperlinks that reference the context below. Do NOT make up hyperlinks.
                      If you can't find the answer in the context below, just say "Hmm, I'm not sure." Don't try to make up an answer.
                      If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.
                      
                      Question: {query}
                      =========
                      
                      =========
                      Answer in Markdown:`
          ),
          HumanMessagePromptTemplate.fromTemplate("{query}"),
        ]);
        const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
          prompt: translationPrompt,
          llm: chat,
          k: 2,
          returnSourceDocuments: true,
        });
        const question = user_question.toString();

        const response = await chain.call({ query: question });
        const api_response = response.text;


        finalResponse = api_response;
        console.log("ChatGPT Res :", finalResponse);

      }
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

  console.log("ChatGPT Res :", finalResponse);

  const message = finalResponse;
  console.log("bot message : ", message);
  // const message = "Hi there";
  let avatarVideoId = '';
  let avatarVideoURL = '';

  try {
    const responseData = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        "accept": 'application/json',
        'Authorization': `Basic ${process.env.DID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "driver_url": "bank://lively",
        "script": {
          "provider": {
            "type": "microsoft",
            "voice_id": "Jenny"
          },
          "input": `${message}`,
          "type": "text"
        },
        "source_url": "https://clips-presenters.d-id.com/amy/image.png"
      })
    })
    const responseDataJson = await responseData.json();
    avatarVideoId = responseDataJson.id;
    console.log("responseDataJson :", responseDataJson);
    console.log("first call id: ", avatarVideoId);
    url = `https://api.d-id.com/talks/${avatarVideoId}`
    console.log(url)

    // send second API request after 20 seconds
    setTimeout(async () => {
      const responseVideoData = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Basic ${process.env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      const responseVideoDataJson = await responseVideoData.json();
      console.log("url: ", responseVideoDataJson);
      avatarVideoURL = responseVideoDataJson.result_url;
      // avatarVideoURL = responseVideoDataJson.source_url;
      console.log("id result: ", responseVideoDataJson);
      console.log("avatarVideoURL: ", avatarVideoURL);
      console.log(" =============== ", responseVideoDataJson.result_url);

    }, 20000); // 20 seconds delay

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
  console.log("finalResponse -", finalResponse)
  console.log("avatarVideoURL -", avatarVideoURL)
  VideoChats.create({
    chat_id: chatId,
    message: finalResponse,
    sent_by: "bot",
    viewed_by_admin: "no",
  });
  return res.json({ status: "success", finalResponse: finalResponse, avatarVideoURL: avatarVideoURL })
})
router.post("/audio-chatGpt-response", async (req, res) => {
  const user_question = req.body.question;
  const chatId = req.body.chatId;
  var finalResponse;
  try {


    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Is "${user_question}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
      temperature: 0.8,
    });

    var info_result = completion.data.choices[0].text;
    if (info_result.toLowerCase().includes("name")) {
      finalResponse = "My name is DFCC GPT.";
    }
    else if (info_result.toLowerCase().includes("age")) {
      finalResponse = "I'm 20 years old";
    }
    else if (info_result.toLowerCase().includes("country")) {
      finalResponse = "I live in Sri Lanka";
    }
    else {
      const completion_2 = await openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt: `Is "${user_question}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
        temperature: 0.8,
      });
      var greeting_result = completion_2.data.choices[0].text;
      if (greeting_result.toLowerCase().includes("yes")) {
        const completion_3 = await openai.createCompletion({
          model: "gpt-3.5-turbo-instruct",
          prompt: `Simple Friendly reply to: ${translationsToEng}. Do not describe the greeting in the reply or ask questions.`,
          temperature: 0.8,
        });
        finalResponse = completion_3.data.choices[0].text;
      }
      else {
        const client = new PineconeClient();
        await client.init({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENVIRONMENT,
        });
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

        const vectorStore = await PineconeStore.fromExistingIndex(
          new OpenAIEmbeddings(),
          { pineconeIndex, namespace: process.env.PINECONE_NAME_SPACE }
        );

        const model = new OpenAI({
          temperature: 0,
          modelName: 'gpt-3.5-turbo',
        });
        const translationPrompt = ChatPromptTemplate.fromPromptMessages([
          SystemMessagePromptTemplate.fromTemplate(
            `You are an AI assistant providing helpful advice. You are given the following extracted parts of a long document and a question. Provide a conversational answer based on the context provided.
                      You should only provide hyperlinks that reference the context below. Do NOT make up hyperlinks.
                      If you can't find the answer in the context below, just say "Hmm, I'm not sure." Don't try to make up an answer.
                      If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.
                      
                      Question: {query}
                      =========
                      
                      =========
                      Answer in Markdown:`
          ),
          /*SystemMessagePromptTemplate.fromTemplate("{query}"),*/
          HumanMessagePromptTemplate.fromTemplate("{query}"),
        ]);
        const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
          prompt: translationPrompt,
          llm: chat,
          k: 2,
          returnSourceDocuments: true,
        });
        const question = user_question.toString();
        /*const question = `You are an AI assistant providing helpful advice. You are given the following extracted parts of a long document and a question. Provide a conversational answer based on the context provided.
        You should only provide hyperlinks that reference the context below. Do NOT make up hyperlinks.
        If you can't find the answer in the context below, just say "Hmm, I'm not sure." Don't try to make up an answer.
        If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.
        Question: ${user_question.toString()}
        =========
        
        =========
        Answer in Markdown:`;*/
        const response = await chain.call({ query: question });
        const api_response = response.text;


        finalResponse = api_response;
        console.log("ChatGPT Res :", finalResponse);

      }
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }

  console.log("ChatGPT Res :", finalResponse);
  AudioChats.create({
    chat_id: chatId,
    message: finalResponse,
    sent_by: "bot",
    viewed_by_admin: "no",
  });
  return res.json({ status: "success", finalResponse: finalResponse })
})
router.get('/video-chat-history', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    res.render('video-chat-history.ejs', { admin_login_details: req.admin_login_details });
  }
  else {
    res.redirect("/admin");
  }
});
router.get('/audio-chat-history', adminloggedin, (req, res) => {
  if (req.admin_login_details) {
    res.render('audio-chat-history.ejs', { admin_login_details: req.admin_login_details });
  }
  else {
    res.redirect("/admin");
  }
});

router.post("/chat-close-by-user", async (req, res) => {
  const chatId = req.body.chatId;

  try {
    db.query('UPDATE live_agent_chat_header SET status = "closed" WHERE message_id = "' + chatId + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      return res.json({ status: "success" })
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post("/chat-timeout", async (req, res) => {
  const chatId = req.body.chatId;

  try {
    db.query('UPDATE live_agent_chat_header SET status = "closed", is_time_out = "yes" WHERE message_id = "' + chatId + '"', async (Err2, result2) => {
      if (Err2) throw Err2;
      return res.json({ status: "success" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post("/financial-advisor-api", async (req, res) => {
  const user_message = req.body.user_Message;
  const language = req.body.language;
  const id = req.body.chatId;
  let api_response = "";
  let selectedLanguage = 'en'

  if (language == 'Sinhala') {
    selectedLanguage = 'si'
  }
  else if (language === 'Arabic') {
    selectedLanguage = 'ar'
  }
  else if (language === 'Tamil') {
    selectedLanguage = 'ta'
  }
  else {
    selectedLanguage = 'en'
  }
  db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: user_message, message_sent_by: 'customer', viewed_by_admin: 'no' }, async (Err3, result3) => {
    if (Err3) throw Err3;

  })
  try {
    let [translationsToEng] = await translate.translate(user_message, 'en');
    translationsToEng = Array.isArray(translationsToEng) ? translationsToEng : [translationsToEng];
    /*console.log(translationsToEng)
    res.json({ translationsToEng })*/


    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Is "${translationsToEng}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
      temperature: 0.8,
    });

    var info_result = completion.data.choices[0].text;
    if (info_result.toLowerCase().includes("name")) {
      api_response = "My name is DFCC GPT.";
      try {
        let [responseToEng] = await translate.translate(api_response, selectedLanguage);
        responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
        db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          if (Err3) throw Err3;

        })
        return res.json({ status: "success", bot_reply: responseToEng.toString() })
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
    else if (info_result.toLowerCase().includes("age")) {
      api_response = "I'm 20 years old";
      try {
        let [responseToEng] = await translate.translate(api_response, selectedLanguage);
        responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
        db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          if (Err3) throw Err3;

        })
        return res.json({ status: "success", bot_reply: responseToEng.toString() })
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
    else if (info_result.toLowerCase().includes("country")) {
      api_response = "I live in Sri Lanka";
      try {
        let [responseToEng] = await translate.translate(api_response, selectedLanguage);
        responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
        db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          if (Err3) throw Err3;

        })
        return res.json({ status: "success", bot_reply: responseToEng.toString() })
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
    else {
      const completion_2 = await openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt: `Is "${translationsToEng}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
        temperature: 0.8,
      });
      var greeting_result = completion_2.data.choices[0].text;
      if (greeting_result.toLowerCase().includes("yes")) {
        const completion_3 = await openai.createCompletion({
          model: "gpt-3.5-turbo-instruct",
          prompt: `Simple Friendly reply to: ${translationsToEng}. Do not describe the greeting in the reply or ask questions.`,
          temperature: 0.8,
        });

        api_response = completion_3.data.choices[0].text;
        try {
          let [responseToEng] = await translate.translate(api_response, selectedLanguage);
          responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
          db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
            if (Err3) throw Err3;

          })
          return res.json({ status: "success", bot_reply: responseToEng.toString() })
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
        }
      }
      else {
        const client = new PineconeClient();
        await client.init({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENVIRONMENT,
        });
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

        const vectorStore = await PineconeStore.fromExistingIndex(
          new OpenAIEmbeddings(),
          { pineconeIndex, namespace: process.env.PINECONE_NAME_SPACE }
        );

        const model = new OpenAI({
          temperature: 0.8,
          modelName: 'gpt-3.5-turbo-16k',
        });

        const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
          foo: "bar",
          k: 2,
          returnSourceDocuments: true,
        });
        const question = translationsToEng.toString();
        query = `friendly reply to ${question} as a financial adviser, if you could not find answer just say "Hmm.. I'm not sure."`
        const response = await chain.call({ query });
        api_response = response.text;

        try {
          let [responseToEng] = await translate.translate(api_response, selectedLanguage);
          responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
          db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: responseToEng.join(' '), message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
            if (Err3) throw Err3;

          })

          return res.json({ status: "success", bot_reply: responseToEng.toString() })
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
        }

      }
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get("/messaging-webhook", (req, res) => {

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    if (mode === "subscribe" && token === config.verifyToken) {
      // Respond with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});





router.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
router.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPsid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {

    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Handles messages events
function handleMessage(senderPsid, receivedMessage) {
  let response;

  // Checks if the message contains text
  if (receivedMessage.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of your request to the Send API
    response = {
      'text': `You sent the message: '${receivedMessage.text}'. Now send me an attachment!`
    };
  } else if (receivedMessage.attachments) {

    // Get the URL of the message attachment
    let attachmentUrl = receivedMessage.attachments[0].payload.url;
    response = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [{
            'title': 'Is this the right picture?',
            'subtitle': 'Tap a button to answer.',
            'image_url': attachmentUrl,
            'buttons': [
              {
                'type': 'postback',
                'title': 'Yes!',
                'payload': 'yes',
              },
              {
                'type': 'postback',
                'title': 'No!',
                'payload': 'no',
              }
            ],
          }]
        }
      }
    };
  }

  // Send the response message
  callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
function handlePostback(senderPsid, receivedPostback) {
  let response;

  // Get the payload for the postback
  let payload = receivedPostback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { 'text': 'Thanks!' };
  } else if (payload === 'no') {
    response = { 'text': 'Oops, try sending another image.' };
  }
  // Send the message to acknowledge the postback
  callSendAPI(senderPsid, response);
}

// Sends response messages via the Send API
function callSendAPI(senderPsid, response) {

  // The page access token we have generated in your app settings
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  // Construct the message body
  let requestBody = {
    'recipient': {
      'id': senderPsid
    },
    'message': response
  };

  // Send the HTTP request to the Messenger Platform
  request({
    'uri': 'https://graph.facebook.com/v17.0/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Message sent!');
    } else {
      console.error('Unable to send message:' + err);
    }
  });
}






router.post("/raja-chat-bot-api", async (req, res) => {
  const user_message = req.body.user_Message;
  const language = req.body.language;
  const id = req.body.chatId;
  const sriLankaTimeZone = 'Asia/Colombo';
  const currentTime = DateTime.now().setZone(sriLankaTimeZone);
  let api_response = "";
  let selectedLanguage = 'en';

  /*if (language == 'Sinhala') {
    selectedLanguage = 'si'
  }
  else if (language === 'Arabic') {
    selectedLanguage = 'ar'
  }
  else if (language === 'Tamil') {
    selectedLanguage = 'ta'
  }
  else {
    selectedLanguage = 'en'
  }*/
  db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: user_message, message_sent_by: 'customer', viewed_by_admin: 'no' }, async (Err3, result3) => {
    if (Err3) throw Err3;

  });
  const model = new OpenAI(
    {
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.8
    }

  );
  try {
    // let [translationsToEng] = await translate.translate(user_message, 'en');
    // translationsToEng = Array.isArray(translationsToEng) ? translationsToEng : [translationsToEng];

    //const question = translationsToEng.toString();

    const gold_rate_22k = await GoldRates.findOne({
      attributes: ['gold_rate_22k'],
      where: {
        id: 1
      },
      order: [['id', 'ASC']]
    });

    const old_gold_exchange_rate = await GoldRates.findOne({
      attributes: ['old_gold_exchange_rate'],
      where: {
        id: 1
      },
      order: [['id', 'ASC']]
    });

    const gold_coin_price = await GoldRates.findOne({
      attributes: ['gold_coin_price'],
      where: {
        id: 1
      },
      order: [['id', 'ASC']]
    });


    const userQuestion = user_message;

    // const answer_gold_rate = `Dear Madam/Sir, The price of 22kt gold sovereign (pawn | 8g) is ${gold_rate_22k.gold_rate_22k} as of today (${currentTime.toLocaleString(DateTime.TIME_SIMPLE)}). This doesn't include labor charges.
    // (T&C apply)
    
    // Thank you
    // `
    const answer_location = `Dear Madam/Sir, We have 3 showrooms. 
    Bambalapitiya - No 173, Galle Road, Colombo 4.
    Negombo - No 242, Main Street, Negombo.
    Kandy - No 86, Colombo Street, Kandy.
    
    Please contact us on 0112 586949 for more details.
    
    Thank you
    
    `
    const answer_opening_hours = `Dear Madam/Sir, Our hours are as below:
    Bambalapitiya: 10.00 am till 6.15pm from Monday to Saturday (Open last Sunday till 4.00pm)
    Negombo and Kandy: 10.00 am till 6.15pm from Monday to Saturday & 10.00am till 4.00pm on Sunday
    
    Thank you
    
    `
    // const answer_old_gold_exchange_rate = `Dear Madam/Sir,
    // We exchange Old Gold jewellery for the rate of ${old_gold_exchange_rate.old_gold_exchange_rate} for 1 Sovereign. You can exchange Old Gold & buy new Items for that rate.
    
    // (Conditions apply)
    
    // Thank you        
    // `
    // const answer_price_gold_coin_today = `Dear Madam/Sir,
    // The rate of one sovereign (pawn | 8g)  gold coin is ${gold_coin_price.gold_coin_price} as of today. 
    // (Conditions apply)
    
    // Thank you        
    // `
    const answer_not_sri_lanka_get_details = `Dear Madam/Sir, 

    Overseas customers can now connect with us from a virtual meeting.
    Please click on the “Virtual Appointments”  icon and schedule a zoom meeting with us. One of our well-trained sales team members will reach you to assist you and discuss your requirements.
    
    Thank you
    `
    const answer_do_custom_made_jwellry = `Yes we do.`
    const answer_quatation_for_custom_made_jwelry = `Dear Madam/Sir,
    Sorry, We don't share quotations from this. Please have an virtual meeting with us or kindly visit one of our main branches at Bambalapitiya, Negombo & Kandy to get a quotation. 
    
    Thank you        
    `

    // if (userQuestion === 'What is the 22kt Gold rate today?') {
    //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_gold_rate, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
    //     if (Err3) throw Err3;
    //   });
    //   return res.json({ status: "success", bot_reply: answer_gold_rate });
    // }
    if (userQuestion === 'Where are you located at?') {
      db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_location, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
        if (Err3) throw Err3;
      });
      return res.json({ status: "success", bot_reply: answer_location });
    }
    else if (userQuestion === 'What are your opening hours?') {
      db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_opening_hours, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
        if (Err3) throw Err3;
      });
      return res.json({ status: "success", bot_reply: answer_opening_hours });
    }
    // else if (userQuestion === 'What is the old gold exchange rate?') {
    //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_old_gold_exchange_rate, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
    //     if (Err3) throw Err3;
    //   });
    //   return res.json({ status: "success", bot_reply: answer_old_gold_exchange_rate });
    // }
    // else if (userQuestion === "What's the price of gold coin today?") {
    //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_price_gold_coin_today, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
    //     if (Err3) throw Err3;
    //   });
    //   return res.json({ status: "success", bot_reply: answer_price_gold_coin_today });
    // }
    else if (userQuestion === "I'm not in Sri Lanka, I need to get some details?") {
      db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_not_sri_lanka_get_details, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
        if (Err3) throw Err3;
      });
      return res.json({ status: "success", bot_reply: answer_not_sri_lanka_get_details });
    }
    else if (userQuestion === 'Do you do custom-made jewelry?') {
      db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_do_custom_made_jwellry, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
        if (Err3) throw Err3;
      });
      return res.json({ status: "success", bot_reply: answer_do_custom_made_jwellry });
    }
    else if (userQuestion === 'Can I get a quotation for a custom-made jewelry?') {
      db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_quatation_for_custom_made_jwelry, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
        if (Err3) throw Err3;
      });
      return res.json({ status: "success", bot_reply: answer_quatation_for_custom_made_jwelry });
    }
    else {


      const promptGreetingCheck = `Is "${userQuestion}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`;

      // const resGreet = await model.call(promptGreetingCheck);
      const resGreet = await openai.invoke({
        model: "gpt-3.5-turbo-instruct",
        prompt: promptGreetingCheck,
        temperature: 1.00,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        });
      console.log(resGreet);

      if (resGreet === "Yes") {
        const promptGreet = `Friendly reply to: ${userQuestion} and do Not ask any questions.`;
        // const resgreet = await model.call(promptGreet);
        const resgreet = await openai.invoke({
          model: "gpt-3.5-turbo-instruct",
          prompt: promptGreet,
          temperature: 1.00,
          max_tokens: 150,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          });
        console.log(resgreet);
        db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: resgreet, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          if (Err3) throw Err3;
        });
        return res.json({ status: "success", bot_reply: resgreet });
      }
      else {

        // langchain
        try {
          const pinecone = new Pinecone();
          const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
          const embeddings = new OpenAIEmbeddings();
          const vectorStore = await PineconeStore.fromExistingIndex(
            embeddings,
            { pineconeIndex, namespace: process.env.PINECONE_NAME_SPACE }
          );
          const retriever = vectorStore.asRetriever();

          const memory = new BufferMemory({
            memoryKey: "chatHistory",
            inputKey: "question",
            outputKey: "text",
            returnMessages: true,
          });

          const serializeDocs = (docs) =>
            docs.map((doc) => doc.pageContent).join("\n");

          const serializeChatHistory = (chatHistory) =>
            chatHistory
              .map((chatMessage) => {
                if (chatMessage._getType() === "human") {
                  return `Human: ${chatMessage.content}`;
                } else if (chatMessage._getType() === "ai") {
                  return `Assistant: ${chatMessage.content}`;
                } else {
                  return `${chatMessage.content}`;
                }
              })
              .join("\n");
          // just say that you don't know
          const questionPrompt = PromptTemplate.fromTemplate(
            `Use the following pieces of context to answer the question at the end. If the question not related to the context, just say "Hmm.. I don't know.  Please contact our branch 
            on 0112 586949 for more details", don't try to make up an answer.
          ----------    
          CONTEXT: {context}
          ----------
          CHAT HISTORY: {chatHistory}
          ----------
          QUESTION: {question}
          ----------
          Helpful Answer:`
          );

          const questionGeneratorTemplate = PromptTemplate.fromTemplate(
            `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
          ----------
          CHAT HISTORY: {chatHistory}
          ----------
          FOLLOWUP QUESTION: {question}
          ----------
          Standalone question:`
          );

          const fasterModel = new ChatOpenAI({
            modelName: "gpt-3.5-turbo",
          });
          const fasterChain = new LLMChain({
            llm: fasterModel,
            prompt: questionGeneratorTemplate,
          });

          const slowerModel = new ChatOpenAI({
            modelName: "gpt-4",
          });
          const slowerChain = new LLMChain({
            llm: slowerModel,
            prompt: questionPrompt,
          });

          const performQuestionAnswering = async (input) => {
            let newQuestion = input.question;

            // Serialize context and chat history into strings
            const serializedDocs = serializeDocs(input.context);
            const chatHistoryString = input.chatHistory
              ? serializeChatHistory(input.chatHistory)
              : null;

            if (chatHistoryString) {
              // Call the faster chain to generate a new question
              const { text } = await fasterChain.invoke({
                chatHistory: chatHistoryString,
                context: serializedDocs,
                question: input.question,
              });

              newQuestion = text;
            }

            const response = await slowerChain.invoke({
              chatHistory: chatHistoryString ?? "",
              context: serializedDocs,
              question: newQuestion,
            });

            // Save the chat history to memory
            await memory.saveContext(
              {
                question: input.question,
              },
              {
                text: response.text,
              }
            );

            return {
              result: response.text,
              sourceDocuments: input.context,
            };
          };
          const chain = RunnableSequence.from([
            {
              question: (input) => input.question,
              chatHistory: async () => {
                const savedMemory = await memory.loadMemoryVariables({});
                const hasHistory = savedMemory.chatHistory.length > 0;
                return hasHistory ? savedMemory.chatHistory : null;
              },
              context: async (input) =>
                retriever.getRelevantDocuments(input.question),
            },
            performQuestionAnswering,
          ]);

          // langchain call
          const resultOne = await chain.invoke({
            question: userQuestion,
          });
          const inputString = resultOne.result;

          // set current price
          // if (inputString.includes('Rs.100,000')) {
          //   const updatedString = inputString.replace('Rs.100,000', gold_rate_22k.gold_rate_22k);
          //   console.log(updatedString);
          //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: updatedString, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //     if (Err3) throw Err3;
          //   });
          //   return res.json({ status: "success", bot_reply: updatedString });
          // }
          // else if (inputString.includes('Rs.200,000')) {
          //   const updatedString = inputString.replace('Rs.200,000', old_gold_exchange_rate.old_gold_exchange_rate);
          //   console.log(updatedString);
          //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: updatedString, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //     if (Err3) throw Err3;
          //   });
          //   return res.json({ status: "success", bot_reply: updatedString });

          // }
          // if (inputString.includes('Rs.300,000')) {
          //   const updatedString = inputString.replace('Rs.300,000', gold_coin_price.gold_coin_price);
          //   console.log(updatedString);
          //   db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: updatedString, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //     if (Err3) throw Err3;
          //   });
          //   return res.json({ status: "success", bot_reply: updatedString });
          // }
          // else {
            console.log(inputString);
            db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: inputString, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
              if (Err3) throw Err3;
            });
            return res.json({ status: "success", bot_reply: inputString });
          // }
        } catch (error) {
          console.log(error);
        }

        // const promptQuestion = `
        //       Is "${userQuestion}" is 
        //           about 22kt Gold rate? or 
        //           about shop located place? or 
        //           about opening hours? or 
        //           about old gold exchange rate? or
        //           about price of gold coin? or
        //           about asking more details on something? or
        //           about do custom-made jewelry or not? or
        //           about opening days? or
        //           about contact number? or
        //           about branches? or
        //           about Can we exchange old gold?
        //               if it is about 22kt Gold rate just say "22kt gold rate", 
        //               if it is about shop located place just say "location", 
        //               if it is about opening hours just say "opening hours", 
        //               if it is about old gold exchange rate just say "old gold exchange rate", 
        //               if it is about price of gold coin just say "price of gold coin", 
        //               if it is about more details on something just say "need details", 
        //               if it is about do custom-made jewelry or not just say "do custom-made jewelry", 
        //               if it is about quotation for a custom-made jewelry just say "quotation for a custom-made jewelry",
        //               if it is about opening days just say "opening days", 
        //               if it is about contact number just say "contact number", 
        //               if it is about branches just say "branches",  
        //               if it is about Can we exchange old gold just say "able to exchange old gold rate", 
        //               else just say "other" ? 
        //               Do not use any other punctuation or any other words in the answer.`;

        //   const resQuestion = await model.call(promptQuestion);
        //   console.log(resQuestion.trim());


          // const resQuestionLower = resQuestion.toLowerCase();
          //     if (/\b22kt gold rate\b/i.test(resQuestionLower)) {
          //         console.log(answer_gold_rate);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_gold_rate, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_gold_rate});
          //     } else if (/\blocation\b/i.test(resQuestionLower)) {
          //         console.log(answer_location);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_location, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_location});
          //     } else if (/\bopening hours\b/i.test(resQuestionLower)) {
          //         console.log(answer_opening_hours);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_opening_hours, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_opening_hours});
          //     } else if (/\bold gold exchange rate\b/i.test(resQuestionLower)) {
          //         console.log(answer_old_gold_exchange_rate);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_old_gold_exchange_rate, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_old_gold_exchange_rate});
          //     } else if (/\bprice of gold coin\b/i.test(resQuestionLower)) {
          //         console.log(answer_price_gold_coin_today);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_price_gold_coin_today, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_price_gold_coin_today});
          //     } else if (/\bneed details\b/i.test(resQuestionLower)) {
          //         console.log(answer_not_sri_lanka_get_details);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_not_sri_lanka_get_details, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_not_sri_lanka_get_details});
          //     } else if (/\bdo custom-made jewelry\b/i.test(resQuestionLower)) {
          //         console.log(answer_do_custom_made_jwellry);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_do_custom_made_jwellry, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_do_custom_made_jwellry});
          //     } else if (/\bquotation for a custom-made jewelry\b/i.test(resQuestionLower)) {
          //         console.log(answer_quatation_for_custom_made_jwelry);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_quatation_for_custom_made_jwelry, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_quatation_for_custom_made_jwelry});
          //     } else if (/\bopening days\b/i.test(resQuestionLower)) {
          //         console.log(answer_location);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_location, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_location});
          //     } else if (/\bcontact number\b/i.test(resQuestionLower)) {
          //         console.log(answer_location);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_location, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_location});
          //     } else if (/\bbranches\b/i.test(resQuestionLower)) {
          //         console.log(answer_location);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_location, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_location});
          //     } else if (/\bable to exchange old gold rate\b/i.test(resQuestionLower)) {
          //         console.log(answer_old_gold_exchange_rate);
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: answer_old_gold_exchange_rate, message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: answer_old_gold_exchange_rate});
          //     } else {
          //         console.log("Hmm, I'm not sure..");
          //         db.query('INSERT INTO chat_bot_chats SET ?', { message_id: id, language: language, message: "Hmm, I'm not sure..", message_sent_by: 'bot', viewed_by_admin: 'no' }, async (Err3, result3) => {
          //           if (Err3) throw Err3;
          //         });
          //         return res.json({ status: "success", bot_reply: "Hmm, I'm not sure.."});
          //     }



      }

    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});
module.exports = router;