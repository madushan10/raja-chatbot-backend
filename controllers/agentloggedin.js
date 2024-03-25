const db = require("../routes/db-config");
const jwt = require("jsonwebtoken");
const agentloggedin = (req, res, next) => {
    if(!req.cookies.agentLoggedIn) return next();
    try {
        const decode = jwt.verify(req.cookies.agentLoggedIn, process.env.JWT_KEY);
        db.query('SELECT * FROM users WHERE id = ?', [decode.id], async (Err, result) =>{
            req.agent_login_details = result[0];
            return next();
        })
    } catch (e) {
        if(e) return next();
    }
    
}
module.exports = agentloggedin