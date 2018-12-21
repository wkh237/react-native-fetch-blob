// Copyright 2016 wkh237@github. All rights reserved.
// Use of this source code is governed by a MIT-style license that can be
// found in the LICENSE file.

import Event from './Event';

export default class ProgressEvent extends Event {

    constructor (lengthComputable, loaded, total) {
        super();
        this._lengthComputable = lengthComputable;
        this._loaded = loaded;
        this._total = total;
    }

    _lengthComputable: boolean = false;

    get lengthComputable () {
        return this._lengthComputable;
    }

    _loaded: number = -1;

    get loaded () {
        return this._loaded;
    }

    _total: numver = -1;

    get total () {
        return this._total;
    }

}
