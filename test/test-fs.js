import RNTest from './react-native-testkit/'
import React from 'react'
import RNFetchBlob from 'react-native-fetch-blob'

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
const { Assert, Comparer, Info, prop } = RNTest
const describe = RNTest.config({
  group : 'fs',
  expand : false,
  run : true
})

let { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles, image } = prop()

describe('Get storage folders', (report, done) => {

  RNFetchBlob.getSystemDirs().then((dirs) => {
    report(
      <Assert key="system folders should exists" expect={dirs} comparer={Comparer.exists} />,
      <Assert key="check properties"
        expect={dirs}
        comparer={Comparer.hasProperties}
        actual={['DocumentDir', 'CacheDir', 'DCIMDir', 'DownloadDir']}
      />,
      <Info key="System Folders">
        <Text>{`${JSON.stringify(dirs)}`}</Text>
      </Info>
    )
    done()
  })

})
