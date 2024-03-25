const db = require("../routes/db-config");
const jwt = require("jsonwebtoken");
const adminloggedin = (req, res, next) => {
    if(!req.cookies.adminLoggedIn) return next();
    try {
        const decode = jwt.verify(req.cookies.adminLoggedIn, process.env.JWT_KEY);
        db.query('SELECT * FROM users WHERE id = ?', [decode.id], async (Err, result) =>{
            req.admin_login_details = result[0];
            return next();
        })
    } catch (e) {
        if(e) return next();
    }
    
}
module.exports = adminloggedin