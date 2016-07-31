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

describe('writeFile and readFile test', (report, done) => {
  let path = dirs.DocumentDir + '/0.6.0-'+Date.now()+'/writeFileTest'+Date.now()
  let data = 'hellofrom'+Date.now()
  fs.writeFile(path, data)
    .then(() => fs.readFile(path, 'utf8'))
    .then((actual) => {
      report(<Assert key="utf8 content should correct" expect={data} actual={actual}/>)
      data = 'base64'
      return fs.writeFile(path, RNFetchBlob.base64.encode('base64'), 'base64')
    })
    .then(() => fs.readFile(path, 'base64'))
    .then((actual) => {
      report(<Assert key="base64 content should correct"
        expect={RNFetchBlob.base64.decode(RNFetchBlob.base64.encode(data))}
        actual={RNFetchBlob.base64.decode(actual)}/>)
      data = 'ascii'
      return fs.writeFile(path, getASCIIArray('ascii'), 'ascii');
    })
    .then(() => fs.readFile(path, 'ascii'))
    .then((actual) => {
      console.log(getASCIIArray(data), actual)
      report(<Assert key="ascii content should correct"
        expect={getASCIIArray(data)}
        comparer={Comparer.equalToArray}
        actual={actual}/>)
      done()
    })
})

describe('append file test', (report, done) => {
  let path = dirs.DocumentDir + '/append-test'+Date.now()
  let content = 'test on ' + Date.now()
  fs.writeFile(path, content, 'utf8')
    .then(() => fs.appendFile(path, '100', 'utf8', true))
    .then(() => fs.readFile(path, 'utf8'))
    .then((data) => {
      report(
        <Assert key="utf8 data should be appended"
          expect={content + '100'}
          actual={data} />)
      return fs.appendFile(path, getASCIIArray('200'), 'ascii')
    })
    .then(() => fs.readFile(path, 'ascii'))
    .then((data) => {
      report(<Assert key="ascii data should be appended"
        expect={getASCIIArray(content + '100' + '200')}
        comparer={Comparer.equalToArray}
        actual={data} />)
      return fs.appendFile(path, RNFetchBlob.base64.encode('300'), 'base64')
    })
    .then(() => fs.readFile(path, 'base64'))
    .then((data) => {
      report(<Assert key="base64 data should be appended"
        expect={content + '100' + '200' + '300'}
        actual={RNFetchBlob.base64.decode(data)} />)
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
