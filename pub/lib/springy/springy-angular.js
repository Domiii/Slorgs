/**
 * Angular-bindings for Springy.js
 */

(function(global, angular, undefined) {
	"use strict";
	if (!global.Springy) throw new Error('Springy not found. Make sure to initialize springy.js before springy-angular.js');

	angular.module('springyjs', [])

	/**
	 * springy-graph directive
	 */
	.directive('springyGraph', [function() {
		function preLink($scope, $element, $attrs, $ngModelCtrl) {
			$element.css({
				'position': 'relative'
			});


			// get graph settings
			var allGraphData = $ngModelCtrl.$modelValue || {};
			
			var stiffness = allGraphData.stiffness || 400.0;
			var repulsion = allGraphData.repulsion || 400.0;
			var damping = allGraphData.damping || 0.5;
			var minEnergyThreshold = allGraphData.minEnergyThreshold || 0.000001;
			var lowEnergyTickDelayMillis = allGraphData.lowEnergyTickDelayMillis || 500;

			// create new graph
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

					$scope.$digest();
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
	 * springy-graph-node directive
	 */
	.directive('springyGraphNode', [function() {
		function linkFun($scope, $element, $attrs, $ngModelCtrl) {
			console.assert($scope.graph, 'invalid `springy-graph-node` - must be placed inside `springy-graph` element');

			function doInit() {
				if (!$ngModelCtrl.$modelValue || $scope._node) return;
				
				var allNodeData = $ngModelCtrl.$modelValue = $ngModelCtrl.$modelValue || {};

				// add new node
				var nodeData = allNodeData.data = allNodeData.data || {};
				nodeData.$element = $element;

				$scope._node = new Springy.Node(allNodeData.id, nodeData);
				$scope.graph.addNode($scope._node);

				$element.css({
					'position': 'absolute'
				});

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
	 * springy-graph-edge directive
	 */
	.directive('springyGraphEdge', [function() {
		function linkFun($scope, $element, $attrs, $ngModelCtrl) {
			console.assert($scope.graph, 'invalid `springy-graph-edge` - must be placed inside `springy-graph` element');

			$scope.$watch($ngModelCtrl, function(val) {
				if (!$ngModelCtrl.$modelValue || $scope._edge) return;

				var edgeAllData = $ngModelCtrl.$modelValue = $ngModelCtrl.$modelValue;
				console.assert(edgeAllData && edgeAllData.from && edgeAllData.to, 
					'invalid  `springy-graph-edge` - must have `ng-model` attribute, containing at least `from` and `to` (node ids): ' + 
					JSON.stringify(edgeAllData));

				var edgeData = edgeAllData.data || {};
				var from = $scope.graph.getNode(edgeAllData.from);
				var to = $scope.graph.getNode(edgeAllData.to);
				if (!from || !to) {
					throw new Error('invalid  `springy-graph-edge` - invalid `from` or `to` node ids: ' + JSON.stringify(edgeAllData));
				}

				// TODO: Add jsPlumb!
				// see: http://jsfiddle.net/wGjDm/7/
				// see: http://jsfiddle.net/gXuS7/

				// draw arc element
				edgeData.$arcElement = $();

				// add new edge
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