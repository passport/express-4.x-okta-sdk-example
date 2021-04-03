var passport = require('passport');
var Strategy = require('passport-local');
var api = require('../api/auth');


module.exports = function() {

  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(function(username, password, cb) {
    api.signIn({
      username: username,
      password: password
    })
    .then(function(transaction) {
      var user, info;
      
      switch (transaction.status) {
      case 'SUCCESS':
      case 'MFA_ENROLL':
        user = {
          id: transaction.user.id,
          username: transaction.user.profile.login
        }
        user.name = {
          familyName: transaction.user.profile.lastName,
          givenName: transaction.user.profile.firstName
        }
        break;
      default:
        return cb(new Error(new Error('Unknown authentication transaction status: ' + transaction.status)));
      }
      
      switch (transaction.status) {
      case 'MFA_ENROLL':
        info = {
          status: 'MFA_ENROLL',
          factors: transaction.factors
        }
        break;
      }
      
      return cb(null, user, info);
    })
    .catch(function(err) {
      console.error(err);
    });
  }));


  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });

  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

};
