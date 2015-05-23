/*jslint node: true */
"use strict";

// Directed Graph render utilities.
// TODO: Support Google Closure annotation.
// See: https://developers.google.com/closure/compiler/docs/js-for-compiler


// #############################################################################
// Graph renderer

/**
 * Initializes and returns the state object used in GraphBFSNodes.
 * @param {Graph} graph The graph to be rendered.
 */
var GraphRenderer = function(graph) {
    this.graph = graph;
};

GraphRenderer.prototype.Render = function(canvas) {
    var context = canvas.getContext('2d');
    
};