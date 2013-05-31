var BACKBONE_CALC = (function (calc) {
    var Symbol = function (keyDef) {
        if (typeof keyDef == 'object') {
            this.s = keyDef.s;
            this.action = keyDef.action;
        } else {
            this.s = keyDef;
        }
    };
    Symbol.prototype.action = function(event){
        var val = this.get('onDisplay');
        if (val === NaN || val === Infinity) {
            val = '';
        }
        if (this.startNewNumber) {
            this.startNewNumber = false;
            val = '';
        }
        this.set('onDisplay', val + event.target.innerHTML);
    };

    function emptyFn() {
        //default behaviour for = button, can be overriden when we press operation button
    }

    var OperationsModel = Backbone.Model.extend({
        Symbol: Symbol,
        defaults:{
            onDisplay: '',
            memory: '',
            consecutiveExecutions: 0,
            symbols: [
                ['1','2','3',
                    { s: 'C',
                        action: function(){
                            this.set('onDisplay', '');
                            this.set('memory', '');
                        }
                    }
                ],
                ['4','5','6'],
                ['7','8','9'],
                ['0', '.',
                    {s: '=',
                        action: function () {
                            this.attributes.consecutiveExecutions += 1;
                            this.execute();
                            return true;
                        }
                    }

                ],
                [
                    {s: '+',
                        action: function(){
                            this.execute = this.typicalBehaviour(function (f, s) {
                                return f+s;
                            });
                        }
                    },
                    {s: '-',
                        action: function(){
                            this.execute = this.typicalBehaviour(function (f, s, executionN) {
                                if (executionN>1) {
                                    return s-f;
                                }
                                return f-s;
                            });
                        }
                    },
                    {s: '*',
                        action: function(){
                            this.execute = this.typicalBehaviour(function (f, s) {
                                return f*s;
                            });

                        }
                    },
                    {s: '/',
                        action: function(){
                            this.execute = this.typicalBehaviour(function (f, s, executionN) {
                                if (executionN>1) {
                                    return s/f;
                                }
                                return f/s;
                            });

                        }
                    }
                ]
            ]
        },
        startNewNumber: false,
        typicalBehaviour: function (callback) {     // this function tries to emulate how typical calculator does execution and memory handling when user presses = button
            this.executeIfMemory();
            this.storeOnDisplayClearDisplay();
            var typicalComputation = function () {        // windows 7 calculator was used for reference
                var consecutive = this.get('consecutiveExecutions');
                var computation = function () {
                    this.set('onDisplay', callback(this.get('memory'),this.getNumber('onDisplay'), consecutive));
                };
                if (consecutive == 1) {
                    this.storeAndExecute(computation);
                } else {
                    computation.call(this);
                }
            };

            return typicalComputation;

        },
        storeOnDisplayClearDisplay: function () {
            this.set('memory', this.getNumber('onDisplay'));
            this.startNewNumber = true;
        },
        storeAndExecute: function (op) {
            var wasDisplayed = this.getNumber('onDisplay');
            op.call(this);
            this.set('memory', wasDisplayed);
        },
        getNumber: function (propName) {
            var v = this.get(propName);
            if (v === '') {
                return 0;
            }
            return parseFloat(v);
        },
        executeIfMemory: function () {
            if (this.get('memory')) {
                this.execute();
            }
        },
        execute: emptyFn,
        initialize: function(additionalSymbols){
            var symbols = this.attributes.symbols;
            var line;
            while (line = additionalSymbols.pop()) {
                symbols.push(line);
            }
            for (var i = 0; i < symbols.length; i++) {
                var line = symbols[i];
                for (var j = 0; j < line.length; j++) {
                    line[j] = new Symbol(line[j]);
                }
            }

        }
    });


    var displayView = Backbone.View.extend({
        el: $('#display'),
        initialize: function (model) {
            this.model = model;
            this.render();
            this.model.bind("change:onDisplay", this.render, this);// update this view whenever model changes
        },
        render: function(){
            var val = this.model.get('onDisplay');
            this.$el.html('<input type="text" value="' + val + '" class="field right span4 offset1" readonly style="text-align: right; margin-left: 20px">');

            return this;
        }
    });

    var keyboardView = Backbone.View.extend({
        el: $('#buttons'),
        initialize: function(model){
            this.model = model;
            this.render();
            this.listenTo(this.model, 'change:symbols', displayView.render);
        },
        render: function(){

            // Default numeric keys
            var symbols = this.model.attributes.symbols;

            for (var i = 0; i < symbols.length; i++) {
                var line = symbols[i];
                var rowEl = $('<div class="row">');
                this.$el.append(rowEl);
                for (var j = 0; j < line.length; j++) {
                    var symbol = line[j];
                    var btnElem = $('<button class="span1 btn">' + symbol.s + '</button>');

                    btnElem.bind('click', _.bind(function (symbol, event) {
                        var wasExec = symbol.action.call(this, event);
                        if (!wasExec) {
                            this.attributes.consecutiveExecutions = 0;
                        }
                    }, this.model, symbol));
                    rowEl.append(btnElem);
                }
            }

            return this;
        }
    });

    calc.init = function (addSymbols) {
        var opsModel = new OperationsModel(addSymbols);
        new displayView(opsModel);
        new keyboardView(opsModel);
    };
    return calc;
}(BACKBONE_CALC || {}));
