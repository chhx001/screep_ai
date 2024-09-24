const { SystemManager, CpuManager } = require("./SystemManager")
const Logger = require("./Logger")

function clear_all_roads() {
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
    return 0
}

module.exports.loop = function() {
    SystemManager.loop()
    //SystemManager.exec_once(1, clear_all_roads)
}