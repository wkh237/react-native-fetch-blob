package com.RNFetchBlob;

import android.util.Base64;

import com.RNFetchBlob.Utils.DataConverter;
import com.facebook.react.bridge.ReadableArray;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

import static com.RNFetchBlob.RNFetchBlobFS.normalizePath;
import static com.RNFetchBlob.RNFetchBlobFS.writeFileToFileWithOffset;
import static com.RNFetchBlob.RNFetchBlobOpenFile.Mode.*;

/**
 * Created by wkh237 on 2017/7/2.
 */

public class RNFetchBlobOpenFile {

    enum Mode {
        READ,
        WRITE,
        READWRITE
    }

    private FileOutputStream writeStream;
    private FileInputStream readStream;
    private String path;
    private Mode accessMode;

    static Integer OpenFileId = 0;


    RNFetchBlobOpenFile(String uri, Mode mode) throws FileNotFoundException {

        this.path = normalizePath(uri);

        if(mode == READ || mode == READWRITE) {
            this.readStream = new FileInputStream(path);
        }
        if( mode == WRITE || mode == READWRITE) {
            this.writeStream= new FileOutputStream(path);
        }
        this.accessMode = mode;

    }

    Object read(String encoding, int offset, int length) throws Exception {


        byte [] buffer = new byte[length];
        int read = this.readStream.read(buffer, offset, length);
        Object result = null;
        if(encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_BASE64)) {
            result = DataConverter.byteToBase64(buffer, read);
        }
        else if(encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_UTF8)) {
            result = DataConverter.byteToUTF8(buffer, read);
        }
        else if(encoding.equalsIgnoreCase(RNFetchBlobConst.RNFB_RESPONSE_ASCII)) {
            result = DataConverter.byteToRCTArray(buffer, read);
        }
        return result;

    }

    void write(String encoding, Object data, int offset) throws Exception {

        byte [] bytes = null;
        switch (encoding) {
            case RNFetchBlobConst.DATA_ENCODE_BASE64 :
                bytes = Base64.decode((String)data, 0);
                break;
            case RNFetchBlobConst.DATA_ENCODE_UTF8 :
                bytes = ((String)data).getBytes();
                break;
            case RNFetchBlobConst.DATA_ENCODE_ASCII :
                bytes = DataConverter.RCTArrayToBytes((ReadableArray) data);
                break;
            case RNFetchBlobConst.DATA_ENCODE_URI :
                writeFileToFileWithOffset((String)data, this.path, offset, false);
                return;
        }
        if(bytes != null)
            this.writeStream.write(bytes, offset, bytes.length);

    }

    public void close() throws IOException {

        switch (this.accessMode) {
            case READ:
                this.readStream.close();
                break;
            case WRITE:
                this.writeStream.close();
                break;
            case READWRITE:
                this.readStream.close();
                this.writeStream.close();
                break;
        }

    }
}
