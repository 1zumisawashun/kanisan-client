# kanisan-client

kanisan-client

## Overview

- 業務委託用の勤怠管理チャンネルです。
- slackから出退勤の時間をスプレッドシートに反映することができます。
- google drive上で業務委託メンバーの勤怠を管理することができます。

## Installation

- clone

```bash
$ git clone git@github.com:1zumisawashun/kanisan-client.git
$ cd kanisan-client
```

- install

```bash
$ yarn install
```

- 上記の手順で失敗する場合 [Troubleshoot](#Troubleshoot)を確認してください

## How to

- deployする

```bash
$ yarn deploy
```

- linterを当てる

```bash
$ yarn lint:fix
```

## Troubleshoot

- なし

## その他ドキュメント

- 出勤する
    - 「おは」とメッセージを送ってください。
    - かにさんから返信が来れば出勤完了です。
- 退勤する
    - 「おつ」とメッセージを送ってください。
    - かにさんから返信が来れば退勤完了です。