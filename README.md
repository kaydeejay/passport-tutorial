# passport-tutorial
A Tutorial to build a quick express server that uses passport to enable creating user credentials and logging in.

## Passport Demo
Build a basic Node/Express app that allows a user to create a username and password, and log onto the application using npm package `passport`. The user data is stored in a mysql database.

This build utilizes sequelize-cli to build the application quickly.

Create a directory that will contain the app\
```mkdir passport-demo```

Install our dependencies.\
```npm i bcryptjs express express-session mysql2 passport passport-local sequelize```

Install sequelize-cli as a dev dependency:\
```npm i --save-dev sequelize-cli```

Your directory will now look like this:
```
/
  node_modules
  package=lock.json
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
  // this allows you to run the node server by entering the command
  // npm run start
  // and to run the server with nodemon
  // npm run watch
```

In a terminal window, at your app’s root directory, run:
npx sequelize-cli init

your directory will now look like this:
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

In /config/config.json, add your mysql username, password, and desired database name to ‘development’. Assuming username is “root”, password is “password”, and database name is “passport_db” 
"development": {
  "username": "<your username>",
  "password": "<your password>",
  "database": "passport_db"
}

Use mysql to create the database: In a terminal window, run mysql:
mysql -u root -p

Enter mysql password when prompted:
Enter Password: ********

Once mysql is running:
mysql> CREATE DATABASE password_db;

Check that it worked, you should see password_db when you run:
mysql> SHOW DATABASES;

Exit mysql:
exit

Use sequelize-cli to create a User Model. IN ONE LINE:
npx sequelize-cli model:generate --name User --attributes email:string,password:string

This will create a new user model file in the models folder, and a new user migration file in the migrations folder. The model file is like a Class that will create a new User object, which sequelize will then add to the mysql database.

Your file structure should now look like this:
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

We will ignore seeders/ for now. Optionally, you can create seed files that you can use to create demo data for your database. More on that can be found here.

Open models/user.js, we need to add some stuff. This is what the file will look like already:
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




And this is with the additions we will make:
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
  User.prototype.validPassword = (password) => {
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



Now we need to add some middleware that will restrict routes only to users who are logged in. Make a directory in `config/` called `middleware`, and a new file `isAuthenticated.js` inside that folder. We can do this by running the following command in a terminal window at your app’s root directory:
mkdir config/middleware && touch config/middleware/isAuthenticated.js

Open up config/middleware/isAuthenticated.js and write the following:

module.exports = (req, res, next) => {
  // if the request does not contain user’s data,
  if (req.user) {
    return next();
  }
  // otherwise send them back to the homepage
  return res.redirect(“/”);
}

We will also add a configuration for passport in config/
In a terminal window at your app’s root directory, run the following:
touch config/passport.js

open config/passport.js and add the following:
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

More on Strategies can be found here

Express Server and Routes:
In a terminal window in the root directory of your app, run the following command:
touch server.js

In server.js, write the following:
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

To finish out the back-end, let’s add our routes.
In a terminal window at your app’s root directory, run the following command:
mkdir routes && touch routes/api-routes.js routes/html-routes.js

Open up routes/api-routes.js and write the following:

