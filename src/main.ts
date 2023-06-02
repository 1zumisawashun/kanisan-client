const sendToSlack = (params: any, message: string) => {
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
    sendToSlack(params, "getUserNameに失敗したかに!");
    return;
  }

  return userInfo.user.real_name;
};

const createSheet = (
  params: any,
  date: string,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
) => {
  const copySheet = spreadsheet.getSheetByName("コピー");

  if (!copySheet) {
    sendToSlack(params, "createSheetに失敗したかに!");
    return;
  }

  const newSheet = copySheet.copyTo(spreadsheet);
  newSheet.setName(date);
  return newSheet;
};

const getSheet = (
  params: any,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | undefined
) => {
  if (!spreadsheet) {
    sendToSlack(params, "spreadsheetが見つからなかったかに!");
    return;
  }

  const eventTs = params.event.event_ts;
  const now = new Date(eventTs * 1000);
  const date = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM");

  const sheet = spreadsheet.getSheetByName(date);

  if (!sheet) {
    const newSheet = createSheet(params, date, spreadsheet);
    return newSheet;
  }

  return sheet;
};

const updateSheet = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | undefined
) => {
  if (!sheet) {
    sendToSlack(params, "sheetが見つからなかったかに!");
    return;
  }

  const text = params.event.text;
  const eventTs = params.event.event_ts;

  const now = new Date(eventTs * 1000);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);

  const date = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd");
  const time = hours + ":" + minutes;

  const datetime = `${date} ${time}`;

  const array = [date, time];

  // NOTE:最終行列を取得する
  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  // NOTE:最終行列を指定する
  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();

  const taikin = values[2];

  if (["おは", "oha"].includes(text)) {
    if (!taikin) {
      sendToSlack(params, `まだ退勤していないかに!(${datetime})`);
      return;
    }
    sheet.appendRow(array);
    sendToSlack(params, `おはようかに!(${datetime})`);
  }
  if (["おつ", "otu"].includes(text)) {
    if (taikin) {
      sendToSlack(params, `既に退勤しているかに!(${datetime})`);
      return;
    }
    sheet.getRange(lastrow, 3).setValue(time);
    sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);

    sendToSlack(params, `おつかれかに!(${datetime})`);
  }
};

const createSpreadsheet = (username: string) => {
  const folderId = process.env.KANISAN_CLIENT_FOLDER_ID;
  if (!folderId) return;

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByName("コピー");

  while (files.hasNext()) {
    const file = files.next();
    const copiedFile = file.makeCopy(username, folder);
    return SpreadsheetApp.openById(copiedFile.getId());
  }

  return;
};

const getSpreadsheet = (params: any, username: string) => {
  const folderId = process.env.KANISAN_CLIENT_FOLDER_ID;
  if (!folderId) return;

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByName(username);

  while (files.hasNext()) {
    const file = files.next(); // get file
    return SpreadsheetApp.openById(file.getId()); // open spreadsheet
  }

  // NOTE:もしスプシを取得できなければ新規作成する
  const message = "新しい仲間かに?新しくspreadsheetを作成するかに!";
  sendToSlack(params, message);
  return createSpreadsheet(username);
};

const main = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());
  const contents = JSON.parse(e.postData.contents);

  // NOTE:SlackのEvent SubscriptionのRequest Verification用
  if (params.type === "url_verification") {
    return ContentService.createTextOutput(params.challenge);
  }

  // NOTE:Slack Botによるメンションを無視する
  if ("subtype" in params.event) return;

  // NOTE:Slackの3秒ルールで発生するリトライをキャッシュする
  const cache = CacheService.getScriptCache();
  if (cache.get(contents.event.client_msg_id) == "done") {
    return ContentService.createTextOutput();
  } else {
    cache.put(contents.event.client_msg_id, "done", 600);
  }

  // NOTE:以下からメインの処理
  const username = getUserName(params);
  const spreadsheet = getSpreadsheet(params, username);
  const sheet = getSheet(params, spreadsheet);
  updateSheet(params, sheet);

  return ContentService.createTextOutput();
};

(global as any).doPost = main;
