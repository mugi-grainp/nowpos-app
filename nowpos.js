// 地点データベースのインポート
import { landmarks } from "./landmarks.js";

// 位置情報取得時、できるだけ高精度な位置情報を利用したい旨端末に通知する
const geoWatchOptions = {
    enableHighAccuracy: true
};

// 現在地と各登録地点間との距離を保存する配列
var distanceBetweenLandmarks = [];
// 位置情報計測の開始・一時停止を制御するためのハンドルを格納
var geoWatchId;
// leaflet.js 地図オブジェクト
var map = null;
// 現在地を保持するオブジェクト
var nowPosMarker = null;
// 現在地を示す位置情報の精度を描画するオブジェクト
var nowPosAccuracyCircle = null;
// 現在地を示すアイコンの定義
var myPin = L.icon({
    iconUrl: 'images/pin.png',
    iconSize: [64, 48],
    iconAnchor: [32, 48]
});

// GPS受信開始後初の受信か
var isFirstGPSCheck = true;

// X (Twitter) Tweetボタンの定義
function setTweetButton() {
    // I'm at ... の文言 (独自のプロパティとして設定済)
    const iAmAtString = document.getElementById('i-am-at-string').iAmAtString;
    // 当該地点を示すOpenStreetMapのURL (独自のプロパティとして設定済)
    const iAmAtOSMUrl = document.getElementById('i-am-at-string').OSMUrl;
    // X (Twitter) の共有投稿用URLを新しいタブで開く
    window.open(`https://twitter.com/intent/tweet?ref_src=twsrc%5Etfw&url=${encodeURIComponent(iAmAtOSMUrl)}&text=${encodeURIComponent(iAmAtString)}`, '_blank');
}

// Mastodon Tootボタンの定義
function setTootButton() {
    // Mastodonの共有は、URLを分けずにすべてトゥートテキストとして流し込める
    const iAmAtString = document.getElementById('i-am-at-string').textContent;
    // Mastodonインスタンス（サーバー）は複数あるため、仮にmstdn.jpインスタンスを直接指している
    window.open(`https://mstdn.jp/share?text=${encodeURIComponent(iAmAtString)}`, '_blank');
}

// Misskey Noteボタンの定義
function setNoteButton() {
    // I'm at ... の文言 (独自のプロパティとして設定済)
    const iAmAtString = document.getElementById('i-am-at-string').iAmAtString;
    // 当該地点を示すOpenStreetMapのURL (独自のプロパティとして設定済)
    const iAmAtOSMUrl = document.getElementById('i-am-at-string').OSMUrl;
    // Misskeyサーバーも複数存在するため、仮にMisskey.io の共有投稿用URLを新しいタブで開く
    window.open(`https://misskey.io/share?url=${encodeURIComponent(iAmAtOSMUrl)}&text=${encodeURIComponent(iAmAtString)}`, '_blank');
}

// 起動時（DOMツリー構築完了後）の処理
window.addEventListener('DOMContentLoaded', function() {
    // 起動時にOpenStreetMapの地図を描画する
    // 位置情報取得追跡前のデフォルトの地点（福岡市中央区天神・天神交差点）
    map = L.map('map').setView([33.5913, 130.3989], 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // TweetボタンとTootボタン、Noteボタンをクリックした時の処理を登録
    const tweetButton = document.getElementById('tweet');
    tweetButton.addEventListener('click', setTweetButton);
    const tootButton = document.getElementById('toot');
    tootButton.addEventListener('click', setTootButton);
    const noteButton = document.getElementById('note');
    noteButton.addEventListener('click', setNoteButton);
});

// geoFindMe() is from MDN (https://developer.mozilla.org/ja/docs/Web/API/Geolocation_API/Using_the_Geolocation_API#examples)
// 現在地を取得する
function geoFindMe() {
    // 各表示制御用のDOMオブジェクトを取得する
    const status = document.getElementById('status');
    const mapLink = document.getElementById('map-link');
    const nearestPos = document.getElementById('nearest-pos');
    const iAmAt = document.getElementById('i-am-at-string');
    const getPosStart = document.getElementById('getpos-start');
    const copyIAmAtStringButton = document.getElementById('copy-i-am-at-string');
    const tweetButton = document.getElementById('tweet');
    const tootButton = document.getElementById('toot');
    const noteButton = document.getElementById('note');

    // 位置取得中は位置取得開始ボタンの重複押下を防止
    getPosStart.removeEventListener('click', geoFindMe);
    // GPS受信中はボタンを強調表示する
    getPosStart.setAttribute('class', 'monitoring');
    getPosStart.setAttribute('value', '位置取得中...');

    // OpenStreetMapへのリンクを初期化する
    mapLink.href = '';
    mapLink.textContent = '';

    // 位置情報取得・更新成功時の処理（随時呼び出し）
    async function success(position) {
        // 緯度・経度・位置情報の精度を取得
        const latitude  = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        // 位置情報取得処理開始後最初の取得成功であった場合は
        // 各共有投稿ボタンの無効化状態を解除する
        if (isFirstGPSCheck) {
            copyIAmAtStringButton.disabled = '';
            tweetButton.disabled = '';
            tootButton.disabled = '';
            noteButton.disabled = '';
            isFirstGPSCheck = false;
        }

        // 位置情報取得状況のステータス表示を消去し、OpenStreetMapへのリンクを設定する
        status.textContent = '';
        mapLink.href = `https://www.openstreetmap.org/#map=17/${latitude}/${longitude}`;
        mapLink.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;

        // 現在地をマップ表示の中心とする
        map.setView([latitude, longitude]);

        // 現在地の点と位置情報精度を示す円を描画
        if (nowPosMarker) {
            map.removeLayer(nowPosMarker);
        }
        if (nowPosAccuracyCircle) {
            map.removeLayer(nowPosAccuracyCircle);
        }
        nowPosMarker = L.marker([latitude, longitude], {
            icon: myPin
        }).addTo(map);
        nowPosAccuracyCircle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: 'blue',
            fillColor: '#399ADE',
            fillOpacity: 0.2
        }).addTo(map);


        // 各登録地点との距離を計算
        for (const landmarkId in landmarks) {
            const dist = distance(latitude, longitude, landmarks[landmarkId].latitude, landmarks[landmarkId].longitude);
            distanceBetweenLandmarks[landmarkId] = dist;
        }

        // 最も近い登録地点を求める
        var nearestPosId = null;
        var nearestPosName = '';
        var nearestPosDistance = 9999999.9;
        for (const pos in distanceBetweenLandmarks) {
            if (distanceBetweenLandmarks[pos] < nearestPosDistance) {
                nearestPosId = pos;
                nearestPosDistance = distanceBetweenLandmarks[pos];
                nearestPosName = landmarks[pos].posName;
            }
        }
        nearestPosDistance = Math.round(nearestPosDistance * 10) / 10;
        nearestPos.textContent = `最も近いポイント: ${nearestPosName} (${nearestPosDistance}m)`;
        const iAmAtString = `I'm at ${nearestPosName} in ${landmarks[nearestPosId].address}.`;
        const nearestPosOSMUrl = `https://www.openstreetmap.org/#map=17/${landmarks[nearestPosId].latitude}/${landmarks[nearestPosId].longitude}`;
        iAmAt.OSMUrl = nearestPosOSMUrl;
        iAmAt.iAmAtString = iAmAtString;
        iAmAt.textContent = `I'm at ${nearestPosName} in ${landmarks[nearestPosId].address}. ${nearestPosOSMUrl}`;
    }

    function error() {
        status.textContent = '位置情報を取得できませんでした。';
    }

    if (!navigator.geolocation) {
        status.textContent = '位置情報機能を利用できません。';
    } else {
        // 位置情報取得中は、共有機能の各ボタンを無効化しておく
        status.textContent = '位置情報取得中...';
        copyIAmAtStringButton.disabled = 'disabled';
        tweetButton.disabled = 'disabled';
        tootButton.disabled = 'disabled';
        noteButton.disabled = 'disabled';
        isFirstGPSCheck = true;
        geoWatchId = navigator.geolocation.watchPosition(success, error, geoWatchOptions);
    }
}

// Code from https://gist.github.com/kawanet/15c5a260ca3b98bd080bb87cdae57230
// 距離を求める（元の式ではkm単位で出るので、1000倍してmの単位にする）
const R = Math.PI / 180;
function distance(lat1, lng1, lat2, lng2) {
    lat1 *= R;
    lng1 *= R;
    lat2 *= R;
    lng2 *= R;
    return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2)) * 1000;
}

// 位置情報取得開始、一時停止ボタンに処理関数を紐付ける
document.getElementById('getpos-start').addEventListener('click', geoFindMe);
document.getElementById('getpos-stop').addEventListener('click', function() {
    const getPosStart = document.getElementById('getpos-start');
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = 0;
    getPosStart.setAttribute('class', 'default');
    getPosStart.setAttribute('value', '位置取得開始');
    getPosStart.addEventListener('click', geoFindMe);
});

// クリップボードにコピーするボタン
// ボタン押下後、クリップボードへのコピー成功 / 失敗を3秒間表示する
const copyIAmAtString = document.getElementById('copy-i-am-at-string');
const restore = function() {
    copyIAmAtString.value = 'Copy';
};
copyIAmAtString.addEventListener('click',
    () => {
        const iAmAtString = document.getElementById('i-am-at-string').textContent;
        // クリップボード操作
        navigator.clipboard.writeText(iAmAtString).then(
            () => {
                // 成功
                copyIAmAtString.value = 'Copied!'
                setTimeout(restore, 2000);
            },
            () => {
                // 失敗
                copyIAmAtString.value = 'Could not copy.'
                setTimeout(restore, 2000);
            }
        );
    }
);
