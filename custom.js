
// ==================== Sourcebook instances are top-level objects that hold the custom data ====================

var Sourcebook = Class.extend({

    all: new Hash(),

    init: function init(name) {
        this.name = name;
        this.data = new Hash();
        this.all.set(name, this);
    },

    getData: function getData(key) {
        if (!this.data.contains(key)) {
            this.data.set(key, new Hash());
        }
        return this.data.get(key);
    },

    addData: function addData(key, dataName, data) {
        this.getData(key).set(dataName, data);
    },

    removeData: function removeData(key, dataName) {
        var deleted = false;
        var data = this.getData(key);
        if (data.contains(dataName)) {
            data.remove(dataName);
            deleted = true;
        }
        if (data.length == 0) {
            this.data.remove(key);
        }
        if (this.data.length == 0) {
            Sourcebook.removeBook(this.name);
        }
        return deleted;
    }

});

Sourcebook.hasBook = function hasBook(name) {
    return Sourcebook.prototype.all.contains(name);
}

Sourcebook.getBook = function getBook(name) {
    if (!Sourcebook.hasBook(name)) {
        new Sourcebook(name);
    }
    return Sourcebook.prototype.all.get(name);
}

Sourcebook.allBooks = function allBooks() {
    return Sourcebook.prototype.all.keys().sort();
}

Sourcebook.removeBook = function removeBook(name) {
    return Sourcebook.prototype.all.remove(name);
}


// ==================== ExpandingTree is a hierarchical tree of data or controls ====================

var ExpandingTree = Class.extend({

    init: function init(parentNode, text, controlFn) {
        this.parentNode = parentNode;
        this.text = text;
        this.children = new Hash();
        this.expanded = false;
        this.div = $("<div/>").addClass('expandingTree');
        if (!parentNode) {
            this.level = 0;
            this.controlFn = controlFn;
        } else {
            this.level = parentNode.level + 1;
            this.controlFn = parentNode.controlFn;
            parentNode.children.set(this.text, this);
        }
        if (this.text) {
            this.control = $('<span/>').addClass('treeControl').html('&#8862;').appendTo(this.div);
            this.control.click($.proxy(this.clickControl, this));
            $('<span/>').text(' ' + this.text).appendTo(this.div);
        }
        this.childDiv = $('<div/>').addClass('treeContent').appendTo(this.div);
    },

    expand: function expand() {
        if (!this.expanded) {
            this.control.html('&#8863;');
            this.expanded = true;
            this.childDiv.show();
            this.refresh();
        }
    },

    collapse: function collapse() {
        if (this.expanded) {
            this.control.html('&#8862;');
            this.expanded = false;
            this.childDiv.hide();
        }
    },

    clickControl: function clickControl(evt) {
        if (!this.expanded) {
            this.expand();
        } else {
            this.collapse();
        }
    },

    refresh: function refresh() {
        if (this.expanded) {
            if (this.controlFn) {
                var names = this.controlFn(this, true);
                $.each(names, $.proxy(function (index, name) {
                    if (!this.children.contains(name)) {
                        new ExpandingTree(this, name);
                    }
                    this.childDiv.append(this.children.get(name).div);
                }, this));
                if (names.length < this.children.length) {
                    // remove any children no longer in names
                    this.children.each($.proxy(function (childName, child) {
                        if (names.indexOf(childName) < 0) {
                            child.div.remove();
                            this.children.remove(childName);
                        }
                    }, this));
                }
            }
            this.children.each($.proxy(function (key, child) {
                child.refresh();
            }, this));
        }
    }

});

// ==================== CustomPanel is the base class for all custom panels ====================

var CustomPanel = Class.extend({

    nonCustomPanels: new Hash(),

    all: new Hash(),

    typeMap: new Hash(),

    init: function init(data, dontEval) {
        this.custom = false;
        this.subPanels = new Hash();
        this.setData(data);
        this.compiled = [];
        if (!dontEval)
        {
            var problem = this.execCode();
            if (problem)
                alert(problem);
        }
    },

    makeCustom: function makeCustom() {
        this.custom = true;
        this.subPanels.each(function (key, value) {
            value.makeCustom();
        });
    },

    setData: function setData(data, custom) {
        this.data = new Hash(data);
        if (this.data.contains('subPanels')) {
            var subPanelJSON = this.data.remove('subPanels');
            this.buildSubPanelsFromJSON(subPanelJSON, custom);
        }
    },

    getSaveData: function getSaveData(includeNonCustom) {
        var result = { };
        this.data.each(function (key, value) {
            result[key] = value;
        });
        var subPanels = [];
        if (this.subPanels && this.subPanels.length > 0) {
            this.subPanels.each(function (id, panel) {
                if (includeNonCustom || panel.custom) {
                    subPanels.push(panel.getSaveData(includeNonCustom));
                }
            });
            if (subPanels.length > 0) {
                result['subPanels'] = subPanels;
            }
        }
        return [ this.className, result ];
    },

    editSubPanel: function editSubPanel(evt, panel) {
        evt.stopPropagation();
        var panel = evt.data;
        panel.showPanel();
    },

    deleteSubPanel: function deleteSubPanel(evt) {
        evt.stopPropagation();
        var panel = evt.data;
        if (confirm('Are you sure you want to delete ' + panel.getId() + '?')) {
            panel.remove();
            this.refreshSubPanelsTable();
            return true;
        }
        return false;
    },

    remove: function remove() {
        this.parentPanel.subPanels.remove(this.getId());
        this.removeFromSource(this.getSource(), this.panelTitle, this.getShortName());
        this.all.get(this.panelTitle).remove(this.getShortName());
        if (this.custom) {
            var previous = this.nonCustomPanels.remove(this.getId());
            if (previous) {
                this.addSubPanel(previous);
            }
        }
    },

    debugPanelCode: function debugPanelCode(evt) {
        evt.stopPropagation();
        var panel = evt.data;
        debugger;
        panel.compile(true);
    },

    showJSON: function showJSON(evt) {
        evt.stopPropagation();
        var panel = evt.data;
        console.info(JSON.stringify(panel.getSaveData(true)));
    },

    refreshSubPanelsTable: function refreshSubPanelsTable(panelDiv, subPanels) {
        panelDiv = panelDiv || this.panelDiv;
        if (!panelDiv) {
            return;
        }
        if (!panelDiv.data('panelTable')) {
            panelDiv.data('panelTable', $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(panelDiv)));
        }
        var table = panelDiv.data('panelTable');
        table.empty();
        subPanels = subPanels || this.subPanels;
        var keys = subPanels.keys().sort();
        $.each(keys, $.proxy(function (index, key) {
            var panel = subPanels.get(key);
            var row = $('<tr/>').appendTo(table);
            var cell = $('<td/>').css('width', '1%').html(panel.getShortName()).appendTo(row);
            if (!panel.custom) {
                cell.addClass('hardcodedFeature');
            }
            $('<button/>').text('Edit').click(panel, $.proxy(this.editSubPanel, this)).appendTo($('<td/>').css('width', '1%').appendTo(row));
            if (panel.custom) {
                $('<button/>').text('Delete').click(panel, $.proxy(this.deleteSubPanel, this)).appendTo($('<td/>').css('width', '1%').appendTo(row));
            } else {
                $('<td/>').css('width', '1%').appendTo(row);
            }
            if (window.location.protocol == "file:") {
                $('<button/>').text('Debug Code').click(panel, $.proxy(this.debugPanelCode, this)).appendTo($('<td/>').css('width', '1%').appendTo(row));
                $('<button/>').text('Show JSON in console').click(panel, $.proxy(this.showJSON, this)).appendTo($('<td/>').css('width', '1%').appendTo(row));
            } else {
                $('<td/>').css('width', '1%').appendTo(row);
                $('<td/>').css('width', '1%').appendTo(row);
            }
            $('<td/>').css('width', '94%').appendTo(row);
        }, this));
    },

    newSubPanel: function newSubPanel(panelType, data, custom) {
        var panel = new panelType(data, true);
        if (custom) {
            panel.makeCustom();
        }
        this.addSubPanel(panel);
        return panel;
    },

    addSubPanel: function addSubPanel(panel) {
        var previous = this.subPanels.set(panel.getId(), panel);
        if (panel.custom && previous && !previous.custom) {
            this.nonCustomPanels.set(previous.getId(), previous);
        }
        panel.parentPanel = this;
        panel.addToSource();
        if (!this.all.contains(panel.panelTitle)) {
            this.all.set(panel.panelTitle, new Hash());
        }
        this.all.get(panel.panelTitle).set(panel.getShortName(), panel);
    },

    openSubPanel: function openSubPanel(evt) {
        evt.stopPropagation();
        var panelType = evt.data;
        this.newSubPanel(panelType).showPanel();
    },

    buildSubPanelsFromJSON: function buildSubPanelsFromJSON(data, custom) {
        var result = [];
        $.each(data, $.proxy(function (index, panelData) {
            var panelType = CustomPanel.prototype.typeMap.get(panelData[0]);
            result.push(this.newSubPanel(panelType, panelData[1], custom));
        }, this));
        return result;
    },

    addSubPanelButtons: function addSubPanelButtons(panelTypes) {
        $.each(panelTypes, $.proxy(function (index, panelType) {
            $('<button/>').html('Add ' + panelType.prototype.panelTitle).click(panelType, $.proxy(this.openSubPanel, this)).appendTo(this.panelDiv);
        }, this));
    },

    renderPanel: function renderPanel() {
        var parentDiv;
        if (this.parentPanel)
        {
            if (!this.parentPanel.panelDiv)
                this.parentPanel.renderPanel();
            parentDiv = this.parentPanel.panelDiv;
        }
        else
            parentDiv = $(document.body);
        if (this.panelDiv) {
            this.panelDiv.empty();
        } else {
            this.panelDiv = $('<div/>').addClass('customPanel').appendTo(parentDiv);
        }
        $('<h4/>').html(this.getPanelTitle()).appendTo(this.panelDiv);
        this.form = $('<form/>').appendTo(this.panelDiv);
    },

    getPanelTitle: function getPanelTitle() {
        return this.panelTitle;
    },

    appendFormTableRow: function appendFormTableRow(title, dataId, type, options) {
        var focus = false;
        if (!this.formTable) {
            this.formTable = $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(this.form));
            focus = true;
        }
        var row = $('<tr/>').appendTo(this.formTable);
        var header = $('<th/>').html(title).appendTo(row);
        if (!type) {
            type = 'text';
        }
        var input;
        if (!dataId) {
            header.attr('colspan', 2);
        } else if (type == 'select') {
            input = $('<select/>').appendTo($('<td/>').appendTo(row)).attr('name', dataId);
            $.each(options, function (index, value) {
                var option = $("<option/>").appendTo(input);
                option.attr('value', value);
                option.text(value);
            });
        } else if (type == 'textarea') {
            input = $('<textarea/>').appendTo($('<td/>').appendTo(row)).attr('name', dataId);
        } else {
            var cell = $('<td/>').appendTo(row);
            input = $('<input/>').appendTo(cell).attr('name', dataId);
            input.attr('type', type);
            if (type == 'text' && options) {
                input.autocomplete({ source: options, appendTo: cell });
            }
        }
        if (input && this.data.contains(dataId)) {
            input.val(this.data.get(dataId));
        }
        if (input && focus) {
            input.focus();
        }
        return input;
    },

    appendSourceRow: function appendSourceRow() {
        var input = this.appendFormTableRow('Source book', 'source', 'text', Sourcebook.allBooks());
    },

    appendFooter: function appendFooter(subpanels) {
        this.refreshSubPanelsTable();
        $('<hr/>').appendTo(this.panelDiv);
        if (subpanels) {
            this.addSubPanelButtons(subpanels);
            $('<hr/>').appendTo(this.panelDiv);
        }
        $('<button/>').text('Done').click($.proxy(this.commitData, this)).appendTo(this.panelDiv);
        $('<input/>').text('Reset').attr('type', 'reset').appendTo(this.panelDiv);
        $('<button/>').text('Cancel').click($.proxy(this.hidePanel, this)).appendTo(this.panelDiv);
    },

    showPanel: function showPanel() {
        if (!this.panelDiv) {
            this.renderPanel();
        }
        this.panelDiv.show();
    },

    hidePanel: function hidePanel(evt) {
        if (evt) {
            evt.stopPropagation();
        }
        if (this.panelDiv) {
            this.panelDiv.hide();
        }
    },

    getSource: function getSource() {
        if (this.data.contains('source')) {
            return this.data.get('source');
        } else {
            return 'Custom';
        }
    },

    getShortName: function getShortName() {
        throw 'Error - a subclass didn\'t override getShortName';
    },

    getId: function getId() {
        return this.getSource() + ' ' + this.panelTitle + ' ' + this.getShortName();
    },

    execCode: function execCode() {
        var result = this.compile(true);
        if (typeof(result) == 'string')
            return result;
        else
            return null;
    },

    removeCompiled: function removeCompiled() {
        $.each(this.compiled, function (index, modifier) {
            modifier.remove();
        });
        this.compiled = [];
        this.subPanels.each(function (key, subPanel) {
            subPanel.removeCompiled();
        });
    },

    compile: function compile(execute) {
        return 'Error - Custom panel ' + this.getId() + ' failed to override compile.';
    },

    collectData: function collectData() {
        var result = new Hash();
        $.each(this.form.serializeArray(), function (index, pair) {
            result.set(pair.name, pair.value);
        });
        if (this.subPanels) {
            result.set('subPanels', this.subPanels);
        }
        this.data = result;
        return result;
    },

    commitData: function commitData(evt) {
        evt.stopPropagation();
        if (this.parentPanel && this.parentPanel.commitPanel(this)) {
            this.hidePanel();
        }
    },

    inspect: function inspect() {
        var result = [];
        result.push(this.className);
        this.data.each(function (key, value) {
            if (value) {
                result.push(key);
                if (value instanceof Hash) {
                    result.push(value.values());
                } else {
                    result.push(value);
                }
            }
        });
        return result.inspect();
    },

    addToSource: function addToSource() {
        if (this.data.contains('source')) {
            var book = Sourcebook.getBook(this.getSource());
            book.addData(this.panelTitle, this.getShortName(), this);
        }
    },

    removeFromSource: function removeFromSource(source, panelTitle, shortName) {
        var deleted = false;
        if (Sourcebook.hasBook(source)) {
            var book = Sourcebook.getBook(source);
            deleted = book.removeData(panelTitle, shortName);
        }
        return deleted;
    },

    // A sub-panel has been committed for us
    commitPanel: function commitPanel(panel) {
        var oldData = panel.data;
        var oldId = panel.getId();
        var oldSource = panel.getSource();
        var oldTitle = panel.panelTitle;
        var oldShortName = panel.getShortName();
        panel.collectData();
        var problem = panel.compile(true);
        if (typeof(problem) == 'string') {
            // There's a problem - abort.
            alert(problem);
            panel.data = oldData;
            return false;
        }
        this.subPanels.remove(oldId);
        this.removeFromSource(oldSource, oldTitle, oldShortName);
        this.all.get(oldTitle).remove(oldShortName);
        panel.makeCustom();
        this.addSubPanel(panel);
        this.refreshSubPanelsTable();
        return true;
    }

});

(function augmentExtend() {
    var prevExtend = $.proxy(CustomPanel.extend, CustomPanel);
    CustomPanel.extend = function extend(data) {
        var newClass = prevExtend(data);
        CustomPanel.prototype.typeMap.set(newClass.prototype.className, newClass);
        return newClass;
    }
})();

// -------------------- TopPanel is the top-level source data panel --------------------

var TopPanel = CustomPanel.extend({

    panelTitle: 'Source Data',

    className: 'TopPanel',

    init: function init() {
        this._super(null, true);
    },

    getShortName: function getShortName() {
        return 'Custom Panel';
    },

    treeControlFn: function treeControlFn (parentNode, refreshOnly) {
        var names = [];
        if (parentNode.level == 0) {
            Sourcebook.prototype.all.each(function (key, value) {
                if (value.data && value.data.length > 0)
                    names.push(key);
            });
            names = names.sort();
        } else if (parentNode.level == 1) {
            var sourceName = parentNode.text;
            var book = Sourcebook.prototype.all.get(sourceName);
            if (book) {
                names = book.data.keys().sort(function (a, b) {
                    if (a == "Custom" || a < b) {
                        return -1;
                    } else if (b == "Custom" || a > b) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            }
        } else {
            var levelTwo = (parentNode.level == 3) ? parentNode.parentNode : parentNode;
            var sourceName = levelTwo.parentNode.text;
            var type = levelTwo.text;
            var book = Sourcebook.prototype.all.get(sourceName);
            var entries = book.data.get(type);
            if (parentNode.level == 2 && entries.length > 25) {
                var previous = null;
                $.each(entries.keys().sort(), function (index, name) {
                    var firstSpace = name.indexOf(' ');
                    var firstWord = (firstSpace >= 0) ? name.slice(0, firstSpace + 1) : name;
                    if (firstWord != previous) {
                        names.push(firstWord);
                        previous = firstWord;
                    }
                });
                // Don't bother doing the extra level for things that don't break down nicely.
                if (names.length > entries.length/2 || names.length < 3) {
                    names = [];
                }
            } else if (parentNode.level == 3) {
                // Filter entries by first word
                var firstWord = parentNode.text;
                var newEntries = new Hash();
                entries.each(function (name, entry) {
                    if (name.indexOf(firstWord) == 0) {
                        newEntries.set(name, entry);
                    }
                });
                entries = newEntries;
            }
            if (names.length == 0) {
                this.refreshSubPanelsTable(parentNode.childDiv, entries);
            }
        }
        return names;
    },

    appendTree: function appendTree() {
        this.tree = new ExpandingTree(null, 'Sourcebooks', $.proxy(this.treeControlFn, this));
        this.tree.div.appendTo(this.panelDiv);
        this.tree.expand(true);
    },

    refreshSubPanelsTable: function refreshSubPanelsTable(panelDiv, subPanels) {
        if (!panelDiv && !subPanels) {
            this.tree.refresh();
        } else {
            this._super(panelDiv, subPanels);
        }
    },

    renderPanel: function renderPanel() {
        if (this.tree && this.tree.div.parentNode == this.panelDiv)
            this.panelDiv.removeChild(this.tree.div);
        this._super();
        $("<p/>").text('The classes, moves and other features of characters are editable from this page.  Grey entries are pre-defined, while black are custom.  Custom features are saved in your character\'s save file, and will execute when that character is loaded.  Editing a pre-defined feature will override it with a custom version.').appendTo(this.panelDiv);
        $("<p/>").text('You can also create new custom features by clicking the buttons at the bottom of this page.').appendTo(this.panelDiv);
        this.appendTree();
        $('<hr/>').appendTo(this.panelDiv);
        this.addSubPanelButtons([ CharacterClassPanel, RacePanel, ClassMovePanel, GearPanel ]);
        $('<hr/>').appendTo(this.panelDiv);
        $('<button/>').text('Done').click($.proxy(this.hidePanel, this)).appendTo(this.panelDiv);
    },

    setData: function setData(data, custom) {
        this._super(data, custom);
        if (this.tree) {
            this.tree.refresh();
        }
    }

});

// -------------------- CharacterClassPanel defines class data --------------------

var CharacterClassPanel = CustomPanel.extend({

    panelTitle: 'Class',

    className: 'CharacterClassPanel',

    getShortName: function getShortName() {
        return this.data.get('name');
    },

    gearWithTags: function (request, response) {
        var hash = CustomPanel.prototype.all.get('Gear');
        var searchTerm = request.term.toLowerCase();
        var multiples = searchTerm.match(/([0-9]+\s*x\s*)(.*)/);
        var prefix = '';
        if (multiples) {
            prefix = multiples[1];
            searchTerm = multiples[2];
        }
        if (searchTerm.length >= 2) {
            var result = $.map(hash.keys().sort(), function (entryKey) {
                var entry = hash.get(entryKey);
                var result = entry.data.get('name');
                if (entry.data.get('tags')) {
                    var tags = entry.data.get('tags');
                    tags = tags.replace(/(^|,\s*)[0-9]+ coin(s?)(\s*,\s*)?/, '$1');
                    result += ' (' + tags + ')';;
                }
                if (result.toLowerCase().indexOf(searchTerm) >= 0) {
                    return prefix + result;
                } else {
                    return undefined;
                }
            });
            response(result);
        }
    },

    gearListToEnglish: function gearListToEnglish(gearList) {
        var items = gearList.toLowerCase().split(/\s*;\s*/);
        if (items.length > 1) {
            var last = items.pop();
            items[items.length - 1] += ' and ' + last;
        }
        return items.join(', ');
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Class Name', 'name');
        this.appendSourceRow();
        var iconInput = this.appendFormTableRow('Class Icon', 'classIcon', 'textarea');
        var iconDisplay = $('<div/>').addClass('iconDisplay').html(this.data.get('classIcon'));
        iconInput.attr('rows', 10).attr('cols', 80).after(iconDisplay);
        iconInput.change(function (evt) {
            iconDisplay.html(iconInput.val());
        });
        this.appendFormTableRow('Look');
        this.appendFormTableRow('Look suggestions 1', 'look1').attr('size', 50);
        this.appendFormTableRow('Look suggestions 2', 'look2').attr('size', 50);
        this.appendFormTableRow('Look suggestions 3', 'look3').attr('size', 50);
        this.appendFormTableRow('Look suggestions 4', 'look4').attr('size', 50);
        this.appendFormTableRow('Combat');
        this.appendFormTableRow('Damage Die', 'damage', 'select', [ 'd4', 'd6', 'd8', 'd10' ] );
        this.appendFormTableRow('Base HP', 'baseHp');
        this.appendFormTableRow('Gear');
        this.appendFormTableRow('Load capacity', 'load').after($('<span/>').text(' + Str').addClass('roll'));
        var initialGear = this.appendFormTableRow('Initial gear - separate multiple items with ;', 'gear', 'text', $.proxy(this.gearWithTags, this));
        initialGear.css('width', '60em');
        multiAutocomplete(initialGear, ';');

        this.appendFooter([ GearChoicePanel, ClassAlignmentPanel, ClassBondPanel ]);
    },

    compile: function compile(execute) {
        if (!this.data.get("name"))
            return "Class must have a name!";
        if (execute) {
            this.removeCompiled();
            var name = this.data.get("name");
            this.compiled.push(new ModifierClass('lookSuggestions1', name, this.data.get('look1')));
            this.compiled.push(new ModifierClass('lookSuggestions2', name, this.data.get('look2')));
            this.compiled.push(new ModifierClass('lookSuggestions3', name, this.data.get('look3')));
            this.compiled.push(new ModifierClass('lookSuggestions4', name, this.data.get('look4')));
            var diceIcon = "<svg><use xlink:href='#" + this.data.get('damage') + "SVG' /></svg>";
            this.compiled.push(new ModifierClass('diceIcon', name, diceIcon));
            this.compiled.push(new ModifierClass('baseHp', name, this.data.get('baseHp')));
            this.compiled.push(new ModifierClass('classIcon', name, this.data.get('classIcon')));
            this.compiled.push(new ModifierClass('baseLoad', name, this.data.get('load')));
        }
        this.subPanels.each(function (key, subPanel) {
            subPanel.compile(execute);
        });
    }

});

// -------------------- GearChoicePanel defines a choice of gear for a character --------------------

var GearChoicePanel = CustomPanel.extend({

    panelTitle: 'Choice of Gear',

    className: 'GearChoicePanel',

    orderSpaces: function orderSpaces() {
        var order = parseInt(this.data.get('order')) || 0;
        return Array(10 - order).join(' ');
    },

    getShortName: function getShortName() {
        return this.orderSpaces() + this.panelTitle + ' "' + this.data.get('instructions') + '"';
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Instructions (e.g. "Choose your defenses")', 'instructions');
        this.appendFormTableRow('Order on sheet', 'order', 'select', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        this.appendFormTableRow('Number of selections', 'selections');
        this.appendFooter([ GearOptionPanel ]);
    },

    compile: function compile(execute) {
        if (!this.data.get("instructions"))
            return "Gear choice must have instructions!";
        if (!this.data.get("selections"))
            return "Gear choice must nominate the number of selections!";
        if (!this.subPanels || this.subPanels.size == 0)
            return "Gear choice must have some options!";
        this.subPanels.each(function (key, subPanel) {
            subPanel.compile(execute);
        });
    }

});

// -------------------- GearOptionPanel defines a single gear option that can be selected --------------------

var GearOptionPanel = CustomPanel.extend({

    panelTitle: 'Gear Option',

    className: 'GearOptionPanel',

    getShortName: function getShortName() {
        return this.panelTitle + ' "' + this.data.get('gear') + '"';
    },

    renderPanel: function renderPanel() {
        this._super();
        var gear = this.appendFormTableRow('Gear - separate multiple items with ;', 'gear', 'text', $.proxy(this.parentPanel.parentPanel.gearWithTags, this));
        gear.css('width', '60em');
        multiAutocomplete(gear, ';');
        this.appendFooter();
    },

    compile: function compile(execute) {
        if (!this.data.get("gear"))
            return "Gear option must specify the gear!";
    }

});

// -------------------- ClassAlignmentPanel defines a single class-specific alignment move --------------------

var ClassAlignmentPanel = CustomPanel.extend({

    panelTitle: 'Alignment Move for Class',

    className: 'ClassAlignmentPanel',

    getShortName: function getShortName() {
        return 'Alignment Move "' + this.data.get('alignment') + '"';
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Alignment', 'alignment');
        this.appendFormTableRow('Move', 'move', 'textarea').attr('rows', 4).attr('cols', 120);
        this.appendFooter();
    },

    getPanelTitle: function getPanelTitle() {
        return this.panelTitle + ' ' + this.parentPanel.form.find('input[name=name]').val();
    },

    compile: function compile(execute) {
        if (!this.data.get("alignment"))
            return "Alignment must have a name!";
        if (!this.data.get("move"))
            return "Alignment Move for Class must have a move!";
        if (execute) {
            this.removeCompiled();
            var className = this.parentPanel.data.get('name');
            this.compiled.push(new ModifierClassHashSet('alignment', className, this.data.get('alignment'), this.data.get('move')));
        }
    }

});

// -------------------- ClassBondPanel defines a single class-specific bond --------------------

var ClassBondPanel = CustomPanel.extend({

    panelTitle: 'Initial Bond for Class',

    className: 'ClassBondPanel',

    getShortName: function getShortName() {
        return 'Initial Bond "' + this.data.get('bond') + '"';
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Bond', 'bond').css('width', '60em');
        this.appendFooter();
    },

    getPanelTitle: function getPanelTitle() {
        return this.panelTitle + ' ' + this.parentPanel.form.find('input[name=name]').val();
    },

    compile: function compile(execute) {
        if (!this.data.get("bond"))
            return "Bond may not be empty!";
        if (execute) {
            this.removeCompiled();
            var className = this.parentPanel.data.get('name');
            var bond = this.data.get('bond').replace(/_/, '________');
            this.compiled.push(new ModifierClassAppend('bonds', className, bond));
        }
    }

});

// -------------------- RacePanel defines race data --------------------

var RacePanel = CustomPanel.extend({

    panelTitle: 'Race',

    className: 'RacePanel',

    getShortName: function getShortName() {
        return this.data.get('name');
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Race Name', 'name');
        this.appendSourceRow();
        this.appendFormTableRow('<br/>Race moves and suggested names for classes');
        this.appendFooter([ RaceClassPanel ]);
    },

    compile: function compile(execute) {
        if (!this.data.get("name"))
            return "Race must have a name!";
        if (execute) {
            this.removeCompiled();
            var name = this.data.get("name");
            this.subPanels.each(function (key, subPanel) {
                subPanel.compile(execute);
            });
        }
    }

});

// -------------------- RaceClassPanel defines a single race+class move --------------------

var RaceClassPanel = CustomPanel.extend({

    panelTitle: 'Class data for Race',

    className: 'RaceClassPanel',

    getShortName: function getShortName() {
        return this.data.get('className');
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Class Name', 'className', 'text', CustomPanel.prototype.all.get('Class').keys().sort());
        this.appendFormTableRow('Move', 'move', 'textarea').attr('rows', 4).attr('cols', 120);
        this.appendFormTableRow('Suggested names<br/>(comma-separated)', 'names').css('width', "100%");
        this.appendFooter();
    },

    getPanelTitle: function getPanelTitle() {
        return this.panelTitle + ' ' + this.parentPanel.form.find('input[name=name]').val();
    },

    compile: function compile(execute) {
        if (!this.data.get("className"))
            return "Class Move for Race must have a class name!";
        if (!this.data.get("move"))
            return "Class Move for Race must have a move!";
        if (execute) {
            this.removeCompiled();
            var className = this.data.get("className");
            var raceName = this.parentPanel.data.get('name');
            var nameSuggestions = '<em>' + raceName + ': </em>,' + this.data.get('names');
            this.compiled.push(new ModifierClassAppend('nameSuggestions', className, nameSuggestions, ',<br/>,'));
            this.compiled.push(new ModifierClassHashSet('race', className, raceName, this.data.get('move')));
        }
    }

});

// -------------------- ClassMovePanel defines an initial or advanced move --------------------

var ClassMovePanel = CustomPanel.extend({

    panelTitle: 'Class Move',

    className: 'ClassMovePanel',

    getShortName: function getShortName() {
        var className = this.data.get('className') || '';
        var result = className.replace(/^The /, '');
        var minLevel = this.data.get('minLevel');
        if (minLevel == 'Starting') {
            result += '  Starting Move';
        } else if (minLevel == 1) {
            result += '  Optional Starting Move';
        } else {
            result += ' Advanced Move (';
            if (this.data.get('maxLevel') > this.data.get('minLevel')) {
                result += 'levels ' + this.data.get('minLevel') + '&ndash;' + this.data.get('maxLevel');
            } else {
                result += 'level ' + this.data.get('minLevel');
            }
            result += ')';
        }
        result += ' "' + this.data.get('name') + '"';
        return result;
    },

    moveNamesForClass: function movesForClass(className) {
        var className = className.replace(/^The /, '') + ' ';
        var result = [];
        var movePanels = CustomPanel.prototype.all.get('Class Move');
        var movePanelNames = movePanels.keys();
        $.each(movePanelNames, function (index, moveShortName) {
            if (moveShortName.indexOf(className) == 0) {
                var panel = movePanels.get(moveShortName);
                var moveName = panel.data.get('name');
                result.push(moveName);
            }
        });
        return result.sort();
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendSourceRow();
        var className = this.appendFormTableRow('Class Name', 'className', 'text', CustomPanel.prototype.all.get('Class').keys().sort());
        var minLevel = this.appendFormTableRow('Minimum level', 'minLevel', 'select', ['Starting', 1, 2, 6]);
        var maxLevelRow = this.appendFormTableRow('Maximum level', 'maxLevel', 'select', [2, 10]).closest('tr');
        minLevel.change(function (evt) {
            var value = minLevel.val();
            if (value == 'Starting' || value == 1) {
                maxLevelRow.hide();
            } else {
                maxLevelRow.show();
            }
        });
        minLevel.change();
        this.appendFormTableRow('Move Name', 'name').css('width', '15em');
        var prereqType = this.appendFormTableRow('Prerequisite', 'prerequisiteType', 'select', ['None', 'Replaces', 'Requires']);
        var prereq = this.appendFormTableRow('', 'prerequisite', 'text', this.moveNamesForClass(className.val()));
        className.change($.proxy(function (evt) {
            prereq.autocomplete('option', 'source', this.moveNamesForClass(className.val()));
        }, this));
        prereqRow = prereq.closest('tr');
        prereqType.change(function (evt) {
            var value = prereqType.val();
            if (value == 'None') {
                prereqRow.hide();
            } else {
                prereqRow.show();
            }
        });
        prereqType.change();
        this.appendFormTableRow('Move', 'move', 'textarea').attr('rows', 4).attr('cols', 120);
        this.appendFormTableRow('Display order is a number, used to sort moves (lower numbers occur first).  Moves with the same display order are sorted alphabetically.  Moves with blank display orders are treated as having a value of 1000.  A Starting move with the special value of LHS is shown in the left-hand column.');
        this.appendFormTableRow('Display order', 'order');
        this.appendFooter();
    },

    compile: function compile(execute) {
        if (!this.data.get("className"))
            return "Class Move must nominate a class name!";
        if (!this.data.get("name"))
            return "Class Move must have a name!";
        if (!this.data.get("move"))
            return "Class Move must have a move!";
        if (execute) {
            this.removeCompiled();
        }
    }

});

// -------------------- GearPanel defines a type of gear --------------------

var GearPanel = CustomPanel.extend({

    panelTitle: 'Gear',

    className: 'GearPanel',

    types: [ 'Weapon', 'Ammunition', 'Armor', 'Gear', 'Poison' ],

    tagList: [ '# ammo', 'applied', '# armour', '+# armour', 'awkward', 'clumsy', 'close', '1 coin', '# coins', '+# damage', 'dangerous', 'far', 'forceful', 'hand', 'ignores armor', 'messy', 'near', '# piercing', 'precise', 'ration', 'reach', 'reload', 'requires', 'slow', 'stun', 'thrown', 'touch', 'two-handed', '# weight', 'worn', '# uses' ],

    getShortName: function getShortName() {
        return this.data.get('type') + ' "' + this.data.get('name') + '"';
    },

    matchNumbersInTags: function matchNumbersInTags(request, response) {
        var numberMatch = request.term.match(/\s*(\+?)([0-9]*)\s*(.*)/);
        var matching = $.map(this.tagList, function (entry) {
            var searchTerm, result;
            if (entry.match(/[0-9]/)) {
                searchTerm = request.term;
                result = entry;
            } else if (numberMatch[1]) {
                searchTerm = '+# ' + numberMatch[3];
                result = numberMatch[1] + numberMatch[2] + ' ' + entry.substring(3);
            } else if (numberMatch[2]) {
                searchTerm = '# ' + numberMatch[3];
                result = numberMatch[2] + ' ' + entry.substring(2);
            } else {
                searchTerm = request.term;
                result = entry;
            }
            if (entry.indexOf(searchTerm.toLowerCase()) >= 0) {
                return result;
            } else {
                return undefined;
            }
        });
        response(matching);
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendSourceRow();
        this.appendFormTableRow('Type', 'type', 'text', this.types);
        this.appendFormTableRow('Item name', 'name');
        var tagsInput = this.appendFormTableRow('Tags', 'tags', 'text', $.proxy(this.matchNumbersInTags, this));
        tagsInput.css('width', '40em');
        multiAutocomplete(tagsInput, ',');
        this.appendFormTableRow('On-sheet note', 'note').css('width', '40em');
        this.appendFormTableRow('Full description', 'description', 'textarea').attr('rows', 4).attr('cols', 60);
        this.appendFooter();
    },

    compile: function compile(execute) {
        if (!this.data.get("name"))
            return "Gear must have a name!";
        if (execute) {
            this.removeCompiled();
        }
    }

});

