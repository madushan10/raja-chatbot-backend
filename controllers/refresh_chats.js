const db = require("../routes/db-config");
const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, {
  host: process.env.DATABASE_HOST,
  dialect: 'mysql' 
});
var BotChats = sequelize.define('chat_bot_chats', {
    message_id :Sequelize.INTEGER,
    language : Sequelize.TEXT,
    message : Sequelize.TEXT,
    message_sent_by : Sequelize.TEXT,
    viewed_by_admin : Sequelize.TEXT,
  }, {
   tableName: 'chat_bot_chats'
  });

const refresh_chats = async (req, res) => {
    var chat = ''
    
    db.query('SELECT DISTINCT message_id FROM chat_bot_chats' , async (Err, chats) =>{
        if (Err) console.log(Err);
        for (var i = 0; i < chats.length; i++) {
            const newMessageCount = await BotChats.count({
                where: {
                  viewed_by_admin: 'no',
                  message_id: chats[i].message_id,
                },
              });
              const lastMessage = await BotChats.findOne({
                where: {
                  message_id: chats[i].message_id,
                },
                order: [['id', 'DESC']],
              });
            const timestamp = new Date("'"+lastMessage.createdAt+"'");
            const time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });  
            
            chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up" onclick="GetAllChats('`+chats[i].message_id+`')">
            <div class="d-flex align-items-center">
                <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
                <div>
                  <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
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
}
module.exports = refresh_chats