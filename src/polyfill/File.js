/**
 * @author wkh237
 * @since 2016/07/18
 * @description
 * Web API File object polyfill.
 */
import fs from '../fs.js'
import Blob from './Blob.js'

export default class File extends Blob {

  constructor() {
    super()
  }

}
