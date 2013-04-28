
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
            this.div.appendTo(parentNode.childDiv);
            this.controlFn = parentNode.controlFn;
            parentNode.children.set(this.text, this);
        }
        if (this.text) {
            this.control = $('<span/>').addClass('treeControl').html('&#8862;').appendTo(this.div);
            this.control.click($.proxy(this.clickControl, this));
            $('<span/>').text(' ' + this.text).appendTo(this.div);
        }
    },

    expand: function expand() {
        if (!this.expanded) {
            this.control.html('&#8863;');
            this.expanded = true;
            if (!this.childDiv) {
                this.childDiv = $('<div/>').addClass('treeContent').appendTo(this.div);
                var names = this.controlFn(this, false);
                $.each(names, $.proxy(function (index, name) {
                    if (!this.children.contains(name)) {
                        new ExpandingTree(this, name);
                    }
                }, this));
            }
            this.childDiv.show();
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
                // TODO what if names change?
            }
            this.children.each(function (key, value) {
                value.refresh();
            });
        }
    }

});

// ==================== CustomPanel is the base class for all custom panels ====================

var CustomPanel = Class.extend({

    customPanels: new Hash(),

    all: new Hash(),

    typeMap: new Hash(),

    init: function init(parentPanel, data, dontEval) {
        this.custom = false;
        this.parentPanel = parentPanel;
        this.subPanels = new Hash();
        this.setData(data);
        this.compiled = [];
        if (!dontEval)
        {
            var problem = this.execCode();
            if (problem)
                alert(problem);
        }
        if (parentPanel) {
            this.addToSource();
        }
        if (!this.all.contains(this.panelTitle)) {
            this.all.set(this.panelTitle, new Hash());
        }
        this.all.get(this.panelTitle).set(this.getShortName(), this);
    },

    makeCustom: function makeCustom(notTop) {
        this.custom = true;
        if (!notTop)
            CustomPanel.prototype.customPanels.set(this.getId(), this);
        this.subPanels.each(function (key, value) {
            value.makeCustom(true);
        });
    },

    setData: function setData(data) {
        this.data = new Hash(data);
        if (this.data.contains('subPanels')) {
            var subPanelsData = this.data.remove('subPanels');
            this.buildSubPanelsFromData(subPanelsData);
        }
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
        CustomPanel.prototype.customPanels.remove(this.getId());
        this.removeFromSource(this.getSource(), this.panelTitle, this.getShortName());
        this.all.get(this.panelTitle).remove(this.getShortName());
    },

    debugPanelCode: function debugPanelCode(evt) {
        evt.stopPropagation();
        var panel = evt.data;
        debugger;
        panel.compile(true);
    },

    appendSubPanelsTable: function appendSubPanelsTable(panelDiv, subPanels) {
        panelDiv = panelDiv || this.panelDiv;
        if (!panelDiv) {
            return;
        }
        if (!panelDiv.data('panelTable')) {
            var table = $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(panelDiv));
            panelDiv.data('panelTable', table);
        }
        this.refreshSubPanelsTable(panelDiv, subPanels);
    },

    refreshSubPanelsTable: function refreshSubPanelsTable(panelDiv, subPanels) {
        panelDiv = panelDiv || this.panelDiv;
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
            } else {
                $('<td/>').css('width', '1%').appendTo(row);
            }
            $('<td/>').css('width', '95%').appendTo(row);
        }, this));
    },

    addSubPanel: function addSubPanel(panelType, data) {
        data = data || {};
        data['source'] = this.getSource();
        var panel = new panelType(this, data, true);
        this.subPanels.set(panel.getId(), panel);
        return panel;
    },

    openSubPanel: function openSubPanel(evt) {
        evt.stopPropagation();
        var panelType = evt.data;
        this.addSubPanel(panelType).showPanel();
    },

    buildSubPanelsFromData: function buildSubPanelsFromData(data) {
        $.each(data, $.proxy(function (index, panelData) {
            var panelType = CustomPanel.prototype.typeMap.get(panelData[0]);
            this.addSubPanel(panelType, panelData[1]);
        }, this));
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
        this.formTable = $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(this.form));
    },

    getPanelTitle: function getPanelTitle() {
        return this.panelTitle;
    },

    appendFormTableRow: function appendFormTableRow(title, dataId, type, options) {
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
                var id = (this.getId() + "_" + dataId).replace(/ /g, '_');
                cell.attr('id', id)
                input.autocomplete({ source: options, appendTo: '#' + id });
            }
        }
        if (input && this.data.contains(dataId)) {
            input.val(this.data.get(dataId));
        }
        return input;
    },

    appendSourceRow: function appendSourceRow() {
        var input = this.appendFormTableRow('Source book', 'source', 'text', Sourcebook.allBooks());
    },

    appendFooter: function appendFooter(subpanels) {
        this.appendSubPanelsTable();
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

    addToSource: function addToSource(oldSource, oldTitle, oldShortName) {
        if (oldSource && !this.removeFromSource(oldSource, oldTitle, oldShortName))
            return;
        var book = Sourcebook.getBook(this.getSource());
        book.getData(this.panelTitle).set(this.getShortName(), this);
    },

    removeFromSource: function removeFromSource(source, panelTitle, shortName) {
        var deleted = false;
        if (Sourcebook.hasBook(source)) {
            var book = Sourcebook.getBook(source);
            var data = book.getData(panelTitle);
            if (data.contains(shortName)) {
                data.remove(shortName);
                deleted = true;
            }
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
        if (typeof(problem) == 'string')
        {
            // There's a problem - abort.
            alert(problem);
            panel.data = oldData;
            return false;
        }
        this.subPanels.remove(oldId);
        this.subPanels.set(panel.getId(), panel);
        if (panel.custom && CustomPanel.prototype.customPanels.get(oldId) == panel)
        {
            CustomPanel.prototype.customPanels.remove(oldId);
            CustomPanel.prototype.customPanels.set(panel.getId(), panel);
        }
        panel.makeCustom();
        panel.addToSource(oldSource, oldTitle, oldShortName);
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
        this._super(null, null, true);
    },

    getShortName: function getShortName() {
        return 'Custom Panel';
    },

    appendTree: function appendTree() {
        this.tree = new ExpandingTree(null, 'Sourcebooks', $.proxy(function (parentNode, refreshOnly) {
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
                names = book.data.keys().sort(function (a, b) {
                    if (a == "Custom" || a < b) {
                        return -1;
                    } else if (b == "Custom" || a > b) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
            } else {
                var sourceName = parentNode.parentNode.text;
                var book = Sourcebook.prototype.all.get(sourceName);
                var type = parentNode.text;
                if (refreshOnly) {
                    this.refreshSubPanelsTable(parentNode.childDiv, book.data.get(type));
                } else {
                    this.appendSubPanelsTable(parentNode.childDiv, book.data.get(type));
                }
            }
            return names;
        }, this));
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
        this.addSubPanelButtons([ CharacterClassPanel, RacePanel ]);
        $('<hr/>').appendTo(this.panelDiv);
        $('<button/>').text('Done').click($.proxy(this.hidePanel, this)).appendTo(this.panelDiv);
    }

});

// -------------------- CharacterClassPanel defines class data --------------------

var CharacterClassPanel = CustomPanel.extend({

    panelTitle: 'Class',

    className: 'CharacterClassPanel',

    getShortName: function getShortName() {
        return this.data.get('name');
    },

    renderPanel: function renderPanel() {
        this._super();
        this.appendFormTableRow('Class Name', 'name');
        this.appendSourceRow();
        this.appendFormTableRow('Look suggestions 1', 'look1').attr('size', 50);
        this.appendFormTableRow('Look suggestions 2', 'look2').attr('size', 50);
        this.appendFormTableRow('Look suggestions 3', 'look3').attr('size', 50);
        this.appendFormTableRow('Look suggestions 4', 'look4').attr('size', 50);
        this.appendFormTableRow('Damage Die', 'damage', 'select', [ 'd4', 'd6', 'd8', 'd10' ] );
        this.appendFormTableRow('Base HP', 'baseHp');
        var iconInput = this.appendFormTableRow('Class Icon', 'classIcon', 'textarea');
        var iconDisplay = $('<div/>').addClass('iconDisplay').html(this.data.get('classIcon'));
        iconInput.attr('rows', 10).attr('cols', 80).after(iconDisplay);
        iconInput.change(function (evt) {
            iconDisplay.html(iconInput.val());
        });

        this.appendFooter([ ClassAlignmentPanel, ClassBondPanel ]);
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
            this.subPanels.each(function (key, subPanel) {
                subPanel.compile(execute);
            });
        }
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

    addToSource: function addToSource(oldSource, oldTitle, oldShortName) {
    },

    compile: function compile(execute) {
        if (!this.data.get("alignment"))
            return "Alignment must have a name!";
        if (!this.data.get("move"))
            return "Alighment Move for Class must have a move!";
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

    addToSource: function addToSource(oldSource, oldTitle, oldShortName) {
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

    addToSource: function addToSource(oldSource, oldTitle, oldShortName) {
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
