var Hash = Class.extend({

    init: function init(sourceObj) {
        this.length = 0;
        this.items = {};
        if (sourceObj instanceof Array) {
            throw 'Initialising hash from array is not supported';
        } else if (sourceObj instanceof Hash) {
            sourceObj.each($.proxy(function (key, value) {
                this.items[key] = value;
                this.length++;
            }, this));
        } else if (sourceObj) {
            $.each(sourceObj, $.proxy(function (key, value) {
                if (sourceObj.hasOwnProperty(key)) {
                    this.items[key] = value;
                    this.length++;
                }
            }, this));
        }
    },

    set: function set(key, value) {
        var previous = undefined;
        if (this.contains(key)) {
            previous = this.items[key];
        } else {
            this.length++;
        }
        this.items[key] = value;
        return previous;
    },

    contains: function contains(key) {
        return this.items.hasOwnProperty(key);
    },

    get: function get(key) {
        return this.contains(key) ? this.items[key] : undefined;
    },

    remove: function remove(key)
    {
        var previous = undefined;
        if (this.contains(key)) {
            previous = this.items[key];
            this.length--;
            delete(this.items[key]);
        }
        return previous;
    },

    clear: function clear()
    {
        this.items = {}
        this.length = 0;
    },

    keys: function keys() {
        var keys = [];
        for (var key in this.items) {
            if (this.contains(key)) {
                keys.push(key);
            }
        }
        return keys;
    },

    values: function values() {
        var values = [];
        for (var key in this.items) {
            if (this.contains(key)) {
                values.push(this.items[key]);
            }
        }
        return values;
    },

    each: function each(callback) {
        for (var key in this.items) {
            if (this.contains(key)) {
                callback(key, this.items[key]);
            }
        }
    }

});
