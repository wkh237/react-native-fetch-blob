import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  Text,
  View,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.8.0',
  run : true,
  expand : true,
  timeout : 999999999,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

false && describe('upload BASE64 v.s. Storage', (report, done) => {

  let b64data = null
  let storageFile = dirs.DocumentDir + '/benchmark-cache'
  let b64res, storageRes
  let iteration = 50
  let target = `${TEST_SERVER_URL}/public/1mb-dummy`

  RNFetchBlob
    .config({ path : storageFile })
    .fetch('GET', target)
    .then((res) => res.readFile('base64'))
    .then((data) => {
      b64data = data
      report(
        <Info key="test data should correct">
          <Text>size of b64data = {data.length}</Text>
        </Info>)
      b64Test()
    })

    // base64 upload benchmark
    function b64Test() {
      let p = Promise.resolve()
      let begin = Date.now()
      let count = 0
      for(let i=0; i< iteration; i++) {
        p = p.then(() => {
          if(++count <iteration){
            report(
              <Info key="benchmark progress" uid="report">
                <Text style={{textAlign:'center'}}>BASE64 {count}/{iteration}</Text>
              </Info>)
            return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {}, b64data)
          }
          else {
            b64res = Date.now() - begin
            storageTest()
          }
        })
      }
    }

    // storage upload benchmark
    function storageTest() {
      let p = Promise.resolve()
      let begin = Date.now()
      let count = 0
      for(let i=0; i< iteration; i++) {
        p = p.then(() => {
          if(++count < iteration){
            report(
              <Info key="benchmark progress" uid="report">
                <Text style={{textAlign:'center'}}>Storage {count}/{iteration}</Text>
              </Info>)
            return RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/echo`, {}, RNFetchBlob.wrap(storageFile))
          }
          else {
            storageRes = Date.now() - begin
            summary()
          }
        })
      }
    }

    function summary() {
      report(
        <Info key="BASE64">
          <Text>{`BASE64 ${b64res/iteration} ms/req`}</Text>
        </Info>,
        <Info key="Storage">
          <Text>{`Storage ${storageRes/iteration} ms/req`}</Text>
        </Info>)
      done()
    }

})


describe('write file BASE64 v.s. URI', (report, done) => {
  let iteration = 200
  let target = `${TEST_SERVER_URL}/public/12k-dummy`
  let sourceURI = dirs.DocumentDir + '/benchmark2-source'
  let writeTarget = dirs.DocumentDir +'/benchmark2-target'
  let sourceBASE64 = null
  let b64Res = 0
  let uriRes = 0
  RNFetchBlob.fetch('GET', target)
  .then((res) => {
    sourceBASE64 = res.base64()
    return fs.writeFile(sourceURI, res.base64(), 'base64')
  })
  .then(() => {
    let p = Promise.resolve()
    let begin = Date.now()
    let count = 0
    for(let i=0; i< iteration; i++) {
      p = p.then(() => {
        if(++count < iteration){
          report(
            <Info key="benchmark progress" uid="report2">
              <Text style={{textAlign:'center'}}>BASE64 {count}/{iteration}</Text>
            </Info>)
          return fs.readFile(sourceURI, 'base64')
                   .then((data) => fs.writeFile(writeTarget, data))
        }
        else {
          b64Res = Date.now() - begin
          uriTest()
        }
      })
    }
  })

  function uriTest() {
    let p = Promise.resolve()
    let begin = Date.now()
    let count = 0
    for(let i=0; i< iteration; i++) {
      p = p.then(() => {
        if(++count < iteration){
          report(
            <Info key="benchmark progress" uid="report2">
              <Text style={{textAlign:'center'}}>URI {count}/{iteration}</Text>
            </Info>)
          return fs.writeFile(writeTarget, sourceURI, 'uri')
        }
        else {
          uriRes = Date.now() - begin
          summary()
        }
      })
    }
  }

  function summary() {
    report(
      <Info key="BASE64 - writeFile">
        <Text>{`BASE64 ${b64Res/iteration} ms/req`}</Text>
      </Info>,
      <Info key="URI - writeFile">
        <Text>{`URI ${uriRes/iteration} ms/req`}</Text>
      </Info>)
    done()
  }

})


false && describe('read file benchmark', (report, done) => {

  let iteration = 50
  let target = `${TEST_SERVER_URL}/public/1mb-dummy`
  let source = dirs.DocumentDir + '/benchmark3-source'
  let res = {}
  RNFetchBlob.fetch('GET', target)
  .then((res) => {
    return fs.writeFile(source, res.base64(), 'base64')
  })
  .then(() => {
    test('base64', () => {
      test('ascii', () => {
        test('utf8', summary)
      })
    })
  })

  function test(encode, cb) {
    let p = Promise.resolve()
    let begin = Date.now()
    let count = 0
    for(let i=0; i< iteration; i++) {
      p = p.then(() => {
        if(++count < iteration){
          report(
            <Info key="benchmark progress" uid="report3">
              <Text style={{textAlign:'center'}}>{encode} {count}/{iteration}</Text>
            </Info>)
          return fs.readFile(source, encode)
        }
        else {
          res[encode] = Date.now() - begin
          cb()
        }
      })
    }
  }

  function summary() {
    report(
      <Info key="BASE64 - readFile">
        <Text>{`BASE64 ${res['base64']/iteration} ms/req`}</Text>
      </Info>,
      <Info key="ASCII - readFile">
        <Text>{`ASCII ${res['ascii']/iteration} ms/req`}</Text>
      </Info>,
      <Info key="UTF8 - readFile">
        <Text>{`UTF8 ${res['utf8']/iteration} ms/req`}</Text>
      </Info>)
    done()
  }

})
