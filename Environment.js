var ArraySet = require("ArraySet")
var Tools = require("Tools")


var Environment = {
    clean: () => {
        // clean triggered by creep number change
        if (Tools.count(Game.creeps) < Tools.count(Memory.creeps)) {
            for (var name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name]
                    console.log("Clear dummy memory for " + name)
                }
            }
            // clean resources mark
            _.forEach(Memory.resources, (v, k) => {
                _.forEach(v.worker_id_list, (e) => {
                    if (e && !Game.getObjectById(e)) {
                        ArraySet.remove(v.worker_id_list, e)
                    }
                })
            })
        }
    },
    check: () => {
        

    },
    run: () => {
        // initialized
        if (Memory.global) {
            Environment.clean()
            Environment.check()
            return
        }
        
        Memory.global = {}
        Memory.resources = {}
        //Memory.creeps = {}
        //Memory.rooms = {}
    },
    
}


module.exports = Environment