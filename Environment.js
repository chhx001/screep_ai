var ArraySet = require("ArraySet")
var Tools = require("Tools")
var log = require("Log")


var EnvRoom = {
    initResource: (room) => {
        var resouce_list = room.find(FIND_SOURCES)
        
        if (!room.memory.resources) {
            room.memory["resources"] = {}
        }
        if (Tools.count(room.memory.resources) < resouce_list.length){
            _.forEach(resouce_list, (r) => {
                log.d(r.id)
                if (!room.memory.resources[r.id])
                    room.memory.resources[r.id] = {}
            })
        }

        _.forEach(room.memory.resources, (r, r_id) => {
            var res = Game.getObjectById(r_id)
            var terrain_data = new Room.Terrain(room.name)
            var open_area = 9
            for (var x = res.pos.x - 1; x <= res.pos.x + 1; x ++) {
                for (var y = res.pos.y - 1; y <= res.pos.y + 1; y ++) {
                    if (terrain_data.get(x, y) == TERRAIN_MASK_WALL)
                        open_area --
                }
            }
            r["max_worker"] = open_area
        })
    }
}

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
            // clean resources mark in all rooms
            _.forEach(Memory.rooms, (room, room_name) => {
                _.forEach(room.resources, (v, k) => {
                    _.forEach(v.worker_id_list, (e) => {
                        if (e && !Game.getObjectById(e)) {
                            ArraySet.remove(v.worker_id_list, e)
                        }
                    })
                })
            })
        }
    },
    // to do some modification on memorys, just do once when triggered
    reinit: () => {
        // build worker limit
        _.forEach(Game.rooms, (room, room_name) => {
            EnvRoom.initResource(room)
        })  
    },
    run: () => {
        // initialized

        if (Memory.global) {
            if (Memory.global.reinit) {
                Environment.reinit()
                Memory.global["reinit"] = false
            }
            Environment.clean()
            return
        }
        
        Memory.global = {reinit:false}

        // Init room data
        _.forEach(Game.rooms, (room, room_name) => {
            EnvRoom.initResource(room)
        })  
    },
    
}


module.exports = Environment