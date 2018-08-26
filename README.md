lambdaに上げるときは、以下の手順を実施

1.動作確認用の以下の行をコメントアウト(たぶん50行目くらい)
```
main().catch(console.error)
```

GCP側でサービスアカウントを作成して、BigQueryのデータセット削除できる権限以上を付与する  
JSONをダウンロードして、allow_bq_storage_user.jsonに上書き保存する

ZIP化する
```
$ cd node-gcp-test
$ zip -r node-gcp-test.zip *
```

