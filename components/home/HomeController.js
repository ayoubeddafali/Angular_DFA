app.controller('HomeController',
    function($scope, $timeout) {

        var NFA = null,
            NFAVisual = null,
            DFAVisual = null,
            converter = new Converter(),
            converting = false;

        $scope.nfaInput = ' ';

        $scope.initializeNFA = function() {
            var width = $('#NFA').innerWidth(),
                height = $('#NFA').parent().innerHeight();
            NFAVisual = new ForceGraph('#NFA', width, height);

            NFA = new FSA();
            converter.nfa = NFA;

            $scope.sampleNFA1();
            syncNFA();
        }

        $scope.initializeDFA = function() {
            var width = $('#DFA').innerWidth(),
                height = $('#DFA').parent().innerHeight();

            DFAVisual = new ForceGraph('#DFA', width, height);
            DFAVisual.forceRenderSpeed = 100;
            DFAVisual.nodeRadius = 20;
            syncDFA();
        }

        function syncNFA() {
            var i, j, key, reachableStates, visualStates = NFAVisual.getNodes(),
                visualTransitions = NFAVisual.getLinks(),
                tmp, alphabet;

            NFA.states = [];
            for (i = 0; i < visualStates.length; i++) {
                NFA.states.push(visualStates[i].id);
            }
            
            NFA.transitions.clear();
            for (i = 0; i < visualTransitions.length; i++) {
                var sourceState = (visualTransitions[i].id.split('-'))[0],
                    targetState = (visualTransitions[i].id.split('-'))[1],
                    symbols = (visualTransitions[i].label.split(','));

                for (j = 0; j < symbols.length; j++) {
                    key = [sourceState, symbols[j]].join('-');
                    reachableStates = NFA.transitions.find(key);
                    if (!reachableStates) {
                        NFA.transitions.put(key, [targetState]);
                    } else {
                        NFA.transitions.put(key, reachableStates.concat(targetState).sort())
                    }
                }
            }
            
            alphabet = new Map();
            for (i = 0; i < visualTransitions.length; i++) {
                tmp = visualTransitions[i].label;
                if (tmp === 'E') continue;
                tmp = tmp.replace(',E', '').replace('E,', '');
                tmp = tmp.split(',').sort();
                alphabet.putArray(tmp);
            }
            NFA.alphabet = alphabet.toArray().sort();
            // Clear and specify the start states.
            d3.selectAll('.start').each(function(d, i) {
                NFA.startState = d.id;
            });
            // Clear and specifcy the accept states.
            NFA.acceptStates = [];
            d3.selectAll('.accept').each(function(d, i) {
                NFA.acceptStates.push(d.id);
            });

            $scope.updateNFAInput();
        }
        
        function syncDFA() {
            if (converter.dfa === null || converter.dfa === undefined) return;

            var i, tmp, label, visualStates = new Map(),
                visualTransitions = new Map(),
                cols = 2,
                rows, xDist, yDist, id, lastTransition;

            if (DFAVisual.width > 500) cols = 4;
            else if (DFAVisual.width > 200) cols = 3;

            rows = Math.floor(converter.dfa.states.length / cols);
            xDist = Math.floor(DFAVisual.width / cols);
            yDist = Math.floor(DFAVisual.height / (rows)),
            xPad = 100,
            yPad = 4 * DFAVisual.nodeRadius;

            console.log(yPad);

            visualStates.putArray(DFAVisual.getNodes(), 'id');
            for (i = 0; i < converter.dfa.states.length; i++) {
                var label = converter.dfa.states[i],
                    state = visualStates.find(label);
                if (!state) {
                    var x = xDist * (i % cols) + xPad,
                        y = yDist * Math.floor(i / cols) + yPad;
                    visualStates.put(label, label);
                    DFAVisual.addNode(label, x, y);
                }
            }

            visualTransitions.putArray(DFAVisual.getLinks(), 'id');
            tmp = converter.dfa.transitions.contents;
            for (var k in tmp) {
                var source = k.split('-')[0],
                    label = k.split('-')[1],
                    target = tmp[k],
                    id = [source, target].join('-'),
                    transition = visualTransitions.find(id);

                DFAVisual.addLink(label, source, target);
            }

            //Set DFAVisual start state
            if (converter.dfa.startState !== undefined) {
                id = '#DFA-N' + converter.dfa.startState.replace(',', '_');
                d3.select(id).classed('start', true);
            }

            //Set DFAVisual accept state
            if (converter.dfa.acceptStates !== undefined) {
                tmp = converter.dfa.acceptStates;
                for (i = 0; i < tmp.length; i++) {
                    id = '#DFA-N' + tmp[i].replace(/,/g, '_');
                    d3.select(id).classed('accept', true);
                }
            }

            //Add 'last-added' class to the last element in the links array
            tmp = DFAVisual.getLinks();
            if (tmp.length > 0) {
                lastTransition = tmp[tmp.length - 1];
                id = '#' + lastTransition.elementId;
                d3.select('.last').classed('last', false);
                d3.select(id).classed('last', true);
            }
        }

        /**
         * prompts the user for a name for this state and calls
         * addNode for the NFAVisual object.
         */
        $scope.addState = function() {
            var id = '';
            while (id.trim().length === 0 || id.trim().length > 3) {
                id = prompt('Nom d\'etat (max 3 caracters)', '');
            }
            if (id === null) return;
            NFAVisual.addNode(id);
            syncNFA();
        }

        $scope.addTransition = function() {
            var symbols = '',
                source = '',
                target = '';
            while (symbols.trim().length === 0) {
                symbols = prompt('Les symboles (separés par des virgule)', '');
            }
            while (source.trim().length === 0) {
                source = prompt('Etat source', '');
            }
            while (target.trim().length === 0) {
                target = prompt('Etat destination', '');
            }

            NFAVisual.addLink(symbols, source, target);
            syncNFA();
        }

        $scope.deleteSelected = function() {
            d3.selectAll('.selected').each(function(d) {
                NFAVisual.removeNode(d.id);
            });
            syncNFA();
        }

        $scope.setStartState = function() {
            NFAVisual.toggleClass('.selected', 'start', false);
            var id = d3.select('.selected.start').attr('id').replace('NFA-N', '');

            NFAVisual.toggleClass('.selected.start', 'selected', false);
            NFAVisual.setNodeProperty(id, 'fixedPosition', {
                'x': NFAVisual.nodeRadius * 4,
                'y': NFAVisual.nodeRadius * 4
            });
            syncNFA();
        }

        $scope.setAcceptStates = function() {
            NFAVisual.toggleClass('.selected', 'accept', true);
            NFAVisual.toggleClass('.selected.accept', 'selected', true);
            syncNFA();
        }

        $scope.reset = function() {
            NFAVisual.reset();
            if (DFAVisual !== null) {
              DFAVisual.reset();
              converter.reset();
            }
            syncNFA();
        }

        /**
         * steps forward in the conversion from NFA to DFA.
         */
        $scope.stepForward = function() {
            converter.stepForward();
            syncDFA();
        }

        /**
         * runs the complete conversion once through
         */
        $scope.completeConversion = function() {
            while (converter.stepForward());
            console.log('resulting dfa', converter.dfa);
            syncDFA();

        }

        $scope.updateNFAInput = function() {
            var userNFA = {
                states: [],
                transitions: [],
                start: '',
                accept: []
            }, tmp, i;

            tmp = NFAVisual.getNodes();
            for (i = 0; i < tmp.length; i++) {
                userNFA.states.push(tmp[i].label);
            }

            tmp = NFAVisual.getLinks();
            for (i = 0; i < tmp.length; i++) {
                userNFA.transitions.push({
                    symbol: tmp[i].label,
                    source: tmp[i].source.label,
                    target: tmp[i].target.label
                });
            }

            userNFA.start = NFA.startState;
            tmp = NFA.acceptStates;
            for (i = 0; i < tmp.length; i++) {
                userNFA.accept.push(tmp[i]);
            }

            this.nfaInput = JSON.stringify(userNFA, null, 2);
        }

        /**
         * Parse the JSON NFA input and reflect the changes
         * in NFAVisual
         */
        $scope.parseNFAInput = function() {
            var userNFA = JSON.parse(this.nfaInput),
                tmp, i, id;
            // Add the nodes
            tmp = userNFA.states;
            for(i = 0; i < tmp.length; i++) {
                NFAVisual.addNode(tmp[i]);
            }
            // Add the links
            tmp = userNFA.transitions;
            for(i = 0; i < tmp.length; i++) {
                NFAVisual.addLink(tmp[i].symbol, tmp[i].source, tmp[i].target);
            }
            // Set the start state
            d3.selectAll('.start').each(function(d) {
                d3.select(d.elementId).classed('start', false);
            })
            id = '#NFA-N' + userNFA.start;
            d3.select(id).classed('selected', true);
            $scope.setStartState();
            // Set the accept states
            tmp = userNFA.accept;
            for(i = 0; i < tmp.length; i++) {
                id = '#NFA-N' + tmp[i];
                d3.select(id).classed('accept', true);
            }
            $scope.setAcceptStates();
            syncNFA();
        }

        $scope.sampleNFA1 = function() {
            $scope.reset();
            //add the sample NFA states
            NFAVisual.addNode('1');
            NFAVisual.addNode('2');
            NFAVisual.addNode('3');

            //add the sample NFA transitions
            NFAVisual.addLink('E', '1', '3');
            NFAVisual.addLink('a,b', '2', '3');
            NFAVisual.addLink('a', '3', '1');
            NFAVisual.addLink('a', '2', '2');
            NFAVisual.addLink('b', '1', '2');

            d3.select('#NFA-N1').classed('selected', true);
            $scope.setStartState();
            d3.select('#NFA-N1').classed('selected', true);
            $scope.setAcceptStates();
        }

        $scope.sampleNFA2 = function() {
            $scope.reset();
            


            NFAVisual.addNode('1');
            NFAVisual.addNode('2');
            NFAVisual.addNode('3');

            NFAVisual.addLink('E', '1', '2');
            NFAVisual.addLink('a', '1', '3');
            NFAVisual.addLink('a,b', '3', '2');

            d3.select('#NFA-N1').classed('selected', true);
            $scope.setStartState();
            d3.select('#NFA-N2').classed('selected', true);
            $scope.setAcceptStates();
        }

        $scope.sampleNFA3 = function() {
            $scope.reset();
            var i;
            for (i = 0; i < 6; i++) {
                NFAVisual.addNode(i.toString());
            }
            for (i = 0; i < 5; i++) {
                NFAVisual.addLink(i.toString(), i.toString(), (i + 1).toString());
            }
            d3.select('#NFA-N0').classed('selected', true);
            $scope.setStartState();
            d3.select('#NFA-N5').classed('selected', true);
            $scope.setAcceptStates();
        }

    });
