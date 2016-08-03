export default function(x) {
  var r = /\\u([\d\w]{4})/gi
  x = x.replace(r, function (match, grp) {
    return String.fromCharCode(parseInt(grp, 16))
  })
  return unescape(x)
}
