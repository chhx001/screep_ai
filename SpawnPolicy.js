var _plan = {
    'worker': 12
}

var Tools = require('Tools')
var CreepStyle = require('CreepStyle')
var log = require('Log')

var SpawnPolicy = {
    getBestSpawn: () => {
        var ret = null
        var energy = -1
        for (var spawn_name in Game.spawns) {
            var spawn = Game.spawns[spawn_name]
            
            // if it is spawning, skip it
            if (spawn.spawning)
                continue

            if (spawn.room.energyCapacityAvailable > energy) {
                energy = spawn.room.energyCapacityAvailable
                ret = spawn
            }
        }
        return ret
    },
    spawnCreep: () => {
        var plan = Tools.copy(_plan)
        for (var creep_name in Game.creeps) {
            var creep = Game.creeps[creep_name]
            plan[creep.memory.role] -= 1
        }

        for (var role in plan) {
            if (plan[role] > 0) {
                //console.log("Need " + plan[role] + " additional " + role)
                // Find a spawn to spawn this creep
                var spawn = SpawnPolicy.getBestSpawn()
                if (spawn) {
                    for (var no in CreepStyle[role]) {
                        var style = CreepStyle[role][no]
                        var cost = CreepStyle.getCost(style)
                        //log.d("Cost=" + cost + " Available=" + spawn.room.energyCapacityAvailable)
                        if (spawn.room.energyCapacityAvailable >= cost && !spawn.spawning) {
                            if (spawn.room.energyAvailable >= cost) {
                                var creep_name = role + Game.time
                                //console.log(spawn.name + " Start Spawn " + creep_name + "at level " + style.option.memory.level)
                                spawn.spawnCreep(style.design, creep_name, style.option)
                            }
                            // normally, we only need the highest level, but if our workers are all killed, then we allow to respawn lower level
                            if (spawn.room.find(FIND_MY_CREEPS, {filter: (c) => {
                                    return c.memory.role = 'worker'
                                }}).length > 0) {
                                break
                            }
                        } else {
                            //console.log("Style " + no + " Need " + cost + " energy, skip")
                        }
                    }
                }
            }
            break
        }
    },
}


module.exports = SpawnPolicy