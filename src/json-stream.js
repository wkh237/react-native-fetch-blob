import Oboe from './lib/oboe-browser.min.js'
import XMLHttpRequest from './polyfill/XMLHttpRequest'

const OboeExtended = (arg: string | object) => {
  
  window.XMLHttpRequest = XMLHttpRequest
  window.location = ''

  if(typeof arg === 'string')
    arg = 'JSONStream://' + arg
  else if(typeof arg === 'object')
    arg = Object.assign(arg, { url : 'JSONStream://' + arg.url })
  return Oboe(arg)
}

export default OboeExtended
