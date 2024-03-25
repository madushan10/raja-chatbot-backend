const db = require("../routes/db-config");


const close_live_chat = async (req, res) => {
    const {message_id} = req.body
    db.query('UPDATE live_agent_chat_header SET status = "closed" WHERE message_id = "'+message_id+'"',async (Err2, result2) =>{
        if(Err2) throw Err2;
        return res.json({status:"success"})
    })
  
}
module.exports = close_live_chat