var OktaAuth = require('@okta/okta-auth-js').OktaAuth;

var authClient = new OktaAuth({
  issuer: process.env['OKTA_URL'],
  clientId: process.env['OKTA_CLIENT_ID']
});


exports = module.exports = authClient;
