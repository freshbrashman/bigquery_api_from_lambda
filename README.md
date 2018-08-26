lambdaに上げるときは、以下の手順を実施

動作確認用の以下の行をコメントアウト(たぶん50行目くらい)
```
main().catch(console.error)
```

GCP側でサービスアカウントを作成して、BigQueryのデータセット削除できる権限以上を付与する  
クレデンシャルのJSONをダウンロードして、allow_bq_storage_user.jsonに上書き保存する

ZIP化する
```
$ cd bigquery_api_from_lambda
$ zip -r bigquery_api_from_lambda.zip *
```

以上で、Lambdaの「nodejs v8」 で実行できるはず。
ハンドラには「index.gcpTest」を指定する。
あと、環境変数「GOOGLE_APPLICATION_CREDENTIALS」を指定する。
※index.jsのコメントにも説明書いてあるから、そちらも参照
