var eq = require("EventQueue.js")
var logger = require("Logger.js");

module.exports = {
    MODULE_NAME:String = "MemoryManager",
    VERSION:Number = 1,
    
    need_init_memory() {
        // if no env, construct
        if (Memory.user == undefined || Memory.user.env == undefined || Memory.user.env.version == undefined)
            return true;
        if (Memory.user.env.version < VERSION)
            return true;
        if (Memory.user.env.force_rebuild == true)
            return true;
        return false;
    },

    init_memory() {
        if (this.need_init_memory()) {
            Memory.user = {};
            Memory.user.env = {};
            Memory.user.env.version = 0;    // initializing
            Memory.user.env.force_rebuild = false;
            Memory.user.cache = {};
            Memory.user.env.version = VERSION;
        }
    },

    run(version) {
        this.init_memory();
        logger.init_memory();
        eq.init_memory();
        
    }
}