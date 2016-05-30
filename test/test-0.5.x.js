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
        actual={['PictureDir', 'MovieDir', 'DocumentDir', 'CacheDir', 'MusicDir', 'DCIMDir']}
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
    .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
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

let localFile = null

describe('Upload from file storage', (report, done) => {
  let filename = ''
  let filepath = ''
  RNFetchBlob.getSystemDirs().then((dirs) => {
    filename = Platform.OS + '0.5.0-' + Date.now() + '-from-storage.png'
    filepath = dirs.DocumentDir + '/' + filename
    return RNFetchBlob.config({ path : filepath })
                      .fetch('GET', `${TEST_SERVER_URL}/public/github2.jpg`)
  })
  .then((resp) => {
      let path = resp.path()
      localFile = path
      return RNFetchBlob.fetch('POST', 'https://content.dropboxapi.com/2/files/upload', {
        Authorization : `Bearer ${DROPBOX_TOKEN}`,
        'Dropbox-API-Arg': '{\"path\": \"/rn-upload/'+filename+'\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}',
        'Content-Type' : 'application/octet-stream',
      }, 'RNFetchBlob-file://' + path)
      .then((resp) => {
        resp = resp.json()
        report(
          <Assert key="confirm the file has been uploaded" expect={filename} actual={resp.name}/>
        )
        done()
      })
  })
})

describe('Upload multipart data with file from storage', (report, done) => {
    let filename = 'test-from-storage-img-'+Date.now()+'.png'
    RNFetchBlob.fetch('POST', `${TEST_SERVER_URL}/upload-form`, {
        'Content-Type' : 'multipart/form-data',
      }, [
        { name : 'test-img', filename : filename, data: 'RNFetchBlob-file://' + localFile},
        { name : 'test-text', filename : 'test-text.txt', data: RNFetchBlob.base64.encode('hello.txt')},
        { name : 'field1', data : 'hello !!'},
        { name : 'field2', data : 'hello2 !!'}
      ])
    .then((resp) => {
      resp = resp.json()
      report(
        <Assert key="check posted form data #1" expect="hello !!" actual={resp.fields.field1}/>,
        <Assert key="check posted form data #2" expect="hello2 !!" actual={resp.fields.field2}/>,
      )
      return RNFetchBlob.fetch('GET', `${TEST_SERVER_URL}/public/${filename}`)
    })
    .then((resp) => {
      report(<Info key="uploaded image">
        <Image
          style={styles.image}
          source={{ uri : 'data:image/png;base64, '+ resp.base64()}}/>
      </Info>)
      done()
    })

})
