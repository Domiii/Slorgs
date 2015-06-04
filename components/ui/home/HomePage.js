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
            // data + data definitions

            OwnerType: squishy.makeEnum({
                All: 1,
                Group: 2,
                Individual: 3
            }),

            genTestData: function() {
                var OwnerType = this.OwnerType;

                this.LearningPathTemplates = [{
                    title: 'Scratch: Getting started!',
                    description: 'hello',
                    isEnabled: true,
                    ownerType: OwnerType.Individual,
                    startTime: null,
                    endTime: null,
                    UsersWithAccess: [],
                    GroupsWithAccess: [],
                    TaskTemplates: [{
                        title: '',

                    }]
                }];
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
                    $scope.nodes = [{
                        id: 1,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(-3, -4)
                        }
                    },{
                        id: 2,
                        data: {
                            dontAttractToCenter: true
                        }
                    },{
                        id: 3,
                        data: {
                            dontAttractToCenter: true
                        }
                    },{
                        id: 4,
                        data: {
                            dontAttractToCenter: true
                        }
                    },{
                        id: 5,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(-3, 4)
                        }
                    },{
                        id: 101,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, -4)
                        }
                    },{
                        id: 102,
                        data: {
                            dontAttractToCenter: true
                        }
                    },{
                        id: 103,
                        data: {
                            isStatic: true,
                            initialPosition: new Springy.Vector(0, 4)
                        }
                    }];

                    $scope.edges = [{
                        from: 1,
                        to: 2
                    },{
                        from: 1,
                        to: 3
                    },{
                        from: 1,
                        to: 4
                    },{
                        from: 2,
                        to: 5
                    },{
                        from: 3,
                        to: 5
                    },{
                        from: 4,
                        to: 5
                    },{
                        from: 101,
                        to: 102
                    },{
                        from: 102,
                        to: 103
                    }]
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