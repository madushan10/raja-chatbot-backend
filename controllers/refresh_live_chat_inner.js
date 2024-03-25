const db = require("../routes/db-config");


const refresh_live_chat_inner = async (req, res) => {
    const {message_id,agent_id} = req.body

    db.query('SELECT * FROM live_chat_timer WHERE message_id = ?', [message_id], async (Err, timer) =>{
        if(!timer[0]){
            db.query('INSERT INTO live_chat_timer SET ?', {message_id:message_id, agent:agent_id, time:1}, async (t_Err2, t_result1) =>{
                if(t_Err2) throw t_Err2;
            })
        }
        else{
            db.query('UPDATE live_chat_timer SET time = "'+(timer[0].time+1)+'" WHERE message_id = "'+message_id+'"',async (t_Err3, t_result3) =>{
                if(t_Err3) throw t_Err3;
            })
        }
    })

    var message_history = ''
    
    db.query('SELECT * FROM live_agent_chat_chats WHERE message_id = ? ORDER BY id ASC' , [message_id], async (Err, chats) =>{
        if (Err) console.log(Err);
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
        return res.json({status:"success", message:message_history})
      });
   
}
module.exports = refresh_live_chat_inner