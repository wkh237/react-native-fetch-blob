package com.RNFetchBlob.Utils;

import com.RNFetchBlob.RNFetchBlobConst;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;

/**
 * Created by wkh237 on 2017/5/17.
 */

public class EncodingResolver {

    public static void resolve(Promise promise, String encoding, Object data) {
        if(encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_BASE64) ||
                encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_UTF8)) {
            promise.resolve((String) data);
        }
        else if(encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_ASCII)) {
            promise.resolve((WritableArray) data);
        }
        else
            promise.resolve(null);
    }

}
