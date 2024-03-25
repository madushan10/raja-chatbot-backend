const db = require("../routes/db-config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const admin_update = async (req, res) => {
    const {admin_name, phone, email, user_id} = req.body
    
        db.query('SELECT * FROM users WHERE email = ?', [email], async (Err, result) =>{
            if(Err) throw Err;
            if(result[0]){
                if(result[0].id == user_id){
                    db.query('UPDATE other_admin_details SET name = "'+admin_name+'", phone = "'+phone+'" WHERE user_id = "'+user_id+'"',async (Err2, result2) =>{
                        if(Err2) throw Err2;
                        db.query('UPDATE users SET email = "'+email+'" WHERE id = "'+user_id+'"',async (Err3, result3) =>{
                            if(Err3) throw Err3;
                            return res.json({status:"success", message:"Admin Updated"})
                        })
                    })
                }
                else{
                    return res.json({status:"failed", message:"Email has already registered"})
                }   
            }
            else {
                db.query('UPDATE other_admin_details SET name = "'+admin_name+'", phone = "'+phone+'" WHERE user_id = "'+user_id+'"',async (Err2, result2) =>{
                    if(Err2) throw Err2;
                    db.query('UPDATE users SET email = "'+email+'" WHERE id = "'+user_id+'"',async (Err3, result3) =>{
                        if(Err3) throw Err3;
                        return res.json({status:"success", message:"Admin Updated"})
                    })
                })
            }
        })
    
}
module.exports = admin_update