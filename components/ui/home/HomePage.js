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

            LearningPathView: squishy.createClass(function($scope, settings) {
                // ctor
                this.$scope = $scope;
                _.merge(this, settings);
                this.tasksOpen = {};
                this.taskSettings = {};

                // create new graph
                this.graph = new Springy.Graph()
            },{
                // methods
                toggleTask: function(taskTemplate) {
                    this.tasksOpen[taskTemplate.taskTemplateId] = !this.tasksOpen[taskTemplate.taskTemplateId];

                    // re-compute layout
                    this.renderer.start();
                },

                addLearningPathTemplate: function() {
                    var learningPathTemplates = Instance.LearningPathTemplate.learningPathTemplates;
                    var learningPathTaskTemplates = Instance.LearningPathTaskTemplate.learningPathTaskTemplates;
                    var lastTaskTemplate = _.last(learningPathTaskTemplates.list);

                    var _newLearningPathTemplate = {
                        title: 'new learning path',
                        description: '',
                        isEnabled: false,
                        ownerType: null         // TODO: Assign tasks to students (how?)
                    };

                    ThisComponent.isBusy = true;
                    return learningPathTemplates.createObject(_newLearningPathTemplate)
                    .then(function(newLearningPathTemplate) {
                        // add first task to learning path
                        var _newTaskTemplate = {
                            learningPathTemplateId: newLearningPathTemplate.learningPathTemplateId,

                            title: 'new task #' + (lastTaskTemplate && lastTaskTemplate.taskTemplateId+1 || 1),
                            description: '',
                            isRequired: true
                        };
                        return learningPathTaskTemplates.createObject(_newTaskTemplate)
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
                    var learningPathTaskTemplates = Instance.LearningPathTaskTemplate.learningPathTaskTemplates;
                    var learningPathTaskDependencies = Instance.LearningPathTaskDependency.learningPathTaskDependencies;
                    var lastTaskTemplate = _.last(learningPathTaskTemplates.list);

                    var _newTaskTemplate = {
                        learningPathTemplateId: parentTaskTemplate.learningPathTemplateId,

                        title: 'new task #' + (lastTaskTemplate && lastTaskTemplate.taskTemplateId+1 || 1),
                        description: '',
                        isRequired: true
                    };

                    ThisComponent.isBusy = true;
                    return learningPathTaskTemplates.createObject(_newTaskTemplate)
                    .then(function(newTaskTemplate) {
                        var _newEdge = {
                            learningPathTemplateId: parentTaskTemplate.learningPathTemplateId,

                            fromTaskTemplateId: parentTaskTemplate.learningPathTemplateId,
                            toTaskTemplateId: newTaskTemplate.learningPathTemplateId,
                        };
                        return learningPathTaskDependencies.createObject(_newEdge)
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

                /**
                 *
                 */
                addVirtualNode: function(settings) {
                    // TOOD: !
                    // this.taskSettings[_.first(taskTemplates).taskTemplateId] = {
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
                    // LearningPath data
                    
                    $scope.learningPathTemplates = Instance.LearningPathTemplate.learningPathTemplates;

                    // var allLearningPathViews = $scope.allLearningPathViews =
                    //     _.mapValues(learningPathTemplates.byId, function(learningPathTemplate) {
                    //         return new ThisComponent.LearningPathView($scope, {
                    //             learningPathTemplate: learningPathTemplate
                    //         });
                    //     });
                    ThisComponent.learningPathView = $scope.learningPathView = new ThisComponent.LearningPathView($scope, {
                        learningPathTemplates: Instance.LearningPathTemplate.learningPathTemplates
                    });


                    // ###############################################################
                    // LearningPath other methods

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
            dataProviders: {
                learningPathTemplates: {
                    compileReadQuery: function() { return null; },
                },
                learningPathTaskTemplates: {
                    compileReadQuery: function() { return null; },

                    onAddedObject: function(taskTemplate) {
                        ThisComponent.learningPathView.taskSettings[taskTemplateId.taskTemplateId] = {
                            dynamics: {
                                dontAttractToCenter: true
                            }
                        };
                    },

                    onRemovedObject: function(taskTemplate) {
                        delete ThisComponent.learningPathView.taskSettings[taskTemplateId.taskTemplateId];
                    }
                },
                learningPathTaskDependencies: {
                    compileReadQuery: function() { return null; },
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