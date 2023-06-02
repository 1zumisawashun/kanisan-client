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

const createGoogleSpreadsheet = (
  params: any,
  date: string,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
) => {
  const copySheet = spreadsheet.getSheetByName("コピー");

  if (!copySheet) {
    sendToSlack(params, "createGoogleSpreadsheetに失敗したかに!");
    return;
  }

  const newSheet = copySheet.copyTo(spreadsheet);
  newSheet.setName(date);
  return newSheet;
};

const getGoogleSpreadsheet = (
  params: any,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
) => {
  const eventTs = params.event.event_ts;
  const now = new Date(eventTs * 1000);
  // NOTE:テストも兼ねて日時でシートが増える実装にしている
  const date = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd");

  const sheet = spreadsheet.getSheetByName(date);

  if (!sheet) {
    const newSheet = createGoogleSpreadsheet(params, date, spreadsheet);
    return newSheet;
  }

  return sheet;
};

const updateGoogleSpreadsheet = (
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

const getFolder = () => {
  const folderId = process.env.KANISAN_CLIENT_FOLDER_ID || "";
  const folder = DriveApp.getFolderById(folderId);
  return folder;
};

// NOTE:idからroot_folderを探し該当のファイルを開くまでの処理
const findSpreadsheetByName = (name: string) => {
  const folder = getFolder();
  const files = folder.getFilesByName(name);

  while (files.hasNext()) {
    const file = files.next(); // get file
    return SpreadsheetApp.openById(file.getId()); // open spreadsheet
  }

  return;
};

// makeCopyの処理でなどループするので新規ユーザーはincoming-webhookを使ってファイルを生成する
const createSpreadsheetByName = (name: string) => {
  const folder = getFolder();
  const files = folder.getFilesByName("コピー");

  while (files.hasNext()) {
    const file = files.next();
    const copiedFile = file.makeCopy(name, folder);
    return SpreadsheetApp.openById(copiedFile.getId());
  }

  return;
};

const main = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());

  // NOTE:SlackのEvent SubscriptionのRequest Verification用
  if (params.type === "url_verification") {
    return ContentService.createTextOutput(params.challenge);
  }

  const contents = JSON.parse(e.postData.contents);

  const cache = CacheService.getScriptCache();
  if (cache.get(contents.event.client_msg_id) == "done") {
    return ContentService.createTextOutput();
  } else {
    cache.put(contents.event.client_msg_id, "done", 600);
  }

  // NOTE:Botによるメンションは無視する
  if ("subtype" in params.event) return;

  const name = getUserName(params);

  let spreadsheet;

  spreadsheet = findSpreadsheetByName(name);

  if (!spreadsheet) {
    sendToSlack(params, "spreadsheetが見つからなかったかに!");
    spreadsheet = createSpreadsheetByName(name);
  }

  const sheet = getGoogleSpreadsheet(params, spreadsheet!);

  updateGoogleSpreadsheet(params, sheet);

  return ContentService.createTextOutput();
};

(global as any).doPost = main;
