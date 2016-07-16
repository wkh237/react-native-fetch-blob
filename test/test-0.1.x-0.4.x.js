import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.1.x - 0.4.x',
  expand : false,
  run : true
})

let { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles, image } = prop()

describe('The check if it follows 301/302 redirection', (report, done) => {

  image = RNTest.prop('image')

  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/redirect`)
  .then((resp) => {
    report(
      <Assert key="check image size" expect={image.length} actual={resp.base64().length}/>,
      <Info key="Response image">
        <Image
          style={{width:Dimensions.get('window').width*0.9, height : Dimensions.get('window').width*0.9,margin :16}}
          source={{uri : `data:image/png;base64, ${image}`}}/>
      </Info>)
      done()
  })

})

describe('Upload octet-stream image to Dropbox', (report, done) => {

  RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
    Authorization : `Bearer ${DROPBOX_TOKEN}`,
    'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+FILENAME+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
    'Content-Type' : 'application/octet-stream',
  }, image)
  .then((resp) => {
    resp = resp.json()
    report(
      <Assert key="confirm the file has been uploaded" expect={FILENAME} actual={resp.name}/>
    )
    done()
  })

})

describe('Upload multipart/form-data', (report, done) => {

  RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
      Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
      'Content-Type' : 'multipart/form-data',
    }, [
      { name : 'test-img', filename : 'test-img.png', data: image},
      { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
      { name : 'field1', data : 'hello !!'},
      { name : 'field2', data : 'hello2 !!'}
    ])
  .then((resp) => {
    console.log(resp.json())
    resp = resp.json()

    report(
      <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
      <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
    )
    done()
  })


})

describe('Compare uploaded multipart image', (report, done) => {
  let r1 = null
  RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/test-img.png`)
    .then((resp) => {
      r1 = resp
      return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/test-text.txt`)
    })
    .then((resp) => {
      report(
        <Assert key="check file length" expect={image.length} actual={r1.base64().length}/>,
        <Assert key="check file content" expect={'hello.txt'} actual={resp.text()}/>
      )
      done()
    })

})

// added after 0.4.2

describe('Progress report test', (report, done) => {
  let actual = 0, expect = -1
  RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/public/1mb-dummy`, {
      Authorization : 'Bearer abde123eqweje'
    })
    .progress((received, total) => {
      actual = received
      expect = total
    })
    .then((resp) => {
      report(
        <Assert key="download progress correct" expect={expect} actual={actual}/>,
        <Assert key="response data should be correct event with progress listener"
          expect={resp.text().substr(0,10)} actual={"1234567890"}/>)
      done()
    })

})


describe('PUT request test', (report, done) => {
  let actual = 0, expect = -1
  RNFetchBlob.fetch('PUT', `${TEST_SERVER_URL}/upload-form`, {
      Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
      'Content-Type' : 'multipart/form-data',
    }, [
      { name : 'test-img', filename : 'test-img.png', data: image},
      { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
      { name : 'field1', data : 'hello !!'},
      { name : 'field2', data : 'hello2 !!'}
    ])
    .uploadProgress((written, total) => {
      actual = written
      expect = total
    })
    .then((resp) => {
      resp = resp.json()
      report(
        <Assert key="upload progress correct" expect={expect} actual={actual}/>,
        <Assert key="check put form data #1" expect="hello !!" actual={resp.fields.field1}/>,
        <Assert key="check put form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
      )
      done()
    })
})

describe('DELETE request test', (report, done) => {
  RNFetchBlob.fetch('DELETE', `${TEST_SERVER_URL}/hey`)
  .then((resp) => {
    report(
      <Assert key="check DELETE request result" expect={'man'} actual={resp.text()}/>)
      done()
  })
})
