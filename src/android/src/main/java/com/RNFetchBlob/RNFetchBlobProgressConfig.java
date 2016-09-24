package com.RNFetchBlob;

/**
 * Created by wkh237 on 2016/9/24.
 */
public class RNFetchBlobProgressConfig {

    public boolean shouldReport() {
        boolean checkCount = true;
        if(count > 0)
            checkCount = Math.floor(progress*100/count)> tick;
        return (lastTick - System.currentTimeMillis() > interval) && enable && checkCount;
    }

    public void tick(float progress) {
        this.progress = progress;
        this.tick ++;
        this.lastTick = System.currentTimeMillis();
    }

    public enum ReportType {
        Upload,
        Download
    };

    long lastTick = 0;
    float progress = 0;
    int tick = 0;
    int count = -1;
    public int interval = -1;
    public boolean enable = false;
    public ReportType type = ReportType.Download;

    RNFetchBlobProgressConfig(boolean report, int interval, int count, ReportType type) {
        this.enable = report;
        this.interval = interval;
        this.type = type;
        this.count = count;
    }

}
