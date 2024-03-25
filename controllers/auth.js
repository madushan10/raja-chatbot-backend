const express = require("express");
const multer = require('multer');
const db = require("../routes/db-config");
const dotenv = require("dotenv").config();
const sql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const router = express.Router();
const flash = require('connect-flash');
const session = require('express-session');
const admin_add = require("./admin_add");
const agent_add = require("./agent_add");
const admin_login = require("./admin-login");
const admin_logout = require("./adminlogout");
const admin_update = require("./admin_update");
const user_check_current_password = require("./user_check_current_password");
const admin_update_with_password = require("./admin_update_with_password");
const agent_update = require("./agent_update");
const agent_update_with_password = require("./agent_update_with_password");
const agent_login = require("./agent_login");
const agent_logout = require("./agent_logout");
const get_chat_messages = require("./get_chat_messages");
const refresh_chats = require("./refresh_chats");
const bot_chats_onload = require("./bot_chats_onload");
const refresh_selected_chat = require("./refresh_selected_chat");
const refresh_live_chats = require("./refresh_live_chats");
const reply_to_live_chat = require("./reply_to_live_chat");
const close_live_chat = require("./close_live_chat");
const refresh_live_chat_inner = require("./refresh_live_chat_inner");
const agent_reply_live_chat = require("./agent_reply_live_chat");
const live_chats_onload = require("./live_chats_onload");

const update_gold_rates = require("./update_gold_rates");


const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: "mysql",
  dialectModule: require('mysql2'),
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
var LiveChatChat = sequelize.define('live_agent_chat_chats', {
  message_id :Sequelize.TEXT,
  sent_by : Sequelize.TEXT,
  message : Sequelize.TEXT,
  sent_to_user : Sequelize.TEXT,
}, {
 tableName: 'live_agent_chat_chats'
});
var VideoChats = sequelize.define('video_chat_history', {
  chat_id :Sequelize.INTEGER,
  message : Sequelize.TEXT,
  sent_by : Sequelize.TEXT,
  viewed_by_admin : Sequelize.TEXT,
}, {
 tableName: 'video_chat_history'
});
var AudioChats = sequelize.define('audio_chat_history', {
  chat_id :Sequelize.INTEGER,
  message : Sequelize.TEXT,
  sent_by : Sequelize.TEXT,
  viewed_by_admin : Sequelize.TEXT,
}, {
 tableName: 'audio_chat_history'
});
router.use(flash());
router.use(session({
  secret:'flashblog',
  saveUninitialized: true,
  resave: true
}));
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'public/uploads/') // Specify the folder where you want to store the files
    },
    filename: function(req, file, cb) {
      cb(null, file.originalname) // Keep the original name of the file
    }
  });
  
const upload = multer({ storage: storage });

router.post("/admin-add", admin_add)
router.post("/admin-login", admin_login)
router.get("/admin-logout", admin_logout)
router.post("/admin-update", admin_update)
router.post("/user-check-current-password", user_check_current_password)
router.post("/admin-update-with-password", admin_update_with_password)

router.post("/update-gold-rates", update_gold_rates)


router.post("/agent-login", agent_login)
router.get("/agent-logout", agent_logout)
router.post("/agent-update", agent_update)
router.post("/agent-update-with-password", agent_update_with_password)

router.post("/get-chat-messages", get_chat_messages)
router.post("/refresh-chats", refresh_chats)
router.post("/bot-chats-onload", bot_chats_onload)
router.post("/refresh-selected-chat", refresh_selected_chat)
router.post("/refresh-live-chats", refresh_live_chats)
router.post("/live-chats-onload", live_chats_onload)
router.post("/reply-to-live-chat", reply_to_live_chat)
router.post("/close-live-chat", close_live_chat)
router.post("/refresh-live-chat-inner", refresh_live_chat_inner)
router.post("/agent-reply-live-chat", agent_reply_live_chat)


router.post('/refresh-selected-audio-chat',async (req, res) =>{
  const {message_id} = req.body
  AudioChats.update(
      { viewed_by_admin: 'yes' },
      { where: { chat_id: message_id } }
  );
  var message_history = ''
  db.query('SELECT * FROM audio_chat_history WHERE chat_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
      if (Err) console.log(Err);
      message_history += ` <div class="box">
      <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
        <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                 
                </div>
            </div>
        </div>								             
      </div>
      <div class="box-body mb-30">
          <div class="chat-box-six">`
          for (var i = 0; i < chats.length; i++) {
              const timestamp = new Date("'"+chats[i].createdAt+"'");
              const formattedDateTime = timestamp.toLocaleString();   
              if(chats[i].sent_by == "customer"){
                  message_history += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>` 
              }
              else{
                  message_history += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/bot.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>											
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>`
              }
              
          }
          message_history += `</div>
      </div>
        <!--<div class="box-footer">
            <div class="d-md-flex d-block justify-content-between align-items-center">
                <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
            
                    <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                        <i class="mdi mdi-send"></i>
                    </button>
                </div>
            </div>
        </div>-->
    </div>`
      return res.json({status:"success", message:message_history})
    });
});
router.post('/get-audio-chat-messages',async (req, res) =>{
  const {message_id} = req.body
  AudioChats.update(
      { viewed_by_admin: 'yes' },
      { where: { chat_id: message_id } }
  );
  var message_history = ''
  db.query('SELECT * FROM audio_chat_history WHERE chat_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
      if (Err) console.log(Err);
      message_history += ` <div class="box">
      <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
        <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                 
                </div>
            </div>
        </div>								             
      </div>
      <div class="box-body mb-30">
          <div class="chat-box-six">`
          for (var i = 0; i < chats.length; i++) {
              const timestamp = new Date("'"+chats[i].createdAt+"'");
              const formattedDateTime = timestamp.toLocaleString();   
              if(chats[i].sent_by == "customer"){
                  message_history += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>` 
              }
              else{
                  message_history += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/bot.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>											
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>`
              }
              
          }
          message_history += `</div>
      </div>
        <!--<div class="box-footer">
            <div class="d-md-flex d-block justify-content-between align-items-center">
                <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
            
                    <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                        <i class="mdi mdi-send"></i>
                    </button>
                </div>
            </div>
        </div>-->
    </div>`
      return res.json({status:"success", message:message_history})
    });
});
router.post('/refresh-audio-chats',async (req, res) =>{
  var chat = ''
    
  db.query('SELECT DISTINCT chat_id FROM audio_chat_history' , async (Err, chats) =>{
      if (Err) console.log(Err);
      for (var i = 0; i < chats.length; i++) {
          const newMessageCount = await AudioChats.count({
              where: {
                viewed_by_admin: 'no',
                chat_id: chats[i].chat_id,
              },

            });
            const lastMessage = await AudioChats.findOne({
              where: {
                  chat_id: chats[i].chat_id,
              },
              order: [['id', 'DESC']],
            });
          const timestamp = new Date("'"+lastMessage.createdAt+"'");
          const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
          chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetAllChats('`+chats[i].chat_id+`')">
          <div class="d-flex align-items-center">
              <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
              <div>
                <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].chat_id+`</strong></a>
                <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
              </div>
          </div>
          <div class="text-end">
            <span class="d-block mb-5 fs-12">`+time+`</span>`
          if(newMessageCount > 0){
          chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
          } 
          chat += `</div>
      </div>`
      }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    });
});
router.post('/audio-chats-onload',async (req, res) =>{
  var chat = ''
    
  db.query('SELECT DISTINCT chat_id FROM audio_chat_history' , async (Err, chats) =>{
      if (Err) console.log(Err);
      for (var i = 0; i < chats.length; i++) {
          const newMessageCount = await AudioChats.count({
              where: {
                viewed_by_admin: 'no',
                chat_id: chats[i].chat_id,
              },

            });
            const lastMessage = await AudioChats.findOne({
              where: {
                  chat_id: chats[i].chat_id,
              },
              order: [['id', 'DESC']],
            });
          const timestamp = new Date("'"+lastMessage.createdAt+"'");
          const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
          chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetAllChats('`+chats[i].chat_id+`')">
          <div class="d-flex align-items-center">
              <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
              <div>
                <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].chat_id+`</strong></a>
                <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
              </div>
          </div>
          <div class="text-end">
            <span class="d-block mb-5 fs-12">`+time+`</span>`
          if(newMessageCount > 0){
          chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
          } 
          chat += `</div>
      </div>`
      }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    });
});
router.post('/refresh-selected-video-chat',async (req, res) =>{
  const {message_id} = req.body
  VideoChats.update(
        { viewed_by_admin: 'yes' },
        { where: { chat_id: message_id } }
    );
    var message_history = ''
    db.query('SELECT * FROM video_chat_history WHERE chat_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
        if (Err) console.log(Err);
        message_history += ` <div class="box">
        <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
          <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
              <div class="d-flex align-items-center">
                  <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  <div>
                    <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                   
                  </div>
              </div>
          </div>								             
        </div>
        <div class="box-body mb-30">
            <div class="chat-box-six">`
            for (var i = 0; i < chats.length; i++) {
                const timestamp = new Date("'"+chats[i].createdAt+"'");
                const formattedDateTime = timestamp.toLocaleString();   
                if(chats[i].sent_by == "customer"){
                    message_history += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                    <div>
                        <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                    </div>
                    <div>
                        <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                            <p class="mb-0">`+chats[i].message+`</p>
                        </div>
                        <p class="text-muted mb-15">`+formattedDateTime+`</p>
                    </div>
                  </div>` 
                }
                else{
                    message_history += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                    <div>
                        <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/bot.png" alt="..."></a>
                    </div>
                    <div>
                        <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                            <p class="mb-0">`+chats[i].message+`</p>
                        </div>											
                        <p class="text-muted mb-15">`+formattedDateTime+`</p>
                    </div>
                  </div>`
                }
                
            }
            message_history += `</div>
        </div>
          <!--<div class="box-footer">
              <div class="d-md-flex d-block justify-content-between align-items-center">
                  <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                  <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
              
                      <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                          <i class="mdi mdi-send"></i>
                      </button>
                  </div>
              </div>
          </div>-->
      </div>`
        return res.json({status:"success", message:message_history})
      });
});
router.post('/refresh-video-chats',async (req, res) =>{
  var chat = ''
    
  db.query('SELECT DISTINCT chat_id FROM video_chat_history' , async (Err, chats) =>{
      if (Err) console.log(Err);
      for (var i = 0; i < chats.length; i++) {
          const newMessageCount = await VideoChats.count({
              where: {
                viewed_by_admin: 'no',
                chat_id: chats[i].chat_id,
              },

            });
            const lastMessage = await VideoChats.findOne({
              where: {
                  chat_id: chats[i].chat_id,
              },
              order: [['id', 'DESC']],
            });
          const timestamp = new Date("'"+lastMessage.createdAt+"'");
          const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
          chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetAllChats('`+chats[i].chat_id+`')">
          <div class="d-flex align-items-center">
              <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
              <div>
                <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].chat_id+`</strong></a>
                <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
              </div>
          </div>
          <div class="text-end">
            <span class="d-block mb-5 fs-12">`+time+`</span>`
          if(newMessageCount > 0){
          chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
          } 
          chat += `</div>
      </div>`
      }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    });
});
router.post('/get-video-chat-messages',async (req, res) =>{
  const {message_id} = req.body
  VideoChats.update(
      { viewed_by_admin: 'yes' },
      { where: { chat_id: message_id } }
  );
  var message_history = ''
  db.query('SELECT * FROM video_chat_history WHERE chat_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
      if (Err) console.log(Err);
      message_history += ` <div class="box">
      <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
        <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                 
                </div>
            </div>
        </div>								             
      </div>
      <div class="box-body mb-30">
          <div class="chat-box-six">`
          for (var i = 0; i < chats.length; i++) {
              const timestamp = new Date("'"+chats[i].createdAt+"'");
              const formattedDateTime = timestamp.toLocaleString();   
              if(chats[i].sent_by == "customer"){
                  message_history += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>` 
              }
              else{
                  message_history += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/bot.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>											
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>`
              }
              
          }
          message_history += `</div>
      </div>
        <!--<div class="box-footer">
            <div class="d-md-flex d-block justify-content-between align-items-center">
                <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
            
                    <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                        <i class="mdi mdi-send"></i>
                    </button>
                </div>
            </div>
        </div>-->
    </div>`
      return res.json({status:"success", message:message_history})
    });
});
router.post('/video-chats-onload',async (req, res) =>{
  var chat = ''
    
  db.query('SELECT DISTINCT chat_id FROM video_chat_history' , async (Err, chats) =>{
      if (Err) console.log(Err);
      for (var i = 0; i < chats.length; i++) {
          const newMessageCount = await VideoChats.count({
              where: {
                viewed_by_admin: 'no',
                chat_id: chats[i].chat_id,
              },

            });
            const lastMessage = await VideoChats.findOne({
              where: {
                  chat_id: chats[i].chat_id,
              },
              order: [['id', 'DESC']],
            });
          const timestamp = new Date("'"+lastMessage.createdAt+"'");
          const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
          chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetAllChats('`+chats[i].chat_id+`')">
          <div class="d-flex align-items-center">
              <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
              <div>
                <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].chat_id+`</strong></a>
                <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
              </div>
          </div>
          <div class="text-end">
            <span class="d-block mb-5 fs-12">`+time+`</span>`
          if(newMessageCount > 0){
          chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
          } 
          chat += `</div>
      </div>`
      }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    });
});
router.post('/load-live-chat-history',async (req, res) =>{
  var agent_details = ` <table id="example1" class="table table-bordered table-striped">
  <thead>
      <tr>
          <th>Agent Name</th>
          <th>No of Chats</th>
          <th>Total Chat Time (Minutes)</th>
          <th>Average Chat Time (Minutes)</th>
          <th>Actions</th>
      </tr>
  </thead>
  <tbody>`
  const agents = await Agents.findAll();
    for (var i = 0; i < agents.length; i++) {
      const agent_id = agents[i].user_id
      const agent_name = agents[i].name
      const chat_count = await ChatHeader.count({
        where: {
          agent: agent_id
        }
      });
      const timer = await ChatTimer.findAll({
        where: {
          agent: agent_id
        }
      });
      var timer_total = 0;
          
      if(timer[0]){
      for (var c = 0; c < timer.length; c++) {
            timer_total = ((timer_total + timer[c].time))
      }
      }
      agent_details += `<tr><td>`+agent_name+`</td><td>`+chat_count+`</td><td>`+(timer_total/60).toFixed(2)+`</td>
      <td>`+((timer_total/60)/chat_count).toFixed(2)+`</td><td> <div class="clearfix">
      <a href="/view-agent-chats/`+agent_id+`"><button type="button" class="waves-effect waves-light btn btn-info mb-5 btn-xs">View Chats</button></a>
      <a href="/view-agent-feedbacks/`+agent_id+`"><button type="button" class="waves-effect waves-light btn btn-primary mb-5 btn-xs">View feedbacks</button></a>
  </div></td>`
    }
    agent_details += '</tbody> </table>'  
   
    return res.json({status:"success", message:agent_details})

});
router.post('/agent-add', upload.single('profile_picture'), function(req, res) {
  const fileName = req.file.originalname;
  const {agent_name, phone, email, password, language} = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (Err, result) =>{
    if(Err) throw Err;
    if(result[0]){
      req.flash('error', 'Email Already Registered');
      res.redirect('/add-agent');
    }
    else {
        const crypt_password = await (bcrypt.hash(password, 10));
        db.query('INSERT INTO users SET ?', {email:email, password:crypt_password, user_role:"2", status:'active'}, async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('INSERT INTO other_agent_details SET ?', {user_id:result2.insertId,name:agent_name, phone:phone, profile_picture:fileName, status:'active'}, async (Err3, result3) =>{
                if(Err3) throw Err3;
                for (var i = 0; i < language.length; i++) {
                  db.query('INSERT INTO agent_languages SET ?', {user_id:result2.insertId,language:language[i]}, async (Err3, result3) =>{

                  })
                }
                req.flash('success', 'Agent Added');
                res.redirect('/add-agent');
            })
        })
    }
})
  
  });

  router.post('/agent-edit/:id', upload.single('profile_picture'),function(req, res) {
    $user_id = req.params.id;
    const {agent_name, phone, email, password, language , current_password} = req.body;
    if(current_password == ""){
      db.query('SELECT * FROM users WHERE email = ?', [email], async (Err, result) =>{
        if(Err) throw Err;
        if(result[0]){
            if(result[0].id == $user_id){
                db.query('UPDATE other_agent_details SET name = "'+agent_name+'", phone = "'+phone+'" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
                    if(Err2) throw Err2;
                    db.query('UPDATE users SET email = "'+email+'" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                        if(Err3) throw Err3;
                        db.query('DELETE FROM agent_languages WHERE user_id = "'+$user_id+'"',async (Err4, result4) =>{
                          if(Err3) throw Err3;
                        });
                        for (var i = 0; i < language.length; i++) {
                          db.query('INSERT INTO agent_languages SET ?', {user_id:$user_id,language:language[i]}, async (Err5, result5) =>{
        
                          })
                        }
                        req.flash('success2', 'Agent Updated');
                        res.redirect('/edit-agent/'+$user_id);
                    })
                })
            }
            else{
                req.flash('error2', 'Email has already registered');
                res.redirect('/edit-agent/'+$user_id);
            }   
        }
        else {
          db.query('UPDATE other_agent_details SET name = "'+agent_name+'", phone = "'+phone+'" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET email = "'+email+'" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                db.query('DELETE FROM agent_languages WHERE user_id = "'+$user_id+'"',async (Err4, result4) =>{
                  if(Err3) throw Err3;
                });
                for (var i = 0; i < language.length; i++) {
                  db.query('INSERT INTO agent_languages SET ?', {user_id:$user_id,language:language[i]}, async (Err5, result5) =>{

                  })
                }
                req.flash('success2', 'Agent Updated');
                res.redirect('/edit-agent/'+$user_id);
            })
        })
        }
    })
    }
    else{
      db.query('SELECT * FROM users WHERE email = ?', [email], async (Err, result) =>{
        if(Err) throw Err;
        if(result[0]){
            if(result[0].id == $user_id){
              const crypt_password = await (bcrypt.hash(password, 10));
                db.query('UPDATE other_agent_details SET name = "'+agent_name+'", phone = "'+phone+'" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
                    if(Err2) throw Err2;
                    db.query('UPDATE users SET email = "'+email+'", password = "'+crypt_password+'" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                        if(Err3) throw Err3;
                        db.query('DELETE FROM agent_languages WHERE user_id = "'+$user_id+'"',async (Err4, result4) =>{
                          if(Err3) throw Err3;
                        });
                        for (var i = 0; i < language.length; i++) {
                          db.query('INSERT INTO agent_languages SET ?', {user_id:$user_id,language:language[i]}, async (Err5, result5) =>{
        
                          })
                        }
                        req.flash('success2', 'Agent Updated');
                        res.redirect('/edit-agent/'+$user_id);
                    })
                })
            }
            else{
                req.flash('error2', 'Email has already registered');
                res.redirect('/edit-agent/'+$user_id);
            }   
        }
        else {
          const crypt_password = await (bcrypt.hash(password, 10));
          db.query('UPDATE other_agent_details SET name = "'+agent_name+'", phone = "'+phone+'" WHERE user_id = "'+$user_id+'"',async (Err2, result2) =>{
            if(Err2) throw Err2;
            db.query('UPDATE users SET email = "'+email+'", password = "'+crypt_password+'" WHERE id = "'+$user_id+'"',async (Err3, result3) =>{
                if(Err3) throw Err3;
                db.query('DELETE FROM agent_languages WHERE user_id = "'+$user_id+'"',async (Err4, result4) =>{
                  if(Err3) throw Err3;
                });
                for (var i = 0; i < language.length; i++) {
                  db.query('INSERT INTO agent_languages SET ?', {user_id:$user_id,language:language[i]}, async (Err5, result5) =>{

                  })
                }
                req.flash('success2', 'Agent Updated');
                res.redirect('/edit-agent/'+$user_id);
            })
        })
        }
    })
    }
    });
    router.post('/refresh-live-agent-chats',async (req, res) =>{
      const {agent_id,profile_picture} = req.body
      var chat = ''
      const chats = await ChatHeader.findAll({
        where: {
            agent: agent_id
        }
      });
      for (var i = 0; i < chats.length; i++) {
        const lastMessage = await LiveChatChat.findOne({
          where: {
            message_id: chats[i].message_id,
          },
          order: [['id', 'DESC']],
        });
        const timestamp = new Date("'"+lastMessage.createdAt+"'");
        const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
      chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetLiveAllChats('`+chats[i].message_id+`')">
        <div class="d-flex align-items-center">
            <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="/uploads/`+profile_picture+`" alt="..."></a>
            <div>
              <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
              <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
            </div>
        </div>
        <div class="text-end">
        <span class="d-block mb-5 fs-12">`+time+`</span>`
      chat += `</div>
  </div>`

    }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    
    });
    router.post('/onload-live-chat-history-chats',async (req, res) =>{
      const {agent_id,profile_picture} = req.body
      var chat = ''
      const chats = await ChatHeader.findAll({
        where: {
            agent: agent_id
        }
      });
      for (var i = 0; i < chats.length; i++) {
        const lastMessage = await LiveChatChat.findOne({
          where: {
            message_id: chats[i].message_id,
          },
          order: [['id', 'DESC']],
        });
        const timestamp = new Date("'"+lastMessage.createdAt+"'");
        const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
      chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetLiveAllChats('`+chats[i].message_id+`')">
        <div class="d-flex align-items-center">
            <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="/uploads/`+profile_picture+`" alt="..."></a>
            <div>
              <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
              <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
            </div>
        </div>
        <div class="text-end">
        <span class="d-block mb-5 fs-12">`+time+`</span>`
      chat += `</div>
  </div>`

    }
      return res.json({status:"success", chats:chat, chatsCount:chats.length})
    
    });
    router.post('/get-agent-live-chat-messages',async (req, res) =>{
      const {agent_id,profile_picture,message_id} = req.body
      var chat = ''
      const chats = await LiveChatChat.findAll({
        where: {
          message_id: message_id
        },
        order: [['id', 'ASC']]
      });
      chat += ` <div class="box">
      <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
        <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                 
                </div>
            </div>
        </div>								             
      </div>
      <div class="box-body mb-30">
          <div class="chat-box-six">`
          for (var i = 0; i < chats.length; i++) {
              const timestamp = new Date("'"+chats[i].createdAt+"'");
              const formattedDateTime = timestamp.toLocaleString();   
              if(chats[i].sent_by == "customer"){
                chat += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>` 
              }
              else{
                chat += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/uploads/`+profile_picture+`" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>											
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>`
              }
              
          }
          chat += `</div>
      </div>
        <!--<div class="box-footer">
            <div class="d-md-flex d-block justify-content-between align-items-center">
                <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
            
                    <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                        <i class="mdi mdi-send"></i>
                    </button>
                </div>
            </div>
        </div>-->
    </div>`
      return res.json({status:"success", chats:chat})
    
    });
    router.post('/refresh-selected-agent-live-chat',async (req, res) =>{
      const {profile_picture,message_id} = req.body
      var chat = ''
      const chats = await LiveChatChat.findAll({
        where: {
          message_id: message_id
        },
        order: [['id', 'ASC']]
      });
      chat += ` <div class="box">
      <div class="box-body px-20 py-10 bb-1 bbsr-0 bber-0">
        <div class="d-md-flex d-block justify-content-between align-items-center w-p100">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+message_id+`</strong></a>
                 
                </div>
            </div>
        </div>								             
      </div>
      <div class="box-body mb-30">
          <div class="chat-box-six">`
          for (var i = 0; i < chats.length; i++) {
              const timestamp = new Date("'"+chats[i].createdAt+"'");
              const formattedDateTime = timestamp.toLocaleString();   
              if(chats[i].sent_by == "customer"){
                chat += `<div class="rt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="ms-15  avatar avatar-lg" href="#"><img class="bg-danger-light rounded-circle" src="/images/avatar/avatar-1.png" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment d-table max-w-p70 bg-light mb-15 px-15 py-10 rounded10 bter-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>` 
              }
              else{
                chat += ` <div class="lt-bx mb-30 d-flex align-items-start w-p100">
                  <div>
                      <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light rounded-circle" src="/uploads/`+profile_picture+`" alt="..."></a>
                  </div>
                  <div>
                      <div class="chat-comment box-shadowed d-table max-w-p70 bg-primary mb-15 px-15 py-10 rounded10 btsr-0">
                          <p class="mb-0">`+chats[i].message+`</p>
                      </div>											
                      <p class="text-muted mb-15">`+formattedDateTime+`</p>
                  </div>
                </div>`
              }
              
          }
          chat += `</div>
      </div>
        <!--<div class="box-footer">
            <div class="d-md-flex d-block justify-content-between align-items-center">
                <input class="form-control b-0 py-10" type="text" placeholder="Type something here...">
                <div class="d-flex justify-content-between align-items-center mt-md-0 mt-30">
            
                    <button type="button" class="waves-effect waves-circle btn btn-circle btn-primary">
                        <i class="mdi mdi-send"></i>
                    </button>
                </div>
            </div>
        </div>-->
    </div>`
      return res.json({status:"success", chats:chat})
    });
module.exports = router;