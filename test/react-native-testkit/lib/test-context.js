//@flow
export default class TestContext {

  test: Array<TestCase>;
  context: ReactElement;

  static timeout = 3000;

  static setTimeout (val) {
    this.timeout  = val
  }

  constructor() {
    this.tests = []
    this.context = null
  }

  /**
   * Calling this method will push a test case into task queue.
   * @param  {String}   desc Description of test case.
   * @param  {Function:Promise<any>} fn   Body of test case, this function
   *         should return a promise.
   * @return {void}
   */
  describe (desc:string, fn:() => Promise<any>) {

    this.tests.push({
      status : 'waiting',
      result : null,
      asserts : [],
      timeout : 3000,
      expired : false,
      running : false,
      executed : false,
      desc, fn,
    })

  }

  /**
   * Run test cases in sequence.
   * @param  {ReactElement} context ReactElement instance context.
   * @return {void}
   */
  run (context:ReactElement) {
    this.context = context
    let promise = Promise.resolve()
    // run test case sequently
    for(let i in this.tests) {
      promise = promise.then(function(update, updateInternal, data) {
        return new Promise((resolve, reject) => {

          let expired = false
          updateInternal({
            running : true,
          })

          // set timeout timer
          let tm = setTimeout(() => {
            updateInternal({
              expired : true,
              executed : true,
              running : false
            })
            resolve('ETIMEOUT')
          }, this.timeout)

          // run test body
          this.fn.bind(this)(update, data).then((...res) => {
            if(!expired) {
              clearTimeout(tm)
              updateInternal({
                executed : true,
                running : false
              })
              resolve(...res)
            }
          }).catch((err) => {
            updateInternal({
              executed : true,
              running : false
            })
          })

        })
      }
      .bind(
        this.tests[i],
        this.update.bind(this, i),
        this.updateInternal.bind(this, i)
      ))
    }
    return promise
  }

  /**
   * Update test task result of given index.
   * @param  {number} i       Index of test case to be updated.
   * @param  {ReactElement<Info | Assert>} ...data Assertion or Info of test.
   * @return {void}
   */
  update(i, ...data) {
    let test = this.tests[i]
    let result = test.result || []
    Object.assign(test, {result : [...result, ...data]})
    this.context.forceUpdate()
  }

  /**
   * Update test result for testkit internal use
   * @param  {[type]} i      Index of test case to be updated.
   * @param  {TestCaseContext} result Test case object
   * @return {void}
   */
  updateInternal(i, result) {
    Object.assign(this.tests[i], result)
    this.context.forceUpdate()
  }

}
