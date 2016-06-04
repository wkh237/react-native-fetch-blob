import {
  NativeModules,
  DeviceEventEmitter,
  NativeAppEventEmitter,
} from 'react-native'

const RNFetchBlob = NativeModules.RNFetchBlob
const emitter = DeviceEventEmitter

export default class RNFetchBlobReadStream {

  path : string;
  encoding : 'utf8' | 'ascii' | 'base64';
  bufferSize : ?number;
  closed : boolean;

  constructor(path:string, encoding:string, bufferSize?:?number) {
    if(!path)
      throw Error('RNFetchBlob could not open file stream with empty `path`')
    this.encoding = encoding || 'utf8'
    this.bufferSize = bufferSize
    this.path = path
    this.closed = false
    this._onData = () => {}
    this._onEnd = () => {}
    this._onError = () => {}

    // register for file stream event
    let subscription = emitter.addListener(`RNFetchBlobStream+${this.path}`, (e) => {
    
      let {event, detail} = e
      if(this._onData && event === 'data')
        this._onData(detail)
      else if (this._onEnd && event === 'end') {
        this._onEnd(detail)
      }
      else {
        if(this._onError)
          this._onError(detail)
        else
          throw new Error(detail)
      }
      // when stream closed or error, remove event handler
      if (event === 'error' || event === 'end') {
        subscription.remove()
        this.closed = true
      }
    })

  }

  open() {
    if(!this.closed)
      RNFetchBlob.readStream(this.path, this.encoding, this.bufferSize || 0)
    else
      throw new Error('Stream closed')
  }

  onData(fn) {
    if(this.encoding.toLowerCase() === 'ascii')
      this._onData = (data) => {
        fn(JSON.parse(data))
      }
    else
      this._onData = fn
  }

  onError(fn) {
    this._onError = fn
  }

  onEnd (fn) {
    this._onEnd = fn
  }

}
