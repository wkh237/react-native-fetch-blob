import RNTest from './react-native-testkit/'
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

const FILENAME = `${Platform.OS}-0.5.0-${Date.now()}.png`
// paste your test config here
const TEST_SERVER_URL = 'http://192.168.17.193:8123'
const DROPBOX_TOKEN = 'fsXcpmKPrHgAAAAAAAAAoXZhcXYWdgLpQMan6Tb_bzJ237DXhgQSev12hA-gUXt4'

const ctx = new RNTest.TestContext()
const Assert = RNTest.Assert
const Comparer = RNTest.Comparer
const Info = RNTest.Info

let image = null

const styles = StyleSheet.create({
  image : {
    width:Dimensions.get('window').width*0.9,
    height : Dimensions.get('window').width*0.9,
    margin :16
  }
})

ctx.describe('GET image from server', (report, done) => {
  RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
      Authorization : 'Bearer abde123eqweje'
    })
    .then((resp) => {
      image = resp.base64()
      report(
        <Info key="Response image">
          <Image
            style={styles.image}
            source={{uri : `data:image/png;base64, ${image}`}}/>
        </Info>)
        done()
    })


})
//
// ctx.describe('The check if it follows 301/302 redirection', (report, done) => {
//
//   RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/redirect`)
//   .then((resp) => {
//     report(
//       <Assert key="check image size" expect={image.length} actual={resp.base64().length}/>,
//       <Info key="Response image">
//         <Image
//           style={{width:Dimensions.get('window').width*0.9, height : Dimensions.get('window').width*0.9,margin :16}}
//           source={{uri : `data:image/png;base64, ${image}`}}/>
//       </Info>)
//       done()
//   })
//
// })
//
// ctx.describe('Upload octet-stream image to Dropbox', (report, done) => {
//
//   RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
//     Authorization : `Bearer ${DROPBOX_TOKEN}`,
//     'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+FILENAME+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
//     'Content-Type' : 'application/octet-stream',
//   }, image)
//   .then((resp) => {
//     resp = resp.json()
//     report(
//       <Assert key="confirm the file has been uploaded" expect={FILENAME} actual={resp.name}/>
//     )
//     done()
//   })
//
// })
//
// ctx.describe('Upload multipart/form-data', (report, done) => {
//
//   RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
//       Authorization : "Bearer fsXcpmKPrHgAAAAAAAAAEGxFXwhejXM_E8fznZoXPhHbhbNhA-Lytbe6etp1Jznz",
//       'Content-Type' : 'multipart/form-data',
//     }, [
//       { name : 'test-img', filename : 'test-img.png', data: image},
//       { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
//       { name : 'field1', data : 'hello !!'},
//       { name : 'field2', data : 'hello2 !!'}
//     ])
//   .then((resp) => {
//     resp = resp.json()
//     report(
//       <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
//       <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
//     )
//     done()
//   })
//
//
// })

ctx.describe('Compare uploaded multipart image', (report, done) => {
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

// ctx.describe('Progress report test', (report, done) => {
//   let received = 0
//   RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/1mb-dummy`, {
//       Authorization : 'Bearer abde123eqweje'
//     })
//     .progress((written, total) => {
//       report(<Info key={`progress = ${written} bytes / ${total} bytes`}/>)
//       if(written === total)
//         report(<Assert key="progress goes to 100%" expect={written} actual={total}/>)
//     })
//     .then((resp) => {
//       report(<Assert key="response data should be correct event with progress listener"
//         expect={resp.text().substr(0,10)} actual={"1234567890"}/>)
//       done()
//     })
//
// })

// FIXME : not yet supported
// ctx.describe('Large file download test', (report, done) => {
//   let received = 0
//   // RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/22mb-dummy`, {
//   //   Authorization : 'Bearer abde123eqweje'
//   // })
//   // .then((resp) => {
//     report(<Assert key="not supported" expect={true} actual={false}/>)
//     done()
//   // })
//
// })

// added after 0.5.0

ctx.describe('Get storage folders', (report, done) => {

  RNFetchBlob.getSystemDirs().then((dirs) => {
    report(
      <Assert key="system folders should exists" expect={dirs} comparer={Comparer.exists} />,
      <Assert key="check properties"
        expect={dirs}
        comparer={Comparer.hasProperties}
        actual={['PictureDir', 'MovieDir', 'DocumentDir', 'CacheDir']}
      />,
      <Info key="System Folders">
        <Text>{`${JSON.stringify(dirs)}`}</Text>
      </Info>
    )
    done()
  })

})

ctx.describe('Download file to storage', (report, done) => {

  RNFetchBlob.config({
      fileCache : true,
      appendExt : 'png'
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
    .then((resp) => {
      report(<Info key={`image from ${resp.path()}`}>
        <Image source={{ uri : resp.path()}} style={styles.image}/>
      </Info>)
      done()
    })
})

export default ctx
