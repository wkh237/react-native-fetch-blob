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

const { Assert, Comparer, Info, describe, prop } = RNTest

// test environment variables

prop('FILENAME', `${Platform.OS}-0.5.0-${Date.now()}.png`)
prop('TEST_SERVER_URL', 'http://192.168.0.14:8123')
prop('DROPBOX_TOKEN', 'fsXcpmKPrHgAAAAAAAAAoXZhcXYWdgLpQMan6Tb_bzJ237DXhgQSev12hA-gUXt4')
prop('styles', {
  image : {
    width: Dimensions.get('window').width*0.9,
    height : Dimensions.get('window').width*0.9,
    margin :16
  }
})

const { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles, image } = prop()

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

// require('./test-fs')
// require('./test-0.1.x-0.4.x')
// require('./test-0.5.x')
require('./test-android')
