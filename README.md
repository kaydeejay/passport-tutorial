# passport-tutorial
A Tutorial to build a quick express server that uses passport and sequelize to enable creating user credentials and logging in.

## Passport/Sequelize Demo
Build a basic Node/Express app that allows a user to create a username and password, and log onto the application using npm package `passport`. The user data is stored in a mysql database.

This build utilizes sequelize-cli to build the application quickly.

Prerequisites: 
- MySQL
- Node
- NPM
- Nodemon

Create a directory that will contain the app.
In a terminal window, `cd` to wherever you want your application to live, then run:
```mkdir passport-demo```

Install dependencies.
```npm i bcryptjs express express-session mysql2 passport passport-local sequelize```

Install sequelize-cli as a dev dependency:
```npm i --save-dev sequelize-cli```

Your directory will now look like this:
```
/
  node_modules
  package-lock.json
  package.json
```

in package-lock.json, add to “scripts” so that it looks like this:
```
"scripts": {
  “test”: “echo \”Error: no test specified\” && exit 1”,
  // add:
  “start”: “node server.js”,
  “watch”: “nodemon server.js”
  }
```
  This allows you to run the node server by entering the command `npm run start`, and to run the server with nodemon `npm run watch`.

In a terminal window, at your app’s root directory, run:
```npx sequelize-cli init```

your directory will now look like this:
```
/
  /config
    config.json
  /migrations
  /models
    index.js
  /node_modules
  /seeders
package-lock.json
package.json
```

In ```/config/config.json```, add your mysql username, password, and desired database name to ‘development’. Replace all values in angle brackets with your own data.
```
"development": {
  "username": "<mysql username>",
  "password": "<password>",
  "database": "<databse_name>"
}
```

## Use mysql to create the database:

In a terminal window, run mysql:
```mysql -u root -p```

Enter mysql password when prompted:
```Enter Password: ********```

Once mysql is running:
```mysql> CREATE DATABASE password_db;```

Check that it worked, you should see password_db when you run:
```mysql> SHOW DATABASES;```

Exit mysql:
```mysql> exit```

## Use sequelize-cli to create a User Model.

In a terminal window at your app's route directory:
```npx sequelize-cli model:generate --name User --attributes email:string,password:string```

This will create a new user model file in the models folder, and a new user migration file in the migrations folder. The model file is like a Class that will create a new User object, which sequelize will then add to the mysql database.

Your file structure should now look like this:
```
/
  config/
    config.json
  migrations/
    xxxxxxxxxxxxxx-create-user.js
  models/
    index.js
    user.js
  node_modules/
  seeders/
  package-lock.json
  package.json
```

We will ignore seeders/ for now. Optionally, you can create seed files that you can use to create demo data for your database. More on that can be found [here](https://sequelize.org/master/manual/migrations.html).

Open models/user.js, we need to add some stuff. This is what the file will look like already:
```
‘use strict’;
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(‘User’, {
    email: DataTypes.STRING,
    password: DataTypes.STRING
  }, {});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};
```

And this is with the changes we will make:
```
const bcrypt = require("bcryptjs");
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(“User”, {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false      
    }
  });
  // uses the bcryptjs library to check if the unhashed password entered by
  // the user matches the encrypted password already stored in the database
  User.prototype.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
  };
  // Before a user is created, their password is automatically hashed:
  User.addHook(“beforeCreate”, (user) => {
    user.password = bcrypt.hashSync(
      user.password, 
      bcrypt.genSaltSync(10), 
      null);
  });
  return User;
}
```

## isAuthenticated Middleware

Now we need to add some middleware that will restrict routes only to users who are logged in. Make a directory in `config/` called `middleware`, and a new file `isAuthenticated.js` inside that folder. We can do this by running the following command in a terminal window at your app’s root directory:\
```mkdir config/middleware && touch config/middleware/isAuthenticated.js```

Open up `config/middleware/isAuthenticated.js` and write the following:

```
module.exports = (req, res, next) => {
  // if the request contains user’s data,
  if (req.user) {
    return next();
  }
  // otherwise send them back to the homepage
  return res.redirect(“/”);
}
```

## Configure Passport

In a terminal window at your app’s root directory, run the following:\
```touch config/passport.js```

open `config/passport.js` and write the following:
```
const passport = require("passport");
const LocalStrategy = require(“passport-local”).Strategy;

const db = require(“../models”);

// passport will use a Local Strategy
// Strategies are what passport uses to authenticate requests.
// Here we will write a strategy that allows the user to log in
// with a username/email and password.

passport.use(new LocalStrategy(
  {
    usernameField: “email”
  },
  (email, password, done) => {
    // this runs when the user tries to sign in
    db.User.findOne({
      where: {
        email: email
      }
    }).then(dbUser => {
      // if the given email does not exist in the database:
      if (!dbUser) {
        return done(null, false, {
          message: “Incorrect Email.”
        });
      }
      // if email exists, but password does not match:
      else if (!dbUser.validPassword(password)) {
        return done(null, false, {
          message: “Incorrect Password.”
        });
      }
      // if none of the above, return the user
      return done(null, dbUser);
    });
  }
));

// Sequelize serializes and deserializes user. 
// This keeps authentication state across HTTP requests

passport.serializeUser((user,cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

module.exports = passport;
```

More on Strategies can be found [here](http://www.passportjs.org/docs/configure/).

## Express Server and Routes

In a terminal window in the root directory of your app, run the following command:\
```touch server.js```

In server.js, write the following:\
```
const express = require("express");
const session = require(“express-session”);
// require our passport.js file, 
// which contains passport configuration
const passport = require(“./config/passport”);

// set up the port, require models
// connection and control of db
let PORT = process.env.PORT || 8080;
const db = require(“./models”);

// create express app and configure middleware
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(“public”));

// sessions keeps track of user’s login status
app.use(session({
  // “signs” the cookie, making it more secure
  secret: “keyboard cat”,
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
require(“./routes/html-routes.js”)(app);
require(“./routes/api-routes.js”)(app);

// syncs database and informs the user on success
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`app listening on ${PORT}, visit http://localhost:${PORT}`);
  });
});
```

To finish out the back-end, let’s add our routes.
In a terminal window at your app’s root directory, run the following command:
```mkdir routes && touch routes/api-routes.js routes/html-routes.js```

Open up routes/api-routes.js and write the following:
```
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
    (req,res) => {
      res.json(req.user);
    }
  );
  
  // signup route
  // user password is hashed and stored with Sequelize User Model and bcryptjs
  app.post(
    "/api/signup", 
    (req,res) => {
      db.User.create({
        email: req.body.email,
        password: req.body.password
      }).then(() => {
        res.redirect(307, "/api/login");
      }).catch((err) => {
        res.status(401).json(err);
      });
    }
  );

  // route for logging user out
  app.get(
    "/logout",
    (req,res) => {
      req.logout();
      res.redirect("/");
    }
  );
  
  // route for getting user data to be used client-side
  app.get(
    "/api/user_data",
    (req.res) => {
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
    }
  );
};
```

Our server.js file will require these api routes. This file will determine the logic for what happens when the front end makes a call on any of the exported routes.

`html-routes.js`, on the other hand, will send static pages back to the user when the front end makes the relevant calls.

routes/html-routes.js:
```
const path = require("path");

// uses the isAuthenticated middleware
// checks if a user is logged in
// will not return some pages if not
const isAuthenticated = require("../config/middleware/isAuthenticated");

module.exports = (app) => {
  app.get(
    "/",
    (req,res) => {
      // if the user is logged in:
      if (req.user) {
        // forward them to members page
        res.redirect("/members");
      }
      // otherwise send them to signup page
      res.sendFile(path.join(__dirname, "../public/signup.html"));
    }
  );

  app.get(
    "/login",
    (req,res) => {
      // if user already has an account, forward to members page
      if (req.user) {
        res.redirect("/members");
      }
      res.sendFile(path.join(__dirname, "../public/login.html"));
    }
  );

  // using isAuthenticated middleware, 
  // non-logged-in users who try to access /members
  // will be redirected to signup
  app.get("/members", isAuthenticated, function(req, res) {
    res.sendFile(path.join(__dirname, "../public/members.html"));
  });
}

```

## Adding the front-end.
In a terminal window at the root directory, run:\
```mkdir public && mkdir public/js public/stylesheets```

Create the html files:
```
touch public/login.html public/members.html public/signup.html
```

Create the css file:
```touch public/stylesheets/style.css```

Create the js files:
```touch public/js/login.js public/js/members.js public/js/signup.js```

### js files:

`login.js` takes the values from the login form and makes the post call to the `api/login` route
```
$(document).ready(function(){
  const loginForm = $("form.login");
  const emailInput = $("input#email-input");
  const passwordInput = $("input#password-input");

  loginForm.on("submit", function(event) {
    event.preventDefault();
    const userData = {
      email: emailInput.val().trim(),
      password: passwordInput.val().trim()
    };

    if (!userData.email || !userData.password) {
      return;
    }

    loginUser(userData.email, userData.password);
    emailInput.val("");
    passwordInput.val("");
  });

  function loginUser(email, password) {
    $.post("/api/login", {
      email: email,
      password: password
    })
      .then(function() {
        window.location.replace("/members");
      })
      .catch(function(err) {
        console.log(err);
      });
  }
});
```

`members.js` makes the get request on the `api/user_data` route to display the user's email on the page:
```
$(document).ready(function() {
  // This file just does a GET request to figure out which user is logged in
  // and updates the HTML on the page
  $.get("/api/user_data").then(function(data) {
    $(".member-name").text(data.email);
  });
});
```

`signup.js` is similar to `login.js` but makes a user object and makes a post call to `api/signup`:

```
$(document).ready(function() {
  const signUpForm = $("form.signup");
  const emailInput = $("input#email-input");
  const passwordInput = $("input#password-input");

  signUpForm.on("submit", function(event) {
    event.preventDefault();
    const userData = {
      email: emailInput.val().trim(),
      password: passwordInput.val().trim()
    };

    if (!userData.email || !userData.password) {
      return;
    }
    signUpUser(userData.email, userData.password);
    emailInput.val("");
    passwordInput.val("");
  });

  function signUpUser(email, password) {
    $.post("/api/signup", {
      email: email,
      password: password
    })
      .then(function(data) {
        window.location.replace("/members");
        // If there's an error, handle it by throwing up a bootstrap alert
      })
      .catch(handleLoginErr);
  }

  function handleLoginErr(err) {
    $("#alert .msg").text(err.responseJSON);
    $("#alert").fadeIn(500);
  }
});
```

### html files
These are all just static pages.

login.html:
```
$(document).ready(function() {
  // Getting references to our form and input
  var signUpForm = $("form.signup");
  var emailInput = $("input#email-input");
  var passwordInput = $("input#password-input");

  // When the signup button is clicked, we validate the email and password are not blank
  signUpForm.on("submit", function(event) {
    event.preventDefault();
    var userData = {
      email: emailInput.val().trim(),
      password: passwordInput.val().trim()
    };

    if (!userData.email || !userData.password) {
      return;
    }
    // If we have an email and password, run the signUpUser function
    signUpUser(userData.email, userData.password);
    emailInput.val("");
    passwordInput.val("");
  });

  // Does a post to the signup route. If successful, we are redirected to the members page
  // Otherwise we log any errors
  function signUpUser(email, password) {
    $.post("/api/signup", {
      email: email,
      password: password
    })
      .then(function(data) {
        window.location.replace("/members");
        // If there's an error, handle it by throwing up a bootstrap alert
      })
      .catch(handleLoginErr);
  }

  function handleLoginErr(err) {
    $("#alert .msg").text(err.responseJSON);
    $("#alert").fadeIn(500);
  }
});
```

members.html:
```
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Passport Authentication</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/lumen/bootstrap.min.css">
  <link href="stylesheets/style.css" rel="stylesheet">
</head>

<body>
  <nav class="navbar navbar-default">
  <div class="container-fluid">
    <div class="navbar-header">
      <a class="navbar-brand" href="/logout">
        Logout
      </a>
    </div>
  </div>
</nav>
  <div class="container">
    <div class="row">
      <div class="col-md-6 col-md-offset-3">
        <h2>Welcome <span class="member-name"></span></h2>
      </div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <script type="text/javascript" src="js/members.js"></script>

</body>

</html>
```

signup.html
```
<!DOCTYPE html>
<html lang="en">

<head>
  <title>Passport Authentication</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootswatch/3.3.7/lumen/bootstrap.min.css">
  <link href="stylesheets/style.css" rel="stylesheet">
</head>

<body>
  <nav class="navbar navbar-default">
    <div class="container-fluid">
      <div class="navbar-header">
      </div>
    </div>
  </nav>
  <div class="container">
    <div class="row">
      <div class="col-md-6 col-md-offset-3">
        <h2>Sign Up Form</h2>
        <form class="signup">
          <div class="form-group">
            <label for="exampleInputEmail1">Email address</label>
            <input type="email" class="form-control" id="email-input" placeholder="Email">
          </div>
          <div class="form-group">
            <label for="exampleInputPassword1">Password</label>
            <input type="password" class="form-control" id="password-input" placeholder="Password">
          </div>
          <div style="display: none" id="alert" class="alert alert-danger" role="alert">
            <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
            <span class="sr-only">Error:</span> <span class="msg"></span>
          </div>
          <button type="submit" class="btn btn-default">Sign Up</button>
        </form>
        <br />
        <p>Or log in <a href="/login">here</a></p>
      </div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
  <script type="text/javascript" src="js/signup.js"></script>

</body>

</html>
```

### css files
styling for the static html pages:
style.css:
```
form.signup,
form.login {
  margin-top: 50px;
}
```

## Running the server
In a terminal at your app's root directory, run `npm run watch`. This will run the server in nodemon. If you don't get any errors, you should get a message in your console that you are successfully connected to the database, and a link to open in your browser.