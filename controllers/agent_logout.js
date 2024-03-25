const agent_logout = (req, res) => {
    res.clearCookie("agentLoggedIn");
    res.redirect("/agent");
    }
    module.exports = agent_logout