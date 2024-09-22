module.exports = {
    MODULE_NAME : "Logger",
    VERSION : 1,
    
    DEBUG : 1,
    INFO : 2,
    WARN : 3,
    Error : 4,

    BUG_ON_ERROR :  true,

    need_init_memory() {
        if (Memory.user.logger == undefined ||
        Memory.user.logger.version == undefined ||
        Memory.user.logger.version < this.VERSION)
            return true;
        return false;
    },

    init() {
        if (this.need_init_memory()) {
            Memory.user.logger = {}
            Memory.user.logger.version = 0;
            Memory.user.logger.log_level = this.DEBUG;
            Memory.user.logger.bug_on_error = this.BUG_ON_ERROR
            Memory.user.logger.version = this.VERSION;
        }
    },

    bug(module, str) {
        Memory.user.bug.exist = true;
    },

    log(module, str) {
        console.log("" + Game.time + ":[" + "LOG" + "]" + module.MODULE_NAME + ": " + str);
    },
    _log(str) {
        console.log("" + Game.time + ":[" + "LOG" + "]" + ": " + str);
    },

    debug(module, str) {
        if (Memory.user.logger.log_level <= this.DEBUG)
            console.log("" + Game.time + ":[" + "DEBUG" + "]" + module.MODULE_NAME + ": " + str);
    },
    _debug(str) {
        if (Memory.user.logger.log_level <= this.DEBUG)
            console.log("" + Game.time + ":[" + "DEBUG" + "]" + ": " + str);
    },

    info(module, str) {
        if (Memory.user.logger.log_level <= this.INFO)
            console.log("" + Game.time + ":[" + "INFO" + "]" + module.MODULE_NAME + ": " + str);
    },
    _info(str) {
        if (Memory.user.logger.log_level <= this.INFO)
            console.log("" + Game.time + ":[" + "INFO" + "]" + ": " + str);
    },

    warn(module, str) {
        if (Memory.user.logger.log_level <= this.WARN)
            console.log("" + Game.time + ":[" + "WARN" + "]" + module.MODULE_NAME + ": " + str);
    },
    _warn(str) {
        if (Memory.user.logger.log_level <= this.WARN)
            console.log("" + Game.time + ":[" + "WARN" + "]" + ": " + str);
    },

    error(module, str) {
        if (Memory.user.logger.log_level <= this.ERROR)
            console.log("" + Game.time + ":[" + "ERROR" + "]" + module.MODULE_NAME + ": " + str);
        if(Memory.user.logger.bug_on_error) {
            this.bug()
        }
    },
    _error(str) {
        if (Memory.user.logger.log_level <= this.ERROR)
            console.log("" + Game.time + ":[" + "ERROR" + "]" + ": " + str);
        if(Memory.user.logger.bug_on_error) {
            this.bug()
        }
    },
}