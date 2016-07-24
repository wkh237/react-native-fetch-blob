import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import Timer from 'react-timer-mixin'
import firebase from 'firebase'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  CameraRoll,
  Platform,
  Dimensions,
  Image,
} from 'react-native';

const fs = RNFetchBlob.fs
const Blob = RNFetchBlob.polyfill.Blob

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = Blob
window.FormData = RNFetchBlob.polyfill.FormData

const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'firebase',
  run : true,
  expand : true,
  timeout : 300000000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let file = RNTest.prop('image')

// Initialize Firebase
var config = {
  apiKey: "AIzaSyCnoNvJu2tYYHe87Sm-FrW7j-G-c0MPWGQ",
  authDomain: "rnfb-test-app.firebaseapp.com",
  databaseURL: "https://rnfb-test-app.firebaseio.com",
  storageBucket: "rnfb-test-app.appspot.com",
};
firebase.initializeApp(config);

describe('firebase login', (report, done) => {

  firebase.auth().signInWithEmailAndPassword('xeiyan@gmail.com', 'rnfbtest1024')
    .catch((err) => {
      console.log('firebase sigin failed', err)
    })

  firebase.auth().onAuthStateChanged((user) => {
    report(<Assert key="login status" uid="100"
      expect={true}
      actual={user !== null}/>,
    <Info key="user content" uid="user data">
      <Text>{JSON.stringify(user)}</Text>
    </Info>)
    done()
  })
})

describe('upload file to firebase', (report, done) => {

  // create Blob from BASE64 data
  let blob = new Blob(RNTest.prop('image'), { type : 'image/png;BASE64'})
  let testImage = `firebase-test-${Platform.OS}-${new Date()}.png`
  RNTest.prop('firebase-image', testImage)
  // start test after Blob created
  blob.onCreated(() => {
    let storage = firebase.storage().ref('rnfbtest')
    let task = storage
      .child(RNTest.prop('firebase-image'))
      .put(blob, { contentType : 'image/png' })
      .then((snapshot) => {
        console.log(snapshot.metadata)
        report(<Assert key="upload success"
          expect={true}
          actual={true}/>,
        <Info key="uploaded file stat" >
          <Text>{snapshot.totalBytes}</Text>
          <Text>{JSON.stringify(snapshot.metadata)}</Text>
        </Info>)
        done()
      })
  })
})

describe('download firebase storage item', (report, done) => {
  let storage = firebase.storage().ref('rnfbtest/' + RNTest.prop('firebase-image'))
  storage.getDownloadURL().then((url) => {
    console.log(url)
    report(<Info key="image viewer">
      <Image style={styles.image} source={{uri : url}}/>
    </Info>)
    done()
  })
})

let tier2FileName = `firebase-test-${Platform.OS}-github2.jpg`

describe('upload using file path', (report, done) => {
  RNFetchBlob
    .config({ fileCache : true, appendExt : 'jpg' })
    .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
    .then((resp) => {
      report(<Info key="test image">
        <Image style={styles.image} source={{uri : prefix + resp.path()}}/>
      </Info>)
      let blob = new Blob(RNFetchBlob.wrap(resp.path()), { type : 'image/jpg' })
      blob.onCreated(() => {
        firebase.storage().ref('rnfbtest')
          .child(tier2FileName)
          .put(blob, { contentType : 'image/jpg' })
          .then(() => {
            report(<Assert key="upload finished" />)
            done()
          })
      })
    })
})

describe('verify uploaded file', (report, done) => {
  firebase.storage().ref('rnfbtest/' + tier2FileName)
    .getDownloadURL()
    .then((url) => {
      console.log(url)
      report(<Info key="image viewer">
        <Image style={styles.image} source={{uri : url}}/>
      </Info>)
      done()
    })
})
