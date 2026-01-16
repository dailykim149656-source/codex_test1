/**
 * Web App Handlers
 * Serves the HTML and handles API requests from the frontend.
 */

// Global User Cache
var userCache = null;

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('dashboard');
  return template.evaluate()
      .setTitle('Stock AI Analyst')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Wrapper to safely get user info for frontend.
 * Automatically registers new users.
 */
function getUserInfoWrapper() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return null;
  
  var user = getUserInfo(email);
  if (!user) {
    user = registerNewUser(email);
  }
  return user;
}

// Logic moved to api.gs
