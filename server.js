const express = require("express");
const session = require("express-session");
// require our passport.js file, 
// which contains passport configuration
const passport = require("./config/passport");

// set up the port, require models
// connection and control of db
let PORT = process.env.PORT || 8080;
const db = require("./models");

// create express app and configure middleware
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// sessions keeps track of user’s login status
app.use(session({
  // "signs" the cookie, making it more secure
  secret: "keyboard cat",
  // tell session store that cookie is still active
  resave: true,
  // save empty/unmodified session objects at end of session
  saveUninitialized: true
}));
// remember configuration for passport is located at 
// ./config/passport.js
app.use(passport.initialize());
app.use(passport.session());

// requiring our routes
require("./routes/html-routes.js")(app);
require("./routes/api-routes.js")(app);

// syncs database and informs the user on success
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`app listening on ${PORT}, visit http://localhost:${PORT}`);
  });
});
