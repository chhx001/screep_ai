module.exports = {
    MODULE_NAME:String = "Logger",
    VERSION:Number = 1,
    
    DEBUG:Number = 1,
    INFO:Number = 2,
    WARN:Number = 3,
    Error:Number = 4,

    DEFAULT_LEVEL:Number = this.INFO,

    need_init_memory() {
        if (Memory.user.logger == undefined || Memory.user.logger.version == undefined || Memory.user.logger.version < this.VERSION)
            return true;
        return false;
    },

    init_memory() {
        if (this.need_init_memory()) {
            Memory.user.logger = {}
            Memory.user.logger.version = 0;
            Memory.user.logger.log_level = this.DEFAULT_LEVEL;
            Memory.user.eq.version = VERSION;
        }
    },

    log(module, str) {
        console.error("[" + Game.time + "][" + "LOG" + "]" + module.MODULE_NAME + ": " + str);
    },

    debug(module, str) {
        if (Memory.user.logger.log_level <= this.DEBUG)
            console.debug("[" + Game.time + "][" + "DEBUG" + "]" + module.MODULE_NAME + ": " + str);
    },
    info(module, str) {
        if (Memory.user.logger.log_level <= this.INFO)
            console.info("[" + Game.time + "][" + "INFO" + "]" + module.MODULE_NAME + ": " + str);
    },
    warn(module, str) {
        if (Memory.user.logger.log_level <= this.WARN)
            console.warn("[" + Game.time + "][" + "WARN" + "]" + module.MODULE_NAME + ": " + str);
    },
    error(module, str) {
        if (Memory.user.logger.log_level <= this.ERROR)
            console.error("[" + Game.time + "][" + "ERROR" + "]" + module.MODULE_NAME + ": " + str);
    },
}