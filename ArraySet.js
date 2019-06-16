var ArraySet = {
    create: () => {
        return new Array()
    },
    add: (set, data) => {
        var slot = set.length
        for (var i in set) {
            if (!set[i]) {
                slot = i
            }
            if (set[i] == data) {
                return
            }
        }
        set[slot] = data
    },
    remove: (set, data) => {
        for (var i in set) {
            if (set[i] == data) {
                set[i] = null
            }
        }
    },
    exist: (set, data) => {
        for (var i in set) {
            if (set[i] == data) {
                return true
            }
        }
        return false
    },
    getLength: (set) => {
        var length = 0
        for (var i in set) {
            if (set[i]) {
                length ++
            }
        }
        return length
    },
    subSet: (set, filter) => {
        var ret = new Array()
        _.forEach(set, (s) => {
            if (filter(s)) {
                ret[ret.length] = s
            }
        })
    }
}

module.exports = ArraySet