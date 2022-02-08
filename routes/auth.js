var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var OTPStrategy = require('passport-otp');
var OktaAuth = require('@okta/okta-auth-js').OktaAuth;
var qrcode = require('qrcode');


var authClient = new OktaAuth({
  issuer: process.env['OKTA_URL'],
  clientId: process.env['OKTA_CLIENT_ID']
});

passport.use(new LocalStrategy(function(username, password, cb) {
  authClient.signInWithCredentials({
    username: username,
    password: password
  })
  .then(function(transaction) {
    /*
    var exists = api.tx.exists();
    if (exists) {
      api.tx.resume()
      .then(function(transaction) {
        console.log('current status:', transaction.status);
      })
      .catch(function(err) {
        console.error(err);
      });
    }
    
    return;
    */
    
    console.log(transaction);
    
    var user, info;
    
    switch (transaction.status) {
    case 'SUCCESS':
    case 'MFA_ENROLL':
    case 'MFA_REQUIRED':
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
        factors: transaction.factors,
        stateToken: transaction.data.stateToken
      }
      break;
    case 'MFA_REQUIRED':
      info = {
        status: 'MFA_REQUIRED',
        factors: transaction.factors,
        stateToken: transaction.data.stateToken
      }
      break;
    }
    
    return cb(null, user, info);
  })
  .catch(function(err) {
    // https://developer.okta.com/docs/reference/error-codes/
    switch (err.errorCode) {
    case 'E0000004': // Authentication exception
      return cb(null, false, { message: err.errorSummary });
    default:
      return cb(err);
    }
  });
}));

passport.use(new OTPStrategy({ passReqToCallback: true }, function(req, otp, user, cb) {
  console.log('AUTH THIS OTP!');
  console.log(otp);
  console.log(req.user);
  
  
  authClient.tx.resume({
    stateToken: req.session.stateToken
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
    console.log(err);
    
    
    // https://developer.okta.com/docs/reference/error-codes/
    switch (err.errorCode) {
    case 'E0000068': // Factor invalid code exception
      return cb(null, false, { message: err.errorSummary });
    default:
      return cb(err);
    }
  });
  
  
}));

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


var router = express.Router();

/* GET users listing. */
router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/login/password',
  passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    console.log('AUTHED PASSWORD!');
    console.log(req.user);
    console.log(req.authInfo);
    console.log(req.state);
    console.log(req.session);
    
    req.session.status = req.authInfo.status;
    req.session.stateToken = req.authInfo.stateToken;
    req.session.factors = req.authInfo.factors;
    
    /*
    switch (req.authInfo.status) {
    case 'MFA_REQUIRED':
      return res.pushState({ token: req.authInfo.stateToken }, '/mfa');
    case 'MFA_ENROLL':
      console.log('HANDLE MFA ENROLL...');
      //req.state = req.authInfo;
      //return res.redirect('/enroll');
      //return res.pushState(req.authInfo, '/enroll');
      return res.pushState({ token: req.authInfo.stateToken }, '/enroll');
      return;
      break;
    }
    */
    
    res.redirect('/');
  });

router.post('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/login/otp', function(req, res){
  console.log('MFA!');
  console.log(req.session);
  
  var stateToken = req.session.stateToken;
  console.log('STATE TOKEN IS');
  console.log(stateToken)
  
  authClient.tx.resume({
    stateToken: stateToken
  })
  .then(function(transaction) {
    console.log('X1');
    console.log(transaction);
    
    // FIXME: Don't hard code index, search for Google OTP
    var factor = transaction.factors[0];
    return factor.verify();
  })
  .then(function(transaction) {
    console.log('X2')
    console.log(transaction);
    
    //req.state.token = transaction.data.stateToken;
    //req.state.foo = 'bar';
    
    res.render('login/otp');
  })
  .catch(function(err) {
    console.error(err);
  });
  
});

router.post('/login/otp',
  passport.authenticate('otp', { failureRedirect: '/login/otp' }),
  function(req, res) {
    console.log('AUTHED OTP!');
    console.log(req.session);
  });

router.get('/enroll', function(req, res){
  console.log('ENROLLING!');
  console.log(req.state);
  
  //var factor = req.state.factors[3];
  
  var exists = authClient.tx.exists();
  console.log('EXISTS? ' + exists);
  // FIXME: Why does one exist here on a new request?
  
  
  authClient.tx.resume({
    stateToken: req.state.token
  })
  .then(function(transaction) {
    //console.log(transaction)
    
    // FIXME: Don't hard code index, search for Google OTP
    var factor = transaction.factors[2];
    return factor.enroll();
  })
  .then(function(transaction) {
    console.log('ENROLL THIS THING!');
    console.log(req.state);
    console.log(transaction);
    console.log(transaction.factor.activation);
    
    // generate QR code for scanning into Google Authenticator
    // reference: ttps://github.com/google/google-authenticator/wiki/Key-Uri-Format
    //
    //  TODO: ensure secret is base32 encoded
    // TODO: Put issuer here
    var keyUri = 'otpauth://totp/' + transaction.factor.profile.credentialId
               + '?secret=' + transaction.factor.activation.sharedSecret
               + '&digits=' + transaction.factor.activation.keyLength
               + '&period=' + transaction.factor.activation.timeStep;
    
    console.log('KEY URI IS:');
    console.log(keyUri);
    
    req.state.token = transaction.data.stateToken;
    req.state.foo = 'bar';
    
    qrcode.toDataURL(keyUri, function(err, url) {
      console.log(err);
      console.log(url)
      
      if (err) { return next(err); }
      return res.render('enroll', { user: req.user, qrImageUrl: url });
    });
  })
  .catch(function(err) {
    console.error(err);
  });
  
  
  /*
  if (exists) {
    api.tx.resume()
    .then(function(transaction) {
      console.log('current status:', transaction.status);
      console.log(transaction);
    })
    .catch(function(err) {
      console.error(err);
    });
  }
  */
  
  
});

router.post('/enroll', function(req, res){
  console.log('ACTIVATE ENROLLMENT!');
  console.log(req.body);
  console.log(req.state);
  
  authClient.tx.resume({
    stateToken: req.state.token
  })
  .then(function(transaction) {
    console.log('TXN!');
    console.log(transaction);
    
    return transaction.activate({ passCode: req.body.otp })
  })
  .then(function(transaction) {
    console.log(transaction);
  })
  .catch(function(err) {
    console.error(err);
  });
});

module.exports = router;
