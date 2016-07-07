import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

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
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : '0.6.2',
  run : true,
  expand : true,
  timeout : 12000,
})
const { TEST_SERVER_URL_SSL, FILENAME, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

CameraRoll.getPhotos({first : 10}, function(resp){console.log(resp)}, (err)=>{console.log(err)})
  // .then((resp) => {
  //   console.log(resp)
  // })
  // .catch((err) => {
  //   console.log(err)
  // })

describe('access file in assets', (report, done) => {
  CameraRoll.getPhotos({first : 10})
    .then((resp) => {
      report(<Info key="items">
        <Text>{JSON.stringify(resp)}</Text>
      </Info>)
    })
    .catch((err) => {
      console.log(err)
      report(<Info key="err">
        <Text>{JSON.stringify(err)}</Text>
      </Info>)
    })
})
