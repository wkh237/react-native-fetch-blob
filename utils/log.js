export default class Log {

  _name:string;
  _isEnable:boolean = true
  _level:number = 0

  constructor(name:string) {
    this._name = name
  }

  level(val:number) {
    this._isEnable = true
    this._level = val
  }

  enable() {
    this._isEnable = true
  }

  disable() {
    this._isEnable = false
  }

  verbose(...args) {
    this._isEnable && this._level > 2 && console.log(this._name, 'verbose:', ...args)
  }

  debug(...args) {
    this._isEnable && this._level > 1 && console.log(this._name, 'debug:', ...args)
  }

  info(...args) {
    this._isEnable && this._level > 0 && console.log(this._name, 'info:', ...args)
  }

  error(...args) {
    this._isEnable && this._level > -1 && console.warn(this._name, 'error:', ...args)
  }

}
