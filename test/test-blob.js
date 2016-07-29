import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'
import Timer from 'react-timer-mixin'

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
const File = RNFetchBlob.polyfill.File

const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'Blob',
  run : true,
  expand : false,
  timeout : 20000,
})
const { TEST_SERVER_URL, TEST_SERVER_URL_SSL, DROPBOX_TOKEN, styles } = prop()
const  dirs = RNFetchBlob.fs.dirs

let prefix = ((Platform.OS === 'android') ? 'file://' : '')
let file = RNTest.prop('image')

describe('create Blob from string', (report, done) => {
  Blob.build('hello world !')
      .then((b) => fs.readFile(b.getRNFetchBlobRef(), 'utf8'))
      .then((data) => {
        report(
          <Assert
            key="string data verification"
            expect={'hello world !'}
            actual={data}/>)
        done()
      })
})

describe('create blob from BASE64 encoded data', (report, done) => {
  let image = RNTest.prop('image')
  Blob.build(image, {type : 'image/png;base64'})
      .then((b) => fs.readFile(b.getRNFetchBlobRef(), 'base64'))
      .then((data) => {
        report(
          <Assert
            key="compare content length"
            expect={image.length}
            actual={data.length} />,
          <Assert
            key="compare content"
            expect={image}
            actual={data} />)
        done()
      })
})

describe('create blob from file', (report, done) => {
  let path = fs.dirs.DocumentDir + '/blob-test-temp-img'
  let image = RNTest.prop('image')
  fs.writeFile(path, image, 'base64')
    .then(() => Blob.build(RNFetchBlob.wrap(path)))
    .then((b) => fs.readFile(b.getRNFetchBlobRef(), 'base64'))
    .then((data) => {
      report(
        <Assert
          key="compare content length"
          expect={image.length}
          actual={data.length} />,
        <Assert
          key="compare content"
          expect={image}
          actual={data} />)
      done()
    })
})

describe('create Blob without any agument', (report, done) => {
  Blob.build().then((b) => fs.stat(b.getRNFetchBlobRef()))
      .then((stat) => {
        report(
          <Assert
            key="cache file exists"
            expect={true}
            actual={stat !== undefined && stat !== null}
          />,
        <Assert
          key="cache file size is 0"
          expect={0}
          actual={Math.floor(stat.size)}/>)
        done()
      })
})

describe('blob clear cache test', (report, done) => {
  let expect = 'test-' + Date.now()
  Blob.clearCache()
      .then(() => Blob.build(expect))
      .catch((err) => {
        console.warn(err)
      })
      .then((b) => fs.readFile(b.getRNFetchBlobRef(), 'utf8'))
      .then((data) => {
        report(
          <Assert key="Blob cache still working properly after clearCache"
            expect={expect}
            actual={data}/>)
        return fs.lstat(fs.dirs.DocumentDir + '/RNFetchBlob-blobs/')
      })
      .then((stat) => {
        report(
          <Assert
            key="should remain one file in cache directory."
            expect={1}
            actual={stat.length}/>)
        done()
      })
})

describe('create blob using FormData', (report, done) => {
  let form = new FormData()
  let fname = 'blob-test' + Date.now()
  File.build('test.png', RNTest.prop('image'), { type:'image/png;base64' })
      .then((f) => {
        form.append('name', fname)
        form.append('blob', f)
        return Blob.build(form)
      })
      .then((b) => {
        let body = RNFetchBlob.wrap(b.getRNFetchBlobRef())
        return RNFetchBlob.fetch(
          'POST',
          `${TEST_SERVER_URL}/upload-form`,
          {
            'content-type' : 'multipart/form-data; boundary='+b.multipartBoundary
          },
          body)
      })
      .then((resp) => {
        report(
          <Assert key="form data verification #1"
            actual={resp.json().files[0].originalname}
            expect={'test.png'}/>,
          <Assert key="form data verification #2"
            actual={resp.json().fields.name}
            expect={fname}/>)
        done()
      })
})
