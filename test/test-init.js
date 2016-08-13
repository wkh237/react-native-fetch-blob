import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Platform,
  Dimension,
  Image,
} from 'react-native';

const { Assert, Comparer, Info, prop } = RNTest

// test environment variables

prop('FILENAME', `${Platform.OS}-0.8.0-${Date.now()}.png`)
prop('TEST_SERVER_URL', 'http://192.168.0.11:8123')
prop('TEST_SERVER_URL_SSL', 'https://192.168.0.11:8124')
prop('DROPBOX_TOKEN', 'fsXcpmKPrHgAAAAAAAAAoXZhcXYWdgLpQMan6Tb_bzJ237DXhgQSev12hA-gUXt4')
prop('styles', {
  image : {
    width: Dimensions.get('window').width*0.9,
    height : Dimensions.get('window').width*0.9,
    margin : 16,
    flex : 1
  }
})

const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles, image } = prop()

const describe = RNTest.config({
  run : true,
  expand : true,
  timeout : 5000,
})

// init

describe('GET image from server', (report, done) => {

  RNFetchBlob
    .fetch('GET', `${TEST_SERVER_URL}/public/github.png`, {
      Authorization : 'Bearer abde123eqweje'
    })
    .then((resp) => {
      RNTest.prop('image', resp.base64())
      report(
        <Info key="Response image">
          <Image
            style={styles.image}
            source={{uri : `data:image/png;base64, ${prop('image')}`}}/>
        </Info>)
        done()
    })
})


describe('Upload octet-stream image to Dropbox', (report, done) => {
  let image = prop('image')
  let tmp = null
  let etag = ''
  // upload a file to dropbox
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
    // detect range request support
    return RNFetchBlob
    .config({
      path : RNFetchBlob.fs.dirs.DocumentDir + '/part1.png'
    })
    .fetch('GET', 'https://content.dropboxapi.com/1/files/auto'+'/rn-upload/'+FILENAME, {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Cache-Control' : 'no-store',
      'Range' : 'bytes=0-22975'
    })
  })
  .then((res) => {

    console.log('first chunk', res.info().headers,res.info().headers['Content-Length'])
    // get first range
    return RNFetchBlob
    .config({
      path : RNFetchBlob.fs.dirs.DocumentDir + '/part2.png'
    })
    .fetch('GET', 'https://content.dropboxapi.com/1/files/auto/rn-upload/'+FILENAME, {
      Authorization : `Bearer ${DROPBOX_TOKEN}`,
      'Cache-Control' : 'no-store',
      'Range' : 'bytes=22976-'
    })
  })
  .then((res) => {
    tmp = res
    console.log('second chunk', res.info().headers, res.info().headers['Content-Length'])
    // get second range
    return RNFetchBlob.fs.appendFile(RNFetchBlob.fs.dirs.DocumentDir + '/part1.png', RNFetchBlob.fs.dirs.DocumentDir + '/part2.png', 'uri')
  })
  .then(() => {
    return RNFetchBlob.fs.stat(RNFetchBlob.fs.dirs.DocumentDir + '/part1.png')
  })
  .then((stat) => {
    tmp.flush()
    console.log('combined', stat)
    report(<Info key="combined image">
      <Text>{stat.size}</Text>
      <Image key="combined image" style={styles.image} source={{uri :RNFetchBlob.fs.dirs.DocumentDir + '/part1.png' }}/>
    </Info>)
    done()
  })

})

// require('./test-0.1.x-0.4.x')
// require('./test-0.5.1')
// require('./test-0.5.2')
// require('./test-0.6.0')
// require('./test-0.6.2')
// require('./test-0.6.3')
// require('./test-0.7.0')
// require('./test-0.8.0')
// require('./test-0.9.0')
// require('./test-fetch')
// require('./test-fs')
// require('./test-xmlhttp')
// require('./test-blob')
// require('./test-firebase')
// require('./test-android')
// require('./test-readable')
// require('./benchmark')
