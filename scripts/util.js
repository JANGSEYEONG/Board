const Util = {};

Util.IsNullOrWhiteSpace = (value) => {
    try {
        if (value == null || value == undefined) return true;

        if (value != null && value != undefined && value.toString != undefined && value.toString().trim() === '') return true;
        else return false;
    } catch (e) {
        return false;
    }
};

Util.ToBool = (value) => {

    try {
        if (value == undefined) return false;

        var rtnValue = false;
        var numberRegex = /\d/g;

        if (numberRegex.test(value)) {
            // 숫자라면
            rtnValue = Number(value);

            if (rtnValue === 1) rtnValue = true;
            else rtnValue = false;
        } else {
            if (value.toString().toLowerCase() == "true") rtnValue = true;
            else rtnValue = false;
        }

        return rtnValue;
    } catch (e) {
        return false;
    }
};

module.exports = Util;
