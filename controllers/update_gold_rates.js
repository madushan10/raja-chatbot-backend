const db = require("../routes/db-config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const update_gold_rates = async (req, res) => {
    const {gold_rate_22k, old_gold_exchange_rate, gold_coin_price, id} = req.body
    
    db.query('UPDATE gold_rates SET gold_rate_22k = "'+gold_rate_22k+'", old_gold_exchange_rate = "'+old_gold_exchange_rate+'", gold_coin_price = "'+gold_coin_price+'" WHERE id = "'+id+'"',async (Err3, result3) =>{
        if(Err3) throw Err3;
        return res.json({status:"success", message:"Rates Updated"})
    })
    
}
module.exports = update_gold_rates