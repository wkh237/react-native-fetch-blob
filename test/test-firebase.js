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

window.XMLHttpRequest = RNFetchBlob.polyfill.XMLHttpRequest
window.Blob = RNFetchBlob.polyfill.Blob

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


describe('firebase login', (report, done) => {

  firebase.initializeApp(config);
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
    if(user)
      done()
  })
})

describe('upload file to firebase', (report, done) => {

  let testImage = `firebase-test-${Platform.OS}-${Date.now()}.png`
  RNTest.prop('firebase-image', testImage)

  // create Blob from BASE64 data
  Blob.build(RNTest.prop('image'), { type : 'image/png;BASE64'})
  .then((blob) => {
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
    .fetch('GET', `${TEST_SERVER_URL}/public/500k-img-dummy.jpg`)
    .then((resp) => {
      report(<Info key="test image">
        <Image style={styles.image} source={{uri : prefix + resp.path()}}/>
      </Info>)
      return Blob.build(RNFetchBlob.wrap(resp.path()), { type : 'image/jpg' })
    })
    .then((blob) => {
      return firebase.storage().ref('rnfbtest')
        .child(tier2FileName)
        .put(blob, { contentType : 'image/jpg' })
    })
    .then(() => {
      report(<Assert key="upload finished" />)
      done()
    })
})

let directURL = null

describe('verify uploaded file', (report, done) => {
  firebase.storage().ref('rnfbtest/' + tier2FileName)
    .getDownloadURL()
    .then((url) => {
      directURL = url
      report(
        <Info key="image viewer">
          <Image style={styles.image} source={{uri : url}}/>
        </Info>)
      done()
    })
})

describe('download to base64', (report, done) => {
  RNFetchBlob.fetch('GET', directURL).then((resp) => {
    report(
      <Info key="image data">
        <Image
          style={styles.image}
          source={{uri : 'data:image/jpg;base64 ,'+ resp.base64()}}/>
      </Info>)
    done()
  })
})

describe('upload from storage', (report, done) => {
  try {
  let file = fs.dirs.DocumentDir + '/tempimg.png'
  fs.writeFile(file, RNTest.prop('image'), 'base64')
    .then(() => Blob.build(RNFetchBlob.wrap(file), {type : 'image/png'}))
    .then((blob) => {
      let storage = firebase.storage().ref('rnfbtest')
      let task = storage
        .child(`image-from-storage-${Platform.OS}-${Date.now()}.png`)
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
  }
  catch(err) {
    console.log(err)
  }
})

Platform.OS === 'ios' && describe('upload from CameraRoll', (report, done) => {

    CameraRoll.getPhotos({first : 10})
    .then((resp) => {
      let url = resp.edges[0].node.image.uri
      console.log('CameraRoll',url)
      return Blob.build(RNFetchBlob.wrap(url), {type:'image/jpg'})
    })
    .then((b) => {
      blob = b
      console.log('start upload ..')
      return firebase.storage()
        .ref('rnfbtest').child(`camra-roll-${Platform.OS}-${Date.now()}.jpg`)
        .put(b, {contentType : 'image/jpg'})
    })
    .then((snapshot) => {
      report(<Assert key="upload sucess" expect={true} actual={true}/>)
      done()
    })
})


Platform.OS === 'android' && describe('upload from CameraRoll', (report, done) => {

  let blob
  RNFetchBlob.config({
      addAndroidDownloads : { useDownloadManager : true }
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/1600k-img-dummy.jpg`)
    .then((res) => CameraRoll.getPhotos({first : 10}))
    .then((resp) => {
      let url = resp.edges[0].node.image.uri
      console.log('CameraRoll',url)
      return Blob.build(RNFetchBlob.wrap(url), {type:'image/jpg'})
    })
    .then((b) => {
      blob = b
      return firebase.storage()
        .ref('rnfbtest').child(`camra-roll-${Platform.OS}-${Date.now()}.jpg`)
        .put(b, {contentType : 'image/jpg'})
    })
    .then((snapshot) => {
      report(<Assert key="upload sucess" expect={true} actual={true}/>)
      blob.close()
      done()
    })
})
