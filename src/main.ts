// NOTE:スプシを同じ場所にコピーできるっぽい
// file.makeCopy( 'fileName’)

const getUserInfo = (params: any) => {
  const jsonData = {
    token: process.env.BOT_USER_OAUTH_TOKEN,
    user: params.event.user,
  };
  const options = {
    method: "get",
    contentType: "application/x-www-form-urlencoded",
    payload: jsonData,
  };

  const res = UrlFetchApp.fetch(
    "https://slack.com/api/users.info",
    options as any
  );

  const userInfo = JSON.parse(res.getContentText());
  return userInfo;
};

const createGoogleSpreadsheet = (name: string) => {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

  if (!sheet) {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const copySheet = spreadsheet.getSheetByName("コピー");

    if (!copySheet) return;

    const newSheet = copySheet.copyTo(spreadsheet);
    newSheet.setName(name);
    return newSheet;
  }

  return sheet;
};

const updateGoogleSpreadsheet = (params: any, sheet: any) => {
  const now = new Date(params.event.event_ts * 1000);
  const date = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd");
  const time =
    ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);

  const text = params.event.text;
  const array = [date, time];

  // 最終行列を取得
  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  //最終行列を指定
  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();
  const syukkin = values[1];
  const taikin = values[2];

  if (["おは", "oha"].includes(text)) {
    // if (!taikin) {
    //   return;
    // }
    sheet.appendRow(array);
  }
  if (["おつ", "otu"].includes(text)) {
    // if (taikin) {
    //   return;
    // }
    sheet.getRange(lastrow, 3).setValue(time);
    sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);
    // ついでに関数も入れる
  }
};

const notifyToSlack = (params: any) => {
  const url = process.env.SLACK_INCOMING_WEBHOOK;

  const user = params.event.user;
  const text = params.event.text;

  if (!url) return;

  const jsonData = {
    username: user,
    icon_emoji: ":dog:",
    text: `<@${user}> ${text}`,
  };
  const payload = JSON.stringify(jsonData);

  const options = {
    method: "post",
    contentType: "application/json",
    payload: payload,
  };

  UrlFetchApp.fetch(url, options as any);
};

const greeting = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());
  const response = ContentService.createTextOutput(params.challenge);

  // SlackのEvent SubscriptionのRequest Verification用
  if (params.type === "url_verification") return response;

  // Botによるメンションは無視
  if ("subtype" in params.event) return;

  const userInfo = getUserInfo(params);

  if (!userInfo) return;

  const name = userInfo.user.real_name;

  const sheet = createGoogleSpreadsheet(name);

  updateGoogleSpreadsheet(params, sheet);

  notifyToSlack(params);

  return;
};

(global as any).doPost = greeting;
