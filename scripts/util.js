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

module.exports = Util;
