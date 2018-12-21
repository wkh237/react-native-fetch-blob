// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

// import type {RNFetchBlobConfig, RNFetchBlobNative, RNFetchBlobStream} from './types'

import {NativeModules, Platform} from 'react-native';
import RNFetchBlobReadStream from './class/RNFetchBlobReadStream';
import RNFetchBlobSession from './class/RNFetchBlobSession';
import RNFetchBlobWriteStream from './class/RNFetchBlobWriteStream';

const RNFetchBlob: RNFetchBlobNative = NativeModules.RNFetchBlob;

const dirs = {
    DocumentDir: RNFetchBlob.DocumentDir,
    CacheDir: RNFetchBlob.CacheDir,
    PictureDir: RNFetchBlob.PictureDir,
    MusicDir: RNFetchBlob.MusicDir,
    MovieDir: RNFetchBlob.MovieDir,
    DownloadDir: RNFetchBlob.DownloadDir,
    DCIMDir: RNFetchBlob.DCIMDir,
    SDCardDir: RNFetchBlob.SDCardDir,
    SDCardApplicationDir: RNFetchBlob.SDCardApplicationDir,
    MainBundleDir: RNFetchBlob.MainBundleDir,
    LibraryDir: RNFetchBlob.LibraryDir
};

function addCode (code: string, error: Error): Error {
    error.code = code;
    return error;
}

/**
 * Get a file cache session
 * @param  {string} name Stream ID
 * @return {RNFetchBlobSession}
 */
function session (name: string): RNFetchBlobSession {
    let s = RNFetchBlobSession.getSession(name);
    if (s) {
        return new RNFetchBlobSession(name);
    } else {
        RNFetchBlobSession.setSession(name, []);
        return new RNFetchBlobSession(name, []);
    }
}

function asset (path: string): string {
    if (Platform.OS === 'ios') {
        // path from camera roll
        if (/^assets-library:\/\//.test(path)) {
            return path;
        }
    }

    return 'bundle-assets://' + path;
}

function createFile (
    path: string,
    data: string,
    encoding: 'base64' | 'ascii' | 'utf8' | 'uri' = 'utf8'
): Promise<string> {
    if (encoding.toLowerCase() === 'ascii') {
        return Array.isArray(data) ?
            RNFetchBlob.createFileASCII(path, data) :
            Promise.reject(addCode(
                'EINVAL',
                new TypeError('`data` of ASCII file must be an array with 0..255 numbers')
            ));
    } else {
        return RNFetchBlob.createFile(path, data, encoding);
    }
}

/**
 * Create file stream from file at `path`.
 * @param  {string} path   The file path.
 * @param  {string} encoding Data encoding, should be one of `base64`, `utf8`, `ascii`
 * @param {number} [bufferSize=10240]
 * @param {number} [tick=10]
 * @return {RNFetchBlobReadStream} RNFetchBlobReadStream instance.
 */
function createReadStream (
    path: string,
    encoding: 'utf8' | 'ascii' | 'base64' = 'utf8',
    bufferSize?: number = 10240,
    tick?: number = 10
): RNFetchBlobReadStream {
    if (typeof path !== 'string') {
        throw addCode('EINVAL', new TypeError('Missing argument "path"'));
    }

    return new RNFetchBlobReadStream(path, encoding, bufferSize, tick);
}

/**
 * Create write stream to a file.
 * @param  {string} path Target path of file stream.
 * @param  {string} encoding Encoding of input data.
 * @param  {boolean} [append]  A flag represent if data append to existing ones.
 * @return {RNFetchBlobWriteStream} A promise resolves a `WriteStream` object.
 */
function createWriteStream (
    path: string,
    encoding?: 'utf8' | 'ascii' | 'base64' | 'uri' = 'utf8',
    append?: boolean = false
): RNFetchBlobWriteStream {
    if (typeof path !== 'string') {
        throw addCode('EINVAL', new TypeError('Missing argument "path" '));
    }

    return new RNFetchBlobWriteStream(path, encoding, append);
}

/**
 * Create a directory.
 * @param  {string} path Path of directory to be created
 * @return {Promise}
 */
function mkdir (path: string): Promise<void> {
    if (typeof path !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
    }

    return RNFetchBlob.mkdir(path);
}

/**
 * Returns the path for the app group. iOS only
 * @param  {string} groupName Name of app group
 * @return {Promise}
 */
function pathForAppGroup (groupName: string): Promise<string> {
    if (Platform.OS === 'ios') {
        return RNFetchBlob.pathForAppGroup(groupName);
    }

    throw new Error('function is available on iOS only');
}

/**
 * @param  {string} path Path of the file.
 * @param  {'base64' | 'utf8' | 'ascii'} encoding Encoding of read stream.
 * @return {Promise<Array<number> | string>}
 */
function readFile (
    path: string,
    encoding?: 'base64' | 'ascii' | 'utf8' = 'utf8'
): Promise<string | Array<number>> {
    if (typeof path !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
    }

    return RNFetchBlob.readFile(path, encoding);
}

/**
 * Write data to file.
 * @param  {string} path  Path of the file.
 * @param  {string | number[]} data Data to write to the file.
 * @param  {string} encoding Encoding of data (Optional).
 * @return {Promise}
 */
function writeFile (
    path: string,
    data: string | Array<number>,
    encoding?: 'base64' | 'ascii' | 'utf8' | 'uri' = 'utf8'
): Promise<void> {
    if (typeof path !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
    }

    if (encoding.toLocaleLowerCase() === 'ascii') {
        if (!Array.isArray(data)) {
            return Promise.reject(addCode('EINVAL', new TypeError('"data" must be an Array when encoding is "ascii"')));
        } else {
            return RNFetchBlob.writeFileArray(path, data, false);
        }
    }
    else {
        if (typeof data !== 'string') {
            return Promise.reject(addCode(
                'EINVAL',
                new TypeError(`"data" must be a String when encoding is "utf8" or "base64", but it is "${typeof data}"`)
            ));
        } else {
            return RNFetchBlob.writeFile(path, encoding, data, false);
        }
    }
}

function appendFile (
    path: string,
    data: string | Array<number>,
    encoding?: 'utf8' | 'ascii' | 'base64' | 'uri' = 'utf8'
): Promise<number> {
    if (typeof path !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
    }

    if (encoding.toLocaleLowerCase() === 'ascii') {
        if (!Array.isArray(data)) {
            return Promise.reject(addCode(
                'EINVAL',
                new TypeError('`data` of ASCII file must be an array with 0..255 numbers')
            ));
        } else {
            return RNFetchBlob.writeFileArray(path, data, true);
        }
    }
    else {
        if (typeof data !== 'string') {
            return Promise.reject(
                addCode('EINVAL'),
                new TypeError(`"data" must be a String when encoding is "utf8" or "base64", but it is "${typeof data}"`)
            );
        } else {
            return RNFetchBlob.writeFile(path, encoding, data, true);
        }
    }
}

/**
 * Show statistic data of a path.
 * @param  {string} path Target path
 * @return {Object}
 */
function stat (path: string): Promise<Object> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
        }

        RNFetchBlob.stat(path, (err, stat) => {
            if (err) {
                reject(new Error(err));
            } else {
                if (stat) {
                    stat.size = parseInt(stat.size);
                    stat.lastModified = parseInt(stat.lastModified);
                }

                resolve(stat);
            }
        });
    });
}

/**
 * Android only method, request media scanner to scan the file.
 * @param  {Array<Object<string, string>>} pairs Array contains Key value pairs with key `path` and `mime`.
 * @return {Promise}
 */
function scanFile (pairs: *): Promise<*> {
    return new Promise((resolve, reject) => {
        if (pairs === undefined) {
            return reject(addCode('EINVAL', new TypeError('Missing argument')));
        }

        RNFetchBlob.scanFile(pairs, (err) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve();
            }
        });
    });
}

function hash (
    path: string,
    algorithm: 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512'
): Promise<string> {
    if (typeof path !== 'string' || typeof algorithm !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" and/or "algorithm"')));
    }

    return RNFetchBlob.hash(path, algorithm);
}

function cp (path: string, dest: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string' || typeof dest !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" and/or "destination"')));
        }

        RNFetchBlob.cp(path, dest, (err, res) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve(res);
            }
        });
    });
}

function mv (path: string, dest: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string' || typeof dest !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" and/or "destination"')));
        }

        RNFetchBlob.mv(path, dest, (err, res) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve(res);
            }
        });
    });
}

function lstat (path: string): Promise<Array<Object>> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
        }

        RNFetchBlob.lstat(path, (err, stat) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve(stat);
            }
        });
    });
}

function ls (path: string): Promise<Array<String>> {
    if (typeof path !== 'string') {
        return Promise.reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
    }

    return RNFetchBlob.ls(path);
}

/**
 * Remove file at path.
 * @param  {string}   path:string Path of target file.
 * @return {Promise}
 */
function unlink (path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
        }

        RNFetchBlob.unlink(path, (err) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Check if file exists and if it is a folder.
 * @param  {string} path Path to check
 * @return {Promise<boolean>}
 */
function exists (path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
        }

        try {
            RNFetchBlob.exists(
                path,
                exist => resolve(exist)
            );
        } catch (err) {
            reject(addCode('EUNSPECIFIED', new Error(err)));
        }
    });
}

// Helper used by slice()
function normalize (num: number, size: number): number {
    if (num < 0) {
        return Math.max(0, size + num);
    }

    if (!num && num !== 0) {
        return size;
    }

    return num;
}

// Resolves with the "dest" parameter path string in case of success
function slice (src: string, dest: string, start: number, end: number): Promise<string> {
    if (typeof src !== 'string' || typeof dest !== 'string') {
        return reject(addCode('EINVAL', new TypeError('Missing argument "src" and/or "destination"')));
    }

    let p = Promise.resolve();
    let size = 0;

    if (start < 0 || end < 0 || !start || !end) {
        p = p.then(() => stat(src))
        .then(stat => {
            size = Math.floor(stat.size);
            start = normalize(start || 0, size);
            end = normalize(end, size);
        });
    }

    return p.then(() => RNFetchBlob.slice(src, dest, start, end));
}

function isDir (path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (typeof path !== 'string') {
            return reject(addCode('EINVAL', new TypeError('Missing argument "path" ')));
        }

        try {
            RNFetchBlob.exists(path, (exist, isDir) => {
                resolve(isDir);
            });
        } catch (err) {
            reject(addCode('EUNSPECIFIED', new Error(err)));
        }
    });
}

// iOS: {free, total}
// Android: {internal_free, internal_total, external_free, external_total}
function df (): Promise<{ free: number, total: number }> {
    return new Promise((resolve, reject) => {
        RNFetchBlob.df((err, stat) => {
            if (err) {
                reject(addCode('EUNSPECIFIED', new Error(err)));
            } else {
                resolve(stat);
            }
        });
    });
}

export default {
    RNFetchBlobSession,
    unlink,
    mkdir,
    session,
    ls,
    createReadStream,
    mv,
    cp,
    createWriteStream,
    writeFile,
    appendFile,
    pathForAppGroup,
    readFile,
    hash,
    exists,
    createFile,
    isDir,
    stat,
    lstat,
    scanFile,
    dirs,
    slice,
    asset,
    df
};
