var Tools = require("Tools")
var log = require('Log')
var Battle = require('BattlePolicy').Tower


var Repair = {
    // if energy < ALERT_ENERGY %, dont repair, wait for fill
    ALERT_ENERGY: 0.5,
    cached_list: {},
    findStructureToRepair: (tower) => {
        var room = tower.room
        if (!Repair.cached_list[room.name] || Repair.cached_list[room.name].tick != Game.tick) {
            Repair.cached_list[room.name] = {}
            Repair.cached_list[room.name]["list"] =  room.find(FIND_STRUCTURES, {filter: (s) => {
                return s.hits < s.hitsMax
            }})
            Repair.cached_list[room.name]["tick"] = Game.time
        }
        
        if (Repair.cached_list[room.name].list.length) {
            return Repair.cached_list[room.name].list[0]
        } else {
            return null
        }
    },
    run: (tower) => {
        // we need to leave some energy for battle
        if (tower.energy < tower.energyCapacity * Repair.ALERT_ENERGY) {
            return
        }

        var target = Repair.findStructureToRepair(tower)
        

        if (target) {
            tower.repair(target)
            return true
        }
        return false
    }
}


var TowerAI = {
    PRIORITY_LIST: [
        Battle,
        Repair,
    ],
    run: (tower) => {
        // if not tower, skip
        if (tower.structureType != STRUCTURE_TOWER) {
            return
        }

        for (var i in TowerAI.PRIORITY_LIST) {
            if (TowerAI.PRIORITY_LIST[i].run(tower)){
                // the task has been done, leave for next tower
                break
            }
        }

    }
}

module.exports = TowerAI