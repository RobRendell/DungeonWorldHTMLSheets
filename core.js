
$(document).ready(function () {

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Bard", damage: "d6", baseHp: 6, classIcon: '<svg><use xlink:href="#bardSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Cleric", damage: "d6", baseHp: 6, classIcon: '<svg><use xlink:href="#clericSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Druid", damage: "d6", baseHp: 6, classIcon: '<svg><use xlink:href="#druidSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Fighter", damage: "d10", baseHp: 10, classIcon: '<svg><use xlink:href="#fighterSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Paladin", damage: "d10", baseHp: 10, classIcon: '<svg><use xlink:href="#paladinSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Ranger", damage: "d8", baseHp: 8, classIcon: '<svg><use xlink:href="#rangerSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Thief", damage: "d8", baseHp: 6, classIcon: '<svg><use xlink:href="#thiefSVG" /></svg>'});

    new CharacterClassPanel(topPanel, {source: "Dungeon World Core", name: "The Wizard", damage: "d4", baseHp: 4, classIcon: '<svg><use xlink:href="#wizardSVG" /></svg>'});

});
