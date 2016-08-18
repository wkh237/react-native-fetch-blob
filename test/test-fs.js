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
const { Assert, Comparer, Info, prop } = RNTest
const fs = RNFetchBlob.fs
const describe = RNTest.config({
  group : 'fs',
  expand : false,
  run : true
})

let { TEST_SERVER_URL, FILENAME, DROPBOX_TOKEN, styles, image } = prop()
let dirs = RNFetchBlob.fs.dirs
let prefix = ((Platform.OS === 'android') ? 'file://' : '')

describe('Get storage folders', (report, done) => {
  report(
    <Assert key="system folders should exists"
      expect={dirs}
      comparer={Comparer.exists} />,
    <Assert key="check properties"
      expect={['DocumentDir', 'CacheDir']}
      comparer={Comparer.hasProperties}
      actual={dirs}
    />,
    <Info key="System Folders">
      <Text>{`${JSON.stringify(dirs)}`}</Text>
    </Info>
  )
  done()
})

describe('ls API test', (report, done) => {
  fs.ls(dirs.DocumentDir).then((list) => {
    report(<Assert key="result must be an Array" expect={true} actual={Array.isArray(list)} />)
    return fs.ls('hh87h8uhi')
  })
  .then(()=>{})
  .catch((err) => {
    report(<Assert key="Wrong path should have error"
      expect={err}
      comparer={Comparer.exists}/>)
    done()
  })
})

describe('exists API test', (report, done) => {
  let exists = fs.exists
  exists(dirs.DocumentDir).then((exist, isDir) => {
    report(
      <Assert key="document dir should exist" expect={true} actual={exist}/>
    )
    return exists('blabajsdio')
  })
  .then((exist, isDir) => {
    report(
      <Assert key="path should not exist" expect={false} actual={exist}/>
    )
    done()
  })
})

describe('create file API test', (report, done) => {
  let p = dirs.DocumentDir + '/test-' + Date.now()
  let raw = 'hello ' + Date.now()
  let base64 = RNFetchBlob.base64.encode(raw)

  fs.createFile(p, raw, 'utf8')
    .then(() => {
      let d = ''
      fs.readStream(p, 'utf8').then((stream) => {
        stream.open()
        stream.onData((chunk) => {
          d += chunk
        })
        stream.onEnd(() => {
          report(<Assert key="utf8 content test"  expect={raw} actual={d}/>)
          testBase64()
        })
      })
    })
  function testBase64() {
    fs.createFile(p + '-base64', RNFetchBlob.base64.encode(raw), 'base64')
      .then(() => {
        fs.readStream(p + '-base64', 'utf8').then((stream) => {
            stream.open()
            let d = ''
            stream.onData((chunk) => {
              d += chunk
            })
            stream.onEnd(() => {
              report(
                <Assert
                  key="base64 content test"
                  expect={raw}
                  actual={d}/>)
                done()
              })
        })
      })
      .catch((err) => {
        console.log(err)
      })
  }

})

describe('mkdir and isDir API test', (report, done) => {
  let p = dirs.DocumentDir + '/mkdir-test-' + Date.now()
  fs.mkdir(p).then((err) => {
    report(<Assert key="folder should be created without error"
      expect={undefined}
      actual={err} />)
    return fs.exists(p)
  })
  .then((exist) => {
    report(<Assert key="mkdir should work correctly" expect={true} actual={exist} />)
    return fs.isDir(p)
  })
  .then((isDir) => {
    report(<Assert key="isDir should work correctly" expect={true} actual={isDir} />)
    return fs.mkdir(p)
  })
  .then()
  .catch((err) => {
    report(<Assert key="isDir should not work when folder exists"
      expect={err}
      comparer={Comparer.hasValue}/>)
    done()
  })
})

describe('unlink and mkdir API test', (report, done) => {
  let p = dirs.DocumentDir + '/unlink-test-' + Date.now()
  fs.createFile(p, 'write' + Date.now(), 'utf8').then(() => {
    return fs.exists(p)
  })
  .then((exist) => {
    report(<Assert key="file created" expect={true} actual={exist} />)
    return fs.unlink(p).then(() => {
      return fs.exists(p)
    })
  })
  .then((exist) => {
    report(<Assert key="file removed" expect={false} actual={exist} />)
    return fs.mkdir(p + '-dir')
  })
  .then((err) => fs.exists(p + '-dir'))
  .then((exist) => {
    report(<Assert key="mkdir should success" expect={true} actual={exist} />)
    return fs.unlink(p + '-dir')
  })
  .then(() => fs.exists(p + '-dir'))
  .then((exist) => {
    report(<Assert key="folder should be removed" expect={false} actual={exist} />)
    done()
  })
})

describe('write stream API test', (report, done) => {

  let p = dirs.DocumentDir + '/write-stream' + Date.now()
  let expect = ''
  fs.createFile(p, '1234567890', 'utf8')
    .then(() => fs.writeStream(p, 'utf8', true))
    .then((ws) => {
      ws.write('11')
      ws.write('12')
      ws.write('13')
      ws.write('14')
      return ws.close()
    })
    .then(() => {
      let d1 = ''
      fs.readStream(p, 'utf8').then((stream) => {
        stream.open()
        stream.onData((chunk) => {
          d1 += chunk
        })
        stream.onEnd(() => {
          report(
            <Assert key="write data async test"
              expect={'123456789011121314'}
              actual={d1}/>)
            base64Test()
        })
      })
    })
  function base64Test() {
    fs.writeStream(p, 'base64', false)
    .then((ws) => {
      for(let i = 0; i< 100; i++) {
        expect += String(i)
      }
      ws.write(RNFetchBlob.base64.encode(expect))
      return ws.close()
    })
    .then(() => {
      return fs.readStream(p, 'base64')
    })
    .then((stream) => {
      let d2 = ''
      stream.open()
      stream.onData((chunk) => {
        d2 += chunk
      })
      stream.onEnd(() => {
        report(
          <Assert key="file should be overwritten by base64 encoded data"
            expect={RNFetchBlob.base64.encode(expect)}
            actual={d2} />)
        done()
      })
    })
  }
})

describe('mv API test', {timeout : 10000},(report, done) => {
  let p = dirs.DocumentDir + '/mvTest' + Date.now()
  let dest = p + '-dest-' + Date.now()
  let content = Date.now() + '-test'
  fs.createFile(p, content, 'utf8')
  .then(() => fs.mkdir(dest))
  .then(() => fs.mv(p, dest +'/moved'))
  .then(() => fs.exists(p))
  .then((exist) => {
    report(<Assert key="file should not exist in old path" expect={false} actual={exist}/>)
    return fs.exists(dest + '/moved')
  })
  .then((exist) => {
    report(<Assert key="file should be moved to destination" expect={true} actual={exist}/>)
    return fs.ls(dest)
  })
  .then((files) => {
    report(<Assert key="file name should be correct" expect={'moved'} actual={files[0]}/>)
    fs.readStream(dest + '/moved').then((rs) => {
      rs.open()
      let actual = ''
      rs.onData((chunk) => {
        actual += chunk
      })
      rs.onEnd(() => {
        report(<Assert key="file content should be correct" expect={content} actual={actual}/>)
        done()
      })
    })
  })
})

describe('cp API test', {timeout : 10000},(report, done) => {
  let p = dirs.DocumentDir + '/cpTest' + Date.now()
  let dest = p + '-dest-' + Date.now()
  let content = Date.now() + '-test'
  fs.createFile(p, content, 'utf8')
  .then(() => fs.mkdir(dest))
  .then(() => fs.cp(p, dest +'/cp'))
  .then(() => fs.exists(dest +'/cp'))
  .then((exist) => {
    report(<Assert key="file should be copy to destination" expect={true} actual={exist}/>)
    return fs.ls(dest)
  })
  .then((files) => {
    report(<Assert key="file name should be correct" expect={'cp'} actual={files[0]}/>)
    fs.readStream(dest + '/cp').then((rs) => {
      rs.open()
      let actual = ''
      rs.onData((chunk) => {
        actual += chunk
      })
      rs.onEnd(() => {
        report(<Assert key="file content should be correct" expect={content} actual={actual}/>)
        done()
      })
    })
  })
})

describe('ASCII data test', (report, done) => {
  let p = dirs.DocumentDir + '/ASCII-test-' + Date.now()
  let expect = 'fetch-blob-'+Date.now()

  fs.createFile(p, 'utf8')
    .then(() => {
      return fs.writeStream(p, 'ascii', false)
    })
    .then((ofstream) => {
      for(let i=0;i<expect.length;i++) {
        ofstream.write([expect[i].charCodeAt(0)])
      }
      ofstream.write(['g'.charCodeAt(0), 'g'.charCodeAt(0)])
      return ofstream.close()
    })
    .then(() => {
      fs.readStream(p, 'ascii').then((ifstream) => {
        let res = []
        ifstream.open()
        ifstream.onData((chunk) => {
          res = res.concat(chunk)
        })
        ifstream.onEnd(() => {
          res = res.map((byte) => {
            return String.fromCharCode(byte)
          }).join('')
          report(
            <Assert key="data written in ASCII format should correct"
              expect={expect + 'gg'}
              actual={res}
            />)
              done()
            })
      })
    })
})

describe('ASCII file test', (report, done) => {
  let p = dirs.DocumentDir + '/'
  let filename = ''
  let expect = []
  let base64 = RNFetchBlob.base64
  filename = 'ASCII-file-test' + Date.now() + '.txt'
  expect = 'ascii test ' + Date.now()
  fs.createFile(p + filename, getASCIIArray(expect), 'ascii')
    .then(() => {
      fs.readStream(p + filename, 'base64').then((rs) => {
        let actual = ''
        rs.open()
        rs.onData((chunk) => {
          actual += chunk
        })
        rs.onEnd(() => {
          report(<Assert key="written data verify"
            expect={expect}
            actual={base64.decode(actual)}/>)
          done()
        })
      })
    })
})

describe('format conversion', (report, done) => {
  let p = dirs.DocumentDir + '/foo-' + Date.now()
  fs.createFile(p, [102, 111, 111], 'ascii')
    .then(() => {
      fs.readStream(p, 'utf8').then((stream) => {
        let res = []
        stream.open()
        stream.onData((chunk) => {
          res+=chunk
        })
        stream.onEnd(() => {
          report(
            <Assert key="write utf8 and read by ascii"
              expect="foo"
              actual={res}/>)
              done()
        })
      })
    })
})

describe('stat and lstat test', (report, done) => {
  let p = dirs.DocumentDir + '/' + 'ls-stat-test' + Date.now()
  let file = null

  fs.lstat(dirs.DocumentDir)
  // stat a folder
  .then((stat) => {
    report(
      <Assert key="result should be an array"
        expect={true}
        actual={Array.isArray(stat)}/>)
    file = stat[0].path
    return fs.stat(file)
  })
  .then((stat) => {
    report(
      <Assert key="should have properties"
        expect={['size', 'type', 'lastModified', 'filename', 'path']}
        comparer={Comparer.hasProperties}
        actual={stat}/>)
    return fs.stat('13123132')
  })
  .then(()=>{})
  .catch((err) => {
    console.log(err)
    report(<Assert key="stat error catacable"
      expect={true}
      actual={true}/>)
    done()
  })
  .then(()=>{})
  .catch((err) => {
    console.log(err)
    report(<Assert key="lstat error catacable"
      expect={true}
      actual={true}/>)
    done()
  })

})

describe('fs.slice test', (report, done) => {

  let source = null
  let parts = fs.dirs.DocumentDir + '/tmp-source-'
  let dests = []
  let combined = fs.dirs.DocumentDir + '/combined-' + Date.now() + '.jpg'
  let size = 0

  window.fetch = new RNFetchBlob.polyfill.Fetch({
    auto : true,
    binaryContentTypes : ['image/', 'video/', 'audio/']
  }).build()

  fetch(`${TEST_SERVER_URL}/public/github2.jpg`)
  .then((res) => res.rawResp())
  .then((res) => {
    source = res.path()
    return fs.stat(source)
  })
  // separate file into 4kb chunks
  .then((stat) => {
    size = stat.size
    let promise = Promise.resolve()
    let cursor = 0
    while(cursor < size) {
      promise = promise.then(function(start) {
        console.log('slicing part ', start , start + 40960)
        let offset = 0
        return fs.slice(source, parts + start, start + offset, start + 40960)
                .then((dest) => {
                  console.log('slicing part ', start + offset, start + 40960, 'done')
                  dests.push(dest)
                  return Promise.resolve()
                })
      }.bind(this, cursor))
      cursor += 40960
    }
    console.log('loop end')
    return promise
  })
  // combine chunks and verify the result
  .then(() => {
    console.log('combinding files')
    let p = Promise.resolve()
    for(let d in dests) {
      p = p.then(function(chunk){
        return fs.appendFile(combined, chunk, 'uri').then((write) => {
          console.log(write, 'bytes write')
        })
      }.bind(this, dests[d]))
    }
    return p.then(() => fs.stat(combined))
  })
  .then((stat) => {
    report(
      <Assert key="verify file size" expect={size} actual={stat.size}/>,
      <Info key="image viewer">
        <Image key="combined image" style={styles.image} source={{ uri : prefix + combined}}/>
      </Info>)
    done()
  })

})


function getASCIIArray(str) {
  let r = []
  for(let i=0;i<str.length;i++) {
    r.push(str[i].charCodeAt(0))
  }
  return r
}
