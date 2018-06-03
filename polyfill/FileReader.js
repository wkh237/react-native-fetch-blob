// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import Log from '../utils/log.js';
import Blob from './Blob';
import EventTarget from './EventTarget';

const log = new Log('FileReader');

log.level(3);

export default class FileReader extends EventTarget {

    // properties
    _readState: number = 0;
    _error: any;
    // event handlers
    onloadstart: (e: Event) => void;
    onprogress: (e: Event) => void;
    onload: (e: Event) => void;
    onabort: (e: Event) => void;
    onerror: (e: Event) => void;
    onloadend: (e: Event) => void;

    constructor () {
        super();
        log.verbose('file reader const');
        this._result = null;
    }

    static get EMPTY () {
        return 0;
    }

    static get LOADING () {
        return 1;
    }

    static get DONE () {
        return 2;
    }

    _result: any;

    get result () {
        return this._result;
    }

    get isRNFBPolyFill () {
        return true;
    }

    get readyState () {
        return this._readyState;
    }

    abort () {
        log.verbose('abort');
    }

    readAsArrayBuffer (b: Blob) {
        log.verbose('readAsArrayBuffer', b);
    }

    readAsBinaryString (b: Blob) {
        log.verbose('readAsBinaryString', b);
    }

    readAsText (b: Blob, label: ?string) {
        log.verbose('readAsText', b, label);
    }

    // private methods

    // getters and setters

    readAsDataURL (b: Blob) {
        log.verbose('readAsDataURL', b);
    }

    dispatchEvent (event, e) {
        log.verbose('dispatch event', event, e);
        super.dispatchEvent(event, e);
        if (typeof this[`on${event}`] === 'function') {
            this[`on${event}`](e);
        }
    }


}
