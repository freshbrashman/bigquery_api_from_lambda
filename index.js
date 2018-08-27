const {google} = require('googleapis');
const bigquery = google.bigquery('v2');
const storage = google.storage('v1');
const dataflow = google.dataflow("v1b3");

//////////////////////　実行準備 ////////////////////////////////////////////////////////////
// Lambda登録時に環境変数「GOOGLE_APPLICATION_CREDENTIALS」を指定する
// GOOGLE_APPLICATION_CREDENTIALS=./allow_bq_storage_user.json

// ./allow_bq_storage_user.json に、BigQueryのデータセット削除権限を持ったサービスアカウントの
// JSONをダウンロードして保存すること(このファイルはGitにあげるとヤバいのでgitignoreしています。)

// Lambda実行時に、ハンドラには「index.gcpTest」を指定する
/////////////////////////////////////////////////////////////////////////////////////////////

async function main () {

  // This method looks for the GCLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS
  // environment variables.
  const client = await google.auth.getClient({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: [
      'https://www.googleapis.com/auth/bigquery',
      'https://www.googleapis.com/auth/devstorage.full_control'
    ]
  });

  // obtain the current project Id
  const projectId = await google.auth.getDefaultProjectId();

  const request = {
    projectId,
    datasetId: 'test_ds_xxx',

    // This is a "request-level" option
    auth: client
  };

  const res = await bigquery.datasets.delete(request);
  console.log(res.data);

  // const res = await compute.zones.list({ project, auth });
  // console.log(res.data);
}

// lambdaで動かす場合は、ハンドラに「index.gcpTest」を指定する
exports.gcpTest = main;

// テスト・デバッグ時に有効化する
main().catch(console.error);
