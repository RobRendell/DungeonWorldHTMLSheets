
// ==================== Some utility methods ====================

(function ($) {
    $.fn.getCursorPosition = function() {
        var element = $(this).get(0);
        var pos = 0;
        if ('selectionStart' in element) {
            pos = element.selectionStart;
        } else if ('selection' in document) {
            element.focus();
            var selection = document.selection.createRange();
            var length = selection.text.length;
            selection.moveStart('character', -element.value.length);
            pos = selection.text.length - length;
        }
        return pos;
    }

    $.fn.setCursorPosition = function(pos) {
        var element = $(this).get(0);
        if ('setSelectionRange' in element) {
            element.setSelectionRange(pos, pos);
        } else if ('createTextRange' in element) {
            var range = element.createTextRange();
            range.collapse(true);
            if (pos < 0) {
                pos = $(element).val().length + pos;
            }
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    }

})(jQuery);

function extractSeparatedField(text, position, separator) {
    var depth = 0;
    var fieldStart = 0;
    for (var pos = 0; pos < text.length; ++pos) {
        if (text[pos] == '(') {
            depth++;
        } else if (text[pos] == ')') {
            depth--;
        } else if (depth == 0 && text[pos] == separator) {
            if (pos < position) {
                fieldStart = pos + 1;
            } else {
                return [text.substring(0, fieldStart), text.substring(fieldStart, pos), text.substring(pos)];
            }
        }
    }
    return [text.substring(0, fieldStart), text.substring(fieldStart), ''];
}

function multiAutocomplete(input, separator) {
    var originalSource = input.autocomplete('option', 'source');
    var cursorPos;
    input.autocomplete('option', 'source', function (request, response) {
        cursorPos = input.getCursorPosition();
        var fields = extractSeparatedField(request.term, cursorPos, separator);
        request.term = fields[1];
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
        cursorPos = input.getCursorPosition();
        var fields = extractSeparatedField(this.value, cursorPos, separator);
        // custom minLength
        return (fields[1].length >= 2);
    });
    input.on('autocompleteselect autocompletefocus', function (evt, ui) {
        if (ui && ui.item && (evt.type == 'autocompleteselect' || evt.keyCode)) {
            cursorPos = input.getCursorPosition();
            var fields = extractSeparatedField(this.value, cursorPos, separator);
            this.value = fields[0] + ui.item.value + fields[2];
            window.setTimeout(function () {
                input.setCursorPosition(cursorPos);
            }, 1);
            return false;
        }
    });
    input.autocomplete('widget').on('menublur', function (evt) {
        window.setTimeout(function () {
            input.setCursorPosition(cursorPos);
        }, 1);
    });
    input.keydown(function(evt) {
        if (evt.keyCode === $.ui.keyCode.TAB && $(this).data("ui-autocomplete").menu.active) {
            evt.preventDefault();
        }
    });

}

function cmp(a, b) {
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
        return item;
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
        return !isNaN(value) && isFinite(value);
    },

    apply: function apply(value) {
        value = parseInt(value);
        var sourceFieldValue = parseInt(this.sourceField.getValue());
        if (this.isNumeric(value) && this.isNumeric(sourceFieldValue)) {
            return value + sourceFieldValue;
        } else if (this.isNumeric(value)) {
            return value;
        } else if (this.isNumeric(sourceFieldValue)) {
            return sourceFieldValue;
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

    getSaveValue: function getSaveValue() {
        return this.getValue();
    },

    loadSavedValue: function loadSavedValue(value) {
        this.updateValue(value);
    },

    startEditing: function startEditing(target) {
        if (this.editing) {
            return;
        }
        if (!this.input) {
            this.input = this.renderEditing(target);
        }
        if (this.input) {
            this.resetInput(target);
            this.element.html(this.input);
            this.editing = true;
            this.input.focus();
            this.input.blur($.proxy(this.blurEditing, this));
            this.input.keydown($.proxy(this.checkFinishKey, this));
        }
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
        } else if ((evt.which == $.ui.keyCode.ENTER && this.input[0].tagName != 'TEXTAREA')
                || evt.which == $.ui.keyCode.TAB) {
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

Field.getAll = function (selector) {
    var result = [];
    var ids = {};
    $(selector).each(function(index, element) {
        var id = $(element).attr("id");
        var parent = $(element).parent();
        while (!id && parent) {
            id = parent.attr('id');
            parent = parent.parent();
        }
        var field = Field.getField(id);
        if (field && !ids[id]) {
            result.push(field);
            ids[id] = true;
        }
    });
    return result;
}

Field.callAll = function (selector, callback) {
    var fields = Field.getAll(selector);
    $.each(fields, function(index, field) {
        callback.call(field);
    });
}

Field.clickEditable = function (evt) {
    var id = $(this).attr("id");
    var target = $(evt.target);
    var parent = target.parent();
    while (!id && parent) {
        id = parent.attr('id');
        parent = parent.parent();
    }
    var field = Field.getField(id);
    if (field) {
        field.startEditing(target);
    }
}

Field.loadFields = function (data, first) {
    $.each(first, function (index, name) {
        var field = Field.getField(name);
        if (field && data[name] != field.getDefaultValue()) {
            field.loadSavedValue(data[name]);
        }
    });
    $.each(Object.keys(data), function (index, name) {
        if (first.indexOf(name) < 0) {
            var field = Field.getField(name);
            if (field && data[name] != field.getDefaultValue()) {
                field.loadSavedValue(data[name]);
            }
        }
    });
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
        value = parseInt(value);
        if (this.options.indexOf(value) >= 0) {
            this._super(value);
        }
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

    setKey: '_set',

    init: function init(name, sortFn, customOptionsFn) {
        this._super(name);
        this.sortFn = sortFn;
        this.customOptionsFn = customOptionsFn;
    },

    emptyValue: function emptyValue() {
        return new Hash();
    },

    renderField: function renderField() {
        this.element.empty();
        var keys = this.value.keys().sort(this.sortFn);
        var set = this.value.get(this.setKey);
        $.each(keys, $.proxy(function (index, key) {
            if (key != this.setKey) {
                var value = this.value.get(key);
                var dt = $('<dt/>').html(key).addClass('editable');
                if (key == set) {
                    dt.addClass('ticked');
                }
                this.element.append(dt);
                $('<dd/>').html(value).appendTo(this.element);
            }
        }, this));
        if (set instanceof Array) {
            $('<dt/>').html(set[0]).addClass('ticked editable custom').appendTo(this.element);
            $('<dd/>').html(set[1]).appendTo(this.element);
        }
    },

    renderEditing: function renderEditing(target) {
        if (target.is('.custom')) {
            return $('<input size="40"/>');
        } else {
            this.loadSavedValue(target.text());
            return null;
        }
    },

    resetInput: function resetInput(target) {
        var set = this.value.get(this.setKey);
        var currentValue = (set[0] && set[1]) ? set[0] + ': ' + set[1] : '';
        this.input.val(currentValue);
        var options = this.customOptionsFn();
        this.input.autocomplete({ source: options });
    },

    updateValue: function updateValue(value) {
        if (value instanceof Hash) {
            return this._super(value);
        } else {
            var newValue = value.split(': ');
            while (newValue.length < 2) {
                newValue.push('');
            }
            this.value.set(this.setKey, newValue);
            this.renderField();
            this.input = null;
        }
    },

    loadSavedValue: function loadSavedValue(value) {
        this.value.set(this.setKey, value);
        this.renderField();
    },

    getSaveValue: function getSaveValue() {
        return this.value.get(this.setKey);
    }

});

// -------------------- FieldUnorderedList is a field that contains elements of a UL --------------------

var FieldUnorderedList = Field.extend({

    init: function init(name, sortFn) {
        this._super(name);
        this.sortFn = sortFn;
        this.actualValues = [];
    },

    emptyValue: function emptyValue() {
        return [];
    },

    renderField: function renderField() {
        this.element = $('#' + this.name);
        this.element.empty();
        var values = this.value.sort(this.sortFn);
        $.each(values, $.proxy(function (index, value) {
            if (index < this.actualValues.length && this.actualValues[index]) {
                value = this.actualValues[index];
            }
            $('<li/>').html(value).addClass('editable').appendTo(this.element);
        }, this));
    },

    resetInput: function resetInput(target) {
        this.element = target;
        this.editingIndex = target.prevAll().length;
        this.input.val(target.text());
    },

    updateValue: function updateValue(value) {
        if (value instanceof Array) {
            this._super(value);
        } else {
            this.actualValues[this.editingIndex] = value;
            this.renderField();
        }
    },

    loadSavedValue: function loadSavedValue(value) {
        this.actualValues = value;
        this.renderField();
    },

    getSaveValue: function getSaveValue() {
        return this.actualValues;
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

    emptyValue: function emptyValue() {
        return [];
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
            var prerequisiteType = movePanel.data.get("prerequisiteType");
            var prerequisite = movePanel.data.get("prerequisite");
            if (prerequisiteType == 'Requires' || prerequisiteType == 'Replaces') {
                move = '<i>' + prerequisiteType + ': ' + prerequisite + '</i><br/>' + move;
            }
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
        if (this.element.is('.checklist')) {
            this.element.find('dt').addClass('editable');
        }
        this.element.find('.checklist li').addClass('editable');
        $.each(this.value, $.proxy(function (index, name) {
            var textVals = name.split('|')
            var dt = this.element.find(':contains("' + textVals[0] + '")');
            if (textVals.length == 1) {
                dt.addClass('ticked');
            } else if (textVals.length == 2) {
                var dd = dt.next();
                dd.find(':contains("' + textVals[1] + '")').addClass('ticked');
            }
        }, this));
    },

    renderEditing: function renderEditing(target) {
        var value = target.text();
        var enclosingDD = target.closest('dd');
        if (enclosingDD.length > 0) {
            var dt = enclosingDD.prev();
            value = dt.text() + '|' + value;
        }
        this.updateValue(value);
        return null;
    },

    updateValue: function updateValue(value) {
        if (value instanceof Array) {
            this._super(value);
        } else {
            var index = this.value.indexOf(value);
            if (index >= 0) {
                this.value.splice(index, 1);
            } else {
                this.value.push(value);
            }
            this.renderField();
        }
    }

});

// -------------------- FieldStartingGear is a field that displays starting gear --------------------

var FieldStartingGear = Field.extend({

    switchText: 'SwitchToOngoingGear',

    init: function init(name) {
        this._super(name);
        this.classField = Field.getField("className");
        this.classField.addDependentField(this);
        this.selected = new Hash();
    },

    renderField: function renderField() {
        this.element.empty();
        if (Field.getField('ongoingGear').getValue() && Field.getField('ongoingGear').getValue().length > 0) {
            $('#loadLabel').show();
            return;
        }
        var className = this.classField.getValue();
        var classPanel = CustomPanel.prototype.all.get('Class').get(className);
        var text = 'Your load is <span class="roll">' + classPanel.data.get('load') + '+Str</span>. You start with ' + classPanel.gearListToEnglish(classPanel.data.get('gear')) + '. ';
        var choices = [];
        classPanel.subPanels.each(function (key, panel) {
            if (panel.className == 'GearChoicePanel') {
                choices[parseInt(panel.data.get('order')) - 1] = panel;
            }
        });
        var finished = true;
        for (var index = 0; index < choices.length; ++index) {
            var panel = choices[index];
            text += panel.data.get('instructions') + ':';
            $('<div/>').html(text).appendTo(this.element);
            var selected = this.selected.get(text) || [];
            var selectionsRemaining = parseInt(panel.data.get('selections')) - selected.length;
            if (selectionsRemaining < 0) {
                selected.splice(0, -selectionsRemaining);
            } else if (selectionsRemaining > 0) {
                finished = false;
            }
            text = '';
            panel.subPanels.each($.proxy(function (key, subPanel) {
                var subPanelText = subPanel.data.get('gear');
                var english = classPanel.gearListToEnglish(subPanelText);
                var li = $('<li/>').html(english).addClass('editable');
                li.data('subPanelText', subPanelText);
                if (selected.indexOf(subPanelText) >= 0) {
                    li.addClass('ticked');
                }
                li.appendTo(this.element);
            }, this));
        }
        if (finished) {
            this.element.append($('<br/>'));
            var finishedDiv = $('<div/>').addClass('editable unprintable buttonLike').text('Switch to ongoing gear display.');
            finishedDiv.data('subPanelText', this.switchText);
            this.element.append(finishedDiv);
        }
        while (this.element.height() < 200) {
            this.element.append($('<br/>'));
        }
    },

    renderEditing: function renderEditing(target) {
        var text = target.data('subPanelText');
        if (text == this.switchText) {
            this.copyToOngoingGear();
        } else {
            var heading = target.prevAll('div').html();
            this.toggleSelection(heading, text);
        }
        this.renderField();
        return null;
    },

    toggleSelection: function toggleSelection(heading, selection) {
        if (!this.selected.contains(heading)) {
            this.selected.set(heading, []);
        }
        var selected = this.selected.get(heading);
        var index = selected.indexOf(selection);
        if (index >= 0) {
            selected.splice(index, 1);
        } else {
            selected.push(selection);
        }
    },

    loadSavedValue: function loadSavedValue(value) {
        this.selected = new Hash(value);
        this.renderField();
    },

    getSaveValue: function getSaveValue() {
        return this.selected.items;
    },

    copyToOngoingGear: function copyToOngoingGear() {
        var className = this.classField.getValue();
        var classPanel = CustomPanel.prototype.all.get('Class').get(className);
        var ongoingGear = Field.getField('ongoingGear');
        ongoingGear.updateValue(new Hash());
        ongoingGear.addGear(classPanel.data.get('gear').split(/\s*;\s*/));
        this.selected.each($.proxy(function (key, selections) {
            $.each(selections, $.proxy(function (index, gearList) {
                ongoingGear.addGear(gearList.split(/\s*;\s*/));
            }, this));
        }, this));
        ongoingGear.renderField();
    }

});

// -------------------- FieldOngoingGear is used to display gear once starting gear is selected --------------------

var FieldOngoingGear = Field.extend({

    numberRE: /^([1-9][0-9]*) (x +)?(.*)/,

    weightRE: /\(.*([1-9][0-9]*) weight/,

    renderEditing: function renderEditing() {
        return $("<textarea style='width: 190%' rows='10'/>");
    },

    resetInput: function resetInput() {
        var text = '';
        this.value.each(function (item, number) {
            if (number == 1) {
                text += item;
            } else {
                text += number + ' x ' + item;
            }
            text += '\n';
        });
        this.input.val(text);
        this.input.autocomplete({ source: function (request, response) {
           CharacterClassPanel.prototype.gearWithTags(request, response, true);
        }, appendTo: $('#advancedMovesTop') });
        multiAutocomplete(this.input, '\n');
    },

    inputField: function inputField(value) {
        this.value = new Hash();
        this.addGear(value.split(/\s*[\n\r]+\s*/));
        this._super(this.value);
    },

    renderField: function renderField() {
        this.element.empty();
        if (this.value.length == 0) {
            $('#loadLabel').hide();
            return;
        }
        var total = 0;
        this.value.each($.proxy(function (item, number) {
            if (number == 1) {
                $('<li/>').text(item).appendTo(this.element);
            } else {
                $('<li/>').html(number + ' &times; ' + item).appendTo(this.element);
            }
            var weight = this.getWeight(item);
            total += parseInt(weight * number);
        }, this));
        while (this.element.height() < 200) {
            this.element.append($('<br/>'));
        }
        this.element.append($('<div/>').text('Total weight carried: ' + total));
    },

    addGear: function addGear(gearList) {
        $.each(gearList, $.proxy(function (index, item) {
            var match = this.numberRE.exec(item);
            var number = 1;
            if (match) {
                number = parseInt(match[1]);
                item = match[3];
            }
            if (item) {
                if (this.value.contains(item)) {
                    this.value.set(item, number + this.value.get(item));
                } else {
                    this.value.set(item, number);
                }
            }
        }, this));
    },

    getWeight: function getWeight(item) {
        if (item == 'coins') {
            return 0.01;
        }
        var match = this.weightRE.exec(item);
        if (match) {
            return parseInt(match[1]);
        } else {
            return 0;
        }
    },

    updateValue: function updateValue(value) {
        if (!(value instanceof Hash)) {
            value = new Hash(value);
        }
        this._super(value);
    },

    getSaveValue: function getSaveValue() {
        return (this.value) ? this.value.items : null;
    },

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
    new FieldInt("armourValue");

    new FieldInt("level");
    new FieldInt("xp");

    new Field("alignmentHeading");
    var alignmentField = new FieldDescriptionList("alignment", function (a, b) {
        var order = ['Lawful', 'Good', 'Neutral', 'Chaotic', 'Evil'];
        var aIndex = order.indexOf(a);
        var bIndex = order.indexOf(b);
        if (aIndex > -1 || bIndex > -1) {
            return cmp(aIndex, bIndex);
        } else {
            return cmp(a, b);
        }
    }, function () {
        var result = [];
        CustomPanel.prototype.all.get('Alignment Move').each(function (index, panel) {
            result.push(panel.data.get('alignment') + ': ' + panel.data.get('move'));
        });
        return result.sort();
    });
    $('#addCustomAlignment').click($.proxy(function () {
        alignmentField.loadSavedValue(['Click to edit']);
        $('#addCustomAlignment').hide();
    }, this));

    new Field("raceHeading");
    new FieldDescriptionList("race");
    new Field("bondsHeading");
    new FieldUnorderedList("bonds");

    new FieldChoice("className", function () {
        return CustomPanel.prototype.all.get('Class').keys().sort();
    });

    new FieldInt("baseLoad");
    new FieldInt("loadField");
    new ModifierAddField("loadField", "baseLoad");
    new ModifierAddField("loadField", "str");
    new FieldStartingGear("startingGear");
    new FieldOngoingGear("ongoingGear");

    new FieldMoveChoice("startingMoveChoice", 1, undefined, "Choose one of these to start with:", "You also start with all of these:");
    new FieldMoveChoice("startingMoves", "Starting", undefined, undefined, undefined, "startingMoveLHS");
    new FieldMoveChoice("advancedMoves2nd", 2, 2, "You may take this move only if it is your first advancement.");
    new FieldMoveChoice("advancedMovesLower", 2, 10);
    new FieldMoveChoice("advancedMovesHigher", 6, 10);

    $(document).on('click', '.editable', Field.clickEditable);

    var topPanel = new TopPanel();

    var menu = new FloatingMenu('floatMenu');
    menu.addMenuItem("New character...", function () {
        // TODO Warn if unsaved data present
        Field.callAll(".field", Field.prototype.reset);
        // TODO should also reset custom data?
    });
    menu.addMenuItem("Load...", function () {
        // TODO Warn if unsaved data present
        var fileInput = $('<input type="file" />');
        fileInput.click();
        fileInput.change(function () {
            var file = fileInput[0].files[0];
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function (evt) {
                var saveData = JSON.parse(reader.result);
                Field.loadFields(saveData.fields, [ 'ongoingGear', 'className' ]);
                topPanel.setData(saveData.sourceData, true)
            };
        });
    });
    menu.addMenuItem("Save As...", function () {
        var fields = {};
        $.each(Field.getAll('.editable'), function (index, field) {
            fields[field.name] = field.getSaveValue();
        });
        var name = Field.getField('name').getValue() || 'character';
        var topPanelData = topPanel.getSaveData();
        var saveData = { fields: fields, sourceData: topPanelData[1] };
        var blob = new Blob([ JSON.stringify(saveData) ], { type: 'text/plain' });
        var url = window.URL.createObjectURL(blob);
        var downloadLink = $('<a/>').text('Download ready').attr({ 'href': url, 'download': name + '.txt' });
        $('.downloadLinkDiv').append(downloadLink);
        downloadLink.click(function () {
            downloadLink.remove();
            window.setTimeout(function () {
                window.URL.revokeObjectURL(url);
            }, 1);
        });
    }).append($('<div/>').addClass('downloadLinkDiv'));
    menu.addMenuItem('Hide unticked options', function () {
        $('.hideUnticked, .checklist li.editable, .checklist dt.editable, .checklist dt.editable + dd').hide();
        $('.showUnticked, .checklist li.editable.ticked, .checklist dt.editable.ticked, .checklist dt.editable.ticked + dd').show();
    }).addClass('hideUnticked');
    menu.addMenuItem('Show unticked options', function () {
        $('.showUnticked').hide();
        $('.hideUnticked, .checklist li.editable, .checklist dt.editable, .checklist dt.editable + dd').show();
    }).addClass('showUnticked').hide();
//    menu.addMenuItem("Save to URL");

    menu.addMenuItem('<hr/>');

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
