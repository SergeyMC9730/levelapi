var GD = require("gd.js");
var admzip = require("adm-zip");
var cpr = require("child_process");
var fs = require("fs");
var xml = require("xml2js");

/**
 * GMD2 Tools
*/
class GMDTools {
    constructor() {
        // Error while downloading file from URL
        this.downloadError = false;
    }
    
    /**
     * Set URL
     * @param {string} url 
     */
    URLSet(url) {
        this.url = url;
    }

    /**
     * Downloads file
     * 
     * *See https://stackoverflow.com/questions/52195360/issues-with-synchronously-downloading-a-file-in-node*
     */
    URLFileDownload() {
        this.downloadError = false;
        this.urlContents = cpr.execFileSync("curl", [
            "--silent", "-L", this.url
        ], {
            //128 MB
            maxBuffer: 128 * 1024 * 1024
        });
        
        if(this.urlContents.includes("404 Not Found")) {
            console.log("[GMD2Impl] Music download error - Blocked Song.");
            this.downloadError = true;
        }
    }
}

class GMDSong {
    constructor() {
        this.id = 0;
        this.isCustom = false;
    }
}

class GMDLevel {
    constructor() {
        this.name = "";
        this.id = 0;
        this.description = "";
        this.song = new GMDSong();
        this.data = "";
        this.levelDataSize = 0;
        this.rawLevelDataString = "";
    }
}

/**
 * GMD2 File Format Implementation
 */
class GMD2Implementation {
    /**
     * **Gives basic information for GMD2 file**
     * @param {GD.Level} levelData Level Data from gd.js
     * @param {string} fileName File Name
     * @param {boolean} debugOutput Enable or disable debugging output
     * 
    */
    constructor(levelData, fileName, debugOutput) {
        // Level Data from gd.js
        this.levelData = levelData;

        // File Name
        this.fileName = fileName;

        // Song Name
        this.songName = "null";

        // Debug Output
        this.debugOutput = debugOutput;
    }

    /**
     * **Embeds song to the resulting file**
     */
    EmbedSong() {
        if(this.levelData.song.isCustom) {
            this.songName = this.levelData.song.url;
        }
    }
    
    /**
     * **Reads file**
     * @return GMDLevel class
     */
    ReadFile() {
        var gdl = new GMDLevel();
        if(fs.existsSync(this.fileName)) {
            var f = fs.readFileSync(this.fileName);
            var zipdata = new admzip(f, {
                readEntries: true,
                noSort: true,
            });

            var lm;
            var ld;

            zipdata.getEntries().forEach((ze) => {
                switch(ze.entryName) {
                    case "level.meta": {
                        lm = JSON.parse(ze.getData().toString("utf8"));
                        break;
                    }
                    case "level.data": {
                        ld = ze.getData().toString("ascii");
                        break;
                    }
                    default: {
                        console.log("[GMD2Impl WARN] Found unknown file %s! Skipping.", ze.entryName);
                        break;
                    }
                }
            });

            gdl.rawLevelDataString = ld;

            // Parse level.data
            xml.parseString(ld, (err, result) => {
                if(err) return gdl;
                gdl.name = result.d.s[0];
                gdl.data = result.d.s[2];
                var ldesc = Buffer.from(result.d.s[1], "base64");
                gdl.description = ldesc.toString("ascii");
                gdl.levelDataSize = gdl.data.length;
                gdl.song.isCustom = (result.d.k[4] == "k45") ? true : false;
                gdl.song.id = parseInt(result.d.i[1]);
            })
            var lid = this.fileName.split("/").slice(-1)[0].split(".")[0].split("_")[1];
            if(lid != "NaN") gdl.id = parseInt(lid);
        }
        
        return gdl;
    }

    /**
     * **Generates file**
     */
    GenerateFile() {
        // level.meta
        var lmeta = {
            "compression": "none"
        };
        // level.data
        var ldata = "";
        // Create level.data
        ldata = ldata.concat("<d><k>kCEK</k>");
            ldata = ldata.concat("<i>4</i><k>k2</k>");

            // Level Name
            if(this.debugOutput) console.log("[GMD2Impl] Level Name: %s", this.levelData.name);
            ldata = ldata.concat(`<s>${this.levelData.name}</s>`);
            ldata = ldata.concat(`<k>k3</k>`);

            // Level Description
            if(this.debugOutput) console.log("[GMD2Impl] Level Description: %s", this.levelData.description);
            var buf = Buffer.from(this.levelData.description, "ascii")
            ldata = ldata.concat(`<s>${buf.toString("base64")}</s>`);
            ldata = ldata.concat("<k>k4</k>");

            // Level Data
            ldata = ldata.concat(`<s>${this.levelData.data}</s>`);

            // Song Information
            var knum = (this.levelData.song.isCustom) ? "k45" : "k8";
            var song = `<k>${knum}</k><i>${this.levelData.song.id - !this.levelData.song.isCustom}</i>`;
            ldata = ldata.concat(song);

            ldata = ldata.concat("<k>k13</k><t/><k>k21</k><i>2</i><k>k50</k><i>35</i>");

        // File end
        ldata = ldata.concat("</d>");

        // Create ZIP File
        var zipdata = new admzip();
        var zipoutput = this.fileName;

        // Download song
        if(this.songName != "null") {
            // Create GMDTools instance
            if(this.debugOutput) console.log("[GMD2Impl] Creating GMD Tools Instance");
            var gtools = new GMDTools();
            
            if(this.debugOutput) console.log("[GMD2Impl] Downloading song");

            // Set Song URL
            gtools.URLSet(this.songName);
        
            // Download Song
            gtools.URLFileDownload();

            if(!gtools.downloadError) {
                // Add to zip file
                zipdata.addFile(`${this.levelData.song.id}.mp3`, gtools.urlContents);

                // Add sond metadata to level.meta
                lmeta["song-file"] = `${this.levelData.song.id}.mp3`;
                lmeta["song-is-custom"] = true;

                if(this.debugOutput && !gtools.downloadError) {
                    console.log("[GMD2Impl] Success! Song %d was downloaded.", this.levelData.song.id);
                }
            }
        }

        // Add level.data and level.meta
        zipdata.addFile("level.data", ldata);
        zipdata.addFile("level.meta", JSON.stringify(lmeta));

        // Write GMD2 file
        if(this.debugOutput) console.log("[GMD2Impl] Writing GMD2 Data to %s", this.fileName);
        zipdata.writeZip(zipoutput);
        if(this.debugOutput) console.log("[GMD2Impl] Success! GMD2 Data was written.");
    }
}

module.exports = {
    GMD2Implementation: GMD2Implementation,
    GMDTools: GMDTools
};