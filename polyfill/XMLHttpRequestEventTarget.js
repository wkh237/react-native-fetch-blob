// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import Log from '../utils/log.js';
import EventTarget from './EventTarget.js';

const log = new Log('XMLHttpRequestEventTarget');

log.disable();
// log.level(3)

export default class XMLHttpRequestEventTarget extends EventTarget {

    constructor () {
        super();
        log.info('constructor called');
    }

    _onabort: (e: Event) => void = () => {
    };

    get onabort () {
        return this._onabort;
    }

    set onabort (fn: (e: Event) => void) {
        log.info('set onabort');
        this._onabort = fn;
    }

    _onerror: (e: Event) => void = () => {
    };

    get onerror () {
        return this._onerror;
    }

    set onerror (fn: (e: Event) => void) {
        log.info('set onerror');
        this._onerror = fn;
    }

    _onload: (e: Event) => void = () => {
    };

    get onload () {
        return this._onload;
    }

    set onload (fn: (e: Event) => void) {
        log.info('set onload', fn);
        this._onload = fn;
    }

    _onloadstart: (e: Event) => void = () => {
    };

    get onloadstart () {
        return this._onloadstart;
    }

    set onloadstart (fn: (e: Event) => void) {
        log.info('set onloadstart');
        this._onloadstart = fn;
    }

    _onprogress: (e: Event) => void = () => {
    };

    get onprogress () {
        return this._onprogress;
    }

    set onprogress (fn: (e: Event) => void) {
        log.info('set onprogress');
        this._onprogress = fn;
    }

    _ontimeout: (e: Event) => void = () => {
    };

    get ontimeout () {
        return this._ontimeout;
    }

    set ontimeout (fn: (e: Event) => void) {
        log.info('set ontimeout');
        this._ontimeout = fn;
    }

    _onloadend: (e: Event) => void = () => {
    };

    get onloadend () {
        return this._onloadend;
    }

    set onloadend (fn: (e: Event) => void) {
        log.info('set onloadend');
        this._onloadend = fn;
    }

    dispatchEvent (event: string, e: Event) {
        log.debug('dispatch event', event, e);
        super.dispatchEvent(event, e);
        switch (event) {
            case 'abort' :
                this._onabort(e);
                break;
            case 'error' :
                this._onerror(e);
                break;
            case 'load' :
                this._onload(e);
                break;
            case 'loadstart' :
                this._onloadstart(e);
                break;
            case 'loadend' :
                this._onloadend(e);
                break;
            case 'progress' :
                this._onprogress(e);
                break;
            case 'timeout' :
                this._ontimeout(e);
                break;
        }
    }

}
