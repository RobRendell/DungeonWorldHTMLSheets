
// ==================== Some utility methods ====================

function multiAutocomplete(input, separator) {

    var originalSource = input.autocomplete('option', 'source');
    var splitRegexString = '\\s*' + separator + '\\s*(?![^(]*\\))';
    var splitRegex = new RegExp(splitRegexString);
    input.autocomplete('option', 'source', function (request, response) {
        request.term = request.term.split(splitRegex).pop();
        if (originalSource instanceof Array) {
            var matching = $.grep(originalSource, function (entry) {
                return (entry.toLowerCase().indexOf(request.term.toLowerCase()) >= 0);
            });
            response(matching);
        } else if ($.isFunction(originalSource)) {
            originalSource(request, response);
        } else {
            throw 'Unknown autocomplete source "' + originalSource + '" configured';
        }
    });
    input.on('autocompletesearch', function(evt) {
        // custom minLength
        var searchTerm = this.value.split(splitRegex).pop();
        if (searchTerm.length < 2) {
                return false;
        }
    });
    input.on('autocompleteselect autocompletefocus', function (evt, ui) {
        if (ui && ui.item && (evt.type == 'autocompleteselect' || evt.keyCode)) {
            var terms = this.value.split(splitRegex);
            terms.pop();
            terms.push(ui.item.value);
            this.value = terms.join(separator + ' ');
            return false;
        }
    });
    input.keydown(function(evt) {
        if (evt.keyCode === $.ui.keyCode.TAB && $(this).data("ui-autocomplete").menu.active) {
            evt.preventDefault();
        }
    });

}

function cmp (a, b) {
    return ((a < b) ? -1 : (a > b) ? 1 : 0);
}

// ==================== Floating menu ====================

var FloatingMenu = Class.extend({

    init: function init(id) {
        this.id = id;
        this.element = $("#" + this.id);
        var item = $("<h3/>");
        item.text("Menu");
        this.element.append(item);
    },

    addMenuItem: function addMenuItem(text, callback) {
        var item = $("<div/>");
        if (callback) {
            var anchor = $("<a/>");
            anchor.text(text);
            anchor.attr('href', '#');
            anchor.click(function (eventObject) {
                callback(eventObject);
                eventObject.preventDefault();
                eventObject.stopPropagation();
            });
            item.append(anchor);
        } else {
            item.html(text);
        }
        this.element.append(item);
    }

});

// ==================== A Modifier modifies the value of a Field ====================

var Modifier = Class.extend({

    init: function init(fieldId, enabled, value) {
        this.fieldId = fieldId
        this.enabled = enabled;
        this.value = value;
        this.add();
    },

    add: function add() {
        if (!this.field) {
            this.field = Field.getField(this.fieldId);
            if (!this.field) {
                throw "Unable to locate field with id " + this.fieldId;
            }
            this.field.addModifier(this);
            $.each(this.getSourceFields(), $.proxy(function (index, dependentField) {
                dependentField.addDependentField(this.field);
            }, this));
        }
    },

    remove: function remove() {
        if (this.field) {
            this.field.removeModifier(this);
            $.each(this.getSourceFields(), $.proxy(function (index, dependentField) {
                dependentField.removeDependentField(this.field);
            }, this));
            this.field = null;
        }
    },

    getEnabled: function getEnabled() {
        return this.enabled;
    },

    getField: function getField() {
        return this.field;
    },

    apply: function apply(value) {
        return this.value;
    },

    getSourceFields: function getSourceFields() {
        return [];
    },

    toString: function toString() {
        return this.value;
    }

});

// -------------------- ModifierStat calculates the modifier for a Dungeon World stat --------------------

var ModifierStat = Modifier.extend({

    init: function(fieldId, stat) {
        this.statField = Field.getField(stat);
        this._super(fieldId, true);
    },

    getSourceFields: function getSourceFields() {
        return [ this.statField ];
    },

    apply: function apply(value) {
        var stat = this.statField.getValue();
        if (stat <= 3) {
            return value - 3;
        } else if (stat <= 5) {
            return value - 2;
        } else if (stat <= 8) {
            return value - 1;
        } else if (stat <= 12) {
            return value;
        } else if (stat <= 15) {
            return value + 1;
        } else if (stat <= 17) {
            return value + 2;
        } else {
            return value + 3;
        }
    },

    toString: function toString() {
        return 'Modifier for ' + this.statField.name;
    }

});

// -------------------- ModifierAddField adds the value of one field to its target --------------------

var ModifierAddField = Modifier.extend({

    init: function(fieldId, sourceFieldId) {
        this.sourceField = Field.getField(sourceFieldId);
        this._super(fieldId, true);
    },

    getSourceFields: function getSourceFields() {
        return [ this.sourceField ];
    },

    isNumeric: function isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },

    apply: function apply(value) {
        var sourceFieldValue = this.sourceField.getValue();
        if (this.isNumeric(value) && this.isNumeric(sourceFieldValue)) {
            return parseInt(value) + parseInt(sourceFieldValue);
        } else {
            return '';
        }
    }

});

// -------------------- ModifierClass is enabled when the className field has the given value --------------------

var ModifierClass = Modifier.extend({

    init: function init(fieldId, classValue, value) {
        this.classValue = classValue;
        this.classField = Field.getField('className');
        this._super(fieldId, true, value);
    },

    getEnabled: function getEnabled() {
        return (this.enabled && this.classField.getValue() == this.classValue);
    },

    getSourceFields: function getSourceFields() {
        return [ this.classField ];
    },

    toString: function toString() {
        return this.classValue;
    }

});

// -------------------- ModifierClassAppend appends its value --------------------

var ModifierClassAppend = ModifierClass.extend({

    init: function init(fieldId, classValue, value, between) {
        this._super(fieldId, classValue, value);
        this.between = between;
    },

    apply: function apply(value) {
        if (value instanceof Array) {
            value.push(this.value);
            return value;
        } else if (value) {
            return value + this.between + this.value;
        } else {
            return this.value;
        }
    }

});

// -------------------- ModifierClassHashSet sets values on a hash --------------------

var ModifierClassHashSet = ModifierClass.extend({

    init: function init(fieldId, classValue, key, value) {
        this._super(fieldId, classValue, value);
        this.key = key;
    },

    apply: function apply(value) {
        value.set(this.key, this.value);
        return value;
    }

});

// ==================== A Field is a (possibly editable) value displayed on the sheet ====================

var Field = Class.extend({

    all: new Hash(),

    init: function init(name) {
        this.name = name;
        this.element = $("#" + name);
        this.defaultValue = this.getDefaultValue();
        this.value = this.defaultValue;
        this.baseValue = this.defaultValue;
        this.all.set(name, this);
        this.dependentFields = new Hash();
        this.modifiers = [];
        this.editing = false;
    },

    getDefaultValue: function getDefaultValue() {
        if (this.element && this.element.html() && /[^\s]/.exec(this.element.html())) {
            return this.element.html() 
        } else {
            return this.emptyValue();
        }
    },

    emptyValue: function emptyValue() {
        return '';
    },

    getValue: function getValue() {
        if (this.value == '&nbsp;') {
            return '';
        } else {
            return this.value;
        }
    },

    startEditing: function startEditing() {
        if (this.editing) {
            return;
        }
        if (!this.input) {
            this.input = this.renderEditing();
        }
        this.resetInput();
        this.element.html(this.input);
        this.editing = true;
        this.input.focus();
        this.input.blur($.proxy(this.blurEditing, this));
        this.input.keydown($.proxy(this.checkFinishKey, this));
    },

    renderEditing: function renderEditing() {
        return $("<input type='text'/>");
    },

    resetInput: function resetInput() {
        if (this.baseValue != '&nbsp;') {
            this.input.val(this.baseValue);
        } else {
            this.input.val('');
        }
    },

    blurEditing: function blurEditing() {
        this.inputField(this.getInputValue());
    },

    checkFinishKey: function checkFinishKey(evt) {
        if (evt.which == $.ui.keyCode.ESCAPE) {
            this.renderField();
            this.editing = false;
        } else if (evt.which == $.ui.keyCode.ENTER || evt.which == $.ui.keyCode.TAB) {
            this.inputField(this.getInputValue());
            evt.preventDefault();
        } else {
            return undefined;
        }
        return true;
    },

    getInputValue: function getInputValue() {
        return this.input.val();
    },

    inputField: function inputField(value) {
        this.editing = false;
        this.updateValue(value);
    },

    addModifier: function addModifier(modifier) {
        this.modifiers.push(modifier);
    },

    removeModifier: function removeModifier(modifier) {
        var index = this.modifiers.indexOf(modifier);
        if (index >= 0) {
            this.modifiers.splice(index, 1);
        }
    },

    addDependentField: function addDependentField(field) {
        var name = field.name;
        this.dependentFields.set(name, (this.dependentFields.get(name) + 1) || 1);
    },

    removeDependentField: function removeDependentField(field) {
        var name = field.name;
        if (this.dependentFields.get(name) == 1) {
            this.dependentFields.remove(name);
        } else {
            this.dependentFields.set(name, this.dependentFields.get(name) - 1);
        }
    },

    updateValue: function updateValue(value) {
        this.baseValue = value;
        this.value = value;
        this.applyModifiers();
        this.renderField();
        this.recalculateDependentFields();
    },

    applyModifiers: function applyModifiers() {
        for (var index = 0; index < this.modifiers.length; ++index) {
            var modifier = this.modifiers[index];
            if (modifier.getEnabled()) {
                this.value = modifier.apply(this.value);
            }
        }
    },

    renderField: function renderField() {
        if (this.value == '') {
            this.element.html(this.defaultValue);
        } else {
            this.element.html(this.value);
        }
    },

    recalculateDependentFields: function recalculateDependentFields() {
        $.each(this.dependentFields.keys(), function (index, fieldName) {
            var dependentField = Field.getField(fieldName);
            dependentField.recalculate();
        });
    },

    recalculate: function recalculate() {
        this.updateValue(this.emptyValue());
    },

    reset: function reset() {
        this.value = this.defaultValue;
        this.baseValue = this.defaultValue;
        this.element.html(this.value);
    },

    showModifiers: function showModifiers() {
        var result = [];
        $.each(this.modifiers, function (index, modifier) {
            result.push(modifier.toString());
        });
        return result.join(", ");
    }

});

Field.getField = function (name) {
    return Field.prototype.all.get(name);
}

Field.callAll = function (selector, callback) {
    $(selector).each(function(index, element) {
        var id = $(element).attr("id");
        var field = Field.getField(id);
        if (field) {
            callback.call(field);
        }
    });
}

Field.clickEditable = function () {
    var id = $(this).attr("id");
    var field = Field.getField(id);
    if (field) {
        field.startEditing();
    }
}

// -------------------- FieldInt holds an integer value --------------------

var FieldInt = Field.extend({

    emptyValue: function emptyValue() {
        return 0;
    },

    updateValue: function updateValue(value) {
        this._super(parseInt(value) || 0);
    }

});

// -------------------- FieldBonus always displays a sign (plus or minus) --------------------

var FieldBonus = FieldInt.extend({

    renderField: function renderField() {
        if (this.value < 0) {
            this.element.html(this.value);
        } else {
            this.element.html("+" + this.value);
        }
    }

});

// -------------------- FieldChoice allows selection from a drop-down list --------------------

var FieldChoice = Field.extend({

    init: function init(id, options) {
        this._super(id);
        this.options = options;
    },

    getOptions: function getOptions() {
        if ($.isFunction(this.options)) {
            return this.options();
        } else {
            return this.options;
        }
    },

    renderEditing: function() {
        return $("<select/>");
    },

    resetInput: function resetInput() {
        this.input.empty();
        $.each(this.getOptions(), $.proxy(function (index, value) {
            var option = $("<option/>");
            option.attr('value', value);
            option.text(value);
            if (value == this.value) {
                option.attr('selected', true);
            }
            this.input.append(option);
        }, this));
        this.input.change($.proxy(this.blurEditing, this));
    }

});

// -------------------- FieldRange allows selecting from a numerical range --------------------

var FieldRange = FieldChoice.extend({

    init: function init(id, min, max) {
        var options = [];
        for (var count = min; count <= max; ++count) {
            options.push(count);
        }
        this._super(id, options);
    },

    updateValue: function updateValue(value) {
        this._super(parseInt(value));
    }

});

// -------------------- FieldHideShow is a field that hides and shows depending on another field --------------------

var FieldHideShow = Field.extend({

    init: function init(name, otherFieldId, hideRegexp) {
        this._super(name);
        this.otherField = Field.getField(otherFieldId);
        this.hideRegexp = hideRegexp;
        this.otherField.addDependentField(this);
    },

    recalculate: function recalculate() {
        this._super();
        if (this.hideRegexp.exec(this.otherField.getValue())) {
            this.element.hide();
        } else {
            this.element.show();
        }
    }

});

// -------------------- FieldSuggestion shows clickable suggestions for the FieldHideShow otherField --------------------

var FieldSuggestion = FieldHideShow.extend({

    init: function init(name, otherFieldId, hideRegexp, commaCount) {
        this._super(name, otherFieldId, hideRegexp);
        this.commaCount = commaCount;
    },

    renderField: function renderField() {
        this.element.empty();
        var first = true;
        $.each(this.value.split(/,\s*/), $.proxy(function (index, value) {
            if (value.indexOf('<') == 0) {
                $(value).appendTo(this.element);
                first = true;
            } else {
                if (first) {
                    first = false;
                } else {
                    this.element.append($('<span/>').text(', '));
                }
                $('<a/>').addClass('suggestion').text(value).click(value, $.proxy(this.applySuggestion, this)).appendTo(this.element);
            }
        }, this));
    },

    applySuggestion: function applySuggestion(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var value = evt.data;
        if (this.commaCount !== undefined) {
            var prevValueArray = this.otherField.getValue().split(/,[\s]*/g);
            while (prevValueArray.length < this.commaCount) {
                prevValueArray.push('');
            }
            prevValueArray[this.commaCount] = value;
            value = prevValueArray.join(', ');
        }
        this.otherField.updateValue(value);
    }

});

// -------------------- FieldDescriptionList is a field that contains elements of a DL --------------------

var FieldDescriptionList = Field.extend({

    init: function init(name, sortFn) {
        this._super(name);
        this.sortFn = sortFn;
    },

    emptyValue: function emptyValue() {
        return new Hash();
    },

    renderField: function renderField() {
        this.element.empty();
        var keys = this.value.keys().sort(this.sortFn);
        $.each(keys, $.proxy(function (index, key) {
            var value = this.value.get(key);
            if (value) {
                $('<dt/>').html(key).appendTo(this.element);
                $('<dd/>').html(value).appendTo(this.element);
            } else {
                $('<div/>').html(key).appendTo(this.element);
            }
        }, this));
    }

});

// -------------------- FieldUnorderedList is a field that contains elements of a UL --------------------

var FieldUnorderedList = Field.extend({

    init: function init(name, sortFn) {
        this._super(name);
        this.sortFn = sortFn;
    },

    emptyValue: function emptyValue() {
        return [];
    },

    renderField: function renderField() {
        this.element.empty();
        var values = this.value.sort(this.sortFn);
        $.each(values, $.proxy(function (index, value) {
            $('<li/>').html(value).appendTo(this.element);
        }, this));
    }

});

// -------------------- FieldMoveChoice is a field that lists matching moves --------------------

var FieldMoveChoice = Field.extend({

    init: function init(name, minLevel, maxLevel, textBefore, textAfter, lhsElementId) {
        this._super(name);
        this.classField = Field.getField("className");
        this.classField.addDependentField(this);
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        this.textBefore = textBefore;
        this.textAfter = textAfter;
        this.lhsElement = $('#' + lhsElementId);
    },

    getMatchingMoves: function getMatchingMoves() {
        var className = this.classField.getValue();
        var allMoves = CustomPanel.prototype.all.get('Class Move');
        var result = [];
        allMoves.each($.proxy(function (moveId, movePanel) {
            if (className == movePanel.data.get('className') &&
                    this.minLevel == movePanel.data.get('minLevel') &&
                    (!this.maxLevel || this.maxLevel == movePanel.data.get('maxLevel'))) {
                result.push(movePanel);
            }
        }, this));
        return result;
    },

    sortFn: function sortFn(a, b) {
        var aOrder = a.data.get('order');
        var aName = a.data.get('name');
        if (aOrder === '' || aOrder === undefined) {
            aOrder = 1000;
        }
        var bOrder = b.data.get('order');
        var bName = b.data.get('name');
        if (bOrder === '' || bOrder === undefined) {
            bOrder = 1000;
        }
        return cmp(aOrder, bOrder) || cmp(aName, bName);
    },

    renderField: function renderField() {
        this.element.empty();
        this.lhsElement.empty();
        var result = this.getMatchingMoves();
        result.sort(this.sortFn);
        if (result.length > 0 && this.textBefore) {
            this.element.append($('<b/>').html(this.textBefore));
        }
        $.each(result, $.proxy(function (index, movePanel) {
            var name = movePanel.data.get("name");
            var move = movePanel.data.get("move");
            if (this.lhsElement.length > 0 && movePanel.data.get('order') == 'LHS') {
                $('<div/>').addClass('heading').addClass('left').html(name).appendTo(this.lhsElement);
                $('<div/>').html(move).appendTo(this.lhsElement);
            } else {
                $('<dt/>').html(name).appendTo(this.element);
                $('<dd/>').html(move).appendTo(this.element);
            }
        }, this));
        if (result.length > 0 && this.textAfter) {
            this.element.append($('<b/>').html(this.textAfter));
        }
    }

});

// -------------------- FieldStartingGear is a field that displays starting gear --------------------

var FieldStartingGear = Field.extend({

    init: function init(name) {
        this._super(name);
        this.classField = Field.getField("className");
        this.classField.addDependentField(this);
    },

    renderField: function renderField() {
        this.element.empty();
        var className = this.classField.getValue();
        var classPanel = CustomPanel.prototype.all.get('Class').get(className);
        var text = 'Your load is <span class="roll">' + classPanel.data.get('load') + '+Str</span>. You start with ' + classPanel.gearListToEnglish(classPanel.data.get('gear')) + '. ';
        var choices = [];
        classPanel.subPanels.each(function (key, panel) {
            if (panel.className == 'GearChoicePanel') {
                choices[parseInt(panel.data.get('order')) - 1] = panel;
            }
        });
        for (var index = 0; index < choices.length; ++index) {
            var panel = choices[index];
            text += panel.data.get('instructions') + ':';
            $('<div/>').html(text).appendTo(this.element);
            text = '';
            panel.subPanels.each($.proxy(function (key, subPanel) {
                var subPanelText = classPanel.gearListToEnglish(subPanel.data.get('gear'));
                $('<li/>').html(subPanelText).appendTo(this.element);
            }, this));
        }
        while (this.element.height() < 200) {
            this.element.append($('<br/>'));
        }
    }


});

// ==================== Initialise everything ====================

$(document).ready(function () {

    new Field("name");
    new FieldSuggestion("nameSuggestions", 'name', /[^\s]/);

    new Field("look");
    new FieldSuggestion("lookSuggestions1", 'look', /^\s*[^\s,]+\s*/, 0);
    new FieldSuggestion("lookSuggestions2", 'look', /^[^,]*,\s*[^\s,]+/, 1);
    new FieldSuggestion("lookSuggestions3", 'look', /^[^,]*,[^,]*,\s*[^\s,]+/, 2);
    new FieldSuggestion("lookSuggestions4", 'look', /^[^,]*,[^,]*,[^,]*,\s*[^\s,]+/, 3);

    $.each([ "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma" ], function (index, stat) {
        var modifier = stat.substring(0, 3);
        new FieldRange(stat, 3, 18);
        new FieldBonus(modifier);
        new ModifierStat(modifier, stat)
    });

    new Field("classIcon");
    new Field("diceIcon");
    new Field("baseHp");
    new FieldInt("hpMaxValue");
    new ModifierAddField("hpMaxValue", "baseHp");
    new ModifierAddField("hpMaxValue", "constitution");

    new FieldDescriptionList("alignment", function (a, b) {
        var order = ['Lawful', 'Good', 'Neutral', 'Chaotic', 'Evil'];
        var aIndex = order.indexOf(a);
        var bIndex = order.indexOf(b);
        return cmp(aIndex, bIndex);
    });
    new FieldDescriptionList("race");
    new FieldUnorderedList("bonds");

    new FieldChoice("className", function () {
        return CustomPanel.prototype.all.get('Class').keys().sort();
    });

    new FieldStartingGear("startingGear");

    new FieldMoveChoice("startingMoveChoice", 1, undefined, "Choose one of these to start with:", "You also start with all of these:");
    new FieldMoveChoice("startingMoves", "Starting", undefined, undefined, undefined, "startingMoveLHS");
    new FieldMoveChoice("advancedMoves2nd", 2, 2, "You may take this move only if it is your first advancement.");
    new FieldMoveChoice("advancedMovesLower", 2, 10);
    new FieldMoveChoice("advancedMovesHigher", 6, 10);

    $(".editable").click(Field.clickEditable);

    var menu = new FloatingMenu('floatMenu');
    menu.addMenuItem("New character...", function () {
        Field.callAll(".field", Field.prototype.reset);
    });
    menu.addMenuItem("Load...");
    menu.addMenuItem("Save As...");
    menu.addMenuItem("Save to URL");

    menu.addMenuItem('<hr/>');

    var topPanel = new TopPanel();
    menu.addMenuItem("Edit Source Data...", function () {
        topPanel.showPanel();
    });

    $.extend({
        addSourceData: function addSourceData(data) {
            var panels = topPanel.buildSubPanelsFromJSON(data);
            $.each(panels, function (index, panel) {
                panel.compile(true);
            });
        }
    });

});
