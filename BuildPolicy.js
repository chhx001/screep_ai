var log = require("Log")
var Tools = require("Tools")

var rcl_capability = [
    //0
    {
        "road"      : true,
        "container" : 5,
    },
    //1
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
    },
    //2
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
        "extension" : 5,
        "rampart"   : true,
        "wall"      : true,
    },
    //3
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
        "extension" : 10,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 1,
    },
    //4
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
        "extension" : 20,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 1,
        "storage"   : true,
    },
    //5
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
        "extension" : 30,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 2,
        "storage"   : true,
        "link"      : 2,
    },
    //6
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 1,
        "extension" : 40,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 2,
        "storage"   : true,
        "link"      : 3,
        "exrtactor" : true,
        "lab"       : 3,
        "terminal"  : true
    },
    //7
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 2,
        "extension" : 50,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 3,
        "storage"   : true,
        "link"      : 4,
        "exrtactor" : true,
        "lab"       : 6,
        "terminal"  : true
    },
    //8
    {
        "road"      : true,
        "container" : 5,
        "spawn"     : 3,
        "extension" : 60,
        "rampart"   : true,
        "wall"      : true,
        "tower"     : 6,
        "storage"   : true,
        "link"      : 6,
        "exrtactor" : true,
        "lab"       : 10,
        "terminal"  : true,
        "observer"  : true,
        "powerspawn": true,
    },
]

var Tower = {
    ATTACK_RANGE: 12,
    SAFE_RANGE: 6,
    reserve: (spawn, number) => {
        // 1. spawm in attack_range distance
        // 2. attack range covers most number of the path points to exits
        // 3. no another tower in safe_range
        // 4. number is given
        var temp_list = new Array()
        var exception_list = new Array()
        var room = spawn.room

        // get all path points on the route, one direction one route
        var exit_mark = [
            FIND_EXIT_TOP,
            FIND_EXIT_LEFT,
            FIND_EXIT_RIGHT,
            FIND_EXIT_BOTTOM
        ]
        var route_list = new Array()
        _.forEach(exit_mark, (e) => {
            let exit_list = room.find(e)
            if (exit_list.length) {
                let route = room.findPath(spawn.pos, exit_list[0])
                _.forEach(route, (r) => {
                    route_list[route_list.length] = r
                })
            }
        })


        // get a list of all possible position and get all path cover value
        while (true) {
            let pos = Tools.getClosestBuildPos(room, spawn.pos.x, spawn.pos.y, exception_list)
            // check 1, if failed, it means too far away, so break to finish
            if (Tools.distance2(pos, spawn.pos) > Tower.ATTACK_RANGE * Tower.ATTACK_RANGE) {
                break
            }
            //check 2
            let cover = 0
            _.forEach(route_list, (r) => {
                if (Tools.distance2(r, pos) < Tower.ATTACK_RANGE * Tower.ATTACK_RANGE) {
                    cover ++
                }
            })
            temp_list[temp_list.length] = {x: pos.x, y: pos.y, type: 'tower', cover: cover}
            exception_list[exception_list.length] = pos
        }

        temp_list = _.sortBy(temp_list, (t) => {
            return -t.cover
        })

        //log.d(temp_list)

        var reserve_list = new Array()
        // pick up several reserve points according to criteria 3 and 4
        _.forEach(temp_list, (t) => {
            if (reserve_list.length >= number) {
                return
            }
            let ok_to_reserve = true
            _.forEach(reserve_list, (r) => {
                if (Tools.distance2(t, r) < Tower.SAFE_RANGE * Tower.SAFE_RANGE) {
                    ok_to_reserve = false
                }
            })
            if (ok_to_reserve) {
                reserve_list[reserve_list.length] = t
                room.memory.reserve[room.memory.reserve.length] = t
            }
        })
    },
    mark: (spawn) => {
        var room = spawn.room
        var rcl_level = rcl_capability[room.controller.level]
        var max_tower = rcl_level.tower? rcl_level.tower: 0;
        var cur_tower = 0
        var exception_list = new Array()
        // calculate current tower
        cur_tower += room.find(FIND_MY_STRUCTURES, {filter: (s) => {
            return s.structureType == STRUCTURE_TOWER
        }}).length
        // add planed tower
        cur_tower += room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => {
            return s.structureType == STRUCTURE_TOWER
        }}).length

        while (cur_tower < max_tower) {
            var pos = null
            _.forEachRight(room.memory.reserve, (r) => {
                if (r.type == 'tower' && !pos) {
                    if (Tools.isPosSafeForBuild(room, r.x, r.y, exception_list, true)) {
                        pos = r
                    }
                }
            })
            if (!pos) {
                Log.error("Can't find pos to set tower in the room, please check")
                break
            } else {
                // add postion to exception list in case it may be found in the next turn again
                exception_list[exception_list.length] = pos
            }
            log.debug("tower x=" + pos.x + " y=" + pos.y)
            if (room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER)) {
                console.log("marking tower ret err")
            } else {
                // build tower wall and ramparts
                // first we need to decide where is the door, it is at the corner, and open for spawn
                /*
                if (spawn.pos.x >= pos.x && spawn.pos.y >= pos.y) {
                    var door = {x: pos.x + 1, y: pos.y + 1}
                } else if (spawn.pos.x <= pos.x && spawn.pos.y <= pos.y) {
                    var door = {x: pos.x - 1, y: pos.y - 1}
                } else if (spawn.pos.x <= pos.x && spawn.pos.y >= pos.y) {
                    var door = {x: pos.x - 1, y: pos.y + 1}
                } else if (spawn.pos.x >= pos.x && spawn.pos.y <= pos.y) {
                    var door = {x: pos.x + 1, y: pos.y - 1}
                }
                let area = room.lookAtArea(pos.y-1, pos.x-1, pos.y+1, pos.x+1)
                _.forEach(area, (row, row_y) => {
                    _.forEach(row, (column, column_x) => {
                        if (column_x == pos.x && row_y == pos.y) {
                            // skip the tower position
                            log.d("x:" + column_x)
                            log.d("y:" + row_y)
                            return
                        }

                        //things list
                        let green_to_build = true
                        _.forEach(column, (thing) => {
                            // remove road
                            if (thing.type == 'structure') {
                                if (thing.structure.structureType == STRUCTURE_ROAD) {
                                    thing.structure.destroy()
                                } else {
                                    Log.error("Tower wall build failed, position occupied by " + thing.structure.structureType)
                                    green_to_build = false
                                }
                            } else if (thing.type == 'constructionSite') {
                                // remove it
                                thing.constructionSite.remove()
                            }
                        })

                        if (green_to_build) {
                            log.d("green to build at " + column_x + "," + row_y)
                            if (column_x == door.x && row_y == door.y) {
                                log.d(room.createConstructionSite(parseInt(column_x), parseInt(row_y), STRUCTURE_RAMPART))
                            } else {
                                log.d(room.createConstructionSite(parseInt(column_x), parseInt(row_y), STRUCTURE_WALL))
                            }
                        }
                    })
                })
                */
            }

            cur_tower ++
        }  
    }
}

var Extension = {
    mark: (spawn) => {
        var room = spawn.room
        var rcl_level = rcl_capability[room.controller.level]
        var max_ext = rcl_level.extension? rcl_level.extension: 0;
        var cur_ext = 0
        var exception_list = new Array()
        // calculate current extension
        cur_ext += room.find(FIND_MY_STRUCTURES, {filter: (s) => {
            return s.structureType == STRUCTURE_EXTENSION
        }}).length
        // add planed extension
        cur_ext += room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => {
            return s.structureType == STRUCTURE_EXTENSION
        }}).length

        while (cur_ext < max_ext) {
            let pos = Tools.getClosestBuildPos(room, spawn.pos.x, spawn.pos.y, exception_list)
            if (!pos) {
                Log.error("Can't find empty pos in the room, please check")
                break
            } else {
                // add postion to exception list in case it may be found in the next turn again
                exception_list[exception_list.length] = pos
            }
            log.debug("extension x=" + pos.x + " y=" + pos.y)
            if (room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION)) {
                console.log("marking extension ret err")
            }
            cur_ext ++
        }  
    },
}

var Road = {
    PLAN: [
        // Spawn to source
        {
            from: {
                type: FIND_MY_SPAWNS
            },
            to: {
                type: FIND_SOURCES
            }
        },
        // Spawn to controller
        {
            from:{
                type: FIND_MY_SPAWNS
            },
            to: {
                type: FIND_MY_STRUCTURES,
                filter: (s) => {
                    return s.structureType == STRUCTURE_CONTROLLER
                }
            }
        }
    ],
    mark: (spawn) => {
        var room = spawn.room
        _.forEach(Road.PLAN, (r) => {
            let from_list = room.find(r.from.type, r.from)
            let to_list = room.find(r.to.type,r.to)
            _.forEach(from_list, (f) => {
                _.forEach(to_list, (t) => {
                    let path = room.findPath(f.pos, t.pos)
                    _.forEach(path, (p) => {
                        // do not build road on the target
                        if (p.x == t.pos.x && p.y == t.pos.y) {
                            return
                        }
                        if (room.createConstructionSite(p.x, p.y, STRUCTURE_ROAD) == ERR_FULL){
                            room.memory.roads_done = false
                        }
                    })
                })
            })
        })
    },
}

var BuildPolicy = {
    // build pos should not be close to another building
    CONSTRUCTION_SITES_MAX: 95,
    CONSTRUCTION_SITES_SAFE_LINE: 90, 
    
    markSite: (spawn) => {
        var room = spawn.room
        // if there is too many construction sites, skip and wait for next turn
        if (Tools.count(Game.constructionSites) > BuildPolicy.CONSTRUCTION_SITES_SAFE_LINE) {
            return
        }

        // if road is not designed, mark roads
        if (!room.memory.roads_done) {
            room.memory["roads_done"] = true
            Road.mark(spawn)
        }
        // if important position has not been reserved, reserve
        if (!room.memory.reserve) {
            room.memory["reserve"] = new Array()
            Tower.reserve(spawn, rcl_capability[rcl_capability.length-1].tower)
        }
        // if rcl increased, mark the build site
        if (!room.memory.rcl || room.memory.rcl != room.controller.level) {
            Extension.mark(spawn)
            Tower.mark(spawn)
        }
        // save the rcl if the construction sites number is safe, otherwise we need to build again
        if (Tools.count(Game.constructionSites) < BuildPolicy.CONSTRUCTION_SITES_MAX) {
            room.memory["rcl"] = room.controller.level
        } else {
            log.info("rcl not recorded because the construction site may be full")
        }
        
    }
}

module.exports = BuildPolicy