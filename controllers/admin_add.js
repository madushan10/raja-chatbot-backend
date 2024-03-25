const db = require("../routes/db-config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const admin_add = async (req, res) => {
    const {name, phone, email, password, user_role} = req.body
    
        db.query('SELECT * FROM users WHERE email = ?', [email], async (Err, result) =>{
            if(Err) throw Err;
            if(result[0]){
                return res.json({status:"failed", message:"Email has already registered"})
            }
            else {
                const crypt_password = await (bcrypt.hash(password, 10));
                db.query('INSERT INTO users SET ?', {email:email, password:crypt_password, user_role:user_role, status:'active'}, async (Err2, result2) =>{
                    if(Err2) throw Err2;
                    db.query('INSERT INTO other_admin_details SET ?', {user_id:result2.insertId,name:name, phone:phone, status:'active'}, async (Err3, result3) =>{
                        if(Err3) throw Err3;
                        return res.json({status:"success", message:"Admin Added"})
                    })
                })
            }
        })
    
}
module.exports = admin_add