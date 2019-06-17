var Tools = require("Tools")
var log = require("Log")

var BattlePolicy = {
    TARGET_PRIORITY: [
        // attack creep or creeps with more than 2 heal parts
        {
            type: FIND_HOSTILE_CREEPS,
            filter: (c) => {
                return (c.getActiveBodyparts(ATTACK) > 0 ||
                c.getActiveBodyparts(RANGED_ATTACK) > 0 ||
                c.getActiveBodyparts(HEAL) >= 2)
            }
        },
        // tower
        {
            type: FIND_HOSTILE_STRUCTURES,
            filter: (s) => {
                return s.structureType == 'tower'
            }
        },
        // normal creep
        {
            type: FIND_HOSTILE_CREEPS,
        },
        //normal structure
        {
            type: FIND_HOSTILE_STRUCTURES,
        }
    ],
    findEnemy: (me) => {
        var enemy = null
        for (var i in BattlePolicy.TARGET_PRIORITY) {
            enemy = me.pos.findClosestByRange(BattlePolicy.TARGET_PRIORITY[i].type, BattlePolicy.TARGET_PRIORITY[i])
            if (enemy) {
                break
            }
        }
        return enemy
    },
}

var RangedPolicy = {

}

var TowerPolicy = {
    run: (tower) => {
        var enemy = BattlePolicy.findEnemy(tower)
        if (enemy) {
            tower.attack(enemy)
            // so we attacked an enemy
            return true
        }
        // there isn't an enemy
        return false
    }
}

var MellePolicy = {

}

var HealerPolicy = {

}

module.exports = {
    Tower: TowerPolicy
}