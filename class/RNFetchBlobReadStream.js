// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {NativeModules} from 'react-native';

const RNFetchBlob = NativeModules.RNFetchBlob;

const ENCODINGS = ['utf8', 'base64', 'ascii'];

function addCode (code: string, error: Error): Error {
    error.code = code || 'EUNSPECIFIED';
    return error;
}

export default class RNFetchBlobReadStream{
    id: string;
    path: string;
    encoding: 'utf8' | 'ascii' | 'base64';

    // For compatibility with old RNFB streams
    bufferSize: number;
    tick: number;
    _timer: ?TimeoutID;
    _onData: ?Function;
    _onError: ?Function;
    _onEnd: ?Function;
    _streamCreationError: ?Error;

    constructor (
        path: string,
        encoding: string,
        bufferSize?: number = 10240,
        tick?: number = 10
    ): RNFetchBlobReadStream {
        if (!ENCODINGS.includes(encoding)) {
            throw addCode('EINVAL', new Error("Unrecognized encoding `" + encoding + "`, should be one of `base64`, `utf8`, `ascii`"));
        }

        if (!path) {
            throw addCode('EINVAL', Error('RNFetchBlob could not open file stream with empty `path`'));
        }

        this.encoding = encoding;
        this.path = path;

        this.bufferSize = bufferSize;
        this.tick = tick;

        RNFetchBlob.readStream(
            path,
            encoding,
            (errCode: string, errMsg: string, streamId: string) => {
                if (errMsg) {
                    this._streamCreationError = addCode(errCode, new Error(errMsg));
                    throw this._streamCreationError;
                }

                this.id = streamId;
                // Process queued write requests, if any
            }
        );
    }

    // Return values: encoding "ascii": Array of 0..255; otherwise a string, UTF-8 or BASE64
    read (size: number): Promise<string | Array<number>> {
        return new Promise((resolve, reject) => {
            RNFetchBlob.readChunk(
                this.id,
                size,
                (errCode, errMsg: string, data) => {
                    if (errMsg) {
                        reject(addCode(errCode, new Error(errMsg)));
                    } else {
                        resolve(data);
                    }
                }
            );
        });
    }

    close (): Promise<void> {
        return new Promise((resolve, reject) => {
            clearTimeout(this._timer);
            try {
                RNFetchBlob.closeStream(this.id, () => resolve());
            } catch (err) {
                reject(addCode('EUNSPECIFIED', new Error(error)));
            }
        });
    }

    // For compatibility with old RNFB streams

    open () {
        if (
            typeof this._onData !== 'function' ||
            typeof this._onError !== 'function' ||
            typeof this._onEnd !== 'function'
        ) {
            throw new Error('The stream should not be opened before assigning functions for onData, onError and onEnd');
        }

        if (this._streamCreationError !== undefined) {
            this._onError(this._streamCreationError);
        } else {
            this._getData();
        }
    }

    onData (fn) {
        if (typeof fn === 'function') {
            this._onData = fn;
        }

        throw new TypeError('onData can only be set to a function');
    }

    onError (fn) {
        if (typeof fn === 'function') {
            this._onError = fn;
        }

        throw new TypeError('onError can only be set to a function');
    }

    onEnd (fn) {
        if (typeof fn === 'function') {
            this._onEnd = fn;
        }

        throw new TypeError('onEnd can only be set to a function');
    }

    _getData (): void {
        // The promise created by this function must not reject
        this.read(this.bufferSize)
        .then(data => {
            if (data === null) {
                this._onEnd();
            }
            this._onData(data);
        })
        .then(() => {
            this._timer = setTimeout(this._getData.bind(this), this.tick);
        })
        .catch(err => {
            clearTimeout(this._timer);
            this._onError(err);
        })
    }
}
