const db = require("../routes/db-config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const adminlogin = async (req, res) => {
    const {email, password, user_role} = req.body
    if(!email || !password ){
        return res.json({status:"failed", message:"Please enter both email and password"})
    }
    else{
        db.query('SELECT * FROM users WHERE email = ? AND user_role = ? AND status = ?' , [email, user_role, 'active'], async (Err, result) =>{
            if(Err) throw Err;
            if(!result[0] || !await bcrypt.compare(password, result[0].password)){
                return res.json({status:"failed", message:"Invalid user name or password"})
            }
            else {
                const token = jwt.sign({ id:result[0].id }, process.env.JWT_KEY, {
                    expiresIn:process.env.JWT_EXPIRES,
                })

                const cookieOptions = {
                    expiresIn:new Date(Date.now() + process.env.COOKIE_EXPIRES * 24 *60 *60 * 100),
                    httpOnly: true
                }
                res.cookie("adminLoggedIn", token, cookieOptions);
                return res.json({status:"success", message:"User Logged In"})
            }
        })
    }
}
module.exports = adminlogin