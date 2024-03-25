const db = require("../routes/db-config");
const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql' 
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
var LiveChatChat = sequelize.define('live_agent_chat_chats', {
    message_id :Sequelize.TEXT,
    sent_by : Sequelize.TEXT,
    message : Sequelize.TEXT,
    sent_to_user : Sequelize.TEXT,
    viewed_by_agent : Sequelize.TEXT,
  }, {
   tableName: 'live_agent_chat_chats'
  });
const reply_to_live_chat = async (req, res) => {
    const {message_id,agent_id} = req.body
    LiveChatChat.update(
        { viewed_by_agent: 'yes' },
        { where: { message_id: message_id } }
    );
    var message_history = ''
    db.query('UPDATE live_agent_chat_header SET agent = "'+agent_id+'" WHERE message_id = "'+message_id+'"',async (Err2, result2) =>{
        if(Err2) throw Err2;
        db.query('SELECT * FROM live_agent_chat_chats WHERE message_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
            if (Err) console.log(Err);
            message_history += `<div class="chatbox" id="main-chat-`+message_id+`">
            <div class="chatbox-top">
              <div class="chat-partner-name">
              #`+message_id+`
              </div>
              <div class="chatbox-icons">
                  <button type="button" class="waves-effect waves-light btn btn-danger mb-5 btn-xs" onclick="CloseLiveChat('`+message_id+`')">Close Chat</button>     
              </div>      
            </div>
            <div class="chat-messages  inner-live-chats" id="live-chat-inner-`+message_id+`" data-id="`+message_id+`">`
            for (var i = 0; i < chats.length; i++) {
                const timestamp = new Date("'"+chats[i].createdAt+"'");
                const formattedDateTime = timestamp.toLocaleString(); 
                if(chats[i].sent_by == "customer"){
                    message_history += `<div class="chat-msg user">
                    <div class="d-flex align-items-center">
                        <span class="msg-avatar">
                            <img src="/images/avatar/avatar-1.png" class="avatar avatar-lg">
                        </span>
                        <div class="mx-10">
                            <a href="#" class="text-dark hover-primary fw-bold">Customer</a>
                            <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
                        </div>
                    </div>
                    <div class="cm-msg-text">
                    `+chats[i].message+`
                    </div>
                </div>`
                }
                else if(chats[i].sent_by == "bot"){
                    message_history += `<div class="chat-msg self">
                    <div class="d-flex align-items-center justify-content-end">
                        <div class="mx-10">
                            <a href="#" class="text-dark hover-primary fw-bold">Bot</a>
                            <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
                        </div>
                        <span class="msg-avatar">
                            <img src="/images/avatar/bot.png" class="avatar avatar-lg">
                        </span>
                    </div>
                    <div class="cm-msg-text">
                    `+chats[i].message+`         
                    </div>        
                </div>`
                }
                else{
                    message_history += `<div class="chat-msg self">
                    <div class="d-flex align-items-center justify-content-end">
                        <div class="mx-10">
                            <a href="#" class="text-dark hover-primary fw-bold">You</a>
                            <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
                        </div>
                        <span class="msg-avatar">
                            <img src="../images/avatar/3.jpg" class="avatar avatar-lg">
                        </span>
                    </div>
                    <div class="cm-msg-text">
                    `+chats[i].message+`        
                    </div>        
                </div>`
                }
            }
            message_history += `</div>
            <div class="chat-input-holder">
            <textarea class="chat-input" id="agent-reply-message-`+message_id+`"></textarea>
            <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplyChat('`+message_id+`')">Send</button>     
            </div>`
            return res.json({status:"success", message:message_history})
          });
    })
  
}
module.exports = reply_to_live_chat