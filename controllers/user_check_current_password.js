const db = require("../routes/db-config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const user_check_current_password = async (req, res) => {
    const {current_password, user_id} = req.body
    
        db.query('SELECT * FROM users WHERE id = ?', [user_id], async (Err, result) =>{
            if(Err) throw Err;
            if(!result[0] || !await bcrypt.compare(current_password, result[0].password)){
                return res.json({status:"failed", message:"Current password is incorrect"})
            }
            else {
                return res.json({status:"success"})
            }
        })
    
}
module.exports = user_check_current_password