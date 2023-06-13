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
- copy

```bash
$ cp .env.example .env2
$ cp .clasp.example.json .clasp.json
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

# 運用フロー

## 基本的な使い方

- 出勤する
    - 「おは」とメッセージを送ってください。
    - かにさんから返信が来れば出勤完了です。
- 退勤する
    - 「おつ」とメッセージを送ってください。
    - かにさんから返信が来れば退勤完了です。

## トラブルシューティング

<details>
<summary>kintai_kanisanチャンネルに初めて招待されたらどうすれば良い？</summary>
- さっそく「おは」と出勤メッセージを送ってみてください。
- 初めてkintai_kanisanチャンネルでメッセージを送った時に、そのメンバーの勤怠管理のスプレッドシートが新規作成されます。
- 以降は「基本的な使い方」の案内に沿ってご利用ください。
</details>

<details>
<summary>出退勤のキーワードはどのくらいある？</summary>
- 以下リンクのsyukkin_keywordsとtaikin_keywordsを参照してください。
- https://github.com/1zumisawashun/kanisan-client/blob/main/src/constants.ts
</details>

<details>
<summary>勤怠履歴を確認するにはどうすれば良い？</summary>
- kintai_kanisanチャンネル上部の勤怠表を押下しご自身のスプレッドシートを確認してください。
- 月ごとにシートが分かれています。
- 月の合計稼働時間も確認することができます。
</details>

<details>
<summary>kintai_kanisanチャンネルで出勤をせずに稼働してしまったらどうすれば良い？</summary>
- 正社員メンバーにお声がけください。
- スプレッドシートの編集権限は正社員のみ付与されているため、ご自身が申告した時間を正社員が反映します。
</details>

<details>
<summary>お昼ご飯や中抜けの場合はどうすれば良い？</summary>
- 同じ日に何度も勤怠をつけられるので、一度退勤をして再度稼働するタイミングで出勤してください。
</details>