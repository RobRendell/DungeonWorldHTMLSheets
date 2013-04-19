
// ==================== Floating menu ====================

var FloatingMenu = Class.extend({

    init: function (id) {
        this.id = id;
        this.element = $("#" + this.id);
        var item = $("<h3/>");
        item.text("Menu");
        this.element.append(item);
    },

    addMenuItem: function (text, callback) {
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

    init: function (enabled) {
        this.enabled = enabled;
    },

    getEnabled: function () {
        return this.enabled;
    },

    setField: function (field) {
        this.field = field;
        $.each(this.getDependents(), function (index, dependentField) {
            dependentField.addDependentField(field);
        });
    },

    getField: function () {
        return this.field;
    },

    apply: function (value) {
        return value;
    },

    getDependents: function () {
        return [];
    }

});

// -------------------- StatModifier calculates the modifier for a Dungeon World stat --------------------

var StatModifier = Modifier.extend({

    init: function(stat) {
        this._super(true);
        this.statField = Field.getField(stat);
    },

    getDependents: function () {
        return [ this.statField ];
    },

    apply: function (value) {
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
    }

});

// ==================== A Field is a (possibly editable) value displayed on the sheet ====================

var Field = Class.extend({

    all: {},

    init: function (name) {
        this.name = name;
        this.element = $("#" + name);
        this.defaultValue = (this.element) ? this.element.text() : undefined;
        this.value = this.defaultValue;
        this.baseValue = this.defaultValue;
        this.all[name] = this;
        this.dependentFields = [];
        this.modifiers = [];
        this.editing = false;
    },

    getValue: function() {
        return this.value;
    },

    startEditing: function () {
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

    renderEditing: function () {
        return $("<input type='text'/>");
    },

    resetInput: function () {
        this.input.val(this.baseValue);
    },

    blurEditing: function () {
        this.inputField(this.getInputValue());
    },

    checkFinishKey: function (eventObject) {
        if (eventObject.which == KeyEvent.DOM_VK_ESCAPE) {
            this.renderField();
            this.editing = false;
        } else if (eventObject.which == KeyEvent.DOM_VK_RETURN) {
            this.inputField(this.getInputValue());
        } else {
            return undefined;
        }
        return true;
    },

    getInputValue: function () {
        return this.input.val();
    },

    inputField: function (value) {
        this.editing = false;
        this.updateValue(value);
    },

    addModifier: function (modifier) {
        modifier.setField(this);
        this.modifiers.push(modifier);
    },

    addDependentField: function (field) {
        this.dependentFields.push(field);
    },

    updateValue: function (value) {
        this.baseValue = value;
        this.value = value;
        this.applyModifiers();
        this.renderField();
        this.recalculateDependentFields();
    },

    applyModifiers: function () {
        for (var index = 0; index < this.modifiers.length; ++index) {
            var modifier = this.modifiers[index];
            if (modifier.getEnabled()) {
                this.value = modifier.apply(this.value);
            }
        }
    },

    renderField: function () {
        this.element.html(this.value);
    },

    recalculateDependentFields: function () {
        $.each(this.dependentFields, function (index, dependentField) {
            dependentField.recalculate();
        });
    },

    recalculate: function () {
        this.updateValue(this.baseValue);
    },

    reset: function () {
        this.value = this.defaultValue;
        this.baseValue = this.defaultValue;
        this.element.html(this.value);
    }

});

Field.getField = function (name) {
    return Field.prototype.all[name];
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

Field.click = function () {
    var id = $(this).attr("id");
    var field = Field.getField(id);
    if (field) {
        field.startEditing();
    }
}

// -------------------- FieldInt holds an integer value --------------------

var FieldInt = Field.extend({

    updateValue: function (value) {
        this._super(parseInt(value) || 0);
    }

});

// -------------------- FieldBonus always displays a sign (plus or minus) --------------------

var FieldBonus = FieldInt.extend({

    renderField: function () {
        if (this.value < 0) {
            this.element.html(this.value);
        } else {
            this.element.html("+" + this.value);
        }
    }

});

// -------------------- FieldChoice allows selection from a drop-down list --------------------

var FieldChoice = Field.extend({

    init: function (id, options) {
        this._super(id);
        this.options = options;
    },

    getOptions: function () {
        return this.options;
    },

    renderEditing: function() {
        return $("<select/>");
    },

    resetInput: function () {
        this.input.html("");
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

    init: function (id, min, max) {
        var options = [];
        for (var count = min; count <= max; ++count) {
            options.push(count);
        }
        this._super(id, options);
    },

    updateValue: function (value) {
        this._super(parseInt(value));
    }

});

// ==================== Initialise everything ====================

function addStat(name, modifier) {
    new FieldRange(name, 3, 18);
    new FieldBonus(modifier).addModifier(new StatModifier(name));
}

$(document).ready(function () {

    new Field("name");
    addStat("strength", "str");
    addStat("dexterity", "dex");
    addStat("constitution", "con");
    addStat("intelligence", "int");
    addStat("wisdom", "wis");
    addStat("charisma", "cha");

    new FieldChoice("className", [ "Bard", "Cleric", "Not really" ]);

    $(".editable").click(Field.click);

    var menu = new FloatingMenu('floatMenu');
    menu.addMenuItem("New character...", function () {
        Field.callAll(".field", Field.prototype.reset);
    });
    menu.addMenuItem("Load...");
    menu.addMenuItem("Save As...");
    menu.addMenuItem("Save to URL");

    menu.addMenuItem('<hr/>');

});
