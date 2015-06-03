"use strict";

// Implementation of the dot graph layout algorithm for directed graphs with a single root.
// TODO: Support Google Closure annotation.
// See: https://developers.google.com/closure/compiler/docs/js-for-compiler


// ####################################################################################################
// TODO: Move these to util

/**
 * Creates an array of given size.
 * If the optional defaultVal parameter is supplied,
 * initializes every element with it.
 * NOTE: There is a design bug in Google's V8 JS engine that sets an arbitrary threshold of 99999 to be the max size for array pre-allocation.
 * @param {number} size Number of elements to be allocated.
 * @param {Object=} defaultVal Optional value to be used to set all array elements.
 */
function createArray(size, defaultVal) {
    var arr = new Array(size);
    if (arguments.length == 2) {
        // optional default value
        for (int i = 0; i < size; ++i) {
            arr[i] = defaultVal;
        }
    }
    return arr;
}

/**
 * Adds a deep copy method to every object.
 * @param newObj The object to clone all properties to.
 * @param {bool} deepCopy Whether to deep-copy elements (true by default).
 */
Object.prototype.clone = function(newObj, deepCopy) {
  if (arguments.length < 2) {
    if (arguments.length == 0) {
      newObj = (this instanceof Array) ? [] : {};
    }
    else {
      deepCopy = true;
    }
  }
  for (i in this) {
  // TODO: Test this
    if (deepCopy && typeof this[i] == "object") {
        newObj[i] = this[i].clone();
    }
  }
  return newObj;
};


// ####################################################################################################
// Directed graph layout algorithm


/**
 * Graph ctor.
 * @constructor
 * @param {data} Data as explained in the computeRanks method.
 */ 
function Graph(data) {
    data.clone(this, false);               // copy all properties from data to this
    this.virtualData = null;
    this.Root = this.nodes[0];
}

/**
 * Computes the position and size of all node rectangles and their arcs.
 * 
 * this: layout, nodes, arcs, narccount
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
 *  size.x & size.y = size of node 
 */
Graph.prototype.computeLayout = function() {
    this.computeRanks();
    var virtualMap = this.createVirtualGraph();
    virtualMap.reorderChildrenLists();
    virtualMap.computeInRankPosition();
}



// ####################################################################################################
// addVirtualNodes

/**
 * Adds a new node to the given parent.
 * @param parent The parent of the new node.
 * @param newWeight The weight of the new arc from parent to new child.
 */
Graph.prototype.addNode = function(parent, newWeight) {
    var newId = this.nodes.length;
    
    // create new child node 
    var newNode = {
        nodeid : newId,
        rank : fromNode.rank
    };
    
    // add new node and arc to graph
    this.addArc(fromNode, newNode, newWeight);
    this.nodes[newId] = newNode;
    this.arcs[newId] = [];              // empty children list for new node
    
    return newNode;
}

/**
 * Adds a new arc to this DAG.
 *
 * @param from The starting node of the arc.
 * @param to The goal node of the arc.
 * @param {number} weight The weight of the new arc.
 */
Graph.prototype.addArc = function(fromNode, toNode, weight) {
    var newArcId = this.narccount;
    
    // create arc from parent to new child
    var newArc = {
        arcid = newArcId,
        from = fromNode.nodeid,
        to = toNode.nodeid,
        weight = newWeight
    };
    ++this.narccount;
    this.arcs[fromNode.nodeid].push(newArc);
    return newArc;
}

/**
 * Creates a copy of the graph with virtual nodes so that every arc has unit length.
 * @private
 */
Graph.prototype.createVirtualGraph = function() {
    var virtualGraph = new Graph({ nodes : this.slice(), arcs = {}, narccount = 0 });
    
    for (var nNodes = this.nodes.length, var i = 0; i < nNodes; ++i) {
        var arcs = this.arcs[i];
        for (var nChildren = arcs.length, j = 0; j < nChildren; ++j) {
            var arc = arcs[j];
            var arcLen = this.arcGetLen(arc);
            assert(arcLen >= 0);
            if (arcLen > 1) {
                // insert (len-1) virtual nodes
                var last = this.nodes[arc.from];
                for (var k = 1; k < arcLen; ++k) {
                    last = virtualGraph.addNode(last, arc.weight);
                }
                
                // fix arc pointing to the goal node, to start at the last added node
                arc.from = last.nodeid;
            }
        }
    }
    
    return virtualGraph;
}


// ####################################################################################################
// Compute Ranks

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
}

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
    
    // start traversal
    var graphBFSState = this.BFSArcsInit();
    do {
        // remember least arc in incident fringe
        // NOTE: This should actually not be necessary in a DAG with a single root.
        var leastAdjacentArc = null;
        var leastAdjacentArcSlack = 1e9;
        
        // grow tight tree
        this.BFSArcs(function(nextArc) {
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
        }, graphBFSState);
        
        // adjust ranks to make the next edge tight
        // var delta = leastAdjacentArcSlack;
        // if (leastAdjacentArc != null) {
            // this.Root.rank += delta;
            // for (var i = 0; i < nNodes; ++i) {
                // var arc = tree.arcs[i];
                // if (arc != null) {
                    // this.nodes[arc.to].rank += delta;
                // }
            // }
        // }
    } while (nTreeSize < nNodes-1);
    
    return tree;
}

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
}

/**
 * @private
 * @param arc The arc.
 */
Graph.prototype.arcGetLen = function(arc) {
    var fromNode = this.nodes[arc.from];
    var toNode = this.nodes[arc.to];
    return toNode.rank - fromNode.rank;
}

/**
 * @private
 * @param arc The arc.
 */
Graph.prototype.arcGetSlack = function(arc) {
    var arcLen = this.getArcLen(arc);
    return arcLen - this.layout.arcMinLength;
}

/**
 * @param {number} nodeid The id of the node to be obtained.
 */
Graph.prototype.nodeGet = function(nodeid) {
    return this.nodes[nodeid];
}


// ####################################################################################################
// Reorder Children Lists

/**
 * Reorders children, based on the median positions of their ancestors
 */
Graph.prototype.reorderChildrenLists = function() {
    // First do a BFS for an initial ordering
    var orderings = createArray(NRankMax, []);     // one array per rank
    var _this = this;
    this.Root.order = 0;
    
    this.BFSNodes(this, function(nextArc) {
        var node = _this.nodes[nextArc.to];
        var nodesInRank = orderings[node.rank];
        node.order = nodesInRank.length;
        nodesInRank.push(node);
        return true;
    });
    
    // TODO: Now improve by computing the median and do some transpose magic
    for (var i = 1; i <= this.NRankMax; ++i) {
        var nodesInRank = orderings[i];
        // TODO: Need to fix the case of siblings all having the same median
    }
}