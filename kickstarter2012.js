
$(document).ready(function () {

    new CharacterClassPanel(topPanel, {source: "Kickstarter 2012", name: "The Barbarian", damage: "d10", baseHp: 8, classIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70"><path d="m 45,14 c -8.01,12.3299998 -9.72,15.0299998 -11.16,17.4599998 l 0,-8.01 c 0,-3.06 0.09,-5.6699998 0.09,-7.6499998 0,-1.89 -0.09,-3.149999 -0.45,-3.149999 -3.24,0 -9.99,6.209999 -9.99,9.0899988 0.18,1.53 0.81,4.32 1.08,8.19 -5.49,-9.27 -8.46,-14.3099998 -10.08,-17.2799988 -3.4200003,1.439999 -7.9200003,2.429999 -7.9200003,8.2799988 2.61,2.7 10.0800003,15.84 18.0900003,29.97 l 0,6.66 c 0,2.97 -0.09,5.76 -0.09,7.65 0,2.07 0.09,3.15 0.54,3.15 3.24,0 9.9,-6.21 9.9,-9.18 -0.18,-1.89 -1.17,-5.94 -1.17,-13.86 2.25,-6.66 8.64,-16.11 17.64,-30.6899998 0.18,-0.36 0.27,-0.63 0.27,-0.9 0,-0.809999 -0.81,-1.079999 -1.98,-1.079999 -1.62,0 -3.69,0.63 -4.77,1.349999 z" stroke="black" stroke-width="2" stroke-linejoin="round" fill="white" /></svg>', look1: 'Tormented eyes, Haunted eyes, Wide eyes, Shrouded eyes', look2: 'Mighty thews, Long shanks, Scrawny body, Supple body', look3: 'Strange tattoos, Unusual jewelry, Unmarred by decoration', look4: 'Scraps, Silks, Scavengers outfit, Weather-inappropriate clothes', subPanels: [ ['ClassAlignmentPanel', {alignment: 'Chaotic', move: 'Eschew a convention of the civilized world.' } ], ['ClassAlignmentPanel', {alignment: 'Neutral', move: 'Teach someone the ways of your people.' } ],
['ClassBondPanel', {bond: '_ is puny and foolish, but amusing to me.' } ],
['ClassBondPanel', {bond: '_\'s ways are strange and confusing.' } ],
['ClassBondPanel', {bond: '_ is always getting into trouble&mdash;I must protect them from themselves.' } ],
['ClassBondPanel', {bond: '_ shares my hunger for glory, the earth will tremble at our passing!' } ]
    ] });

    new RacePanel(topPanel, {source: "Kickstarter 2012", name: "Outsider", subPanels: [ ['RaceClassPanel', {className: 'The Barbarian', move: "You may be elf, dwarf, halfling, or human, but you and your people are not from around here. At the beginning of each session, the GM will ask you something about your homeland, why you left, or what you left behind. If you answer them, mark XP.", names: "Gorm, Si-Yi, Priscilla, Sen, Xia, Anneira, Haepha, Lur, Shar, Doria, Nkosi, Fafnir, Qua, Sacer, Vercin'geto, Barbozar, Clovis, Frael, Thra-raxes, Sillius, Sha-Sheena, Khamisi, <br>, <em>Titles: </em>, the Glorious, the Hungry, the Irascible, the Undefeated, the Gluttonous, Foesmasher, Bonebreaker, the Mirthful, the Melancholic, All-Mighty, the Giant, the Triumphant" } ] ] });

});
