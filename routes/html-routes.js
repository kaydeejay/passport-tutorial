const path = require("path");

// uses the isAuthenticated middleware
// checks if a user is logged in
// will not return some pages if not
const isAuthenticated = require("../config/middleware/isAuthenticated");

module.exports = (app) => {
  app.get("/", (req, res) => {
    // if the user is logged in:
    if (req.user) {
      // forward them to members page
      res.redirect("/members");
    }
    // otherwise send them to signup page
    res.sendFile(path.join(__dirname, "../public/signup.html"));
  });

  app.get("/login", (req, res) => {
    // if user already has an account, forward to members page
    if (req.user) {
      res.redirect("/members");
    }
    res.sendFile(path.join(__dirname, "../public/login.html"));
  });

  // using isAuthenticated middleware, 
  // non-logged-in users who try to access /members
  // will be redirected to signup
  app.get("/members", isAuthenticated, function (req, res) {
    res.sendFile(path.join(__dirname, "../public/members.html"));
  });
}