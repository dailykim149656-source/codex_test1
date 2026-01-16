/**
 * User Management System
 * Handles user registration, credits, and usage logging.
 */

// Configuration - REPLACE WITH YOUR ACTUAL SHEET ID
var USERS_SHEET_ID = "REPLACE_WITH_YOUR_SPREADSHEET_ID";

/**
 * Gets user information from the database.
 * @param {string} email
 * @returns {Object|null} User object or null if not found
 */
function getUserInfo(email) {
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();

  // Skip header (row 0)
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return {
        email: data[i][0],
        tier: data[i][1],
        credits: data[i][2],
        joinedAt: data[i][3],
        rowIndex: i + 1, // 1-indexed for Sheet operations
      };
    }
  }
  return null;
}

/**
 * Registers a new user with default free tier.
 * @param {string} email
 * @returns {Object} New user object
 */
function registerNewUser(email) {
  var sheet = getSheet("Users");
  var now = new Date();

  // Default: Free Tier, 3 Credits
  var newUser = [email, "Free", 3, now, now];
  sheet.appendRow(newUser);

  return getUserInfo(email);
}

/**
 * Checks if user has enough credits.
 * @param {Object} user
 * @returns {boolean}
 */
function hasCredits(user) {
  // If user object not passed, fetch it
  if (typeof user === "string") {
    user = getUserInfo(user);
    if (!user) return false;
  }

  return user.credits > 0;
}

/**
 * Consumes a credit for the user and logs usage.
 * @param {string} email
 * @returns {boolean} Success
 */
function consumeCredit(email) {
  var user = getUserInfo(email);
  if (!user || user.credits <= 0) return false;

  var sheet = getSheet("Users");

  // Decrement credit
  var newCredit = user.credits - 1;
  sheet.getRange(user.rowIndex, 3).setValue(newCredit);
  sheet.getRange(user.rowIndex, 5).setValue(new Date()); // Update last login/action

  // Log usage
  logUsage(email, "ANALYSIS", 1);

  return true;
}

/**
 * Resets daily credits for all users.
 * Should be run by a time-driven trigger (e.g., every day at midnight).
 */
function resetDailyCredits() {
  var sheet = getSheet("Users");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var tier = data[i][1];
    var maxCredits = tier === "Pro" ? 10 : 3;

    // Reset credits
    sheet.getRange(i + 1, 3).setValue(maxCredits);
  }
}

/**
 * Helper to get a specific sheet.
 */
function getSheet(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
    return ss.getSheetByName(sheetName);
  } catch (e) {
    return null;
  }
}

/**
 * Logs usage actions.
 */
function logUsage(email, action, cost) {
  try {
    var sheet = getSheet("Usage Logs");
    sheet.appendRow([new Date(), email, action, cost]);
  } catch (e) {
    console.error("Failed to log usage", e);
  }
}

// 검색 키워드 기록
function searchKeywordLog(email, keywords) {
  try {
    var sheet = getSheet("Search Logs");
    if (!sheet) {
      // 시트 없으면 만들기
      var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
      sheet = ss.insertSheet("Search Logs");
      sheet.appendRow(["email", "keyword", "timestamp"]);
    }

    keywords.forEach(function (kw) {
      sheet.appendRow([email, kw.trim(), new Date()]);
    });

    return true;
  } catch (e) {
    console.error("searchKeywordLog error: " + e.message);
    return false;
  }
}

// 리포트 조회 기록
function reportInteractionLog(email, reportUrl) {
  try {
    var sheet = getSheet("Report Interactions");
    if (!sheet) {
      var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
      sheet = ss.insertSheet("Report Interactions");
      sheet.appendRow(["email", "reportUrl", "action", "timestamp"]);
    }

    sheet.appendRow([email, reportUrl, "view", new Date()]);
    return true;
  } catch (e) {
    console.error("reportInteractionLog error: " + e.message);
    return false;
  }
}

// 동의 관리
function updateUserConsent(email, consent_flag) {
  try {
    var sheet = getSheet("User Consent");
    if (!sheet) {
      var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
      sheet = ss.insertSheet("User Consent");
      sheet.appendRow(["email", "consent", "timestamp"]);
    }

    sheet.appendRow([email, consent_flag, new Date()]);
    return true;
  } catch (e) {
    console.error("updateUserConsent error: " + e.message);
    return false;
  }
}

function logAnalysisHistory(email, keywords, reportUrl) {
  try {
    var sheet = getSheet("Analysis History");
    if (!sheet) {
      // Fallback if sheet doesn't exist, though typically we assume it does or handle it like others
      var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
      sheet = ss.insertSheet("Analysis History");
      sheet.appendRow(["email", "timestamp", "reportUrl", "keywords"]);
    }
    var keywordStr = Array.isArray(keywords) ? keywords.join(", ") : keywords;
    sheet.appendRow([email, new Date(), reportUrl, keywordStr]);
  } catch (e) {
    console.error("Failed to log analysis history", e);
  }
}
