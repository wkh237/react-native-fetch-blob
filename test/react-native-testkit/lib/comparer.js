export default {
  greater : (a, b) => a > b,
  smaller : (a, b) => a < b,
  instanceOf : (a, b) => a instanceof b,
  typeof : (a, b) => typeof a === b,
  IsNull : (a, b) => a === null,
  exists : (a, b) => {
    return a !== null && a !== void 0
  },
  equalToArray : (a, b) => {
    var i = a.length;
    if (i != b.length) return false;
    while (i--) {
        if (a[i] !== b[i]) return false;
    }
    return true;
  },
  hasValue : (a, b) => (a !== void 0) && (Array.isArray(a) ? a.length !==0 : true),
  isArray : (a, b) => Array.isArray(a),
  hasProperties : (a, b) => {
    let res = true
    let c = 0
    for(let i in a) {
      let found = false
      for(let j in b) {
        c++
        if(j === a[i]) {
          found = true
          break;
        }
      }
      res = res && found
    }
    return res
  }
}
