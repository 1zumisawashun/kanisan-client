const updateGoogleSpreadsheet = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");

  const datetime = new Date();
  const date =
    datetime.getFullYear() +
    "/" +
    ("0" + (datetime.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + datetime.getDate()).slice(-2);
  const time =
    ("0" + datetime.getHours()).slice(-2) +
    ":" +
    ("0" + datetime.getMinutes()).slice(-2);
  const user_name = params.event.user;
  const trigger_word = "trigger_word";
  const text = params.event.text;

  //追加する配列を作成
  const array = [date, time, user_name, trigger_word, text];

  //シートの最下行に配列を記述
  sheet?.appendRow(array);
};

const greeting = (e: any) => {
  const params = JSON.parse(e.postData.getDataAsString());
  const response = ContentService.createTextOutput(params.challenge);
  console.log(process.env.SLACK_INCOMING_WEBHOOK);

  if ("challenge" in params) return response;

  // const userName = params.event.user;
  // const text = params.event.text;

  // // Botによるメンションは無視
  // if ("subtype" in params.event) return response;

  // updateGoogleSpreadsheet(e);

  // const url = process.env.SLACK_INCOMING_WEBHOOK;

  // if (!url) return;

  // const jsonData = {
  //   username: userName,
  //   icon_emoji: ":dog:",
  //   text: `${text}(${userName})`,
  // };
  // const payload = JSON.stringify(jsonData);

  // const options = {
  //   method: "post",
  //   contentType: "application/json",
  //   payload: payload,
  // };

  // UrlFetchApp.fetch(url, options as any);

  // return response;
};

(global as any).doPost = greeting;
