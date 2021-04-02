var okta = require('@okta/okta-sdk-nodejs');

var client = new okta.Client({
  orgUrl: process.env['OKTA_URL'],
  token: process.env['OKTA_API_TOKEN']
});


exports = module.exports = client;
