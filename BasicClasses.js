class BasicMachine {
    static run(creep) {
        Logger._warn(creep, "I'm unknown, idling...")
    }

    static schedule(creep) {

    }
}

class BasicSpawnPolicy {
    static need_spawn(room_name) {
        Logger._warn("basic spawn policy")
        return false
    }

    static design(room_name) {
        Logger._warn("basic spawn policy")
        return []
    }
}

module.exports = {BasicMachine, BasicSpawnPolicy}