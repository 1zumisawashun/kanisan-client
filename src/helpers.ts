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
