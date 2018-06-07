// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import {NativeModules} from 'react-native';

const RNFetchBlob = NativeModules.RNFetchBlob;

const ENCODINGS = ['utf8', 'base64', 'ascii'];

function addCode (code: string, error: Error): Error {
    error.code = code;
    return error;
}

export default class RNFetchBlobWriteStream {
    streamId: string;
    path: string;
    encoding: string;

    _streamCreation: Promise<void>;
    _streamCreationError: ?Error;

    constructor (
        path: string,
        encoding: string,
        append: boolean = false
    ): RNFetchBlobWriteStream {
        if (!ENCODINGS.includes(encoding)) {
            throw addCode(
                'EINVAL',
                new Error('Unrecognized encoding "' + encoding + '", should be one of "base64", "utf8", "ascii", "uri"')
            );
        }

        this.path = path;
        this.encoding = encoding;

        this._streamCreation = new Promise(
            (resolve, reject) => RNFetchBlob.writeStream(
                path,
                encoding,
                append,
                (errCode: string, errMsg: string, streamId: string) => {
                    if (errMsg) {
                        this._streamCreationError = addCode(errCode, new Error(errMsg));
                        reject(this._streamCreationError);
                    }
                    else {
                        this.streamId = streamId;
                        resolve();
                    }
                }
            )
        );
    }

    write (data: string | Array<number>): Promise<RNFetchBlobWriteStream> {
        return this._streamCreation.then(() =>
            new Promise(
                (resolve, reject) => {
                    if (this.encoding.toLocaleLowerCase() === 'ascii' && !Array.isArray(data)) {
                        reject(new Error('ascii input data must be an Array of numbers 0..255'));
                        return;
                    }
                    else if (typeof data !== 'string) {
                        reject(new Error('Input data must be a string (utf8 or base64)'));
                        return;
                    }

                    const cb = error => {
                        if (error) {
                            reject(addCode('EUNSPECIFIED', new Error(error)));
                        }
                        else {
                            resolve(this);
                        }
                    };

                    try {
                        if (this.encoding === 'ascii') {
                            RNFetchBlob.writeArrayChunk(this.streamId, data, cb);
                        }
                        else {
                            RNFetchBlob.writeChunk(this.streamId, data, cb);
                        }
                    } catch (err) {
                        reject(addCode('EUNSPECIFIED', new Error(error)));
                    }
                }
            )
        );
    }

    /**
     * Closes the system's underlying write stream. If the stream is already closed nothing happens.
     * @returns {Promise<void>}
     */
    close () {
        return this._streamCreation.then(() =>
            new Promise(
                (resolve, reject) => {
                    try {
                        RNFetchBlob.closeStream(this.streamId, () => resolve());
                    } catch (err) {
                        reject(addCode('EUNSPECIFIED', new Error(error)));
                    }
                }
            )
        );
    }
}
