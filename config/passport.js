const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const db = require("../models");

// passport will use a Local Strategy
// Strategies are what passport uses to authenticate requests.
// Here we will write a strategy that allows the user to log in
// with a username/email and password.

passport.use(new LocalStrategy(
  {
    usernameField: "email"
  },
  function (email, password, done) {
    // this runs when the user tries to sign in
    db.User.findOne({
      where: {
        email: email
      }
    }).then(function (dbUser) {
      // if the given email does not exist in the database:
      if (!dbUser) {
        return done(null, false, {
          message: "Incorrect Email."
        });
      }
      // if email exists, but password does not match:
      else if (!dbUser.validPassword(password)) {
        return done(null, false, {
          message: "Incorrect Password."
        });
      }
      //if none of the above, return the user
      return done(null, dbUser);
    });
  }
));

// Sequelize serializes and deserializes user. 
// This keeps authentication state across HTTP requests

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

module.exports = passport;
