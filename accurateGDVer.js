var inRange = (x = 0, min = 0, max = 0) => (x >= min) && (x <= max);

var IDRange = [
    {
        min: 91,
        max: 1941,
        naming: "1.0"
    },
    {
        min: 1942,
        max: 10043,
        naming: "1.1"
    },
    {
        min: 10049,
        max: 63415,
        naming: "1.2"
    },
    {
        min: 63419,
        max: 121068,
        naming: "1.3"
    },
    {
        min: 121074,
        max: 184425,
        naming: "1.4"
    },
    {
        min: 184440,
        max: 420780,
        naming: "1.5"
    },
    {
        min: 420781,
        max: 827308,
        naming: "1.6"
    },
    {
        min: 827316,
        max: 1627362,
        naming: "1.7"
    },
    {
        min: 1627371,
        max: 2810918,
        naming: "1.8"
    },
    {
        min: 2810991,
        max: 11020426,
        naming: "1.9"
    },
    {
        min: 11020438,
        max: 28356225,
        naming: "2.0"
    },
    {
        min: 28356243,
        max: 100000000,
        naming: "2.1"
    },
    {
        min: 100000001,
        max: 108000002,
        naming: "2.2"
    }
];

var getGDVer = (id = 0) => {
    var GJVer = "0.0";
    IDRange.forEach((idr) => {
        if(inRange(id, idr.min, idr.max)) {
            GJVer = idr.naming;
            return GJVer;
        }
    });
    return GJVer;
}

module.exports = {
    IDRange: IDRange,
    /**
     * **Gets real game version**
     */
    getGDVer: getGDVer
};