/**
 * ============================================
 * GAS（スプシ）とは関係なさそうな関数を集める
 * ============================================
 */
export const sendToSlack = (params: any, message: string) => {
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

export const getRandomValue = (arr: string[]) => {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
};

// NOTE:関数としてbool値を出力するのはhas〇〇の命名は良さそう
export const hasPartialMatch = (str: string, patterns: string[]) => {
  return (
    patterns.find((pattern) => {
      // NOTE:正規表現のマッチング時に大文字と小文字を区別しない（i）
      const regex = new RegExp(pattern, "i");
      return regex.test(str);
    }) !== undefined
  );
};

export const getUserName = (params: any) => {
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
    sendToSlack(params, "getUserNameに失敗したかに！");
    return;
  }

  return userInfo.user.real_name;
};

export const getFormattedDate = (params: any) => {
  const eventTs = params.event.event_ts;
  const now = new Date(eventTs * 1000);

  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  const time = hours + ":" + minutes;

  const dateFullYearMonth = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM");
  const dateFullYearMonthDay = Utilities.formatDate(
    now,
    "Asia/Tokyo",
    "yyyy/MM/dd"
  );

  const dateFullYearMonthDayTime = `${dateFullYearMonthDay} ${time}`;

  return {
    dateFullYearMonth,
    dateFullYearMonthDay,
    dateFullYearMonthDayTime,
    time,
  };
};
