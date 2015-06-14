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
                this.allTaskSettings = {
                    list: [],
                    byId: {}
                };

                this._updateTimer = null;
                this._virtualNodes = [];

                // create new graph
                this.graph = new Springy.Graph()
            },{
                // methods
                toggleTaskOpen: function(taskSettings) {
                    taskSettings.isOpen = !taskSettings.isOpen;

                    // re-compute layout
                    this.renderer.start();
                },

                addLearningGraphTemplate: function() {
                    var learningGraphTemplates = Instance.LearningGraphTemplate.learningGraphTemplates;
                    var learningGraphTaskTemplates = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;
                    var lastTaskTemplate = _.last(learningGraphTaskTemplates.list);

                    var _newLearningGraphTemplate = {
                        title: 'new learning path',
                        description: '',
                        isEnabled: false,
                        ownerType: null         // TODO: Assign tasks to students (how?)
                    };

                    ThisComponent.isBusy = true;
                    return learningGraphTemplates.createObject(_newLearningGraphTemplate)
                    .bind(this)
                    .then(function(newLearningGraphTemplate) {
                        // add first task to learning path
                        var _newTaskTemplate = {
                            learningGraphTemplateId: newLearningGraphTemplate.learningGraphTemplateId,

                            title: 'new task #' + (lastTaskTemplate && lastTaskTemplate.taskTemplateId+1 || 1),
                            description: '',
                            isRequired: true
                        };
                        return learningGraphTaskTemplates.createObject(_newTaskTemplate)
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

                addChildTask: function(parentTaskTemplate) {
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

                onGraphUpdate: function() {
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

                    var taskTemplates = Instance.LearningGraphTaskTemplate.learningGraphTaskTemplates;

                    // virtual node types for: Roots, leafs, "important" tasks

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

                    // var allLearningGraphViews = $scope.allLearningGraphViews =
                    //     _.mapValues(learningGraphTemplates.byId, function(learningGraphTemplate) {
                    //         return new ThisComponent.LearningGraphView($scope, {
                    //             learningGraphTemplate: learningGraphTemplate
                    //         });
                    //     });
                    ThisComponent.learningGraphView = $scope.learningGraphView = new ThisComponent.LearningGraphView($scope, {
                        learningGraphTemplates: Instance.LearningGraphTemplate.learningGraphTemplates
                    });


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
                    compileReadQuery: function() { return null; },
                },
                learningGraphTaskTemplates: {
                    compileReadQuery: function() { return null; },

                    onAddedObject: function(taskTemplate) {
                        var newSettings = {
                            task: taskTemplate,
                            dynamics: {
                                //dontAttractToCenter: true
                            }
                        };

                        var allTaskSettings = ThisComponent.learningGraphView.allTaskSettings;
                        allTaskSettings.list.push(newSettings);
                        allTaskSettings.byId[taskTemplate.taskTemplateId] = newSettings;
                    },

                    onRemovedObject: function(taskTemplate) {
                        delete ThisComponent.learningGraphView.allTaskSettings[taskTemplate.taskTemplateId];
                    },

                    onCacheChanged: function() {
                        ThisComponent.learningGraphView.onGraphUpdate();
                    }
                },

                learningGraphTaskDependencies: {
                    compileReadQuery: function() { return null; },

                    onCacheChanged: function() {
                        ThisComponent.learningGraphView.onGraphUpdate();
                    }
                },
            },
            
            /**
             * Client Public methods can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});