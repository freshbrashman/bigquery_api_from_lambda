const { google } = require('googleapis');
const bigquery = google.bigquery('v2');
const storage = google.storage('v1');
const storageTransfer = google.storagetransfer('v1')
const dataflow = google.dataflow("v1b3");
const AWS = require('aws-sdk');
const LineStream = require('byline').LineStream;

//////////////////////　実行準備 ////////////////////////////////////////////////////////////
// Lambda登録時に環境変数「GOOGLE_APPLICATION_CREDENTIALS」を指定する
// GOOGLE_APPLICATION_CREDENTIALS=./gcp_user.json
// GCPからAWSのクレデンシャルが必要な処理を実行する場合は、通常通り以下２つの環境変数を設定する
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY

// ./gcp_user.json に、GCP側の利用サービスの権限を持ったサービスアカウントの
// JSONをダウンロードして保存すること(このファイルはGitにあげるとヤバいのでgitignoreしています。)

// Lambda実行時に、ハンドラには「index.gcpTest」を指定する
/////////////////////////////////////////////////////////////////////////////////////////////
async function loadBigQueryTable() {
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

    const params = {
        projectId: projectId,
        auth: client,
        requestBody: {
            configuration: {
                dryRun: false,
                jobTimeoutMs: 1000 * 60 * 20,    // 20分タイムアウト
                load: {
                    createDisposition: "CREATE_IF_NEEDED",
                    writeDisposition: "WRITE_TRUNCATE",
                    sourceFormat: "NEWLINE_DELIMITED_JSON",
                    sourceUris: [
                        "gs://yterui-function-test/bq_load_test/bq_load_test.json",  // データソースのURIを指定(*によるワイルドカード指定可)
                    ],
                    destinationTable: {         // ロード先テーブル
                        projectId: projectId,
                        datasetId: "test02",
                        tableId: "load_test_01",
                    },
                    destinationTableProperties: {
                        description: "テーブルロードだぜ",
                        friendlyName: "フレンドリーネームだぜ",

                    },
                    encoding: "UTF-8",          // データソースのエンコード
                    ignoreUnknownValues: false, // 異常値を無視するか(無視された場合はたぶんんnull扱い？Docに明記されていない)
                    maxBadRecords: 0,           // 異常値の許容数
                    autodetect: true,           // [CSV/JSONのみ] スキーマの自動推定機能の利用
//                    schema: {
//                        fields: [
//                            {name: "", mode: "", type: ""},
//                        ]
//                    }

//                    schemaUpdateOptions: [      // WRITE_APPENDか、「WRITE_TRUNCATEかつパーティショニング」のどちらかの場合指定する
//                        "ALLOW_FIELD_ADDITION",
//                        "ALLOW_FIELD_RELAXATION",
//                    ],

//                    allowJaggedRows: false,     // [CSVのみ]CSV末尾の空列を許容するか？
//                    allowQuotedNewlines: false, // [CSVのみ]クォートで括られたデータの改行コードを許容するか？
//                    quote: "",                  // [CSVのみ]クォート文字
//                    nullMarker: "",           // [CSVのみ]NULL値を意味する文字
//                    fieldDelimiter: "",       // CSV系の場合の区切り文字
//                    clustering: {                 // カラム指定のクラスタリング？(ベータらしい)
//                        fields: ["col1", "col2"]
//                    },
//                    skipLeadingRows: 0,       // [CSVのみ]先頭行の読み飛ばし数
//                    destinationEncryptionConfiguration: {     // KMSなど暗号化オプション
//                        …
//                    },
//                    projectionFields: []      // [Datastoreのみ？]
//                    timePartitioning: {}      // timeパーティション系
                }
            }
        }
    };

    res = await bigquery.jobs.insert(params);
    console.log(JSON.stringify(res.data));

// 複数テーブル同時書き込みの場合のサンプルコード
/*
    for (var i = 0; i < 200; i++){
        const newParams = JSON.parse(JSON.stringify(params));
        newParams.auth = client;
        newParams.requestBody.configuration.load.destinationTable.tableId = "takusan_test_" + i;
        res = bigquery.jobs.insert(newParams);
        console.log(JSON.stringify(res.data));
    }
*/    
}


async function runStorageTransferService() {

    // ※API経由でTransferServiceを使うには、
    // 　「APIs & Services」画面で「Storage Transfer API」を友好にする必要がある。
    //
    // ※APIを有効にし忘れて実行したときのエラーメッセージに書かれたURLが途中で切れている
    // 　("Storage Transfer API has not been used in project"という件のエラー)
    // 　以下が正しい
    // 　→ https://console.developers.google.com/apis/api/storagetransfer
    //
    // ※GCP側のStorageServiceを実行するサービスアカウントには、なんと！「EDITOR」権限が必要とのこと。
    // 　情報元→　https://cloud.google.com/storage-transfer/docs/create-client

    const client = await google.auth.getClient({
        // Scopes can be specified either as an array or as a single, space-delimited string.
        scopes: [
            'https://www.googleapis.com/auth/devstorage.full_control',
            'https://www.googleapis.com/auth/cloud-platform',
        ]
    });

    // obtain the current project Id
    const projectId = await google.auth.getDefaultProjectId();

    const params = {
        requestBody: {
            projectId: projectId,
            description: "transfer-test-01",
            status: "ENABLED",
            schedule: {
                scheduleStartDate: {
                    year: 2000,
                    month: 1,
                    day: 1,
                },
                scheduleEndDate: {
                    year: 2000,
                    month: 1,
                    day: 1,
                }
            },
            transferSpec: {
                awsS3DataSource: {
                    bucketName: "yterui-test-bucket-01",
                    awsAccessKey: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    }
                },
                gcsDataSink: {
                    bucketName: "yterui-transfer-test",
                },
                objectConditions: {
                    maxTimeElapsedSinceLastModification: 60*60*24*5 + "s",  // 5日以内に更新されたモノ
                    includePrefixes: [],
                    excludePrefixes: [],
                },
                transferOptions: {
                    overwriteObjectsAlreadyExistingInSink: false,   // シンクにあるオブジェクトをお常に上書きするか
                    deleteObjectsUniqueInSink: false,               // シンクにしかないオブジェクトを削除するか
                    deleteObjectsFromSourceAfterTransfer: false,    // シンクに転送したソースのオブジェクトを削除するか
                },
            },
        },
        auth: client
    };

    const res = await storageTransfer.transferJobs.create(params);
    console.log(res.data);
}

async function deleteBigQueryDataset() {

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
        projectId: projectId,
        datasetId: 'test_ds_xxx',

        // This is a "request-level" option
        auth: client
    };

    const res = await bigquery.datasets.delete(request);
    console.log(res.data);
}

// lambdaで動かす場合は、ハンドラに「runStorageTransfer」を指定する
exports.deleteBigQueryDataset = deleteBigQueryDataset;
exports.runStorageTransferService = runStorageTransferService;
exports.loadBigQueryTable = loadBigQueryTable;

// テスト・デバッグ時に有効化する
loadBigQueryTable().catch(console.error);
