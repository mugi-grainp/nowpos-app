# NowPos

現在地情報取得、SNS共有ウェブアプリ

## しくみ

JavaScriptからGeolocation APIを呼び出し、位置情報を取得します。取得した位置情報
から、事前に登録したスポットとの距離を計算して、最も近いポイントを表示し、地点を
表す文言と地図へのリンクを生成します。

地点を表す文言はボタンひとつでクリップボードにコピーできるほか、Twitter /
Mastodon / Misskeyへの共有投稿もワンタッチで可能です

Mastodon / Misskey共有利用時は、共有ボタンクリックで呼び出されるリンクを、事前
に投稿するサーバーのURLに書き換えてください。

投稿用に生成される文言は、Foursquare Swarm~~をパクった~~にインスパイアされた形
式です。チェックイン記録を表示するURLの代わりに、最寄り地点を表示する
OpenStreetMapのリンクを差し込むつくりにしています。

## 注意事項

Geolocation APIはHTTPS接続でないと呼び出しに失敗するため、HTTPS接続ができるサー
バーに設置してください。

## 最寄り地点の登録

landmarks.jsに記述していきます。サンプルとして、大変偏った地点群を登録しています。

## 利用しているライブラリ

地図表示・マーカー描画のために[leaflet.js](https://leafletjs.com/)を利用してい
ます。HTMLページに記載したタグの通り、CDNからJavaScriptとCSSを取得しています。

## License

MIT License

## Future Work

* Mastodon共有のためにdonshare、Misskey共有のためにmisskeyshareを介してサーバー
  選択できるようにするといいかもしれない。
