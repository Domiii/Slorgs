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
                this.nodesOpen = {};

                // create new graph
                this.graph = new Springy.Graph()

                // prepare task node data
                var taskTemplates = this.learningPathTemplates.taskTemplates.list;
                var taskSettings = this.taskSettings = {};

                for (var i = 0; i < taskTemplates.length; ++i) {
                    var taskTemplate = taskTemplates[i];

                    taskSettings[taskTemplate.taskTemplateId] = {
                        dynamics: {
                            dontAttractToCenter: true
                        }
                    };
                };
            },{
                // methods
                toggleTask: function(taskTemplate) {
                    this.nodesOpen[taskTemplate.taskTemplateId] = !this.nodesOpen[taskTemplate.taskTemplateId];

                    // re-compute layout
                    this.renderer.start();
                },

                addChild: function(taskTemplate) {
                    // re-compute layout
                    this.renderer.start();
                },

                /**
                 *
                 */
                addVirtualNode: function(settings) {
                    taskSettings[_.first(taskTemplates).taskTemplateId] = {
                        dynamics: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, 0)
                        }
                    };
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
                    
                    var learningPathTemplates = $scope.learningPathTemplates = Instance.LearningPathTemplate.learningPathTemplates;

                    // var allLearningPathViews = $scope.allLearningPathViews =
                    //     _.mapValues(learningPathTemplates.byId, function(learningPathTemplate) {
                    //         return new ThisComponent.LearningPathView($scope, {
                    //             learningPathTemplate: learningPathTemplate
                    //         });
                    //     });
                    var allLearningPathViews = $scope.allLearningPathViews = [new ThisComponent.LearningPathView($scope, {
                        learningPathTemplates: learningPathTemplates
                    })];


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
             * Handling set of dependent data providers
             */
            dataProviders: {
                LearningPathTemplate: {
                    query: function() { return {}; },

                    onUpdate: function(templates) {

                    }

                }
            },
            
            /**
             * Client Public methods can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});