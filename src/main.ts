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

const updateSheet = (
  params: any,
  sheet: GoogleAppsScript.Spreadsheet.Sheet | undefined
) => {
  if (!sheet) {
    sendToSlack(params, "sheetが見つからなかったかに！");
    return;
  }
  const { dateFullYearMonthDay, time, dateFullYearMonthDayTime } =
    getFormattedDate(params);

  const text = params.event.text;

  const lastrow = sheet.getLastRow();
  const lastcol = sheet.getLastColumn();

  const values = sheet.getRange(lastrow, 1, 1, lastcol).getValues().flat();

  const date = values[0];
  const syukkin = values[1];
  const taikin = values[2];

  if (hasPartialMatch(text, syukkin_keywords)) {
    if (syukkin && !taikin) {
      const message = `まだ退勤していないかに！ (${dateFullYearMonthDayTime})`;
      sendToSlack(params, message);
      return;
    }
    sheet.appendRow([dateFullYearMonthDay, time]);

    const message = getRandomValue(syukkin_messages);
    sendToSlack(params, `${message} (${dateFullYearMonthDayTime})`);
    return;
  }

  if (hasPartialMatch(text, taikin_keywords)) {
    if (syukkin && taikin) {
      const message = `もう退勤しているかに！ (${dateFullYearMonthDayTime})`;
      sendToSlack(params, message);
      return;
    }

    // NOTE:日を跨いで退勤した場合（6/1 23:00に稼働して6/2 01:00に退勤した場合）
    if (date !== dateFullYearMonthDay) {
      sheet.getRange(lastrow, 3).setValue("00:00");
      sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);
      sheet.appendRow([dateFullYearMonthDay, "00:00"]);
    }

    sheet.getRange(lastrow, 3).setValue(time);
    sheet.getRange(lastrow, 4).setValue(`=C${lastrow}-B${lastrow}`);

    const message = getRandomValue(taikin_messages);
    sendToSlack(params, `${message} (${dateFullYearMonthDayTime})`);
    return;
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
  const message = "新しい仲間かに？ 新しくspreadsheetを作成するかに！";
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
