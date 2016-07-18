export default class XMLHttpRequest {

  constructor(...args) {
    console.log('XMLHttpRequest constructor called', args)
  }

  send(...data) {
    console.log('XMLHttpRequest send called', data)
  }

  abort(...args) {
    console.log('XMLHttpRequest abort called', data)
  }

}
