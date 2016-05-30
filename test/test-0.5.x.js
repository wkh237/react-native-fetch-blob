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

const { Assert, Comparer, Info, describe, prop } = RNTest
const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles } = prop()

let prefix = ((Platform.OS === 'android') ? 'file://' : '')

// added after 0.5.0

describe('Get storage folders', (report, done) => {

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

let tmpFilePath = null

describe('Download file to storage with custom file extension', (report, done) => {

  RNFetchBlob.config({
      fileCache : true,
      appendExt : 'png'
    })
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
    .then((resp) => {
      tmpFilePath = resp.path()
      report(<Info key={`image from ${tmpFilePath}`}>
        <Image
          source={{ uri : prefix + tmpFilePath}}
          style={styles.image}/>
      </Info>)
      done()
    })
})

describe('Read cached file via file stream', (report, done) => {
  let data = 'data:image/png;base64, '
  let stream = RNFetchBlob.openReadStream(tmpFilePath, 'base64')
  stream.onData((chunk) => {
    data += chunk
  })
  stream.onEnd(() => {
    console.log(prop('image').length, data.length)
    console.log(data)
    report(
      <Assert key="image should have value"
        expect={0}
        comparer={Comparer.smaller}
        actual={data.length}/>,
      <Info key="image from read stream">
        <Image source={{uri : data}} style={styles.image}/>
      </Info>)
    done()
  })
  stream.onError((err) => {
    console.log('stream err', err)
  })
})

describe('File stream reader error should be able to handled', (report, done) => {
  let stream = RNFetchBlob.openReadStream('^_^ not exists', 'base64')
  stream.onError((err) => {
    report(<Info key="error message">
      <Text>
        {err}
      </Text>
    </Info>)
    done()

  })
})

//
// describe('Upload from file storage', (report, done) => {
//   let filename = ''
//   let filepath = ''
//   RNFetchBlob.getSystemDirs().then((dirs) => {
//     filename = 'ios.5.0-' + Date.now() + '-from-storage.png'
//     filepath = dirs.DocumentDir + '/' + filename
//     return RNFetchBlob.config({ path : filepath })
//                       .fetch('GET', `${TEST_SERVER_URL}/public/github.png`)
//   })
//   .then((resp) => {
//       let path = resp.path()
//       return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
//         Authorization : `Bearer ${DROPBOX_TOKEN}`,
//         'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
//         'Content-Type' : 'application/octet-stream',
//       }, 'RNFetchBlob-file://' + path)
//       .then((resp) => {
//         console.log(resp.text())
//         resp = resp.json()
//         report(
//           <Assert key="confirm the file has been uploaded" expect={filename} actual={resp.name}/>
//         )
//         done()
//       })
//   })
//
//
//
// })
