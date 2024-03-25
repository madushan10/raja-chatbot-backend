const { request } = require("express");
const express = require("express");
const flash = require('connect-flash');
const session = require('express-session');
const cors = require("cors");
const bodyParser = require('body-parser');
const adminloggedin = require("../controllers/adminloggedin");
const agentloggedin = require("../controllers/agentloggedin");
const router = express.Router();
const db = require("./db-config");
const bcrypt = require("bcrypt");
const { Configuration, OpenAIApi } = require("openai");
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { Translate } = require('@google-cloud/translate').v2;
const { ChatOpenAI } = require('langchain/chat_models/openai');
const chat = new ChatOpenAI({ temperature: 0,modelName: 'gpt-3.5-turbo' },);
const { PineconeClient } = require('@pinecone-database/pinecone');
const { VectorDBQAChain } = require('langchain/chains');
const { LLMChain  } = require('langchain/chains');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { OpenAI } = require('langchain/llms/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');
const {SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate} = require('langchain/prompts')
const {HumanChatMessage, SystemChatMessage} = require('langchain/schema')
require('dotenv').config();
const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql' 
});
var Agents = sequelize.define('other_agent_details', {
  user_id :Sequelize.INTEGER,
  name : Sequelize.TEXT,
  phone : Sequelize.TEXT,
  status : Sequelize.TEXT,
  profile_picture : Sequelize.TEXT
}, {
  timestamps: false,tableName: 'other_agent_details'
});
var ChatHeader = sequelize.define('live_agent_chat_header', {
  message_id :Sequelize.TEXT,
  agent : Sequelize.TEXT,
  language : Sequelize.TEXT,
  rating : Sequelize.TEXT,
  feedback : Sequelize.TEXT,
  status : Sequelize.TEXT
}, {
  timestamps: false,tableName: 'live_agent_chat_header'
});
var ChatTimer = sequelize.define('live_chat_timer', {
  message_id :Sequelize.TEXT,
  agent : Sequelize.TEXT,
  time : Sequelize.DOUBLE,
}, {
  timestamps: false,tableName: 'live_chat_timer'
});
var BotChats = sequelize.define('chat_bot_chats', {
    message_id :Sequelize.INTEGER,
    language : Sequelize.TEXT,
    message : Sequelize.TEXT,
    message_sent_by : Sequelize.TEXT,
  }, {
    timestamps: false,tableName: 'chat_bot_chats'
  });
  var LiveChatChat = sequelize.define('live_agent_chat_chats', {
    message_id :Sequelize.TEXT,
    sent_by : Sequelize.TEXT,
    message : Sequelize.TEXT,
    sent_to_user : Sequelize.TEXT,
    viewed_by_agent : Sequelize.TEXT,
  }, {
    timestamps: false,tableName: 'live_agent_chat_chats'
  });
var VideoChats = sequelize.define('video_chat_history', {
    chat_id : Sequelize.TEXT,
    message : Sequelize.TEXT,
    sent_by : Sequelize.TEXT,
    viewed_by_admin : Sequelize.TEXT,
  }, {
   tableName: 'video_chat_history'
  });
var AudioChats = sequelize.define('audio_chat_history', {
    chat_id : Sequelize.TEXT,
    message : Sequelize.TEXT,
    sent_by : Sequelize.TEXT,
    viewed_by_admin : Sequelize.TEXT,
  }, {
    tableName: 'audio_chat_history'
  });
router.use(bodyParser.json());
router.use(cors());

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const translate = new Translate();
const client = new speech.SpeechClient();
const clienttext = new textToSpeech.TextToSpeechClient();
router.use(session({
    secret:'flashblog',
    saveUninitialized: true,
    resave: true
}));
router.use(flash());
router.get('/', (req, res) =>{
    res.render("index.ejs")
});
router.get('/admin', (req, res) =>{
        res.render("admin-login.ejs")
});
router.get('/admin-dashboard', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        res.render("admin-dashboard.ejs",{admin_login_details:req.admin_login_details})
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/add-admin', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        res.render("add-admin.ejs",{admin_login_details:req.admin_login_details})
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/manage-admins', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        db.query('SELECT * FROM other_admin_details', function(err, admins) {
            if (err) throw err;
            res.render('manage-admins.ejs', { admins: admins,admin_login_details:req.admin_login_details });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/edit-admin/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        db.query('SELECT * FROM other_admin_details WHERE user_id = '+$user_id+'', function(err, admin_details) {
            if (err) throw err;
            db.query('SELECT * FROM users WHERE id = '+$user_id+'', function(err2, login_details) {
                if (err2) throw err2;
                res.render('edit-admin.ejs', { admin_details: admin_details[0],login_details: login_details[0],admin_login_details:req.admin_login_details });
              });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/deactivate-admin/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        db.query('UPDATE other_admin_details SET status = "inactive" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET status = "inactive" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                res.redirect("/manage-admins");
            })
        })
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/activate-admin/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        db.query('UPDATE other_admin_details SET status = "active" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET status = "active" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                res.redirect("/manage-admins");
            })
        })
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/add-agent', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        const successMessage = req.flash('success')[0];
        const errorMessage = req.flash('error')[0];
        res.render("add-agent.ejs",{admin_login_details:req.admin_login_details, successMessage: successMessage,errorMessage: errorMessage})
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/manage-agents', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        db.query('SELECT * FROM other_agent_details', function(err, agents) {
            if (err) throw err;
            res.render('manage-agents.ejs', { agents: agents,admin_login_details:req.admin_login_details });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/live-chat-history', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        res.render('live-chat-history.ejs', { admin_login_details:req.admin_login_details });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/view-agent-chats/:id', adminloggedin,async (req, res) =>{
    if(req.admin_login_details){
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
        res.render('view-agent-chats.ejs', { agent: agent,admin_login_details:req.admin_login_details,chat_count:chat_count,timer:timer,chats:chats });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/view-agent-feedbacks/:id', adminloggedin,async (req, res) =>{
    if(req.admin_login_details){
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
        res.render('view-agent-feedbacks.ejs', { agent: agent,admin_login_details:req.admin_login_details,chats:chats });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/edit-agent/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        const successMessage = req.flash('success2')[0];
        const errorMessage = req.flash('error2')[0];
        db.query('SELECT * FROM other_agent_details WHERE user_id = '+$user_id+'', function(err, agent_details) {
            if (err) throw err;
            db.query('SELECT * FROM users WHERE id = '+$user_id+'', function(err2, login_details) {
                if (err2) throw err2;
                db.query('SELECT * FROM agent_languages WHERE user_id = '+$user_id+'', function(err3, languages) {
                    if (err3) throw err3;
                    res.render('edit-agent.ejs', { agent_details: agent_details[0],login_details: login_details[0],admin_login_details:req.admin_login_details,languages:languages, successMessage: successMessage,errorMessage: errorMessage });
                })
                
              });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/deactivate-agent/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        db.query('UPDATE other_agent_details SET status = "inactive" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET status = "inactive" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                res.redirect("/manage-agents");
            })
        })
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/activate-agent/:id', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        $user_id = req.params.id;
        db.query('UPDATE other_agent_details SET status = "active" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET status = "active" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                res.redirect("/manage-agents");
            })
        })
    }
   else{
    res.redirect("/admin");
   }
});

router.get('/agent', (req, res) =>{
    res.render("agent-login.ejs")
});
router.get('/agent-dashboard', agentloggedin, (req, res) =>{
    if(req.agent_login_details){
        res.render("agent-dashboard.ejs",{agent_login_details:req.agent_login_details})
    }
   else{
    res.redirect("/agent");
   }
});
router.get('/agent-profile/:id', agentloggedin, (req, res) =>{
    if(req.agent_login_details){
        $user_id = req.params.id;
        db.query('SELECT * FROM other_agent_details WHERE user_id = '+$user_id+'', function(err, agent_details) {
            if (err) throw err;
            db.query('SELECT * FROM users WHERE id = '+$user_id+'', function(err2, login_details) {
                if (err2) throw err2;
                res.render('agent-profile.ejs', { agent_details: agent_details[0],login_details: login_details[0],agent_login_details:req.agent_login_details });
              });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.post("/translate-to-english-api",async(req, res)=>{
    const user_message = req.body.user_Message;
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
    db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:user_message, message_sent_by:'customer', viewed_by_admin:'no'}, async (Err3, result3) =>{
        if(Err3) throw Err3;
        
    })
    try {
        let [translationsToEng] = await translate.translate(user_message, 'en');
        translationsToEng = Array.isArray(translationsToEng) ? translationsToEng : [translationsToEng];
        /*console.log(translationsToEng)
        res.json({ translationsToEng })*/

    
        const completion = await openai.createCompletion({
              model: "text-davinci-003",
              prompt: `Is "${translationsToEng}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
              temperature: 0.6,
        });

        var info_result =  completion.data.choices[0].text;
        if(info_result.toLowerCase().includes("name")){
            db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:"My name is DFCC GPT.", message_sent_by:'bot', viewed_by_admin:'no'}, async (Err3, result3) =>{
                if(Err3) throw Err3;
            })
            return res.json({status:"success", bot_reply:"My name is DFCC GPT."})
        }
        else if(info_result.toLowerCase().includes("age")){
            db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:"I'm 20 years old", message_sent_by:'bot', viewed_by_admin:'no'}, async (Err3, result3) =>{
                if(Err3) throw Err3;
            })
           return res.json({status:"success", bot_reply:"I'm 20 years old"})
        }
        else if(info_result.toLowerCase().includes("country")){
            db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:"I live in Sri Lanka", message_sent_by:'bot', viewed_by_admin:'no'}, async (Err3, result3) =>{
                if(Err3) throw Err3;
            })
          return res.json({status:"success", bot_reply:"I live in Sri Lanka"})
        }
        else{
            const completion_2 = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `Is "${translationsToEng}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
                temperature: 0.6,
              });
              var greeting_result =  completion_2.data.choices[0].text;
              if (greeting_result.toLowerCase().includes("yes")){
                const completion_3 = await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: `Friendly reply to: ${translationsToEng} and do Not ask any questions.`,
                    temperature: 0.6,
                  });
                  db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:completion_3.data.choices[0].text, message_sent_by:'bot', viewed_by_admin:'no'}, async (Err3, result3) =>{
                    if(Err3) throw Err3;
                })
                  return res.json({status:"success", bot_reply:completion_3.data.choices[0].text})
              }
              else{
                const client = new PineconeClient();
                await client.init({
                  apiKey: process.env.PINECONE_API_KEY,
                  environment: process.env.PINECONE_ENVIRONMENT,
                });
                const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);
                
                const vectorStore = await PineconeStore.fromExistingIndex(
                  new OpenAIEmbeddings(),
                  { pineconeIndex, namespace:process.env.PINECONE_NAME_SPACE }
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
                     `
                    ),
                    HumanMessagePromptTemplate.fromTemplate("{query}"),
                  ]);
          
                  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
                    prompt: translationPrompt,
                    llm: model,
                    k: 2,
                    returnSourceDocuments: true,
                  });
                  const question = translationsToEng.toString();
        
                  const response = await chain.call({
                    query: question,
                  });
                  const api_response = response.text;
                  console.log("ChatGPT Res :",api_response);
        
                  try {
                    let [responseToEng] = await translate.translate(api_response, selectedLanguage);
                    responseToEng = Array.isArray(responseToEng) ? responseToEng : [responseToEng];
                    db.query('INSERT INTO chat_bot_chats SET ?', {message_id:id,language:language, message:responseToEng.join(' '), message_sent_by:'bot', viewed_by_admin:'no'}, async (Err3, result3) =>{
                        if(Err3) throw Err3;
                        
                    })
                    console.log("Translated Res :",responseToEng);
                    return res.json({status:"success", bot_reply:responseToEng.toString()})
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
})
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
router.get('/conversation-history', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        db.query('SELECT DISTINCT message_id FROM chat_bot_chats', function(err, chats) {
            if (err) throw err;
            res.render('conversation-history.ejs', { chats: chats,admin_login_details:req.admin_login_details });
          });
    }
   else{
    res.redirect("/admin");
   }
});
router.post("/live-chat-user",async(req, res)=>{
    const user_message = req.body.user_Message;
    const chatId = req.body.chatId;
    const language = req.body.language;
   
    try {
        db.query('SELECT * FROM live_agent_chat_header WHERE message_id = ?', [chatId], async (Err, result) =>{
            if(!result[0]){
                db.query('INSERT INTO live_agent_chat_header SET ?', {message_id:chatId, agent:'unassigned', language:language, status:'live'}, async (Err2, result2) =>{
                    if(Err2) throw Err2;
                    db.query('INSERT INTO live_agent_chat_chats SET ?', {message_id:chatId, sent_by:'customer', message:user_message, viewed_by_agent:'no'}, async (Err3, result3) =>{
                        if(Err3) throw Err3;
                    })
                })
            }
            else{
                db.query('INSERT INTO live_agent_chat_chats SET ?', {message_id:chatId, sent_by:'customer', message:user_message, viewed_by_agent:'no'}, async (Err4, result4) =>{
                    if(Err4) throw Err4;
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
        db.query('SELECT * FROM live_agent_chat_header WHERE message_id = ? LIMIT 1', [chatId], function(err, chat_header_result) {
            if (err) throw err;
            db.query('SELECT * FROM live_agent_chat_chats WHERE message_id = ? AND sent_by = ? AND sent_to_user = ? ORDER BY id DESC LIMIT 1', [chatId, "agent", "no"], function(err2, chat_body_result) {
                if (err2) throw err2;
                if(chat_header_result[0]){
                    db.query('SELECT * FROM other_agent_details WHERE user_id = ? LIMIT 1', [chat_header_result[0].agent], function(err2, agent_details) {
                        if(agent_details[0]){
                            var agent_name = agent_details[0].name;
                            var profile_picture = agent_details[0].profile_picture; 
                        }
                        else{
                            var agent_name = null;  
                            var profile_picture = null;  
                        }
                        if(chat_body_result[0]){
                            var agent_message = chat_body_result[0].message;
                            db.query('UPDATE live_agent_chat_chats SET sent_to_user = "yes" WHERE id = "'+chat_body_result[0].id+'"',async (Err2, result2) =>{
                                if (Err2) throw Err2;
                            });
                        }
                        else{
                            var agent_message = null;  
                        }
                        var agent_id = chat_header_result[0].agent;
                        var chat_status = chat_header_result[0].status;
                        res.json({agent_id, chat_status, agent_message,agent_name,profile_picture});
                    })
                    
                }
                else{
                    var agent_id = null;  
                    var chat_status = null;
                    var agent_message = null;
                    var agent_name = null;
                    var profile_picture = null;
                    res.json({agent_id, chat_status, agent_message,agent_name,profile_picture});
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
        db.query('UPDATE live_agent_chat_header SET rating = "'+ratingValue+'", feedback = "'+feedbackMessage+'" WHERE message_id = "'+chatId+'"',async (Err2, result2) =>{
            if (Err2) throw Err2;
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})
router.get('/live-chats', agentloggedin, (req, res) =>{
    if(req.agent_login_details){
        db.query('SELECT * FROM live_agent_chat_header WHERE agent = ? AND status = ?', ['unassigned','live'], function(err, chats) {
            if (err) throw err;
            db.query('SELECT * FROM agent_languages WHERE user_id = ?', [req.agent_login_details.id], function(err2, languages) {
                if (err2) throw err2;
                res.render('live-chats.ejs', { chats: chats,agent_login_details:req.agent_login_details,languages:languages});
            })
            
          });
    }
   else{
    res.redirect("/agent");
   }
});
let transcript = '';
router.post("/recording-start", async (req, res) => {
    const chatId = req.body.chatId;
    const apiType = req.body.apiType;
    let userMessageTime = new Date().toLocaleTimeString()

    try {
        if (!transcript) {
            transcript = await speechRecognition();
            console.log("Transcript =====> " + transcript);
        }
        //add transcript to db
        if(apiType == "video"){
            VideoChats.create({
                chat_id: chatId,
                message: transcript,
                sent_by: "customer",
                viewed_by_admin: "no",
              });
        }
        else{
            AudioChats.create({
                chat_id: chatId,
                message: transcript,
                sent_by: "customer",
                viewed_by_admin: "no",
              });
        }
        res.json({ transcript, userMessageTime, status:"success" })
        transcript = "";
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    } 
})


const speechRecognition = async () => {
    // config
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

    //   start recording
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

    // create new promise
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
router.post("/video-chatGpt-response",async(req, res)=>{
    const user_question = req.body.question;
    const chatId = req.body.chatId;
    var finalResponse;
    try {
      
    
        const completion = await openai.createCompletion({
              model: "text-davinci-003",
              prompt: `Is "${user_question}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
              temperature: 0.6,
        });

        var info_result =  completion.data.choices[0].text;
        if(info_result.toLowerCase().includes("name")){
            finalResponse ="My name is DFCC GPT.";
        }
        else if(info_result.toLowerCase().includes("age")){
           finalResponse ="I'm 20 years old";
        }
        else if(info_result.toLowerCase().includes("country")){
            finalResponse ="I live in Sri Lanka";
        }
        else{
            const completion_2 = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `Is "${user_question}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
                temperature: 0.6,
              });
              var greeting_result =  completion_2.data.choices[0].text;
              if (greeting_result.toLowerCase().includes("yes")){
                const completion_3 = await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: `Friendly reply to: ${user_question} and do Not ask any questions.`,
                    temperature: 0.6,
                  });
                finalResponse =completion_3.data.choices[0].text;
              }
              else{
                const client = new PineconeClient();
                await client.init({
                  apiKey: process.env.PINECONE_API_KEY,
                  environment: process.env.PINECONE_ENVIRONMENT,
                });
                const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);
                
                const vectorStore = await PineconeStore.fromExistingIndex(
                  new OpenAIEmbeddings(),
                  { pineconeIndex, namespace:process.env.PINECONE_NAME_SPACE }
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
        
                  const response = await chain.call({ query:question });
                  const api_response = response.text;
        
                  
                  finalResponse =api_response;
                  console.log("ChatGPT Res :",finalResponse);

              }
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

    console.log("ChatGPT Res :",finalResponse);

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
            console.log(" =============== ",responseVideoDataJson.result_url);
            
        }, 20000); // 20 seconds delay

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
    console.log("finalResponse -",finalResponse)
    console.log("avatarVideoURL -",avatarVideoURL)
    VideoChats.create({
        chat_id: chatId,
        message: finalResponse,
        sent_by: "bot",
        viewed_by_admin: "no",
      });
    return res.json({status:"success", finalResponse:finalResponse, avatarVideoURL:avatarVideoURL})
})
router.post("/audio-chatGpt-response",async(req, res)=>{
    const user_question = req.body.question;
    const chatId = req.body.chatId;
    var finalResponse;
    try {
      
    
        const completion = await openai.createCompletion({
              model: "text-davinci-003",
              prompt: `Is "${user_question}" is asking about your name or age or country? if it is about name just say "name", if it is about age just say "age", if it is about country just say "country" if it is not about name or age or country just say "other" ? Do not use any other punctuation or words in the answer.`,
              temperature: 0.6,
        });

        var info_result =  completion.data.choices[0].text;
        if(info_result.toLowerCase().includes("name")){
            finalResponse ="My name is DFCC GPT.";
        }
        else if(info_result.toLowerCase().includes("age")){
           finalResponse ="I'm 20 years old";
        }
        else if(info_result.toLowerCase().includes("country")){
            finalResponse ="I live in Sri Lanka";
        }
        else{
            const completion_2 = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `Is "${user_question}" is a greeting ? yes or no? Do not use any other punctuation or words in the answer`,
                temperature: 0.6,
              });
              var greeting_result =  completion_2.data.choices[0].text;
              if (greeting_result.toLowerCase().includes("yes")){
                const completion_3 = await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: `Friendly reply to: ${user_question} and do Not ask any questions.`,
                    temperature: 0.6,
                  });
                finalResponse =completion_3.data.choices[0].text;
              }
              else{
                const client = new PineconeClient();
                await client.init({
                  apiKey: process.env.PINECONE_API_KEY,
                  environment: process.env.PINECONE_ENVIRONMENT,
                });
                const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);
                
                const vectorStore = await PineconeStore.fromExistingIndex(
                  new OpenAIEmbeddings(),
                  { pineconeIndex, namespace:process.env.PINECONE_NAME_SPACE }
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
                  const response = await chain.call({ query:question });
                  const api_response = response.text;
        
                  
                  finalResponse =api_response;
                  console.log("ChatGPT Res :",finalResponse);

              }
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }

    console.log("ChatGPT Res :",finalResponse);
    AudioChats.create({
        chat_id: chatId,
        message: finalResponse,
        sent_by: "bot",
        viewed_by_admin: "no",
      });
    return res.json({status:"success", finalResponse:finalResponse})
})
router.get('/video-chat-history', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        res.render('video-chat-history.ejs', {admin_login_details:req.admin_login_details });
    }
   else{
    res.redirect("/admin");
   }
});
router.get('/audio-chat-history', adminloggedin, (req, res) =>{
    if(req.admin_login_details){
        res.render('audio-chat-history.ejs', {admin_login_details:req.admin_login_details });
    }
   else{
    res.redirect("/admin");
   }
});

router.post("/chat-close-by-user", async (req, res) => {
    const chatId = req.body.chatId;

    try {
        db.query('UPDATE live_agent_chat_header SET status = "closed" WHERE message_id = "'+chatId+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            return res.json({status:"success"})
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})
module.exports = router;