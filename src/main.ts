// NOTE:スプシを同じ場所にコピーできるっぽい
// file.makeCopy( 'fileName’)
// const text = params.event.text;

const notifyToSlack = (params: any, message: string) => {
  const url = process.env.SLACK_INCOMING_WEBHOOK;
  const user = params.event.user;

  if (!url) return;

  const jsonData = { text: `<@${user}> ${message}` };
  const payload = JSON.stringify(jsonData);

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: payload,
  });
};

const getUserName = (params: any) => {
  const jsonData = {
    token: process.env.BOT_USER_OAUTH_TOKEN,
    user: params.event.user,
  };

  const res = UrlFetchApp.fetch("https://slack.com/api/users.info", {
    method: "get",
    contentType: "application/x-www-form-urlencoded",
    payload: jsonData,
  });

  const userInfo = JSON.parse(res.getContentText());

  if (!userInfo) {
    notifyToSlack(params, "getUserNameに失敗したかに!");
    return;
  }

  return userInfo.user.real_name;
};

const createGoogleSpreadsheet = (params: any, name: string) => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const copySheet = spreadsheet.getSheetByName("コピー");

  if (!copySheet) {
    notifyToSlack(params, "createGoogleSpreadsheetに失敗したかに!");
    return;
  }

  const newSheet = copySheet.copyTo(spreadsheet);
  newSheet.setName(name);
  return newSheet;
};

const getGoogleSpreadsheet = (params: any, name: string) => {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

  if (!sheet) {
    const newSheet = createGoogleSpreadsheet(params, name);
    return newSheet;
  }

  return sheet;
};

const updateGoogleSpreadsheet = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | undefined
) => {
  if (!sheet) {
    notifyToSlack(params, "sheetが見つからなかったかに!");
    return;
  }

  const text = params.event.text;
  const eventTs = params.event.event_ts;

  const now = new Date(eventTs * 1000);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);

  const date = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd");
  const time = hours + ":" + minutes;

  const datetime = date + time;

  const array = [date, time];

  // 最終行列を取得
  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  //最終行列を指定
  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();

  const syukkin = values[1];
  const taikin = values[2];

  if (["おは", "oha"].includes(text)) {
    if (!taikin) {
      notifyToSlack(params, `まだ退勤していないかに!(${datetime})`);
      return;
    }
    sheet.appendRow(array);
    notifyToSlack(params, `おはようかに!(${datetime})`);
  }
  if (["おつ", "otu"].includes(text)) {
    if (taikin) {
      notifyToSlack(params, `既に退勤しているかに!(${datetime})`);
      return;
    }
    sheet.getRange(lastrow, 3).setValue(time);
    sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);

    notifyToSlack(params, `おつかれかに!(${datetime})`);
  }
};

const main = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());

  // SlackのEvent SubscriptionのRequest Verification用
  if (params.type === "url_verification") {
    return ContentService.createTextOutput(params.challenge);
  }

  // Botによるメンションは無視
  if ("subtype" in params.event) return;

  const name = getUserName(params);

  const sheet = getGoogleSpreadsheet(params, name);

  updateGoogleSpreadsheet(params, sheet);
};

(global as any).doPost = main;
