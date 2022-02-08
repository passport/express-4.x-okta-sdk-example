var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var qrcode = require('qrcode');
var api = require('../api/auth');


passport.use(new LocalStrategy(function(username, password, cb) {
  api.signIn({
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
        stateToken: transaction.data.stateToken
      }
      break;
    }
    
    return cb(null, user, info);
  })
  .catch(function(err) {
    console.error(err);
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
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    //console.log('AUTHED PASSWORD!');
    //console.log(req.user);
    //console.log(req.authInfo);
    //console.log(req.state);
    
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
    
    
    res.redirect('/');
  });

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/mfa', function(req, res){
  console.log('MFA!');
  console.log(req.state);
  
  api.tx.resume({
    stateToken: req.state.token
  })
  .then(function(transaction) {
    console.log(transaction);
    
    // FIXME: Don't hard code index, search for Google OTP
    var factor = transaction.factors[0];
    return factor.verify();
  })
  .then(function(transaction) {
    console.log(transaction);
    
    req.state.token = transaction.data.stateToken;
    req.state.foo = 'bar';
    
    res.render('mfa');
  })
  .catch(function(err) {
    console.error(err);
  });
  
});

router.post('/mfa',
  passport.authenticate('otp', { failureRedirect: '/login' }),
  function(req, res) {
    console.log('AUTHED OTP!');
  });

router.get('/enroll', function(req, res){
  console.log('ENROLLING!');
  console.log(req.state);
  
  //var factor = req.state.factors[3];
  
  var exists = api.tx.exists();
  console.log('EXISTS? ' + exists);
  // FIXME: Why does one exist here on a new request?
  
  
  api.tx.resume({
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
  
  api.tx.resume({
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
