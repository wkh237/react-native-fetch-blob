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


// describe('upload file to firebase', (report, done) => {
//
//   try {
//     let storage = firebase.storage().ref()
//     let task = storage
//       .child(`testdata/firebase-test-${Platform.OS}.png`)
//       .put(new Blob(file, 'image/png'), { contentType : 'image/png' })
//
//     task.on('state_change', null, (err) => {
//
//     }, () => {
//       report(<Assert key="upload success"
//         expect={true}
//         actual={true}/>,
//       <Info key="uploaded file stat" >
//         <Text>{task.snapshot.totalBytes}</Text>
//         <Text>{JSON.stringify(task.snapshot.metadata)}</Text>
//       </Info>)
//     })
//   } catch(ex) {
//     console.log('firebase polyfill error', ex)
//   }
//
// })
