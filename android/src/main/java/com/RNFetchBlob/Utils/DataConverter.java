package com.RNFetchBlob.Utils;

import android.net.Uri;
import android.os.SystemClock;
import android.provider.ContactsContract;
import android.util.Base64;

import com.RNFetchBlob.RNFetchBlob;
import com.RNFetchBlob.RNFetchBlobConst;
import com.RNFetchBlob.RNFetchBlobFS;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.io.StringWriter;
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

    public static String exceptionToStringStackTrace(Exception ex) {
        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        return ex.toString();
    }

    public static byte[] RCTArrayToBytes(ReadableArray data) {
        byte [] bytes = new byte[data.size()];
        for(int i=0;i<data.size();i++) {
            bytes[i] = (byte) data.getInt(i);
        }
        return bytes;
    }

}
