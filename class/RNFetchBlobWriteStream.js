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

export default class RNFetchBlobWriteStream{
    id: string;
    path: string;
    encoding: string;
    append: boolean;

    constructor (path: string, encoding: string, append: boolean = false) {
        if (!ENCODINGS.includes(encoding)) {
            throw addCode(
                'EINVAL',
                new Error("Unrecognized encoding `" + encoding + "`, should be one of `base64`, `utf8`, `ascii`")
            );
        }

        this.id = null;
        this.path = path;
        this.encoding = encoding;
        this.append = append;
        this._queue = [];

        RNFetchBlob.writeStream(
            path,
            encoding,
            append,
            (errCode: string, errMsg: string , streamId: string) => {
                if (errMsg) {
                    throw addCode(errCode, new Error(errMsg));
                }

                this.id = streamId;
                // Process queued write requests, if any
            }
        );
    }

    write (data: string): Promise<RNFetchBlobWriteStream> {
        return new Promise((resolve, reject) => {
            if (this.encoding.toLocaleLowerCase() === 'ascii' && !Array.isArray(data)) {
                reject(new Error('ascii input data must be an Array'));
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
                    RNFetchBlob.writeArrayChunk(this.id, data, cb);
                }
                else {
                    RNFetchBlob.writeChunk(this.id, data, cb);
                }
            } catch (err) {
                reject(addCode('EUNSPECIFIED', new Error(error)));
            }
        });
    }

    close () {
        return new Promise((resolve, reject) => {
            try {
                RNFetchBlob.closeStream(this.id, () => {
                    resolve();
                });
            } catch (err) {
                reject(addCode('EUNSPECIFIED', new Error(error)));
            }
        });
    }
}
