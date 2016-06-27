import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

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
  group : '0.6.0',
  run : true,
  expand : false,
  timeout : 10000,
})
const { TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('writeFile test', (report, done) => {
  let path = dirs.DocumentDir + '/0.6.0-'+Date.now()+'/writeFileTest'+Date.now()
  let data = 'hellofrom'+Date.now()
  fs.writeFile(path, 'utf8', data)
    .then(() => fs.readFile(path, 'utf8'))
    .then((actual) => {
      report(<Assert key="utf8 content should correct" expect={data} actual={actual}/>)
      data += 'base64'
      return fs.writeFile(path, 'base64', RNFetchBlob.base64.encode('base64'))
    })
    .then(() => fs.readFile(path, 'base64'))
    .then((actual) => {
      report(<Assert key="base64 content should correct"
        expect={RNFetchBlob.base64.decode(RNFetchBlob.base64.encode(data))}
        actual={RNFetchBlob.base64.decode(actual)}/>)
      data += 'ascii'
      return fs.writeFile(path, 'ascii', getASCIIArray('ascii'));
    })
    .then(() => fs.readFile(path, 'ascii'))
    .then((actual) => {
      report(<Assert key="ascii content should correct"
        expect={getASCIIArray(data)}
        comparer={Comparer.equalToArray}
        actual={actual}/>)
      done()
    })
})

function getASCIIArray(str) {
  let r = []
  for(let i=0;i<str.length;i++) {
    r.push(str[i].charCodeAt(0))
  }
  return r
}
