var passport = require('passport');
var PasswordStrategy = require('passport-local');
//var OTPStrategy = require('passport-otp');
var api = require('../api/auth');


module.exports = function() {

  // Configure the local strategy for use by Passport.
  //
  // The local strategy requires a `verify` function which receives the credentials
  // (`username` and `password`) submitted by the user.  The function must verify
  // that the password is correct and then invoke `cb` with a user object, which
  // will be set at `req.user` in route handlers after authentication.

  /*
  passport.use(new OTPStrategy({ passReqToCallback: true }, function(req, otp, user, cb) {
    console.log('AUTH OTP');
    console.log(req.state);
    console.log(otp);
    console.log(user);
    
    api.tx.resume({
      stateToken: req.state.token
    })
    .then(function(transaction) {
      console.log(transaction);
      
      return transaction.verify({ passCode: otp })
    })
    .then(function(transaction) {
      console.log(transaction);
      
      switch (transaction.status) {
      case 'SUCCESS':
        return cb(null, true, { method: 'otp' });
      default:
        return cb(new Error(new Error('Unknown authentication transaction status: ' + transaction.status)));
      }
    })
    .catch(function(err) {
      console.error(err);
    });
    
  }));
  */

  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  The
  // typical implementation of this is as simple as supplying the user ID when
  // serializing, and querying the user record by ID from the database when
  // deserializing.
  

};
