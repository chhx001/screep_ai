var Tools = require("Tools")
var log = require('Log')
var BattlePolicy = require('BattlePolicy')

var TowerAI = {
    run: (tower) => {
        // if not tower, skip
        if (tower.structureType != STRUCTURE_TOWER) {
            return
        }
        BattlePolicy.Tower.run(tower)
    }
}

module.exports = TowerAI