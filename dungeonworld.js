
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

var StatModifier = Modifier.extend({

    init: function(stat, enabled) {
        this._super(enabled);
        this.statField = getField(stat);
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
        this.value = (this.element) ? this.element.text() : undefined;
        this.baseValue = this.value;
        this.all[name] = this;
        this.dependentFields = [];
        this.modifiers = [];
    },

    getValue: function() {
        return this.value;
    },

    startEditing: function () {
        if (!this.input) {
            this.input = this.renderEditing();
        } else {
            this.resetInput();
        }
        this.element.html(this.input);
        this.input.focus();
        this.input.blur($.proxy(this.blurEditing, this));
        this.input.keydown($.proxy(this.checkFinishKey, this));
    },

    renderEditing: function () {
        var result = $("<input type='text'/>");
        result.val(this.baseValue);
        return result;
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
    }

});

var IntField = Field.extend({

    init: function (name) {
        this._super(name);
        this.value = parseInt(this.value) || 0;
    },

    updateValue: function (value) {
        this._super(parseInt(value) || 0);
    }

});

var BonusField = IntField.extend({

    renderField: function () {
        if (this.value < 0) {
            this.element.html(this.value);
        } else {
            this.element.html("+" + this.value);
        }
    }

});

function getField(name) {
    return Field.prototype.all[name];
}

// ==================== Initialise everything ====================

function addStat(name, modifier) {
    new IntField(name);
    new BonusField(modifier).addModifier(new StatModifier(name, true));
}

$(document).ready(function () {

    new Field("name");
    addStat("strength", "str");
    addStat("dexterity", "dex");
    addStat("constitution", "con");
    addStat("intelligence", "int");
    addStat("wisdom", "wis");
    addStat("charisma", "cha");

    $(".editable").click(function() {
        var id = $(this).attr("id");
        var field = getField(id);
        if (field) {
            field.startEditing();
        }
    });

});
