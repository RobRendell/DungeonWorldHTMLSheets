
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

    init: function init(parentNode, text, expandFn) {
        this.parentNode = parentNode;
        this.text = text;
        this.children = new Hash();
        this.expanded = false;
        this.div = $("<div/>").addClass('expandingTree');
        if (!parentNode) {
            this.level = 0;
            this.expandFn = expandFn;
        } else {
            this.level = parentNode.level + 1;
            this.div.appendTo(parentNode.childDiv);
            this.expandFn = parentNode.expandFn;
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
                this.childDiv = $('<div/>').appendTo(this.div);
                this.expandFn(this);
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
            if (this.expandFn) {
                this.expandFn(this);
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

    init: function init(parentPanel, data, dontEval) {
        this.custom = false;
        this.parentPanel = parentPanel;
        this.subPanels = new Hash();
        this.setData(data);
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
            this.subPanels.remove(panel.getId());
            CustomPanel.prototype.customPanels.remove(panel.getId());
            this.removeFromSource(panel.getSource(), panel.panelTitle, panel.getShortName());
            this.refreshTable();
            return true;
        }
        return false;
    },

    debugPanelCode: function debugPanelCode(evt) {
        evt.stopPropagation();
        var panel = evt.data;
        debugger;
        panel.compile(true);
    },

    refreshTable: function refreshTable(panelDiv, subPanels) {
        panelDiv = panelDiv || this.panelDiv;
        if (!panelDiv) {
            return;
        }
        var table = panelDiv.data('panelTable');
        if (!table) {
            table = $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(panelDiv));
            panelDiv.data('panelTable', table);
        }
        table.html('');
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

    addSubPanel: function addSubPanel(evt, panelType, data) {
        if (evt) {
            evt.stopPropagation();
            panelType = evt.data;
        }
        if (!data) {
            data = {};
        }
        data['source'] = this.getSource();
        var panel = new panelType(this, data, true);
        panel.showPanel();
        return panel;
    },

    addSubPanelButtons: function addSubPanelButtons(panelTypes) {
        $.each(panelTypes, $.proxy(function (index, panelType) {
            $('<button/>').html('Add ' + panelType.prototype.panelTitle).click(panelType, $.proxy(this.addSubPanel, this)).appendTo(this.panelDiv);
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
            this.panelDiv.html('');
        } else {
            this.panelDiv = $('<div/>').addClass('customPanel').appendTo(parentDiv);
        }
        $('<h4/>').html(this.panelTitle).appendTo(this.panelDiv);
        this.form = $('<form/>').appendTo(this.panelDiv);
        this.formTable = $('<tbody/>').appendTo($('<table/>').addClass('customTable').appendTo(this.form));
    },

    appendFormTableRow: function appendFormTableRow(title, dataId, type, options) {
        var row = $('<tr/>').appendTo(this.formTable);
        $('<th/>').html(title).appendTo(row);
        if (!type) {
            type = 'text';
        }
        if (type == 'select') {
            var input = $('<select/>').appendTo($('<td/>').appendTo(row)).attr('name', dataId);
            $.each(options, function (index, value) {
                var option = $("<option/>").appendTo(input);
                option.attr('value', value);
                option.text(value);
            });

        } else {
            var input = $('<input/>').appendTo($('<td/>').appendTo(row)).attr('name', dataId);
            input.attr('type', type);
            if (type == 'text' && options) {
                input.autocomplete({ source: options, appendTo: 'td' });
            }
        }
        if (this.data.contains(dataId)) {
            input.val(this.data.get(dataId));
        }

    },

    appendSourceRow: function appendSourceRow() {
        var input = this.appendFormTableRow('Source book', 'source', 'text', Sourcebook.allBooks());
    },

    appendFooter: function appendFooter(subpanels) {
        this.refreshTable();
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
        this.renderPanel();
        this.panelDiv.show();
    },

    hidePanel: function hidePanel(evt) {
        if (evt)
            evt.stopPropagation();
        if (this.panelDiv)
            this.panelDiv.hide();
    },

    getSource: function getSource() {
        if (this.data.contains('source'))
            return this.data.get('source');
        else
            return 'Custom';
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

    compile: function compile(execute) {
        return 'Error - Custom panel ' + this.getId() + ' failed to override compile.';
    },

    collectData: function collectData() {
        var result = new Hash();
        $.each(this.form.serializeArray(), function (index, pair) {
            result.set(pair.name, pair.value);
        });
        this.setData(result);
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
    commitPanel: function commitPanel(panel, execPanel) {
        var oldData = panel.data;
        var oldId = panel.getId();
        var oldSource = panel.getSource();
        var oldTitle = panel.panelTitle;
        var oldShortName = panel.getShortName();
        panel.collectData();
        var problem = panel.compile(execPanel);
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
        panel.addToSource(oldSource, oldTitle, oldShortName);
        this.refreshTable();
        return true;
    }

});

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

    refreshTable: function refreshTable() {
        var superRefresh = $.proxy(this._super, this);
        if (this.tree) {
            this.tree.refresh();
        } else {
            this.tree = new ExpandingTree(null, 'Sourcebooks', $.proxy(function (parentNode)
            {
                var names = [];
                // return children nodes appropriate to parentNode
                if (parentNode.level == 0) {
                    Sourcebook.prototype.all.each(function (key, value) {
                        if (value.data && value.data.length > 0)
                            names.push(key);
                    });
                    names = names.sort();
                } else if (parentNode.level == 1) {
                    var sourceName = parentNode.text;
                    var book = Sourcebook.prototype.all.get(sourceName);
                    names = book.data.keys().sort(
                            function (a, b)
                            {
                                if (a == "Custom" || a < b)
                                    return -1;
                                else if (b == "Custom" || a > b)
                                    return 1;
                                else
                                    return 0;
                            });
                } else {
                    var sourceName = parentNode.parentNode.text;
                    var book = Sourcebook.prototype.all.get(sourceName);
                    var type = parentNode.text;
                    superRefresh(parentNode.childDiv, book.data.get(type));
                }
                $.each(names, function (index, name) {
                    if (!parentNode.children.contains(name)) {
                        new ExpandingTree(parentNode, name);
                    }
                });
            }, this));
            this.tree.div.appendTo(this.panelDiv);
            this.tree.expand(true);
        }
    },

    commitPanel: function commitPanel(panel) {
        Field.edited = true;
        panel.makeCustom();
        var result = this._super(panel, true);
        return result;
    },

    renderPanel: function renderPanel() {
        if (this.tree && this.tree.div.parentNode == this.panelDiv)
            this.panelDiv.removeChild(this.tree.div);
        this._super();
        $("<p/>").text('The classes, moves and other features of characters are editable from this page.  Grey entries are pre-defined, while black are custom.  Custom features are saved in your character\'s save file, and will execute when that character is loaded.  Editing a pre-defined feature will override it with a custom version.').appendTo(this.panelDiv);
        $("<p/>").text('You can also create new custom features by clicking the buttons at the bottom of this page.').appendTo(this.panelDiv);
        this.refreshTable();
        $('<hr/>').appendTo(this.panelDiv);
        this.addSubPanelButtons([ CharacterClassPanel ]);
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
        this.appendFormTableRow('Damage Die', 'damage', 'select', [ 'd4', 'd6', 'd8', 'd10' ] );
        this.appendFormTableRow('Base HP', 'baseHp');
        this.appendFormTableRow('Class Icon', 'classIcon');

        this.appendFooter();
    },

    compile: function compile(execute) {
        if (!this.data.get("name"))
            return "Class must have a name!";
        if (execute) {
            var name = this.data.get("name");
            var diceIcon = "<svg><use xlink:href='#" + this.data.get('damage') + "SVG' /></svg>";
            Field.getField('diceIcon').addModifier(new ModifierClass(name, diceIcon));
            Field.getField('baseHp').addModifier(new ModifierClass(name, this.data.get('baseHp')));
            Field.getField('classIcon').addModifier(new ModifierClass(name, this.data.get('classIcon')));
        }
    }

});
