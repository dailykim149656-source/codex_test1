/**
 * DEBUG SCRIPT
 * Run the function below (runDebug) to test your API key and Model availability directly.
 */

// 1. 여기에 AI Studio에서 받은 API 키를 붙여넣으세요.
var API_KEY = "AIzaSy...PUT_YOUR_KEY_HERE";

function runDebug() {
  if (API_KEY.includes("PUT_YOUR_KEY_HERE")) {
    Logger.log("❌ ERROR: Please paste your API KEY in line 7!");
    return;
  }

  Logger.log("🔎 Starting Debug Test...");
  Logger.log("Key: " + API_KEY.substring(0, 5) + "...");

  // 1. Check Available Models
  checkModels("v1beta");
  checkModels("v1");

  // 2. Try a simple generation
  tryGenerate("gemini-1.5-flash", "v1beta");
  tryGenerate("gemini-pro", "v1");
}

function checkModels(version) {
  Logger.log("\n📡 Listing Models (" + version + ")...");
  var url =
    "https://generativelanguage.googleapis.com/" +
    version +
    "/models?key=" +
    API_KEY;
  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      if (data.models) {
        data.models.forEach(function (m) {
          if (m.name.includes("gemini")) Logger.log("   - " + m.name);
        });
      } else {
        Logger.log("   ⚠️ No models found.");
      }
    } else {
      Logger.log(
        "   ❌ Error " + resp.getResponseCode() + ": " + resp.getContentText()
      );
    }
  } catch (e) {
    Logger.log("   ❌ Connection Failed: " + e.toString());
  }
}

function tryGenerate(modelName, version) {
  Logger.log("\n🧪 Testing Generation: " + modelName + " (" + version + ")...");
  var url =
    "https://generativelanguage.googleapis.com/" +
    version +
    "/models/" +
    modelName +
    ":generateContent?key=" +
    API_KEY;
  var payload = {
    contents: [{ parts: [{ text: "Hello, verify connection." }] }],
  };

  try {
    var resp = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    if (resp.getResponseCode() === 200) {
      Logger.log("   ✅ SUCCESS! Response received.");
    } else {
      Logger.log(
        "   ❌ FAILED " + resp.getResponseCode() + ": " + resp.getContentText()
      );
    }
  } catch (e) {
    Logger.log("   ❌ Exception: " + e.toString());
  }
}
