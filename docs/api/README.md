# API set

This file contains every usable API request to any Level API server.

### `/api/v1/list`

- Avaliable methods: **`GET`**
- Description: **This API call returns every usable URL.**
- Arguments: **None**
- Usage:
```json
GET /api/v1/list
==
Returns on success:
{
    "response": 200,
    "api": [
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
        "/api/v1/search/nickname/:userName?node"
    ]
}
```

### `/api/v1/download`

- Avaliable methods: **`GET` and `POST`**
- Description: **Downloads level in `.gmd2` format**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/download/128.gmd2
==
Returns on success:
Requested file
==
Returns on fail:
{
    "response": 404,
    "isQueue": false | true
}
```
```json
POST /api/v1/download/128.gmd2
==
Returns on success:
Requested file
==
Returns on fail:
404;0|1
```

### `/api/v1/upload`
This part will cover API requests related **to placing levels to the queue.**

#### `/api/v1/upload/user`

- Avaliable methods: **`GET` and `POST`**
- Description: **Resolves user levels and places them to the queue.**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/upload/user/RobTop
==
Returns on success:
{
    "response": 200,
    "queue": true,
    "queueSize": 10,
    "levelList": [98, 120],
}
==
Returns on fail:
{
    "response": 404
}
```
```json
POST /api/v1/upload/user/RobTop
==
Returns on success:
200;1;10;98,120
==
Returns on fail:
404
```

#### `/api/v1/upload/level`

- Avaliable methods: **`GET` and `POST`**
- Description: **Places level to queue.**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/upload/level
==
Returns on success:
{
    "response": 200,
    "queue": true,
    "queueLength": 12
}
```
```json
POST /api/v1/upload/level
==
Returns on success:
200;1;12
```

#### `/api/v1/upload/levelbatch`

- Avaliable methods: **`GET` and `POST`**
- Description: **Places array of levels to queue.**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/upload/levelbatch/98:120:2221:11111
==
Returns on success:
{
    "response": 200,
    "queue": true,
    "queueLength": 12
}
```
```json
POST /api/v1/upload/levelbatch/98:120:2221:11111
==
Returns on success:
200;1;12
```

### `/api/v1/admin`

- Avaliable methods: **`GET`**
- Description: **Shows up Admin Control Panel**
- Arguments: **None**
- Usage:
```json
GET /api/v1/admin
==
Returns on success:
I'm a Teapot
```

### `/api/v1/stats`

- Avaliable methods: **`GET`**
- Description: **Shows up Level API statistics**
- Arguments: **None**
- Usage:
```json
GET /api/v1/admin
==
Returns on success:
{
    "response": 200,
    "levels": 593554,
    "queueSize": 0,
    "latestLevelDownloaded": {
        "id": 86281202,
        "gameVersion": 21,
        "size": 1648,
        "name": "kokwkola",
        "description": "",
        "levelDownloads": 15,
        "levelLikes": -1,
        "levelObjects": 232,
        "authorAccountID": 22293497,
        "authorUserID": 194660950,
        "authorNickname": "giooio",
        "musicIsOfficial": true,
        "musicID": 13,
        "releasedIn": "2.1",
        "node": "boomlings"
    },
    "estimatedLeveldataSize_MB": 16556
}
```

### `/api/v1/search`
This part will cover API requests related **to Level searching.**

#### `/api/v1/search/lid`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels by ID**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/lid/128
==
Returns on success:
{
    "response": 200,
    "meta": {
        "id": 128,
        "gameVersion": 21,
        "size": 1004,
        "name": "1st level",
        "description": "",
        "levelDownloads": 0,
        "levelLikes": 0,
        "levelObjects": 0,
        "authorNickname": null,
        "authorAccountID": 6338004,
        "authorUserID": 30144023,
        "musicIsOfficial": 1,
        "musicID": 4,
        "releasedIn": "1.0",
        "node": "boomlings"
    }
}
Returns on fail:
{
    "response": 404,
    "inQueue": false
}
```
```json
POST /api/v1/search/lid/128
==
Returns on success:
{
    "response": 200,
    "meta": {
        "id": 128,
        "gameVersion": 21,
        "size": 1004,
        "name": "1st level",
        "description": "",
        "levelDownloads": 0,
        "levelLikes": 0,
        "levelObjects": 0,
        "authorNickname": null,
        "authorAccountID": 6338004,
        "authorUserID": 30144023,
        "musicIsOfficial": 1,
        "musicID": 4,
        "releasedIn": "1.0",
        "node": "boomlings"
    }
}
200;128,21,1004,MXN0IGxldmVs,IA==,0,0,0,-127,6338004,30144023,1,4,IDEuMA==,Ym9vbWxpbmdz
Returns on fail:
404;0
```

#### `/api/v1/search/name`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels by their Name**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/name/Robtop
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels containing Robtop in their names
    ]
}
```
```json
POST /api/v1/search/name/Robtop
==
Returns on success:
200;level1;level2;level3
```

#### `/api/v1/search/description`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels by their Description**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/description/Demon
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels containing Demon in their descriptions
    ]
}
```
```json
POST /api/v1/search/description/Demon
==
Returns on success:
200;level1;level2;level3
```

#### `/api/v1/search/gameVersion`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels uploaded in `gameVersion`**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/gameVersion/21
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels released in 2.1
    ]
}
```
```json
POST /api/v1/search/gameVersion/21
==
Returns on success:
200;level1;level2;level3
```

#### `/api/v1/search/accountID`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels created by `accountID`**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/description/accountID/1968609
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels made by 1968609 (dogotrigger)
    ]
}
```
```json
POST /api/v1/search/description/Demon
==
Returns on success:
200;level1;level2;level3
```

#### `/api/v1/search/userID`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels created by `userID`**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/description/userID/6718651
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels made by 6718651 (dogotrigger)
    ]
}
```
```json
POST /api/v1/search/description/Demon
==
Returns on success:
200;level1;level2;level3
```

#### `/api/v1/search/nickname`

- Avaliable methods: **`GET` and `POST`**
- Description: **Searches levels created by `nickname`**
- Arguments: **`node`**
- Usage:
```json
GET /api/v1/search/description/nickname/ViPriN
==
Returns on success:
{
    "response": 200,
    "meta": [
        # Bunch of levels made by ViPriN
    ]
}
```
```json
POST /api/v1/search/description/Demon
==
Returns on success:
200;level1;level2;level3
```