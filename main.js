const { SystemManager, CpuManager } = require("./SystemManager")
const Logger = require("./Logger")

function clear_all() {
    var room = Game.rooms["W7S8"]
    var road_list = room.find(FIND_STRUCTURES, {filter:(s) => {
        return s.structureType == STRUCTURE_ROAD;
    }})

    for (var i = 0;i < road_list.length; i ++) {
        if (CpuManager.agree()) {
            road_list[i].destroy()
        } else {
            return 1
        }
    }

    var site_list = room.find(FIND_MY_CONSTRUCTION_SITES)
    for (var i = 0;i < site_list.length; i ++) {
        if (CpuManager.agree()) {
            site_list[i].remove()
        } else {
            return 1
        }
    }
    return 0
}

module.exports.loop = function() {
    SystemManager.loop()
    SystemManager.exec_once(11, clear_all)
}