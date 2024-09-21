var logger = require("Logger.js");
var opcode = require("Opcodes.js")
var eq = require("EventQueue.js")


class Worker {
    constructor(creep_name) {
        this.creep_name = creep_name;
        this.current = opcode.OP_ID_CREEP_IDLE;
    }

    idle() {
        var creep = Game.creeps[this.creep_name]
    }


}

module.exports = {
    MODULE_NAME:String = "CreepStrategy",
    VERSION:Number = 1,

    

    
    
}