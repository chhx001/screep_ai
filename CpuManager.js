const MAX_BUCKET = 10000
class CpuManager {
    static init() {
        if (Memory.user.cpu == undefined) {
            Memory.user.cpu = {}
            Memory.user.cpu.blast_mode = false
        }
    }
    static set_cpu_blast_mode(mode) {
        Memory.user.blast_mode = mode
    }

    static agree() {
        var bucket = Game.cpu.bucket
        var used = Game.cpu.getUsed()

        if(Game.cpu.tickLimit == Infinity) {
            /* probably simulator, always agree */
            return true;
        }

        /* blast mode < 95% is good to go, total 500ms, 5% is 25ms */
        if (Memory.user.blast_mode || bucket > MAX_BUCKET * 0.9) {
            return (used / Game.cpu.tickLimit < 0.95)
        } else if (bucket > MAX_BUCKET * 0.9){  /* bucket nearly full, < 80% for safe,  */
            return (used / Game.cpu.tickLimit < 0.80)
        } else {    /* only use 75% to save for bucket */
            return (used < Game.cpu.limit * 0.75)
        }
    }
}

module.exports = {CpuManager}