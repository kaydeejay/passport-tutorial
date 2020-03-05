// import models and passport config
const db = require("../models");
const passport = require("../config/passport");

module.exports = (app) => {
  // login route
  // send user to member page with valid login credentials
  // otherwise send them error message
  app.post(
    "/api/login",
    passport.authenticate("local"),
    (req, res) => {
      res.json(req.user);
    }
  );

  // signup route
  // user password is hashed and stored with Sequelize User Model and bcryptjs
  app.post("/api/signup", (req, res) => {
    db.User.create({
      email: req.body.email,
      password: req.body.password
    }).then(() => {
      res.redirect(307, "/api/login");
    }).catch((err) => {
      res.status(401).json(err);
    });
  });

  // route for logging user out
  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  // route for getting user data to be used client-side
  app.get("/api/user_data", (req, res) => {
    // if user is not logged in:
    if (!req.user) {
      // send back an empty object
      res.json({});
      // else if user is logged in:
    } else {
      // send back user's email and id
      res.json({
        email: req.user.email,
        id: req.user.id
      });
    }
  });
};