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

        return {
            __ctor: function() {
                ThisComponent = this;

                ThisComponent.allGraphData = {};
            },


            // ####################################################
            // setup GUI

            /**
             * Prepares the page controller
             */
            setupUI: function(UIMgr, app) {
                // create page controller
                app.lazyController('homeCtrl', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);

                    // LearningPaths + Tasks
                    $scope.toggleTask = function(learningPathTemplate, taskTemplate) {
                        var learningPathSettings = $scope.allLearningPathSettings[learningPathTemplate.learningPathTemplateId];
                        var nodesOpen = learningPathSettings.nodesOpen;

                        nodesOpen[taskTemplate.taskTemplateId] = !nodesOpen[taskTemplate.taskTemplateId];

                        // re-compute layout
                        learningPathSettings.renderer.start();
                    };

                    function getLearningTaskSettings(learningPathTemplate) {
                        var taskTemplates = learningPathTemplate.taskTemplates.list;
                        var learningTaskSettings = {};

                        // first
                        if (taskTemplates.length > 0) {
                            learningTaskSettings[_.first(taskTemplates).taskTemplateId] = {
                                data: {
                                    isStatic: true,
                                    initialPosition: new Springy.Vector(0, -100)
                                }
                            };
                        }

                        for (var i = 1; i < taskTemplates.length-1; ++i) {
                            var taskTemplate = taskTemplates[i];

                            // middle
                            learningTaskSettings[taskTemplate.taskTemplateId] = {
                                data: {
                                    dontAttractToCenter: true
                                }
                            };
                        };

                        if (taskTemplates.length > 1) {
                            // last
                            learningTaskSettings[_.last(taskTemplates).taskTemplateId] = {
                                data: {
                                    isStatic: true,
                                    initialPosition: new Springy.Vector(0, 100)
                                }
                            };
                        }

                        return learningTaskSettings;
                    };


                    var learningPathTemplates = $scope.learningPathTemplates = Instance.LearningPathTemplate.learningPathTemplates;

                    var allLearningPathSettings = $scope.allLearningPathSettings =
                        _.mapValues(learningPathTemplates.byId, function(learningPathTemplate) {
                            return {
                                taskSettings: getLearningTaskSettings(learningPathTemplate),

                                nodesOpen: {}
                            };
                        });
                    

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
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});