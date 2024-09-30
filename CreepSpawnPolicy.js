const { BasicSpawnPolicy } = require("./BasicClasses");

class WorkerSpawnPolicy extends BasicSpawnPolicy {
    static need_spawn(room_name) {
        /* worker will be needed */
        var room = Game.rooms[room_name]
    }
}

module.exports = {}