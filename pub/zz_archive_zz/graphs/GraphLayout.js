/*jslint node: true */
"use strict";

// Implementation of the dot graph layout algorithm for directed graphs with a single root.
// TODO: Fully add Google Closure - compatbile annotation.
// See: https://developers.google.com/closure/compiler/docs/js-for-compiler



// ####################################################################################################
// Misc graph methods


/**
 * Graph ctor.
 *
 * @constructor
 * @param {data} is explained below.
 * 
 * data: { layout, nodes, arcs, narccount }
 *
 * implicit properties:
 *  Graph is DAG with single root
 *  rank dimension = vertical (we call it y)
 *  sibling dimension = horizontal (we call it x)
 *
 * layout properties:
 *  arcMinLength = min length of an arc (usually 1)
 *  nodeSizeMax.x = max node width
 *  nodeSizeMax.y = max node height
 *  separation.x & separation.y = space between nodes
 *
 * node properties:
 *  nodeid, name, htmlInfo
 * 
 * arc properties:
 *  arcid, from, to, weight
 *
 * new per-node properties: 
 *  node.rank = rank of node (y)
 *  node.inRankPos = in-rank position of node (x)
 *  node.size.x & node.size.y = size of node
 */ 
function Graph(data) {
    data.clone(this, false);               // shallow-copy all properties from data to this
    this.virtualData = null;
    this.Root = this.nodes[0];
    
    // determine correct index of each node and create empty parent & child lists
    // also make sure to keep indexing dense by mapping nodeid to nodeindex
    var nodeIdToIndex = {};
    var nNodes = this.nodes.length;
    for (var i = 0; i < nNodes; ++i) {
        var node = this.nodes[i];
        node.nodeindex = i;
        node.arcsIn = [];
        node.arcsOut = [];
        nodeIdToIndex[node.nodeid] = i;
    }
    
    // fill all parent and child lists
    var nArcs = this.arcs.length;
    for (var i = 0; i < nArcs; ++i) {
        var arc = this.arcs[i];
        arc.arcindex = i;
        
        // get nodes and fix indices
        var fromIdx = nodeIdToIndex[arc.from];
        var toIdx = nodeIdToIndex[arc.to];
        var fromNode = this.nodes[fromIdx];
        var toNode = this.nodes[toIdx];
        arc.from = fromIdx;
        arc.to = toIdx;
        
        // add arcs to nodes
        fromNode.arcsOut.push(arc);
        toNode.arcsIn.push(arc);
    }
}


/**
 * The length of an arc is the distance in ranks between it's ndoes.
 *
 * @param arc The arc.
 */
Graph.prototype.arcGetLen = function(arc) {
    var fromNode = this.nodes[arc.from];
    var toNode = this.nodes[arc.to];
    return toNode.rank - fromNode.rank;
};

/**
 * The slack is (arc length) - (min length). The min length is usually 1.
 *
 * @param arc The arc.
 */
Graph.prototype.arcGetSlack = function(arc) {
    var arcLen = this.getArcLen(arc);
    return arcLen - this.layout.arcMinLength;
};

/**
 * @param {number} nodeid The id of the node to be obtained.
 */
Graph.prototype.nodeGet = function(nodeid) {
    return this.nodes[nodeid];
};


/**
 * Adds a new node to the given parent.
 * @param parent The parent of the new node.
 * @param {number} newWeight The weight of the new arc from parent to new child.
 * @param {number} newArcId The arc id, corresponding to an actual backend object.
 */
Graph.prototype.addNode = function(parent, newWeight, newArcId) {
    var newIdx = this.nodes.length;
    
    // create new child node 
    var newNode = {
        nodeid : -1,                // does not actually exist in the DB
        nodeindex : newIdx,
        rank : fromNode.rank,
        name : "virtual",
        arcsIn : [],
        arcsOut : []
    };
    
    // add new node and arc to graph
    this.nodes[newIdx] = newNode;
    this.addArc(fromNode, newNode, newWeight, newArcId);
    
    return newNode;
};

/**
 * Adds a new arc to this DAG.
 *
 * @param from The starting node of the arc.
 * @param to The goal node of the arc.
 * @param {number} weight The weight of the new arc.
 */
Graph.prototype.addArc = function(fromNode, toNode, weight, newArcId) {
    var newArcIdx = this.arcs.length;
    
    // create arc from parent to new child
    var newArc = {
      arcid : newArcId,
      arcindex : newArcIdx,
      from : fromNode.nodeindex,
      to : toNode.nodeindex,
      weight : newWeight
    };
    
    this.arcs[newArcIdx] = newArc;
    fromNode.arcsOut.push(newArc);
    toNode.arcsIn.push(newArc);
    return newArc;
};

// ####################################################################################################
// Directed graph layout algorithm

/**
 * Computes the position and size of all node rectangles and their arcs.
 */
Graph.prototype.computeLayout = function() {
    this.computeRanks();
    var virtualMap = this.createVirtualGraph();
    var ordering = virtualMap.computeInRankOrder();
    virtualMap.computeInRankPosition(ordering);
};



// #################################################################
// DOT Step #2: addVirtualNodes

/**
 * Creates a copy of the graph with virtual nodes so that every arc has unit length.
 * @private
 */
Graph.prototype.createVirtualGraph = function() {
    // copy all nodes into the new graph
    var virtualGraph = new Graph({ nodes : this.slice(), arcs = [] });
    
    // create all arcs
    for (var nNodes = virtualGraph.nodes.length, i = 0; i < nNodes; ++i) {
        var childList = this.arcs[i];
        for (var nChildren = childList.length, j = 0; j < nChildren; ++j) {
            var arc = childList[j];
            var arcLen = this.arcGetLen(arc);
            assert(arcLen >= 0);
            if (arcLen > 1) {
                // insert (len-1) virtual nodes
                var last = virtualGraph.nodes[arc.from];
                for (var k = 1; k < arcLen; ++k) {
                    last = virtualGraph.addNode(last, arc.weight, arc.arcid);
                }
                
                // finally, connect the last virtual node and the child node
                var child = virtualGraph.nodes[arc.to];
                virtualGraph.addArc(last, child, arc.weight, arc.arcid);
            }
            else {
                // just add the new arc
                var fromNode = virtualGraph.nodes[arc.from];
                var toNode = virtualGraph.nodes[arc.to];
                virtualGraph.addArc(fromNode, toNode, arc.weight, arc.arcid);
            }
        }
    }
    
    return virtualGraph;
};


// #################################################################
// DOT Step #1: Compute Ranks

/**
 * @private
 */
Graph.prototype.computeRanks = function() {
    // TODO: First group by tags, and then compute the inter-group and intra-group layouts separately
    
    var tree = this.computeFeasibleTree();
    
    // All other steps are unnecessary since we only have a single root (citation missing)
    
    // while ((arcBad = this.getNextBadArc(tree)) != null) {
        // arcGood = this.getReplacementArc(arcBad, tree);
        // tree.replaceEdge(arcBad, arcGood);
    // }
    // this.normalize(); // not currently necessary (set min rank to 0)
    // this.balance();  // TODO: For edges with multiple feasible rank choices, choose the least crowded one
};

/**
 * @private
 */
Graph.prototype.computeFeasibleTree = function() {
    this.initRanks();
    this.NRankMin = 0;
    this.NRankMax = 0;
    
    /** @const */ var nNodes = this.nodes.length;      // total node count
    var tree = { arcs = createArray(nNodes, null) };        // arcs is a list of arcs
    
    var _this = this;
    var nTreeSize = 0;
    var leastAdjacentArc;
    var leastAdjacentArcSlack;
    var bfsCallback = function(nextArc) {
        var slack = _this.arcGetSlack(nextArc);
        if (slack == 0) {       // tight arc
            // in a tree, every node can only have a single parent.
            var toid = _this.nodes[nextArc.to];
            if (tree.arcs.indexOf(toid) == -1) {
                tree.arcs[toid] = [];
            }
            tree.arcs[toid].push(nextArc);
            ++nTreeSize;
            return true;
        }
        
        // this arc is not tight -> But it's adjacent to the tree.
        if (slack < leastAdjacentArcSlack) {
            leastAdjacentArc = nextArc;
            leastAdjacentArcSlack = slack;
        }
        
        return false;
    };
    
    // start traversal
    var graphBFSState = this.BFSArcsInit();
    while (true) {
        // remember arc with least slack in incident fringe
        leastAdjacentArc = null;
        leastAdjacentArcSlack = 1e9;
        
        // grow tight tree
        this.BFSArcs(bfsCallback, graphBFSState);
        
        if (nTreeSize == nNodes-1) {
            break;
        }
        
        // adjust ranks to make the next edge tight
        var delta = leastAdjacentArcSlack;
        if (leastAdjacentArc != null) {
            this.Root.rank += delta;
            for (var i = 0; i < nNodes; ++i) {
                var arc = tree.arcs[i];
                if (arc != null) {
                    var newRank = (this.nodes[arc.to].rank += delta);
                    _this.NRankMax = Math.max(_this.NRankMax, newRank);
                }
            }
        }
    }
    return tree;
};

/**
 * Produces an initial node ranking with breadth-first order.
 * Sets the rank property of each node.
 *
 * @private
 */
Graph.prototype.initRanks = function() {
    this.Root.rank = this.NRankMin;     // set root rank to 0
    /** @const */ var _this = this;
    this.BFSNodes(this, function(nextArc) { 
        var newRank = _this.nodes[nextArc.to].rank = _this.nodes[nextArc.from].rank+1;
        _this.NRankMax = Math.max(_this.NRankMax, newRank);
        return true;
    });
};


// #################################################################
// DOT Step #3: Reorder Children Lists

/**
 * Computes in-rank order, based on the median positions of ancestors.
 */
Graph.prototype.computeInRankOrder = function() {
    // First do a BFS for an initial ordering.
    // Produces "ordering" array and the "order" property of every node.
    var ordering = createArray(NRankMax+1, []);     // one array per rank
    var _this = this;
    this.Root.order = 0;
    
    this.BFSNodes(this, function(nextArc) {
        var node = _this.nodes[nextArc.to];
        var nodesInRank = ordering[node.rank];
        node.order = nodesInRank.length;
        nodesInRank.push(node);
        return true;
    });
    
    // compare order of two parents
    var compareFun = function(left, right) {
        var leftFromNode = _this.nodes[left.from];
        var rightFromNode = _this.nodes[right.from];
        if (leftFromNode.order < rightFromNode.order) return -1;
        else if (leftFromNode.order == rightFromNode.order) return 0;
        else return 1;
    }
    
    // Now, improve the initial ordering using median.
    // Note we use stable sort to maintain the original order of siblings.
    // TODO: Iteratively perform local swaps, and switch up/down <-> down/up directions between iterations.
    for (var nRanks = this.NRankMax, i = 1; i <= nRanks; ++i) {
        var nodesInRank = ordering[i];
        for (var rankSize = nodesInRank.length, j = 1; j < this.rankSize; ++j) {
            var node = nodesInRank[j];
            // sort the parents
            var sortedParents = node.arcsIn.stableSort(compareFun);
            
            // TODO: Interpolation, in case there are multiple medians.
            
            // update order value based on parent order value
            var medianArc = sortedParents[sortedParents.length/2];
            var medianNode = this.nodes[medianArc.from];
            node.order = medianNode.order;
        }
        
        // re-compute in-rank ordering
        ordering[i] = nodesInRank.stableSort(compareFun);
    }
    return ordering;
};


// #################################################################
// DOT Step #4: Compute in-rank positions of nodes.

/**
 * Computes in-rank position.
 */
Graph.prototype.computeInRankPosition = function() {
    
};