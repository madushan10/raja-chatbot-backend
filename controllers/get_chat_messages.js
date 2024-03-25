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

const get_chat_messages = async (req, res) => {
    const {message_id} = req.body
    BotChats.update(
        { viewed_by_admin: 'yes' },
        { where: { message_id: message_id } }
    );
    var message_history = ''
    db.query('SELECT * FROM chat_bot_chats WHERE message_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
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
                if(chats[i].message_sent_by == "customer"){
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
   
}
module.exports = get_chat_messages