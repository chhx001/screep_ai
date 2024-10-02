
class Utils {
    static get_mem(...path) {
        if (path.length <= 0)
            return undefined
        var retval = Memory
        for (var i = 0; i < path.length; i ++) {
            retval = retval[path[i]]
            if (retval == undefined)
                return undefined
        }
        return retval
    }
}

module.exports = {Utils}