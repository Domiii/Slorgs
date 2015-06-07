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

                    $scope.mdUpdate = function() {
                        var mdPreview = markdown.toHTML($scope.mdRaw || '');
                        $('#preview').html(mdPreview);
                    };
                    
                    // customize your $scope here:
                    $scope.LearningPathTemplates = Instance.LearningPathTemplate.LearningPathTemplates;

                    $scope.nodes = [{
                        id: 1,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(-1, 0)
                        }
                    },{
                        id: 2,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(1, 0)
                        }
                    }
                    // ,{
                    //     id: 3,
                    //     data: {
                    //         dontAttractToCenter: true
                    //     }
                    // },{
                    //     id: 4,
                    //     data: {
                    //         dontAttractToCenter: true
                    //     }
                    // },{
                    //     id: 5,
                    //     data: {
                    //         isStatic: true,
                    //         initialPosition: new Springy.Vector(-3, 4)
                    //     }
                    // },{
                    //     id: 101,
                    //     data: {
                    //         isStatic: true,
                    //         initialPosition: new Springy.Vector(0, -4)
                    //     }
                    // },{
                    //     id: 102,
                    //     data: {
                    //         dontAttractToCenter: true
                    //     }
                    // },{
                    //     id: 103,
                    //     data: {
                    //         isStatic: true,
                    //         initialPosition: new Springy.Vector(0, 4)
                    //     }
                    // }
                    ];
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