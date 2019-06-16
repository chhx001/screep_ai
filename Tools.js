var log = require("Log")

var Tools = {
    copy : (src) => {
        var ret = {}
        for (var name in src) {
            ret[name] = src[name]
        }
        return ret
    },
    count: (target) => {
        var sum = 0
        for (var i in target) {
            sum ++
        }
        return sum
    },
    distance2: (pos1, pos2) => {
        return (Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
    },
    isCreepDangerous: (creep) => {
        return (creep.getActiveBodyparts(ATTACK) > 0 ||
        creep.getActiveBodyparts(RANGED_ATTACK) > 0)
    },
    isPosSafeForBuild: (room, x, y, exception, ignore_reserve = false) => {
        // check up, down, left, right and center
        var area = new Array()
        var ret = true
        // check up, down, left, right and center
        area = area.concat(room.lookAtArea(y, x-1, y, x-1,true))
        area = area.concat(room.lookAtArea(y, x+1, y, x+1,true))
        area = area.concat(room.lookAtArea(y, x, y, x,true))
        area = area.concat(room.lookAtArea(y-1, x, y-1, x,true))
        area = area.concat(room.lookAtArea(y+1, x, y+1, x,true))

        log.d(area)
        // if there is exception pos nearby
        _.forEach(area, (a) => {
            // if there are structures nearby except wall or roads, cancel
            // if there are constructionSite except road nearby, cancel,
            // if there are natural wall, cancel
            // if the exact position is a structure or constructionSite cancel
            if ((a.type == 'structure' && (a.structure.structureType != STRUCTURE_WALL &&
                                            a.structure.structureType != STRUCTURE_ROAD)) ||
            (a.type == 'constructionSite' && a.constructionSite.structureType != STRUCTURE_ROAD) || 
            (a.type == 'terrain' && a.terrain == 'wall')||
            ((a.type == 'structure' || a.type == 'constructionSite') && a.x == x && a.y == y)) {
                log.debug("Canceled x="+x+",y="+y + " as " + a.type)
                ret = false
                return
            } 
            _.forEach(exception, (e) => {
                if (a.x == e.x && a.y == e.y) {
                    // exception found, can't build here
                    //log.debug("Canceled x="+x+",y="+y + " as exception")
                    ret = false
                }
            })
            if (!ignore_reserve) {
                _.forEach(room.memory.reserve, (r) => {
                    if (a.x == r.x && a.y == r.y) {
                        // exception found, can't build here
                        //log.debug("Canceled x="+x+",y="+y + " as reservation")
                        ret = false
                    }
                })
            }
        })
        return ret
    },
    getClosestBuildPos: (room, pos_x, pos_y, exception)=> {
        var pos_found = null
        var dis = 0
        var x = pos_x
        var y = pos_y
        var checked_block = 0
        
        // check as room size
        for (var total_iterated = 0; total_iterated < 50 * 50; total_iterated ++) {
            // invalid block
            if (x < 0 || y < 0 || x >= 50 || y >= 50) {
                continue
            }

            let roompos = room.lookAt(x,y)

            // is terrian?
            if (roompos.length == 1) {
                if (roompos[0].terrain == 'plain') {
                    pos_found = {x: x, y: y}
                    if (Tools.isPosSafeForBuild(room, x, y, exception))
                    {
                        break
                    }
                }
            }

            if (y == pos_y - dis && x < pos_x + dis) {
                x ++
            } else if (y == pos_y + dis && x > pos_x - dis) {
                x --
            } else if (x == pos_x + dis && y < pos_y + dis) {
                y ++
            } else if (x == pos_x - dis && y > pos_y - dis ) {
                y --
            }

            //console.log("x: " + x + " y: " + y)
            
            checked_block ++
            if (checked_block >= (2 * dis + 1) * (2 * dis + 1) - (2 * dis - 1) * (2 * dis - 1)) {
                x--
                y--
                dis ++
                checked_block = 0
            }
        }
        return pos_found
    },
}

module.exports = Tools