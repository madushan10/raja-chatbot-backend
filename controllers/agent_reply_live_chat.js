const db = require("../routes/db-config");


const agent_reply_live_chat = async (req, res) => {
    const {message_id,reply_message} = req.body

    db.query('INSERT INTO live_agent_chat_chats SET ?', {message_id:message_id, sent_by:'agent', message:reply_message,sent_to_user:'no'}, async (Err3, result3) =>{
        if(Err3) throw Err3;
        return res.json({status:"success"})
    })
  
}
module.exports = agent_reply_live_chat