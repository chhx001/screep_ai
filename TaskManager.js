var logger = require("Logger.js");
var events = require("Events.js")
var eq = require("EventQueue.js")

class Tasks {
    constructor(id, opcodes, context) {
        this.id = id
        this.opcodes = opcodes
    }
    to_queue
};

module.exports = {
    MODULE_NAME:String = "TaskManager",
    VERSION:Number = 1,
    MAX_TASKS:Number = 20,
    
    need_init_memory() {
        if (Memory.user.task_manager == undefined || Memory.user.task_manager.version == undefined || Memory.user.task_manager.version < this.VERSION)
            return true;
        return false;
    },

    init_memory() {
        if (this.need_init_memory()) {
            Memory.user.task_manager = {}
            Memory.user.task_manager.version = 0;
            Memory.user.task_manager.id_gen = 0;
            Memory.user.task_manager.task_list = []

            Memory.user.task_manager.version = VERSION;
        }
    },
}