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

// window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
// window.Blob = RNFetchBlob.polyfill.Blob
// window.fetch = new RNFetchBlob.polyfill.Fetch({
//   auto : true,
//   binaryContentTypes : ['image/', 'video/', 'audio/']
// }).build()

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

describe('test', (report, done) => {

  console.log('start')

  let image = RNTest.prop('image')
  let form = new FormData()
  form.append("FormData", true)
  form.append("access_token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU3YjgyZGQ2MTEwZDcwYmEwYjUxZjM5YyIsImlzTWVkaWMiOnRydWUsImlhdCI6MTQ3MTY4ODE1MiwiZXhwIjoxNDcxNzA2MTUyfQ.gPeql5g66Am4Txl1WqnbvOWJaD8srTK_6vihOJ6kFbY")
  form.append("Content-Type", "image/jpg")
  form.append('image', {
    uri : `data:image/png;base64, ${image}`,
    type : 'image/png'
  })

  let xhr = new XMLHttpRequest()
  xhr.open('post', `${TEST_SERVER_URL}/upload-form`)
  xhr.send(form)
  console.log(form)
  xhr.onerror = function(e) {
    console.log('err', e)
  }
  xhr.onreadystatechange = function() {
    console.log('changed')
    if(this.readyState === this.DONE) {
      console.log(this.response)
    }
  }
  // fetch(`${TEST_SERVER_URL}/upload-form`, {
  //   method : 'POST',
  //   body : form
  // })
  // .then((res) => res.text())
  // .then((data) => {
  //   console.log(data)
  // })

  // let filename = 'test-from-storage-img-'+Date.now()+'.png'
  // RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
  //     'Content-Type' : 'multipart/form-data',
  //   }, [
  //     { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
  //     { name : 'field1', data : 'hello !!'},
  //     { name : 'field2', data : 'hello2 !!'}
  //   ])
  // .then((resp) => {
  //   resp = resp.json()
  //   report(
  //     <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
  //     <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
  //   )
  //   return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/${filename}`)
  // })
  // .then((resp) => {
  //   report(<Info key="uploaded image">
  //     <Image
  //       style={styles.image}
  //       source={{ uri : 'data:image/png;base64, '+ resp.base64()}}/>
  //   </Info>)
  //   done()
  // })

})
