import {
  syukkin_messages,
  taikin_messages,
  syukkin_keywords,
  taikin_keywords,
} from "./constants";
import {
  sendToSlack,
  getRandomValue,
  hasPartialMatch,
  getUserName,
  getFormattedDate,
} from "./helpers";

const createSheet = (
  params: any,
  date: string,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
) => {
  const copySheet = spreadsheet.getSheetByName("コピー");

  if (!copySheet) {
    sendToSlack(params, "createSheetに失敗したかに！");
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
    sendToSlack(params, "spreadsheetが見つからなかったかに！");
    return;
  }

  const { dateFullYearMonth } = getFormattedDate(params);
  const sheet = spreadsheet.getSheetByName(dateFullYearMonth);

  if (!sheet) {
    const newSheet = createSheet(params, dateFullYearMonth, spreadsheet);
    return newSheet;
  }

  return sheet;
};

const updateSheetForSyukkin = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
) => {
  const { dateFullYearMonthDay, time, dateFullYearMonthDayTime } =
    getFormattedDate(params);

  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();

  const syukkin = values[1];
  const taikin = values[2];

  // NOTE:まだ退勤していない場合（6/1 9:00に出勤して6/1 12:00に出勤した場合）
  if (syukkin && !taikin) {
    const message = `まだ退勤していないかに！（${dateFullYearMonthDayTime}）`;
    sendToSlack(params, message);
    return;
  }

  sheet.appendRow([dateFullYearMonthDay, time]);

  const message = getRandomValue(syukkin_messages);
  sendToSlack(params, `${message}（${dateFullYearMonthDayTime}）`);
};

const updateSheetForTaikin = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet
) => {
  const { dateFullYearMonthDay, time, dateFullYearMonthDayTime } =
    getFormattedDate(params);

  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();

  const date = values[0];
  const syukkin = values[1];
  const taikin = values[2];

  const formattedDate = Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd");

  // NOTE:すでに退勤している場合（6/1 9:00に退勤して6/1 12:00に退勤した場合）
  if (syukkin && taikin) {
    const message = `もう退勤しているかに！（${dateFullYearMonthDayTime}）`;
    sendToSlack(params, message);
    return;
  }

  // NOTE:日を跨いで退勤した場合（6/1 23:00に稼働して6/2 01:00に退勤した場合）
  if (formattedDate !== dateFullYearMonthDay) {
    sheet.getRange(lastrow, 3).setValue("23:59");
    sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);
    sheet.appendRow([dateFullYearMonthDay, "00:00"]);

    const sum = `=C${lastrow + 1}-B${lastrow + 1}`;
    sheet.getRange(lastrow + 1, 3).setValue(time);
    sheet.getRange(lastrow + 1, 4).setValue(sum);

    const message = getRandomValue(taikin_messages);
    sendToSlack(params, `${message}（${dateFullYearMonthDayTime}）`);
    return;
  }

  sheet.getRange(lastrow, 3).setValue(time);
  sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);

  const message = getRandomValue(taikin_messages);
  sendToSlack(params, `${message}（${dateFullYearMonthDayTime}）`);
};

const updateSheet = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | undefined
) => {
  if (!sheet) {
    sendToSlack(params, "sheetが見つからなかったかに！");
    return;
  }

  if (hasPartialMatch(params.event.text, syukkin_keywords)) {
    updateSheetForSyukkin(params, sheet);
    return;
  }

  if (hasPartialMatch(params.event.text, taikin_keywords)) {
    updateSheetForTaikin(params, sheet);
    return;
  }
};

const createSpreadsheet = (username: string) => {
  const folderId = process.env.KANISAN_CLIENT_FOLDER_ID;
  if (!folderId) return;

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByName("コピー（削除厳禁）");

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
  const message = "新しい仲間かに？ 新しくspreadsheetを作成するかに！";
  sendToSlack(params, message);
  return createSpreadsheet(username);
};

const main = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());

  // NOTE:SlackのEvent SubscriptionのRequest Verification用
  if (params.type === "url_verification") {
    return ContentService.createTextOutput(params.challenge);
  }

  // NOTE:Slack Botによるメンションを無視する
  if ("subtype" in params.event) return;

  // NOTE:Slackの3秒ルールで発生するリトライをキャッシュする
  const cache = CacheService.getScriptCache();

  if (cache.get(params.event.client_msg_id) == "done") return;

  cache.put(params.event.client_msg_id, "done", 600);

  // NOTE:以下からメインの処理
  const username = getUserName(params);
  const spreadsheet = getSpreadsheet(params, username);
  const sheet = getSheet(params, spreadsheet);
  updateSheet(params, sheet);

  return;
};

(global as any).doPost = main;
