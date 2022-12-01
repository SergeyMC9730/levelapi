var convertToRobtop = (arr = [1, true, ""]) => {
    var str = "";
    var l = arr.length;
    var i = 0;
    arr.forEach((arrr) => {
        if(typeof(arrr) != "object") {
            var t;
            if(typeof(arrr) == "string") {
                if(arrr == "") arrr = " ";
                var g = new Buffer.from(arrr, "utf-8");
                t = g.toString("base64");
            } else if(!arrr) {
                t = -128;
            } else {
                t = arrr;
            }
            str += `${t}${(i == (l - 1)) ? "" : ":"}`;
            i++;
        } else {
            var l2 = arrr.length;
            var i2 = 0;
            arrr.forEach((t) => {
                var j;
                if(typeof(t) == "string") {
                    if(t == "") t = " ";
                    var g = new Buffer.from(t, "utf-8");
                    j = g.toString("base64");
                } else if(`${t}` == `null` || `${t}` == `undefined`) {
                    j = -128;
                } else {
                    j = t;
                }
                str += `${j}${(i2 == (l2 - 1)) ? "" : ","}`;
                i2++;
            });
            
            if(i != (l - 1)) {
                str += ":"
            }

            i++;
        }
    });
    str[str.length - 1] = "";
    return str;
}

module.exports = {
    /**
     * **RobTop string implementation**
     */
    convertToRobtop: convertToRobtop,
    /**
     * Validates that implementation converts array to string correctly.
     */
    rtest: (debug = false) => {
        var r = convertToRobtop([41, "lol", true]);
        var r2 = convertToRobtop(["1st level", [22, 1, 22, 32]]);
        var ret = 0;
        var getSuccess = (x = true) => (x) ? "Success" : "Incorrect conversion";

        if(r != "41:bG9s:true") ret = -1;
        if(r2 != "MXN0IGxldmVs:22,1,22,32") ret = -1;
        
        if(debug) {
            console.log(`Tests:\n* String test: expected "41:bG9s:true" | got "${r}" == ${getSuccess(r == "41:bG9s:true")}\n* String test: expected "MXN0IGxldmVs:22,1,22,32" | got "${r2}" == ${getSuccess(r2 == "MXN0IGxldmVs:22,1,22,32")}`);
            console.log(`--------------------------\nResult: ${ret}`);
        }

        return ret;
    }
};