export default {
  greater : (a, b) => a > b,
  smaller : (a, b) => a < b,
  instanceOf : (a, b) => a instanceof b,
  typeof : (a, b) => typeof a === b,
  IsNull : (a, b) => a === null,
  exists : (a, b) => a,
  hasValue : (a, b) => (a !== void 0) && (Array.isArray(a) ? a.length !==0 : true),
  isArray : (a, b) => Array.isArray(a),
  hasProperties : (a, b) => {
    let res = true
    for(let i in a) {
      let found = false
      for(let j in b) {
        if(b[j] === i) {
          found = true
          break;
        }
      }
      res = res && found
    }
    return res
  }
}
