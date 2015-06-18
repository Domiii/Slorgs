/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(Shared, Context) { return {
        Assets: {
            Files: {
                string: {
                    template: 'HomePage.html'
                }
            },
            AutoIncludes: {
                css: [
                    'LearningGraph'
                ]
            }
        },
                
        /**
         * 
         */
        initHost: function() {
            
        },
        
        /**
         * Host commands can be directly called by the client
         */
        Public: {
            
        },
    }}),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        // TODO: All paths in one graph
        // TODO: Embed graphs into virtual node network

        return {
            __ctor: function() {
                ThisComponent = this;

                ThisComponent.allGraphData = {};
            },

            LearningGraphView: squishy.createClass(function($scope, settings) {
                // ctor
                this.$scope = $scope;
                _.merge(this, settings);

                // create new graph
                this.graph = new Springy.Graph()

                this._updateTimer = null;

                this._virtualForces = {
                    nodes: [],
                    edges: []
                };
            },{
                // methods
                setLearningGraphs: function(learningGraphTemplates) {
                    this.learningGraphTemplates = {
                        list: learningGraphTemplates,
                        byId: _.indexBy(learningGraphTemplates, 'learningGraphTemplateId')
                    };

                    // reset taskNodes
                    var learningGraphTaskTemplateData = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    var learningGraphTaskDependenciesData = Instance.LearningGraphTaskDependency.learningGraphTaskDependencies;
                    
                    this.allTaskNodes = {
                        list: [],
                        byId: {}
                    };

                    this.allTaskEdges = {
                        list: [],
                        byId: {}
                    };
                    
                    for (var i = 0; i < this.learningGraphTemplates.list.length; ++i) {
                        var graph = this.learningGraphTemplates.list[i];
                        var tasks = learningGraphTaskTemplateData.indices.learningGraphTemplateId.get(graph.learningGraphTemplateId);
                        var dependencies = learningGraphTaskDependenciesData.indices.learningGraphTemplateId.get(graph.learningGraphTemplateId);

                        tasks.forEach(this.addTaskNode.bind(this));
                        dependencies.forEach(this.addTaskEdge.bind(this));
                    };

                    // add virtual forces
                    this._recomputeVirtualForces();


                    // re-compute layout
                    ThisComponent.page.invalidateView();
                    this.renderer.start();
                },

                toggleTaskOpen: function(taskNode) {
                    taskNode.isSelected = !taskNode.isSelected;
                    if (this.selectedTaskNode) {
                        this.selectedTaskNode.isSelected = false;
                    }

                    if (taskNode.isSelected) {
                        this.selectedTaskNode = taskNode;
                    }
                    else {
                        this.selectedTaskNode = null;
                    }

                    // re-compute layout
                    this.renderer.start();
                },

                /**
                 * Create a wrapper for the given taskTemplate for UI representation.
                 * Called when new TaskTemplate has been added to cache or set of viewed graphs/tasks has changed.
                 */
                addTaskNode: function(taskTemplate) {
                    // check if Task is currently visible
                    if (!this.learningGraphTemplates.byId[taskTemplate.learningGraphTemplateId]) return;

                    var newNode = {
                        task: taskTemplate,
                        dynamics: {
                            //dontAttractToCenter: true
                        }
                    };

                    var allTaskNodes = this.allTaskNodes;
                    allTaskNodes.list.push(newNode);
                    allTaskNodes.byId[taskTemplate.learningGraphTemplateTaskId] = newNode;
                },

                removeTaskNode: function(taskTemplate) {
                    _.remove(this.allTaskNodes.list, function(taskNode) { 
                        return taskNode.task == taskTemplate;
                    });
                    delete this.allTaskNodes.byId[taskTemplate.learningGraphTemplateTaskId];
                },

                /**
                 * Create a wrapper for the given taskTemplate for UI representation.
                 * Called when new TaskTemplate has been added to cache or set of viewed graphs/tasks has changed.
                 */
                addTaskEdge: function(taskDependency) {
                    // check if dependency is currently visible
                    if (!this.learningGraphTemplates.byId[taskDependency.learningGraphTemplateId]) return;

                    var newEdge = {
                        edge: taskDependency,
                        dynamics: {
                        }
                    };

                    var allTaskEdges = this.allTaskEdges;
                    allTaskEdges.list.push(newEdge);
                    allTaskEdges.byId[taskDependency.learningGraphTaskDependencyId] = newEdge;
                },

                removeTaskEdge: function(taskDependency) {
                    _.remove(this.allTaskEdges.list, function(taskNode) {
                        return taskNode.edge == taskDependency;
                    });
                    delete this.allTaskEdges.byId[taskDependency.learningGraphTaskDependencyId];
                },


                // ######################################################################################################
                // Create + Update

                createLearningGraphTemplate: function() {
                    var learningGraphTemplateData = Instance.LearningGraphTemplate.learningGraphTemplates;
                    var learningGraphTaskTemplateData = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;

                    var _newLearningGraphTemplate = {
                        title: 'new learning path',
                        description: '',
                        isEnabled: false,
                        ownerType: null         // TODO: Assign tasks to students (how?)
                    };

                    ThisComponent.isBusy = true;
                    return learningGraphTemplateData.createObject(_newLearningGraphTemplate)
                    .bind(this)
                    .then(function(newLearningGraphTemplate) {
                        // add first task to learning path
                        var _newTaskTemplate = {
                            learningGraphTemplateId: newLearningGraphTemplate.learningGraphTemplateId,

                            title: 'new task',
                            description: '',
                            isRequired: true
                        };
                        return learningGraphTaskTemplateData.createObject(_newTaskTemplate)
                    })
                    .finally(function() {
                        ThisComponent.isBusy = false;
                    })
                    .then(function() {
                        // re-compute layout
                        ThisComponent.page.invalidateView();
                        this.renderer.start();
                    })
                    .catch(ThisComponent.page.handleError);
                },


                createChildTask: function(parentTaskTemplate) {
                    var learningGraphTaskTemplates = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    var learningGraphTaskDependencies = Instance.LearningGraphTaskDependency.learningGraphTaskDependencies;

                    var _newTaskTemplate = {
                        learningGraphTemplateId: parentTaskTemplate.learningGraphTemplateId,

                        title: 'new task',
                        description: '',
                        isRequired: true
                    };

                    ThisComponent.isBusy = true;
                    return learningGraphTaskTemplates.createObject(_newTaskTemplate)
                    .bind(this)
                    .then(function(newTaskTemplate) {
                        var _newEdge = {
                            learningGraphTemplateId: parentTaskTemplate.learningGraphTemplateId,

                            fromTaskTemplateId: parentTaskTemplate.learningGraphTemplateTaskId,
                            toTaskTemplateId: newTaskTemplate.learningGraphTemplateTaskId,
                        };
                        return learningGraphTaskDependencies.createObject(_newEdge)
                    })
                    .finally(function() {
                        ThisComponent.isBusy = false;
                    })
                    .then(function() {
                        // re-compute layout
                        this.renderer.start();
                        ThisComponent.page.invalidateView();
                    })
                    .catch(ThisComponent.page.handleError);
                },


                // ######################################################################################################
                // Other graph management

                onGraphDataChanged: function() {
                    if (this._updateTimer) return;

                    this._updateTimer = setTimeout(function() {
                        this._updateTimer = null;
                        this._recomputeVirtualForces();
                    }.bind(this));
                },


                /**
                 * Introduce (or adjust) virtual nodes to add additional structure to the graph.
                 * We currently use virtual nodes to:
                 *
                 * 1. Layout grpahs from top to bottom
                 * 2. Keep the set of "current tasks to do" close to each other
                 */
                _recomputeVirtualForces: function() {
                    var graph = this.graph;
                    if (!graph) return;

                    ThisComponent.page.invalidateView();

                    for (var i = 0; i < this._virtualForces.nodes.length; ++i) {
                        var node = this._virtualForces.nodes[i];
                        graph.removeNode(node);
                    };

                    for (var i = 0; i < this._virtualForces.edges.length; ++i) {
                        var edge = this._virtualForces.edges[i];
                        graph.removeEdge(edge);
                    };

                    this._virtualForces = {
                        nodes: [],
                        edges: []
                    };

                    // single root + leaf nodes -> All other roots and leaf are connected to these respectively
                    this._virtualForces.nodes.push(this._rootNode = 
                        graph.addNode(new Springy.Node('root', {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, -30)
                        }))
                    );
                    this._virtualForces.nodes.push(this._leafNode = 
                        graph.addNode(new Springy.Node('leaf', {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, 30)
                        }))
                    );


                    var taskTemplateData = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    var taskDependencyData = Instance.LearningGraphTaskDependency.learningGraphTaskDependencies;

                    // virtual node types for: Roots, leafs, "important" tasks
                    // iterate over all currently visible task nodes
                    for (var i = 0; i < this.allTaskNodes.list.length; ++i) {
                        var taskNode = this.allTaskNodes.list[i];
                        var id = taskNode.task.learningGraphTemplateTaskId;
                        var flexNode = graph.getNode(id.toString());      // node visible in UI
                        console.assert(flexNode, 'Invalid task does not have a node: ' + JSON.stringify(taskNode.task));

                        var childEdges = taskNode.task.getChildEdges();
                        var parentEdges = taskNode.task.getParentEdges();
                        var isRoot = !parentEdges || parentEdges.length == 0;
                        var isLeaf = !childEdges || childEdges.length == 0;

                        if (isRoot) {
                            // connect this inner-graph root node to global root node
                            this._virtualForces.edges.push(graph.newEdge(this._rootNode, flexNode, {}));
                        }

                        if (isLeaf) {
                            // leaf node
                            this._virtualForces.edges.push(graph.newEdge(this._leafNode, flexNode, {}));
                        }

                        // if () {
                        //     // TODO: is "important" or "next-in-line" node
                        // }
                    };
                },


                /**
                 *
                 */
                addVirtualNode: function(settings) {
                    // TOOD: !
                    // this.allTaskNodes.ById[_.first(taskTemplates).learningGraphTemplateTaskId] = {
                    //     dynamics: {
                    //         isStatic: true,
                    //         initialPosition: new Springy.Vector(0, 0)
                    //     }
                    // };
                }
            }),


            // ####################################################
            // setup GUI

            /**
             * Prepares the page controller
             */
            setupUI: function(UIMgr, app) {

                // create page controller
                app.lazyController('homeCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);


                    // ###############################################################
                    // LearningGraph data
                    
                    $scope.learningGraphTemplates = Instance.LearningGraphTemplate.learningGraphTemplates;
                    $scope.learningGraphTaskDependencies = Instance.LearningGraphTaskDependency.learningGraphTaskDependencies;


                    // ###############################################################
                    // LearningGraph other methods

                    $scope.toggleEditMode = function() {
                        $scope.editing = !$scope.editing;
                    };


                    // ###############################################################
                    // markdown

                    $scope.mdUpdate = function() {
                        var mdPreview = markdown.toHTML($scope.mdRaw || '');
                        $('#preview').html(mdPreview);
                    };
                });

                // register page
                Instance.UIMgr.registerPage(this, 'Home', this.assets.template, {
                    iconClasses: 'fa fa-home'
                });
            },


            // ####################################################
            // data "binding"

            /**
             * set of dependent data providers
             */
            dataBindings: {
                learningGraphTemplates: {
                    compileReadQuery: function() { return null; }
                },
                learningGraphTaskTemplates: {
                    compileReadQuery: function() { return null; },

                    onAddedObject: function(taskTemplate) {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.addTaskNode(taskTemplate);
                        }
                    },

                    onRemovedObject: function(taskTemplate) {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.removeTaskNode(taskTemplate);
                        }
                    },

                    onCacheChanged: function() {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.onGraphDataChanged();
                        }
                    }
                },

                learningGraphTaskDependencies: {
                    compileReadQuery: function() { return null; },

                    onAddedObject: function(taskDependency) {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.addTaskEdge(taskDependency);
                        }
                    },

                    onRemovedObject: function(taskDependency) {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.removeTaskEdge(taskDependency);
                        }
                    },

                    onCacheChanged: function() {
                        if (!!ThisComponent.learningGraphView) {
                            ThisComponent.learningGraphView.onGraphDataChanged();
                        }
                    }
                },
            },

            onDataUpdate: function() {
                // var allLearningGraphViews = $scope.allLearningGraphViews =
                //     _.mapValues(learningGraphTemplates.byId, function(learningGraphTemplate) {
                //         return new ThisComponent.LearningGraphView($scope, {
                //             learningGraphTemplate: learningGraphTemplate
                //         });
                //     });

                var $scope = ThisComponent.page.scope;
                if ($scope.learningGraphView) return;

                ThisComponent.learningGraphView = 
                    $scope.learningGraphView = new ThisComponent.LearningGraphView($scope, {});
                ThisComponent.learningGraphView.setLearningGraphs(
                    Instance.LearningGraphTemplate.learningGraphTemplates.list);
            },
            
            /**
             * Client Public methods can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});