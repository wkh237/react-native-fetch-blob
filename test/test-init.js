import RNTest from './react-native-testkit/'
import React from 'react'
import _ from 'lodash'
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

prop('FILENAME', `${Platform.OS}-0.10.0-${Date.now()}.png`)
prop('TEST_SERVER_URL', 'http://localhost:8123')
prop('TEST_SERVER_URL_SSL', 'https://localhost:8124')
// prop('TEST_SERVER_URL', 'http://192.168.0.13:8123')
// prop('TEST_SERVER_URL_SSL', 'https://192.168.0.13:8124')
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

describe('#225 upload progress should fire correctly', (report, done) => {

  let data = '';
  let fired = false;
  for(let i =0; i< 100000; i++) {
    data += 'chunkchunk'
  }
  let upload = RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload`, {
    'Content-Type' : 'text/plain;BASE64'
  }, data)
  upload.uploadProgress((total, now) => {
    console.log(total, now)
    fired = true;
  })
  upload.then(() => {
    report(<Assert key="progress event fired" expect={true} actual={fired}/>);
    done()
  })
})

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


// require('./test-0.1.x-0.4.x')
// require('./test-0.5.1')
// require('./test-0.5.2')
// require('./test-0.6.0')
// require('./test-0.6.2')
// require('./test-0.7.0')
// require('./test-0.8.0')
// require('./test-0.9.0')
// require('./test-0.9.2')
// require('./test-0.9.4')
// require('./test-0.9.5')
// require('./test-0.9.6')
// require('./test-0.10.0')
// require('./test-0.10.1')
// require('./test-0.10.2')
require('./test-0.10.3')
// require('./test-background.js')
// require('./test-stream')
// require('./test-fetch')
// require('./test-fs')
// require('./test-xmlhttp')
// require('./test-blob')
// require('./test-firebase')
// require('./test-android')
// require('./test-stress')
// require('./benchmark')
