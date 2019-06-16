var Tools = require('Tools')
var log = require("Log")

var Route = {
    // distance^2
    safe_distance2: 25,
    isRouteSafe: (room, frompos, topos) => {
        //log.d("from:" + frompos + ",to:" + topos)
        var route = room.findPath(frompos, topos)
        if (route.length) {
            // find hostile weaponed creeps
            var hostile_list = room.find(FIND_HOSTILE_CREEPS, {filter : (c) => {
                return Tools.isCreepDangerous(c)
            }})
            if (hostile_list.length) {
                for (var i in route) {
                    for (var j in hostile_list) {
                        if (Tools.distance2(hostile_list[j].pos, route[i]) <= Route.safe_distance2) {
                            //log.debug("Position + " + frompos + "," + topos + "disabled as unsafe")
                            return false
                        }
                    }
                }
            }
        } else {
            return false
        }
        return true
    },
    isPositionSafe: (room, x, y) => {
        var pos = room.getPositionAt(x, y)
        var hostile_list = pos.findInRange(FIND_HOSTILE_CREEPS, Math.ceil(Math.sqrt(Route.safe_distance2)), {filter : (c) => {
            return Tools.isCreepDangerous(c)
        }})
        if (hostile_list.length) {
            return false
        } else {
            return true
        }
    }
}

module.exports = Route