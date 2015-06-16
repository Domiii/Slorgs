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
                this._virtualNodes = [];
            },{
                // methods
                setLearningGraphs: function(learningGraphTemplates) {
                    this.learningGraphTemplates = {
                        list: learningGraphTemplates,
                        byId: _.indexBy(learningGraphTemplates, 'learningGraphTemplateId')
                    };

                    // reset taskSettings
                    var learningGraphTaskTemplateData = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    this.allTaskSettings = {
                        list: [],
                        byId: {}
                    };
                    
                    for (var i = 0; i < this.learningGraphTemplates.list.length; ++i) {
                        var graph = this.learningGraphTemplates.list[i];
                        var tasks = learningGraphTaskTemplateData.indices.learningGraphTemplateId.get(graph.learningGraphTemplateId);
                        tasks.forEach(this.addTaskSettings.bind(this));
                    };


                    // re-compute layout
                    ThisComponent.page.invalidateView();
                    this.renderer.start();
                },

                toggleTaskOpen: function(taskSettings) {
                    taskSettings.isSelected = !taskSettings.isSelected;
                    if (this.selectedTaskSettings) {
                        this.selectedTaskSettings.isSelected = false;
                    }

                    if (taskSettings.isSelected) {
                        this.selectedTaskSettings = taskSettings;
                    }
                    else {
                        this.selectedTaskSettings = null;
                    }

                    // re-compute layout
                    this.renderer.start();
                },

                /**
                 * Create a wrapper for the given taskTemplate for UI representation.
                 * Called when new TaskTemplate has been added to cache or set of viewed graphs/tasks has changed.
                 */
                addTaskSettings: function(taskTemplate) {
                    // check if Task is currently visible
                    if (!this.learningGraphTemplates.byId[taskTemplate.learningGraphTemplateId]) return;

                    var newSettings = {
                        task: taskTemplate,
                        dynamics: {
                            //dontAttractToCenter: true
                        }
                    };

                    var allTaskSettings = this.allTaskSettings;
                    allTaskSettings.list.push(newSettings);
                    allTaskSettings.byId[taskTemplate.taskTemplateId] = newSettings;
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
                    var lastTaskTemplate = _.last(learningGraphTaskTemplates.list);

                    var _newTaskTemplate = {
                        learningGraphTemplateId: parentTaskTemplate.learningGraphTemplateId,

                        title: 'new task #' + (lastTaskTemplate && lastTaskTemplate.taskTemplateId+1 || 1),
                        description: '',
                        isRequired: true
                    };

                    ThisComponent.isBusy = true;
                    return learningGraphTaskTemplates.createObject(_newTaskTemplate)
                    .bind(this)
                    .then(function(newTaskTemplate) {
                        var _newEdge = {
                            learningGraphTemplateId: parentTaskTemplate.learningGraphTemplateId,

                            fromTaskTemplateId: parentTaskTemplate.learningGraphTemplateId,
                            toTaskTemplateId: newTaskTemplate.learningGraphTemplateId,
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
                 * Introduce (or adjust) virtual nodes to add certain structure to the graph.
                 * We currently use virtual nodes to:
                 *
                 * 1. Layout grpahs from top to bottom
                 * 2. Keep the set of "current tasks to do" close to each other
                 */
                _recomputeVirtualForces: function() {
                    // TODO: Topological sorting? At least we need depth information?
                    // TODO: Virtual nodes for containing and constraining the graph

                    var taskTemplateData = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    var taskDependencyData = Instance.LearningGraphTaskDependency.learningGraphTaskDependencies;

                    // virtual node types for: Roots, leafs, "important" tasks
                    // iterate over all currently visible task nodes
                    for (var i = 0; i < this.allTaskSettings.length; ++i) {
                        var settings = this.allTaskSettings[i];
                        var childEdges = settings.task.getChildEdges();
                        var parentEdges = settings.task.getParentEdges();
                        var isRoot = !parentEdges || parentEdges.length == 0;
                        var isLeaf = !childEdges || childEdges.length == 0;

                        if (isRoot) {
                            // root node
                            
                        }

                        if (isLeaf) {
                            // leaf node
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
                    // this.allTaskSettings.ById[_.first(taskTemplates).taskTemplateId] = {
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
                        this.editing = !this.editing;
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
                            ThisComponent.learningGraphView.addTaskSettings(taskTemplate);
                        }
                    },

                    onRemovedObject: function(taskTemplate) {
                        if (!!ThisComponent.learningGraphView) {
                            delete ThisComponent.learningGraphView.allTaskSettings[taskTemplate.taskTemplateId];
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
                ThisComponent.learningGraphView = $scope.learningGraphView = new ThisComponent.LearningGraphView($scope, {});
                ThisComponent.learningGraphView.setLearningGraphs(Instance.LearningGraphTemplate.learningGraphTemplates.list);
            },
            
            /**
             * Client Public methods can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});