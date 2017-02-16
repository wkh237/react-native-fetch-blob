export default {

  isFileURI : (uri:string):boolean => {
    if(typeof uri !== 'string')
      return false
    return /^RNFetchBlob-file\:\/\//.test(uri)
  },

  isJSONStreamURI : (uri:string):boolean => {
    if(typeof uri !== 'string')
      return false
    return /^JSONStream\:\/\//.test(uri)
  },

  removeURIScheme : (uri:string, iterations:number):string => {
    iterations = iterations || 1
    let result = uri
    for(let i=0;i<iterations;i++) {
      result = String(result).replace(/^[^\:]+\:\/\//, '')
    }
    return String(result)
  },

  unwrapFileURI : (uri:string):string => {
    return String(uri).replace(/^RNFetchBlob-file\:\/\//, '')
  }

}
