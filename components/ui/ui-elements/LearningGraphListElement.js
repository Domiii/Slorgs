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
                    template: 'LearningGraphListElement.html'
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

            LearningGraphView: squishy.createClass(function($scope, settings) {
                // ctor
                this.$scope = $scope;
                _.merge(this, settings);

                var taskTemplates = this.learningGraphTemplate.taskTemplates.list;
                var taskSettings = this.taskSettings = {};
                this.nodesOpen = {};

                // first
                if (taskTemplates.length > 0) {
                    taskSettings[_.first(taskTemplates).taskTemplateId] = {
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, 0)
                        }
                    };
                }

                for (var i = 1; i < taskTemplates.length-1; ++i) {
                    var taskTemplate = taskTemplates[i];

                    // middle
                    taskSettings[taskTemplate.taskTemplateId] = {
                        data: {
                            dontAttractToCenter: true
                        }
                    };
                };

                if (taskTemplates.length > 1) {
                    // last
                    taskSettings[_.last(taskTemplates).taskTemplateId] = {
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, taskTemplates.length * 100)
                        }
                    };
                }
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
                }
            }),


            // ####################################################
            // setup GUI

            /**
             * Prepares the page controller
             */
            setupUI: function(UIMgr, app) {

                // create learning-path-list directive
                app.lazyController('learningGraphList', function($scope) {
                    Instance.UIMgr.registerElementScope(this, $scope);


                    // ###############################################################
                    // LearningGraph data
                    
                    $scope.bindAttrExpr($attrs, '', function(learningGraphTemplates) {
                        if (!learningGraphTemplates) return;

                        var allLearningGraphViews = $scope.allLearningGraphViews =
                            _.mapValues(learningGraphTemplates.byId, function(learningGraphTemplate) {
                                return new ThisComponent.LearningGraphView($scope, {
                                    learningGraphTemplate: learningGraphTemplate,
                                });
                            }); 
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
                Instance.UIMgr.registerElementComponent(this);
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});