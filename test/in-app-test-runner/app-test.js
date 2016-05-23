export default class RNAppTest {

  constructor() {
    this.tests = []
    this.context = null
  }

  describe (desc, fn) {

    this.tests.push({
      status : 'running',
      result : null,
      asserts : [],
      desc, fn,
    })

  }

  run (context) {
    this.context = context
    let promise = Promise.resolve()
    for(let i in this.tests) {
      promise = promise.then(function(update, data) {
        return this.fn(update, data)
      }.bind(
        this.tests[i],
        this.update.bind(this, i)
      ))
    }
    return promise
  }

  update(i, data) {
    Object.assign(this.tests[i], data)
    this.context.forceUpdate()
  }

}
