const express = require("express");
const cors = require('cors');
const path = require("path")
const db = require("./routes/db-config")
const app = express();
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 7000;
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(cookieParser());
app.use(cors());
express.set('view engine', 'ejs');
db.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("MYSQL CONNECTED")
    }
})
app.use('/', require('./routes/pages'));
app.use('/api', require('./controllers/auth'));

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));