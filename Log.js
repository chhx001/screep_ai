var LOG_LEVEL = {
    INFO : 0,
    WARNING : 1,
    ERROR: 2,
    DEBUG: 3,
}

var Log = {
    init: () => {
        if (!Memory.global.log) {
            Memory.global["log"] = {level: 4}
        }
    },
    info: (msg) => {
        Log.init()
        if (Memory.global.log.level > LOG_LEVEL.INFO) {
            msg = "[INFO]" + JSON.stringify(msg)
            console.log(msg)
        }
    },
    warning: (msg) => {
        Log.init()
        if (Memory.global.log.level > LOG_LEVEL.WARNING) {
            msg = "[WARNING]" + JSON.stringify(msg)
            console.log(msg)
        }
    },
    error: (msg) => {
        Log.init()
        if (Memory.global.log.level > LOG_LEVEL.ERROR) {
            msg = "[ERROR]" + JSON.stringify(msg)
            console.log(msg)
        }
    },
    debug: (msg) => {
        Log.init()
        if (Memory.global.log.level > LOG_LEVEL.DEBUG) {
            msg = "[DEBUG]" + JSON.stringify(msg)
            console.log(msg)
        }
    },
    d: (msg) => {
        Log.debug(msg)
    },
    i: (msg) => {
        Log.info(msg)
    },
    e: (msg) => {
        Log.error(msg)
    },
    w: (msg) => {
        Log.warning(msg)
    }
}

module.exports = Log