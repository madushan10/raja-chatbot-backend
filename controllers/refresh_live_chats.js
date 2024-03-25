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
  }, {
   tableName: 'live_agent_chat_chats'
  });
const refresh_live_chats = async (req, res) => {
    const {agent_id} = req.body
    var chat = ''
    
    db.query('SELECT * FROM live_agent_chat_header WHERE agent = ? AND status = ?', ['unassigned','live'] , async (Err, chats) =>{
        db.query('SELECT * FROM agent_languages WHERE user_id = ?', [agent_id], async function(err2, languages) {
            for (var i = 0; i < chats.length; i++) {
                const newMessageCount = await LiveChatChat.count({
                    where: {
                      viewed_by_agent: 'no',
                      message_id: chats[i].message_id,
                    },
    
                  });
                  const lastMessage = await LiveChatChat.findOne({
                    where: {
                      message_id: chats[i].message_id,
                    },
                    order: [['id', 'DESC']],
                  });
                  const timestamp = new Date("'"+lastMessage.createdAt+"'");
                 const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });
                for (var c = 0; c < languages.length; c++){
                    if(languages[c].language == chats[i].language){
                        chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up">
                        <div class="d-flex align-items-center">
                            <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
                            <div>
                              <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
                              <p class="mb-0">`+lastMessage.message.slice(0, 30)+` ...</p>
                              <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplayToLiveChat('`+chats[i].message_id+`')">REPLY</button>
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
            }}
            return res.json({status:"success", chats:chat, chatsCount:chats.length})
        })
        
      });
   
}
module.exports = refresh_live_chats