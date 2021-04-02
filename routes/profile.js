var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var api = require('../api');

var router = express.Router();

/* GET users listing. */
router.get('/', ensureLoggedIn(), function(req, res, next) {
  api.getUser(req.user.id)
    .then(function(user) {
      var profile = {
        id: user.id,
        username: user.profile.login
      }
      profile.name = {
        familyName: user.profile.lastName,
        givenName: user.profile.firstName
      };
      
      profile.emails = [{ value: user.profile.email }];
      
      res.render('profile', { user: profile });
    }, function(err) {
      return next(err);
    });
});

module.exports = router;
