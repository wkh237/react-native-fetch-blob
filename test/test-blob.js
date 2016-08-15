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

// since 0.9.2
// test case from :
// https://github.com/w3c/web-platform-tests/blob/master/FileAPI/blob/Blob-slice.html
describe('#89 Blob.slice test', (report, done) => {

  let blob1, blob2
  let count = 0
  let testData

  Blob
    .build(["squiggle"])
    .then((b) => {
      blob1 = b
      return Blob.build(["steak"], {type: "content/type"})
    })
    .then((b) => {
      blob2 = b
      setTestData()
      startTest()
    })

  function setTestData() {
    testData = [
      [
        ["PASSSTRING"],
        [{start:  -6, contents: "STRING"},
         {start: -12, contents: "PASSSTRING"},
         {start:   4, contents: "STRING"},
         {start:  12, contents: ""},
         {start: 0, end:  -6, contents: "PASS"},
         {start: 0, end: -12, contents: ""},
         {start: 0, end:   4, contents: "PASS"},
         {start: 0, end:  12, contents: "PASSSTRING"},
         {start: 7, end:   4, contents: ""}]
      ],
      // Test 3 strings
      [
        ["foo", "bar", "baz"],
        [{start:  0, end:  9, contents: "foobarbaz"},
         {start:  0, end:  3, contents: "foo"},
         {start:  3, end:  9, contents: "barbaz"},
         {start:  6, end:  9, contents: "baz"},
         {start:  6, end: 12, contents: "baz"},
         {start:  0, end:  9, contents: "foobarbaz"},
         {start:  0, end: 11, contents: "foobarbaz"},
         {start: 10, end: 15, contents: ""}]
      ],
      // Test string, Blob, string
      [
        ["foo", blob1, "baz"],
        [{start:  0, end:  3, contents: "foo"},
         {start:  3, end: 11, contents: "squiggle"},
         {start:  2, end:  4, contents: "os"},
         {start: 10, end: 12, contents: "eb"}]
      ],
      // Test blob, string, blob
      [
        [blob1, "foo", blob1],
        [{start:  0, end:  8, contents: "squiggle"},
         {start:  7, end:  9, contents: "ef"},
         {start: 10, end: 12, contents: "os"},
         {start:  1, end:  4, contents: "qui"},
         {start: 12, end: 15, contents: "qui"},
         {start: 40, end: 60, contents: ""}]
      ],
      // Test blobs all the way down
      [
        [blob2, blob1, blob2],
        [{start: 0,  end:  5, contents: "steak"},
         {start: 5,  end: 13, contents: "squiggle"},
         {start: 13, end: 18, contents: "steak"},
         {start:  1, end:  3, contents: "te"},
         {start:  6, end: 10, contents: "quig"}]
      ]
    ]
  }

  function startTest() {
    Promise.all(testData.map(assert)).then(done)
  }

  function assert(d):Promise {
    let content = d[0]
    let assertions = d[1]
    console.log('create blob content = ', content)
    Blob.build(content).then((b) => {
      for(let i in assertions) {
        let args = assertions[i]
        let target = b.slice(args.start, args.end)
        target.onCreated((b2) => {
          let raw = null
          fs.readFile(b.blobPath, 'utf8').then((data) => {
            raw = data
            fs.readFile(b2.blobPath, 'utf8')
              .then(function(actual){
                console.log('---')
                console.log('raw',data)
                console.log('expect', this.contents)
                console.log('actual', actual)
                report(<Assert key={`assertion ${++count}`} expect={this.contents} actual={actual}/>)
              }.bind(args))
          })

        })
      }
    })

  }

})
