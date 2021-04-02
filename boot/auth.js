var passport = require('passport');
var Strategy = require('passport-local');

var OktaAuth = require('@okta/okta-auth-js').OktaAuth;

var authClient = new OktaAuth({
  issuer: process.env['OKTA_URL'],
  clientId: process.env['OKTA_CLIENT_ID']
});


module.exports = function() {

  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.
  passport.use(new Strategy(function(username, password, cb) {
    authClient.signIn({
      username: username,
      password: password
    })
    .then(function(transaction) {
      if (transaction.status === 'SUCCESS') {
        var user = {
          id: transaction.user.id,
          username: transaction.user.profile.login
        }
        user.name = {
          familyName: transaction.user.profile.lastName,
          givenName: transaction.user.profile.firstName
        }
        
        return cb(null, user);
      } else {
        throw 'We cannot handle the ' + transaction.status + ' status';
      }
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