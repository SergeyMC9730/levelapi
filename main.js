require('isomorphic-fetch');
var GD = require("gd.js");
var fs = require("fs");
var GMD2 = require("./gmd2");
var expressJS = require("express");
var process = require("process");
var si = require("systeminformation");
var os = require('os-utils');
var agv = require("./accurateGDVer");
var mysql = require('sync-mysql');
var SqlString = require('sqlstring');
var config = require("./config.json");
var con = new mysql(config.sql);
var robtop = require("./robtop");
var nList = {};

var query = (req) => {
    if(config.sql_middleware.debug) console.log("[DEBUG] Send %s", req);
    return con.query(req);
};

var NodeList;

if (fs.existsSync("nodes.json")) {
    NodeList = JSON.parse(fs.readFileSync("nodes.json").toString("utf8"));
} else {
    fs.writeFileSync("nodes.json", JSON.stringify(
        [
            {
                "node": "yournode",
                "debug": false,
                "database": {
                    "endpoint": "example.com/database",
                    "featureSet": 21,
                    "readOnly": false
                },
                "levelDataLocation": "Levels/node/yournode",
                "queue": {
                    "commandList": [],
                    "runQueue": 0,
                    "runState": 0
                }
            }
        ]
    ));
    console.log("[LevelAPI] Please, configure nodes.json.");
    process.exit(1);
}

NodeList.forEach((nd) => {
    if(!fs.existsSync(nd.levelDataLocation)) {
        console.log("[LevelAPI] Folder " + nd.levelDataLocation + " is not present! Please, create one.");
        process.exit(1);
    }
});

console.log("[LevelAPI] Nodes been verificated successfully");

var enableGC = false;
if (enableGC) {
    setInterval(() => {
        console.log("[GC] Garbage Collector is running");
        global.gc();
        console.log("[GC] Garbage Collector is completed");
    }, 10000);
}

var killFlag = false;

process.on('SIGINT', function () {
    if (killFlag) {
        fs.writeFileSync("nodes.json", NodeList);
        console.log("! Bye !");
        process.exit(0);
    }
    console.log("!! Press Ctrl+C second time to exit !\n? Flag will be reset after two seconds !!");
    killFlag = true;
    setTimeout(() => {
        killFlag = false;
        console.log("! Killflag is removed !");
    }, 2000);
});

var apiService = true;

var findNode = (node = "boomlings") => {
    var foundNode = {
        "node": "boomlings",
        "database": {
            "endpoint": "http://boomlings.com/database",
            "featureSet": 21,
            "readOnly": true
        },
        "levelDataLocation": "./Levels/node/boomlings",
        "queue": {
            "commandList": [],
            "runQueue": 0,
            "runState": 1755018
        }
    };
    var i = 0;

    NodeList.forEach((nd) => {
        if (nd.node == node) {
            foundNode = nd;
            foundNode["gdInstance"] = nList[foundNode.node];
            foundNode["INDEX"] = i;
            return foundNode;
        }
        i++;
    });

    return foundNode;
}

var QueueCommandList = {
    STATE_RESOLVE_INDEX: -2,
    STATE_RESOLVE_QUEUE: -1,
    COMMAND_RESOLVE_LEVEL: 0,
    COMMAND_RESOLVE_LEVEL_FROM_INDEX: 1,
    COMMAND_RESOLVE_USER: 2,
    COMMAND_RESOLVE_COMMENTS: 3
};

var isLevelExists = (id = 0, searchQueue = false, node = "boomlings") => {
    var flag = false;
    if (!searchQueue) {
        var searchedLevels = query("SELECT * FROM `meta` WHERE `id`=" + id + " AND `node`='" + node + "'");
        searchedLevels.forEach((lvl) => {
            //console.log(lvl.id, id, lvl.id == id);
            if (lvl.id == id) flag = true;
        });
    } else {
        var reqNode = findNode(node);
        reqNode.queue.commandList.forEach((queuedLevel) => {
            if (queuedLevel[0] == id && queuedLevel[1] == QueueCommandList.COMMAND_RESOLVE_LEVEL) flag = true;
        });
    }
    return flag;
}
var findLevel = (id = 0, node = "boomlings") => {
    var searchedLevels = query("SELECT * FROM `meta` WHERE `id`=" + id + " AND `node`='" + node + "'");
    return searchedLevels[0];
}
var filterLevelList = (ids = [0, 1, 2], node = "boomlings") => {
    // construct search query
    var str = "SELECT * FROM meta WHERE ";
    var i = 0;
    ids.forEach((id) => {
        var d = (i == (ids.length - 1)) ? " AND " : " OR ";
        str += `id = ${id}${d}`;
        i++;
    });
    str += "node LIKE '" + node + "'";
    // request query
    var searchedLevels = query(str);
    var l2_1 = [];
    searchedLevels.forEach((fl) => {
        l2_1.push(fl.id);
    })
    var l2 = l2_1;
    var nf1 = l2.filter(id => ids.includes(id));
    var ff = [];
    ids.forEach((lll) => {
        if (!nf1.includes(lll)) ff.push(lll);
    });
    return ff;
}

var convertLevelToArray = (lm) => {
    var lmeta = [];
    lmeta[0] = lm.id;
    lmeta[1] = lm.gameVersion;
    lmeta[2] = lm.size;
    lmeta[3] = lm.name;
    lmeta[4] = lm.description;
    lmeta[5] = lm.levelDownloads;
    lmeta[6] = lm.levelLikes;
    lmeta[7] = lm.levelObjects;
    lmeta[8] = lm.authorNickname;
    lmeta[9] = lm.authorAccountID;
    lmeta[10] = lm.authorUserID;
    lmeta[11] = lm.musicIsOfficial + 0;
    lmeta[12] = lm.musicID;
    lmeta[13] = lm.releasedIn;
    lmeta[14] = lm.node;
    return lmeta;
}

var latestLevelDownloadd;

var saveIForNode = (i, node = "boomlings") => {
    var reqNode = findNode(node);
    NodeList[reqNode.INDEX].queue = i;
    NodeList[reqNode.INDEX].gdInstance = null;
    fs.writeFileSync("nodes.json", JSON.stringify(NodeList));
}
var getIForNode = (node = "boomlings") => {
    return findNode(node).queue;
}

var sched = async (nodeInformation, gdNode) => {
    if (nodeInformation.database.readOnly) return;
    console.log("[LevelAPI] Select node " + nodeInformation.node);
    var i = getIForNode(nodeInformation.node);
    i.runQueue = !i.runQueue;
    saveIForNode(i, nodeInformation.node);
    if(i.runQueue - 2 == QueueCommandList.STATE_RESOLVE_INDEX) {
        i.runState++;
        saveIForNode(i, nodeInformation.node);
        console.log("[LevelAPI : %s] Access %d", nodeInformation.node, i.runState);
        var somelevel = null;
        try {
            somelevel = await gdNode.levels.get(i.runState);
        } catch (err) {
            somelevel = null;
        }
        if (somelevel != null) {
            console.log("[LevelAPI : %s] ID: %d | Game Version: %d\n[LevelAPI] Creating .gmd2 file", nodeInformation.node, somelevel.id, somelevel.gameVersion);
            var levelData = await (await somelevel.resolve());
            var gmdfile = new GMD2.GMD2Implementation(levelData, `${nodeInformation.levelDataLocation}/Level_${i[0]}.gmd2`, false);
            gmdfile.GenerateFile();
            if (somelevel.creator.accountID == null || somelevel.creator.accountID == 0) {
                var usr = null;
            } else {
                try {
                    var usr = await gdNode.users.getByAccountID(somelevel.creator.accountID);
                } catch (err) {
                    //console.log(err);
                    var usr = null;
                }
            }
            var insr = {
                id: levelData.id,
                gameVersion: levelData.gameVersion,
                size: levelData.data.length,
                name: somelevel.name,
                description: somelevel.description,
                levelDownloads: somelevel.stats.downloads,
                levelLikes: somelevel.stats.likes,
                levelObjects: somelevel.stats.objects,
                authorNickname: (usr != null) ? usr.username : null,
                authorAccountID: (somelevel.creator.accountID == null) ? -1 : somelevel.creator.accountID,
                authorUserID: somelevel.creator.id,
                musicIsOfficial: !somelevel.song.isCustom,
                musicID: somelevel.song.id - !somelevel.song.isCustom,
                releasedIn: agv.getGDVer(levelData.id),
                node: nodeInformation.node
            }
            latestLevelDownloadd = insr;
            query(SqlString.format("INSERT INTO meta SET ?", insr));
            console.log("[LevelAPI : %s] .gmd2 file was made!", nodeInformation.node);
        } else {
            console.log("[LevelAPI : %s] ID: %d | Level is not avaliable", nodeInformation.node, i.runState);
        }
    } else {
        if(i.commandList.length == 0) {
            console.log("[LevelAPI : %s] Queue is empty. Skipping.", nodeInformation.node);
            return;
        }
        var command = i.commandList[i.commandList.length - 1];
        switch(command[1]) {
            case QueueCommandList.COMMAND_RESOLVE_LEVEL: {
                var LLID = command[0];
                i.commandList.pop();
                saveIForNode(i, nodeInformation.node);

                var somelevel = null;
                try {
                    somelevel = await gdNode.levels.get(LLID);
                } catch(err) {
                    somelevel = null;
                }

                if (somelevel != null) {
                    console.log("[LevelAPI : %s] ID: %d | Game Version: %d\n[LevelAPI : %s] Creating .gmd2 file", nodeInformation.node, somelevel.id, somelevel.gameVersion, nodeInformation.node);
                    var levelData = await (await somelevel.resolve());
                    var gmdfile = new GMD2.GMD2Implementation(levelData, `${nodeInformation.levelDataLocation}/Level_${somelevel.id}.gmd2`, false);
                    gmdfile.GenerateFile();
                    if (somelevel.creator.accountID == null || somelevel.creator.accountID == 0) {
                        var usr = null;
                    } else {
                        try {
                            var usr = await gdNode.users.getByAccountID(somelevel.creator.accountID);
                        } catch (e) {
                            var usr = null;
                        }
                    }
                    var insr = {
                        id: somelevel.id,
                        gameVersion: levelData.gameVersion,
                        size: levelData.data.length,
                        name: somelevel.name,
                        description: somelevel.description,
                        levelDownloads: somelevel.stats.downloads,
                        levelLikes: somelevel.stats.likes,
                        levelObjects: somelevel.stats.objects,
                        authorAccountID: (somelevel.creator.accountID == null) ? -1 : somelevel.creator.accountID,
                        authorUserID: somelevel.creator.id,
                        authorNickname: (usr != null) ? usr.username : null,
                        musicIsOfficial: !somelevel.song.isCustom,
                        musicID: somelevel.song.id - !somelevel.song.isCustom,
                        releasedIn: agv.getGDVer(somelevel.id),
                        node: nodeInformation.node
                    };
                    latestLevelDownloadd = insr;
                    query(SqlString.format("INSERT INTO meta SET ?", insr));
                    console.log("[LevelAPI : %s] .gmd2 file was made!", nodeInformation.node)
                } else {
                    console.log("[LevelAPI : %s] ID: %d | Level is not avaliable", nodeInformation.node, LLID);
                }
                break;
            }
            default: {
                console.log("[LevelAPI : %s] Command %d not implemented yet. Skipping.", nodeInformation.node, command[1]);
            }
        }
    }
}

var getInfo = async () => {
    console.log("! Welcome to LevelAPI v1.0 !");
    NodeList.forEach((nd) => {
        nList[nd.node] = new GD({
            logLevel: (nd.debug) ? 2 : 0,
            dbURL: nd.database.endpoint,
            corsURL: config.server_gateway.corsURL
        });
        console.log("[LevelAPI] Starting up node " + nd.node + (nd.debug ? " in DEBUG mode" : ""));
        setInterval(async (nD) => {
            await sched(nD, nList[nD.node]);
        }, 5 * 1000, nd);
    })
    return;
}

String.prototype.isNumber = function () { return /^\d+$/.test(this); }
String.prototype.isJSON = function () {
    if (/^[\],:{}\s]*$/.test(this.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        return true;
    }
    return false;
}

getInfo();

if (apiService) {
    var App = expressJS();
    var port = 8000;

    App.get("/api/v1/download/:levelID.:fileFormat", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levelID = req.params.levelID;
        var resp = {
            response: 200
        };
        var requestedNodeInformation = findNode(requestedNode);
        if (fs.existsSync(__dirname + `/${requestedNodeInformation.levelDataLocation}/Level_${levelID}.gmd2`) && req.params.fileFormat == "gmd2") {
            res.sendFile(__dirname + `/${requestedNodeInformation.levelDataLocation}/Level_${levelID}.gmd2`);
        } else {
            resp.response = 404;
            resp.inQueue = isLevelExists(parseInt(levelID), true, requestedNodeInformation.node);
            res.send(resp);
        }

    });
    App.get("/api/v1/upload/level/:levelID", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var rn = findNode(requestedNode);
        var resp = {
            response: 200,
            queue: true,
            queueLength: rn.queue.commandList.length
        };
        if (!isLevelExists(parseInt(req.params.levelID), false, requestedNode) && !isLevelExists(parseInt(req.params.levelID), true, requestedNode)) {
            rn.queue.commandList.push([parseInt(req.params.levelID), QueueCommandList.COMMAND_RESOLVE_LEVEL]);
        }

        NodeList[rn.INDEX] = rn;
        NodeList[rn.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(resp);
    });
    App.get("/api/v1/upload/levelbatch/:levelArray", async (req, res) => {
        var levels = req.params.levelArray.split(":");
        var lvls2 = [];
        levels.forEach((lvl) => {
            lvls2.push(parseInt(lvl));
        });
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var rn = findNode(requestedNode);
        var resp = {
            response: 200,
            queue: true,
            queueLength: rn.queue.commandList.length,
        };
        var lvls3 = filterLevelList(lvls2, requestedNode);
        lvls3.forEach((lvll) => {
            if (!isLevelExists(parseInt(lvll), true, requestedNode)) {
                rn.queue.commandList.push([parseInt(lvll), QueueCommandList.COMMAND_RESOLVE_LEVEL]);
            }
        });

        NodeList[rn.INDEX] = rn;
        NodeList[rn.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(resp);
    });
    App.get("/api/v1/upload/user/:userName", async (req, res) => {
        var isAccountID = req.params.userName.isNumber();
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var requestedNodeInformation = findNode(requestedNode);
        if (!isAccountID) {
            var author = await requestedNodeInformation.gdInstance.users.getByUsername(req.params.userName, false);
        } else {
            var author = await requestedNodeInformation.gdInstance.users.getByAccountID(parseInt(req.params.userName));
        }
        if (!author) {
            var resp = {
                response: 404
            };
            res.send(resp);
            return;
        }
        var authorLevels = await author.getLevels(8192);
        var respLevels = [];
        var rrr = [];
        authorLevels.forEach((al) => {
            rrr.push(al.id);
        });
        var rrr2 = filterLevelList(rrr, requestedNode);
        rrr2.forEach((al) => {
            if (!isLevelExists(al, true, requestedNode)) {
                respLevels.push(al);
                requestedNodeInformation.queue.commandList.push([al, QueueCommandList.COMMAND_RESOLVE_LEVEL]);
            }
        });
        var resp = {
            response: 200,
            queue: true,
            queueSize: requestedNodeInformation.length,
            levelList: respLevels,
        };

        NodeList[requestedNodeInformation.INDEX] = rn;
        NodeList[requestedNodeInformation.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(resp);
    });
    App.get("/api/v1/stats", async (req, res) => {
        var qSize = 0;
        NodeList.forEach((nd) => {
            qSize += nd.queue.commandList.length;
        });
        var resp = {
            response: 200,
            levels: query("SELECT COUNT(*) FROM `meta` WHERE `id`!=0;")[0]["COUNT(*)"],
            queueSize: qSize,
            latestLevelDownloaded: latestLevelDownloadd,
            estimatedLeveldataSize_MB: parseInt(query("SELECT SUM(size) FROM `meta` WHERE `id`!=0;")[0]["SUM(size)"] / 1024 / 1024),
        };
        res.send(resp);
    });
    App.get("/api/v1/admin", async (req, res) => {
        res.sendStatus(418);
    });
    App.get("/api/v1/teapot", async (req, res) => {
        res.sendStatus(501);
    });
    App.get("/api/info", async (req, res) => {
        var cpudata = await si.cpu();
        var ramdata = await si.mem();
        var sysdata = await si.osInfo();
        os.cpuUsage((j) => {
            var resp = {
                response: 200,
                information: {
                    cpu: {
                        manufacter: cpudata.manufacturer,
                        brand: cpudata.brand,
                        speed: cpudata.speed,
                        cores: cpudata.cores,
                        usage: j * 100
                    },
                    memory: {
                        total: parseInt(ramdata.total / 1024 / 1024),
                        used: parseInt(ramdata.used / 1024 / 1024)
                    },
                    system: {
                        platform: sysdata.platform,
                        sysname: sysdata.distro,
                        release: sysdata.release
                    },
                    api: {
                        version: "v1.0",
                        branch: "/v1",
                        production: true,
                        methodUsed: "GET"
                    }
                }
            };
            res.send(resp);
        });
    });
    App.get("/api/v1/list", async (req, res) => {
        var resp = {
            response: 200,
            api: [
                "/api/v1/download/:levelID.gmd2?node",
                "/api/v1/upload/user/:userName?node",
                "/api/v1/upload/user/:accountID?node",
                "/api/v1/upload/level/:levelID?node",
                "/api/v1/upload/levelbatch/:levelArray?node",
                "/api/v1/admin",
                "/api/v1/stats",
                "/api/v1/list",
                "/api/v1/search/lid/:levelID?node",
                "/api/v1/search/name/:levelName?node",
                "/api/v1/search/description/:levelDescription?node",
                "/api/v1/search/gameVersion/:gameVersion?node",
                "/api/v1/search/accountID/:accountID?node",
                "/api/v1/search/userID/:userID?node",
                "/api/v1/search/nickname/:userName?node",
            ]
        };
        res.send(resp);
    });
    App.get("/api/v1/search/lid/:levelID", async (req, res) => {
        var levelID = req.params.levelID;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        if (isLevelExists(parseInt(levelID), false, requestedNode)) {
            var leveldata1 = findLevel(parseInt(levelID), requestedNode);
            var resp = {
                response: 200,
                meta: leveldata1
            };
            res.send(resp);
            return;
        } else {
            var resp = {
                response: 404,
                inQueue: isLevelExists(parseInt(levelID), true, requestedNode)
            };
            res.send(resp);
            return;
        }
    });
    App.get("/api/v1/search/name/:levelName", async (req, res) => {
        var levelName = req.params.levelName;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var resp = {
            response: 200,
            levels: query("SELECT * FROM meta WHERE name LIKE '%" + levelName + "%' AND `node`='" + requestedNode + "'")
        };
        res.send(resp);
    });
    App.get("/api/v1/search/nickname/:nickName", async (req, res) => {
        var nickName = req.params.nickName;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var resp = {
            response: 200,
            levels: query("SELECT * FROM meta WHERE authorNickname='" + nickName + "' AND `node`='" + requestedNode + "'")
        };
        res.send(resp);
    });
    App.get("/api/v1/search/description/:levelDescription", async (req, res) => {
        var levelDescription = req.params.levelDescription;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var resp = {
            response: 200,
            levels: query(SqlString.format("SELECT * FROM meta WHERE description LIKE ? AND `node`=?", ["%" + levelDescription + "%", requestedNode]))
        };
        res.send(resp);
    });

    App.get("/api/v1/search/gameVersion/:gameVersion", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var gameVersion = parseInt(req.params.gameVersion);
        var resp = {
            response: 200,
            levels: query("SELECT * FROM meta WHERE gameVersion='" + gameVersion + "' AND `node`='" + requestedNode + "'")
        };
        res.send(resp);
    });
    App.get("/api/v1/search/accountID/:accountID", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var accountID = req.params.accountID;
        var resp = {
            response: 200,
            levels: query("SELECT * FROM meta WHERE authorAccountID='" + accountID + "' AND `node`='" + requestedNode + "'")
        };
        res.send(resp);
    });
    App.get("/api/v1/search/userID/:userID", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var userID = req.params.userID;
        var resp = {
            response: 200,
            levels: query("SELECT * FROM meta WHERE authorUserID='" + userID + "' AND `node`='" + requestedNode + "'")
        };
        res.send(resp);
    });

    // POST
    App.post("/api/v1/download/:levelID.:fileFormat", async (req, res) => {
        var levelID = req.params.levelID;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var resp = [200];
        var requestedNodeInformation = findNode(requestedNode);
        if (fs.existsSync(__dirname + `/${requestedNodeInformation.levelDataLocation}/Level_${levelID}.gmd2`) && req.params.fileFormat == "gmd2") {
            res.sendFile(__dirname + `/${requestedNodeInformation.levelDataLocation}/Level_${levelID}.gmd2`);
        } else {
            resp[1] = isLevelExists(parseInt(levelID), true);
            res.send(robtop.convertToRobtop(resp));
        }

    });
    App.post("/api/v1/upload/level/:levelID", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var requestedNodeInformation = findNode(requestedNode);
        var resp = [200, 1, requestedNodeInformation.queue.commandList.length];

        if (!isLevelExists(parseInt(req.params.levelID), false, requestedNode) && !isLevelExists(parseInt(req.params.levelID), true, requestedNode)) {
            requestedNodeInformation.queue.commandList.push([parseInt(req.params.levelID), QueueCommandList.COMMAND_RESOLVE_LEVEL]);
        }

        NodeList[requestedNodeInformation.INDEX] = rn;
        NodeList[requestedNodeInformation.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(robtop.convertToRobtop(resp));

    });
    App.post("/api/v1/upload/levelbatch/:levelArray", async (req, res) => {
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var requestedNodeInformation = findNode(requestedNode);
        var resp = [200, 1, requestedNodeInformation.queue.commandList.length];
        var levels = req.params.levelArray.split(":");
        var lvls2 = [];
        levels.forEach((lvl) => {
            lvls2.push(parseInt(lvl));
        });
        var lvls3 = filterLevelList(lvls2, requestedNode);
        lvls3.forEach((lvll) => {
            if (!isLevelExists(parseInt(lvll), true, requestedNode)) {
                requestedNodeInformation.queue.commandList.length.push([parseInt(lvll), QueueCommandList.COMMAND_RESOLVE_LEVEL]);
            }
        });

        NodeList[requestedNodeInformation.INDEX] = rn;
        NodeList[requestedNodeInformation.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(resp);
    });
    App.post("/api/v1/upload/user/:userName", async (req, res) => {
        var isAccountID = req.params.userName.isNumber();
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var requestedNodeInformation = findNode(requestedNode)
        if (!isAccountID) {
            var author = await requestedNodeInformation.gdInstance.users.getByUsername(req.params.userName, false);
        } else {
            var author = await requestedNodeInformation.gdInstance.users.getByAccountID(parseInt(req.params.userName));
        }
        if (!author) {
            res.send("404");
            return;
        }
        var authorLevels = await requestedNodeInformation.gdInstance.levels.byCreator(author, {}, 8192);
        var respLevels = [];
        var rrr = [];
        authorLevels.forEach((al) => {
            rrr.push(al.id);
        });
        var rrr2 = filterLevelList(rrr, requestedNode);
        rrr2.forEach((al) => {
            if (!isLevelExists(al, true, requestedNode)) {
                respLevels.push(al);
                requestedNodeInformation.queue.commandList.push([al, QueueCommandList.COMMAND_RESOLVE_LEVEL]);
            }
        });
        var resp = [200, 1, requestedNodeInformation.queue.commandList, respLevels];

        NodeList[requestedNodeInformation.INDEX] = rn;
        NodeList[requestedNodeInformation.INDEX].gdInstance = null;
        fs.writeFileSync("nodes.json", JSON.stringify(NodeList));

        res.send(robtop.convertToRobtop(resp));
    });
    App.post("/api/v1/search/lid/:levelID", async (req, res) => {
        var levelID = req.params.levelID;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        if (isLevelExists(parseInt(levelID), false, requestedNode)) {
            var leveldata1 = findLevel(parseInt(levelID), requestedNode);
            var resp = [200, convertLevelToArray(leveldata1)];
            res.send(robtop.convertToRobtop(resp));
            return;
        } else {
            var resp = [404, isLevelExists(parseInt(levelID), true, requestedNode) + 0];
            res.send(robtop.convertToRobtop(resp));
            return;
        }
    });
    App.post("/api/v1/search/name/:levelName", async (req, res) => {
        var levelName = req.params.levelName;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query("SELECT * FROM meta WHERE name LIKE '%" + levelName + "%' AND `node`='" + requestedNode + "'");
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));
    });
    App.post("/api/v1/search/nickname/:nickName", async (req, res) => {
        var nickName = req.params.nickName;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query("SELECT * FROM meta WHERE authorNickname='" + nickName + "' AND `node`='" + requestedNode + "'");
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));
    });
    App.post("/api/v1/search/description/:levelDescription", async (req, res) => {
        var levelDescription = req.params.levelDescription;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query(SqlString.format("SELECT * FROM meta WHERE description LIKE ? AND `node`=?", ["%" + levelDescription + "%", requestedNode]));
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));
    });

    App.post("/api/v1/search/gameVersion/:gameVersion", async (req, res) => {
        var gameVersion = parseInt(req.params.gameVersion);
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query(SqlString.format("SELECT * FROM meta WHERE gameVersion LIKE ?", ["%" + gameVersion + "%", requestedNode]));
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));

    });
    App.post("/api/v1/search/accountID/:accountID", async (req, res) => {
        var accountID = req.params.accountID;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query("SELECT * FROM meta WHERE authorAccountID='" + accountID + "' AND `node`='" + requestedNode + "'");
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));
    });
    App.post("/api/v1/search/userID/:userID", async (req, res) => {
        var userID = req.params.userID;
        var requestedNode;
        if (req.query.node) {
            requestedNode = req.query.node;
        } else {
            requestedNode = "boomlings";
        }
        var levels = query("SELECT * FROM meta WHERE authorUserID='" + userID + "' AND `node`='" + requestedNode + "'");
        var lvls = [200];
        levels.forEach((lvl) => {
            lvls.push(convertLevelToArray(lvl));
        });
        res.send(robtop.convertToRobtop(lvls));
    });

    App.listen(port, () => {
        console.log("[Express] Working on " + port)
    });
}