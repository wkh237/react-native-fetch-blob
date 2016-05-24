import RNTest from './in-app-test-runner'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';

const FILENAME = `${Platform.OS}-0.4.0-${Date.now()}.png`
// paste your test config here
const TEST_SERVER_URL = 'http://192.168.17.193:8123'
const DROPBOX_TOKEN = 'fsXcpmKPrHgAAAAAAAAAoXZhcXYWdgLpQMan6Tb_bzJ237DXhgQSev12hA-gUXt4'

const ctx = new RNTest.TestContext()
const Assert = RNTest.Assert
const Info = RNTest.Info

let image = null

ctx.describe('GET image from server', async function(report) {
  let resp = await RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
      Authorization : 'Bearer abde123eqweje'
    })

  image = resp.base64()
  report(
      <Info key="Response image">
        <Image
          style={{width:Dimensions.get('window').width*0.9, height : Dimensions.get('window').width*0.9,margin :16}}
          source={{uri : `data:image/png;base64, ${image}`}}/>
      </Info>)

})

ctx.describe('The check if it follows 301/302 redirection', async function(report) {

  let resp = await RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/redirect`)
  report(
    <Assert key="check image size" expect={image.length} actual={resp.base64().length}/>,
      <Info key="Response image">
        <Image
          style={{width:Dimensions.get('window').width*0.9, height : Dimensions.get('window').width*0.9,margin :16}}
          source={{uri : `data:image/png;base64, ${image}`}}/>
      </Info>)

})

ctx.describe('Upload octet-stream image to Dropbox', async function(report) {

  let resp = await RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+FILENAME+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
    'Content-Type' : 'application/octet-stream',
  }, image)
  resp = resp.json()
  report(
      <Assert key="confirm the file has been uploaded" expect={FILENAME} actual={resp.name}/>
  )

})

ctx.describe('Upload multipart/form-data', async function(report, data) {

  let resp = await RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
      Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
      'Content-Type' : 'multipart/form-data',
    }, [
      { name : 'test-img', filename : 'test-img.png', data: image},
      { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
      { name : 'field1', data : 'hello !!'},
      { name : 'field2', data : 'hello2 !!'}
    ])

  resp = resp.json()

  report(
      <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
      <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
  )

})

ctx.describe('Compare uploaded multipart image', async function(report) {
  let resp = await RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/test-img.png`)
  let resp2 = await RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/test-text.txt`)

  report(
      <Assert key="check file length" expect={image.length} actual={resp.base64().length}/>,
      <Assert key="check file content" expect={'hello.txt'} actual={resp2.text()}/>
  )

})

ctx.describe('Progress report test', (report) => new Promise((resolve) => {

  let p1 = RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
      Authorization : 'Bearer abde123eqweje'
    })
  let log = []

  p1.onProgress = (written, total) => {
    log.push(<Info key={`progress = ${written} bytes / ${total} bytes`}></Info>)
    if(written === total)
      log.push(<Assert key="progress goes to 100%" expect={written} actual={total}/>)
    report(...log)
    resolve()
  }

}))


export default ctx
