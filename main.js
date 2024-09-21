const Logger = require("./Logger")
const Spawn = require("./Spawn")

function scan_spawns() {
    spawn_list = []
    for (var name in Game.spawns) {
        spawn = Spawn(name)
        spawn_list += spawn
    }
    return spawn_list
}

module.exports.loop = function () {
    var spawn_list = scan_spawns();
    for (var spawn in spawn_list) {
        spawn.run()
    }
}