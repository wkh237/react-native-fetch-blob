package com.RNFetchBlob.Utils;

import android.os.SystemClock;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetEncoder;

/**
 * Created by wkh237 on 2017/5/17.
 */

public class DataConverter {

    private static CharsetEncoder UTF8Encoder = Charset.forName("UTF-8").newEncoder();

    public static String byteToBase64(byte [] data, int length) {
        return Base64.encodeToString(data, 0, length, 0);
    }

    public static String byteToUTF8(byte [] data, int length) throws CharacterCodingException {

        UTF8Encoder.encode(ByteBuffer.wrap(data).asCharBuffer());
        return new String(data);
    }

    public static WritableArray byteToRCTArray(byte [] data, int length) {
        WritableArray chunk = Arguments.createArray();
        for(int i =0;i<length;i++)
        {
            chunk.pushInt((int)data[i]);
        }
        return chunk;
    }
}
