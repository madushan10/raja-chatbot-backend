const adminlogout = (req, res) => {
res.clearCookie("adminLoggedIn");
res.redirect("/admin");
}
module.exports = adminlogout