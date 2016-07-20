export default class Log {

  _name:string;

  constructor(name:string) {
    this._name = name
  }

  info(...args) {
    console.log(this._name, '-info:', ...args)
  }

  debug(...args) {
    console.log(this._name, '-debug:', ...args)
  }

  error(...args) {
    console.log(this._name, '-error:', ...args)
  }

}
