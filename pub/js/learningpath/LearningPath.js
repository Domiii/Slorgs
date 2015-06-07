/**
 * Directives for responsive, editable graphs
 */

(function(global, angular, undefined) {
	"use strict";
	if (!global.Springy) throw new Error('Springy not found. Make sure to initialize springy.js before learningpaths.js');
	if (!global.jsPlumb) throw new Error('jsPlumb not found. Make sure to initialize jsPlumb before learningpaths.js');

	angular.module('learningpaths', [])


	/**
	 * learningpath directive
	 */
	.directive('learningpath', [function() {
		function preLink($scope, $element, $attrs, $ngModelCtrl) {
			$element.addClass('learningpath');


			// get graph settings
			var allGraphData = $ngModelCtrl.$modelValue || {};
			
			var stiffness = allGraphData.stiffness || 400.0;
			var repulsion = allGraphData.repulsion || 400.0;
			var damping = allGraphData.damping || 0.5;
			var minEnergyThreshold = allGraphData.minEnergyThreshold || 0.0001;
			var lowEnergyTickDelayMillis = allGraphData.lowEnergyTickDelayMillis || 500;


			// ##########################################################################################
			// create new jsPlumb instance

			// see basic fiddle: http://jsfiddle.net/xkvzgj82/
		    var plumbInstance = $scope._plumbInstance = jsPlumb.getInstance({
		        // default drag options
		        DragOptions: { cursor: 'pointer', zIndex: 2000 },

		        // the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
		        // case it returns the 'labelText' member that we set on each connection in the 'init' method below.
		        ConnectionOverlays: [
		            [ "Arrow", { location: 1 } ],
		            [ "Label", {
		                location: 0.1,
		                id: "label",
		                cssClass: "aLabel"
		            }]
		        ],
		        Container: $element,
		    });

		    // need to set css classes after ctor (bug in API)
		    plumbInstance.connectorClass = 'learningpath-connector';
		    plumbInstance.endpointClass = 'learningpath-endpoint';
		    plumbInstance.endpointFullClass = 'learningpath-endpoint-full';
		    plumbInstance.overlayClass = 'learningpath-overlay';

			var basicType = {
		        connector:"StateMachine",
		        paintStyle:{lineWidth:3,strokeStyle:"#056"},
		        hoverPaintStyle:{strokeStyle:"#dbe300"},
		        endpoint:"Blank",
		        anchor:"Continuous",
		        overlays:[ ["PlainArrow", {location:1, width:15, length:12} ]]
		    };

	        plumbInstance.registerConnectionType("basic", basicType);


			// ##########################################################################################
			// create springy instance

			var graph = allGraphData.graph = $scope.graph = new Springy.Graph();

            // create layout
			var layout = allGraphData.layout = $scope.layout = new Springy.Layout.ForceDirected(
				graph, stiffness, repulsion, damping, minEnergyThreshold, lowEnergyTickDelayMillis);

			// convert to/from screen coordinates
			var toScreen = function(p) {
				var currentBB = layout.getBoundingBox();
				var w = $element.width();
				var h = $element.height();

				var size = currentBB.topright.subtract(currentBB.bottomleft);
				var sx = p.subtract(currentBB.bottomleft).divide(size.x).x * w;
				var sy = p.subtract(currentBB.bottomleft).divide(size.y).y * h;

				return new Springy.Vector(sx, sy);
			};

			var fromScreen = function(s) {
				var currentBB = layout.getBoundingBox();
				var w = $element.width();
				var h = $element.height();

				var size = currentBB.topright.subtract(currentBB.bottomleft);
				var px = (s.x / w) * size.x + currentBB.bottomleft.x;
				var py = (s.y / h) * size.y + currentBB.bottomleft.y;

				return new Springy.Vector(px, py);
			};

			// create renderer
			var renderer = allGraphData.renderer = $scope.renderer = new Springy.Renderer(layout,
				function clear() {
				},

				function drawEdge(edge, p1, p2) {
					var s1 = toScreen(p1);
					var s2 = toScreen(p2);

					// update arc info
					var $arcEl = edge.data.$element;
				},

				function drawNode(node, p) {
					var s = toScreen(p);

					// update node position
					var $nodeEl = node.data.$element;
					var w = $nodeEl.outerWidth();
					var h = $nodeEl.outerHeight();
					$nodeEl.css({
						left: s.x - w/2,
						top: s.y - h/2,
					});
				},{
					onAfterRender: function() {
						$scope._plumbInstance.repaintEverything();
						$scope.$digest();
					}
				}
			);

			renderer.start();

			// update allGraphData model
            $ngModelCtrl.$setViewValue(allGraphData);
            $ngModelCtrl.$render();

            // for some reason, need to $apply before changes become visible on the outside
            setTimeout(function() {
            	$scope.$apply();
            })
		}

		function postLink($scope, $element, $attrs, $ngModelCtrl) {
		}

		// see: http://jasonmore.net/angular-js-directives-difference-controller-link/
      	return {
  			restrict: 'A',
      		link: {
      			pre: preLink,
      			post: postLink
      		},
      		replace: true,
            require:'ngModel',
            //scope: true
      	};
    }])


	/**
	 * learningpath-node directive
	 */
	.directive('learningpathNode', [function() {
		function linkFun($scope, $element, $attrs, $ngModelCtrl) {
			console.assert($scope.graph, 'invalid `learningpath-node` - must be placed inside `learningpath` element');

			function doInit() {
				if (!$ngModelCtrl.$modelValue || $scope._node) return;
				
				var allNodeData = $ngModelCtrl.$modelValue = $ngModelCtrl.$modelValue || {};

				// add new node
				var id = $element.attr('id');
				if (!id) {
					throw new Error('invalid `learningpath-node` - does not have an id set');
				}

				var nodeData = allNodeData.data = allNodeData.data || {};
				nodeData.$element = $element;

				$scope._node = new Springy.Node(id, nodeData);
				$scope.graph.addNode($scope._node);

				// TODO: Check if element source information is ignored in `makeSource`!
			    $scope._plumbInstance.makeSource($element, {
				    anchor:['Continuous', { faces:[ "bottom" ] } ]
				});

			    $scope._plumbInstance.makeTarget($element, {
				    anchor:['Continuous', { faces:[ "top" ] } ]
				});

				$element.addClass('learningpath-node');

				$scope.$on('destroy', function() {
					// remove node
					$scope.graph.removeNode($scope._node);
				});
			}

			$scope.$watch($ngModelCtrl, doInit);
		}

      	return {
  			restrict: 'A',
      		link: linkFun,
            require: 'ngModel',
      		replace: false
      	};
    }])


	/**
	 * learningpath-edge directive
	 */
	.directive('learningpathEdge', [function() {
		function linkFun($scope, $element, $attrs, $ngModelCtrl) {
			console.assert($scope.graph, 'invalid `learningpath-edge` - must be placed inside `learningpath` element');

			$scope.$watch($ngModelCtrl, function(val) {
				if (!$ngModelCtrl.$modelValue || $scope._edge) return;

				var edgeAllData = $ngModelCtrl.$modelValue = $ngModelCtrl.$modelValue;
				console.assert(edgeAllData && edgeAllData.from && edgeAllData.to, 
					'invalid  `learningpath-edge` - must have `ng-model` attribute, containing at least `from` and `to` (node ids): ' + 
					JSON.stringify(edgeAllData));

				var edgeData = edgeAllData.data || {};
				var from = $scope.graph.getNode(edgeAllData.from.toString());
				var to = $scope.graph.getNode(edgeAllData.to.toString());

				if (!from || !to) {
					throw new Error('invalid  `learningpath-edge` - invalid `from` or `to` node ids: ' + JSON.stringify(edgeAllData));
				}

				// TODO: Restrict anchors to "bottom-to-top" only
				// see: https://jsplumbtoolkit.com/demo/dynamicAnchors/demo.js

				$scope._plumbInstance.connect({
					//source: edgeAllData.from.toString(),
					source: from.data.$element,
					target: to.data.$element,
					type: 'basic'
				});

				// TODO: Add jsPlumb!
				// see: http://jsfiddle.net/wGjDm/7/
				// see: http://jsfiddle.net/gXuS7/

				// add new springy edge
				$scope._edge = $scope.graph.newEdge(from, to, edgeData);

				$scope.$on('destroy', function() {
					// remove node
					$scope._graph.removeEdge($scope._edge);
				});
			});
		}

      	return {
  			restrict: 'EA',
      		link: linkFun,
            require:'ngModel',
      		replace: false
      	};
    }]);


})(this, angular);