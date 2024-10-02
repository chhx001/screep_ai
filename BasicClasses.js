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

const OP_DONE = 0
const OP_AGAIN_NEXT = 1

module.exports = {BasicMachine, BasicSpawnPolicy, OP_DONE, OP_AGAIN_NEXT}