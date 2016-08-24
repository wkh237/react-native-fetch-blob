import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import DataStore from 'nedb'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.10.0',
  run : true,
  expand : true,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
const DB_PATH = fs.dirs.DocumentDir + `/nedb/test-db-${Date.now()}.db`
const db = null

describe('nedb persistant constructor test', (report, done) =>{
  db = new DataStore(DB_PATH)
  // db.loadDatabase(function(err) {
  //   report(<Assert key="database should created" expect={null} actual={err}/>)
  //   done()
  // })

})

describe('db CRUD test', (report, done) => {
  let data = 'first record' + Date.now()
  db.insert(data, (err, newDoc) => {
    console.log(err, newDoc)
  })
})
