/**
 * The Main component is the base component for logged in users.
 */
"use strict";
 

var NoGapDef = require('nogap').Def;



module.exports = NoGapDef.component({
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { return {
        Assets: {
            AutoIncludes: {
                js: [
                    // bootstrap's logic (requires jquery, which is included by UIMgr)
                    'lib/bootstrap/bootstrap.3.1.1.min.js',

                    /**
                     * Some fancy UI elements for Angular + Bootstrap.
                     * @see http://angular-ui.github.io/bootstrap/
                     */
                    'lib/angular/ui-bootstrap-tpls-0.11.2',

                    /**
                     * lodash can do all kinds of stuff
                     * @see lodash.com/docs
                     */
                    'lib/lodash.min',

                    /**
                     * URI.js for working with URLs
                     * @see http://medialize.github.io/URI.js/
                     */
                    'lib/URI',

                    /**
                     * moment.js for working with time, dates and timespans
                     * @see http://momentjs.com/
                     */
                    'lib/moment',

                    /**
                     * moment.js for working with time, dates and timespans
                     * @see http://momentjs.com/
                     */
                    'lib/bcrypt',
                    
                    // squishy for classes, enums and some other goodies
                    'js/squishy/squishy',
                    'js/squishy/squishy.util',
                    'js/squishy/squishy.domUtil',
                    'js/squishy/squishy.AngularUtil',

                    // some DOM + UI utilities
                    'js/DomUtil',
                    'js/angular_ui/timespan-picker',
                    
                    'lib/markdown/markdown',
                    //'lib/markdown/markdown.min'

                    // springy (graph layouting + rendering)
                    'lib/springy/springy',

                    'lib/jsplumb/jsPlumb-1.7.5',

                    // flexgraph
                    'js/flexgraph/flexgraph'
                ],
                css: [
                    // bootstrap & font-awesome make things look pretty
                    'lib/bootstrap/bootstrap.min.css',
                    'lib/font-awesome/css/font-awesome.min.css',
                    //'//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css',
                    //'//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css',

                    /**
                     * normalize.css fixes style differences between browsers
                     * @see http://necolas.github.io/normalize.css/
                     */
                    'lib/normalize.css',

                    // flexgraph default styles
                    'js/flexgraph/flexgraph',

                    // our custom styles
                    'css/styles.css'
                ]
            }
        },

        initHost: function(app, cfg) {
            // load default localization files
            Shared.Localizer.Default = Shared.Localizer.createLocalizer(cfg.localizer || {});
        },
        
        Private: {
            __ctor: function() {
            },

            onNewClient: function() {
                // enable these core components on the client initially
                return this.Tools.requestClientComponents(
                    // Core stuff
                    'RuntimeError',
                    'AppConfig', 
                    'User',

                    // utilities
                    'DataProvider',
                    'MiscUtil',
                    'Localizer',
                    'Log',
                    'ValidationUtil',
                    'SimpleBooleanExpressions',
                    'Auth',

                    // base UI elements
                    'UIMgr', 'Main'
                )
                .bind(this)
                .then(function() {
                    // send default localizer to client
                    this.client.setDefaultLocalizer(Shared.Localizer.Default);
                })

                // then send other core components that depend on previous components to be ready
                .then(function() {
                    // return this.Tools.requestClientComponents(
                    //     'UIActivityTracker'
                    // );
                });
            },

            /**
             * This is called after `onNewClient`
             */
            onClientBootstrap: function() {
                // explicitely install caches
                this.Instance.DataProvider.initDataProviders();

                // sanity check: Make sure, User cache is present
                console.assert(this.Instance.User.users, 'INITIALIZATION FAILED: DataProvider installation failed.');

                // resume user session
                return this.Instance.User.resumeSession();
            },
        }
    };}),
    

    
    Client: NoGapDef.defClient(function (Tools, Instance, Context) {

        // ####################################################################################################################
        // misc variables

        var UserRole;

        /**
         * The main Angular module (aka. the Angular app).
         */
        var app;

        /**
         * The $scope object of the Main controller.
         */
        var mainScope;


        // ####################################################################################################################
        // initialization (private)

        /**
         * Tell Angular to re-render dirty variables inside the main view.
         * @see http://stackoverflow.com/a/23769600/2228771
         */
        var invalidateView = function() {
            if (!mainScope.$$phase) mainScope.$digest();
        };

        // ####################################################################################################################
        // page groups & pages

        // TODO: Set the guest user object; and use `displayRole` instead to determine user access
        var _defaultPageGroups = [
            /**
             * Guest clients get access to these components.
             */
            {
                otherComponents: [
                    'FacebookApi'
                ],
                
                pageComponents: [
                    'LoginPage'
                ],
                mayActivate: function() {
                    return !Instance.User.currentUser;
                }
            },

            /**
             * Logged in users get access to these components
             */
            {
                otherComponents: [
                    // other model components
                    'LearningGraphTemplate',
                    'LearningGraphTaskTemplate',
                    'LearningGraphTaskDependency',


                    // other UI components
                    'LearningGraphListElement'
                ],

                pageComponents: [
                    'HomePage',
                    'AccountPage'
                ],

                mayActivate: function() {
                    return Instance.User.currentUser && Instance.User.currentUser.displayRole >= UserRole.Student;
                }
            },


           //  /**
           //   * Logged in and unregistered users get access to these components
           //   */     
           // {

           //      pageComponents: [
           //          'ProfilePage'
           //      ],
           //      mayActivate: function() {
           //          return Instance.User.currentUser && Instance.User.currentUser.displayRole >= UserRole.Unregistered;
           //      }
           //  },


            /**
             * Staff gets access to these additional components
             */
            {
                pageComponents: [
                    //'SettingsPage',
                ],

                mayActivate: function() {
                    return Instance.User.isStaff();
                }
            }
        ];

        /**
         * Page group initializor is called by `initClient`.
         */
        var initDefaultPageGroups = function() {
            _defaultPageGroups.forEach(function(group) {
                Instance.UIMgr.addPageGroup(group);
            });
        };

        // #########################################################################################################
        // Add some useful directives to our angular app
        // TODO: Move to it's own file(s)

        var addDirectives = function(app) {
            app.directive('pulseClock', function() {
                var linkFun = function($scope, $element, $attrs) {
                    var evalExpr = function(dontApply) {
                        $scope.clockValue = $scope.$eval($attrs.pulseClock);
                        if (!dontApply) {
                            $scope.$digest();
                        }
                    };

                    setTimeout(evalExpr);
                    setInterval(evalExpr, 999);
                };

                return {
                    restrict: 'A',  // Attribute
                    link: linkFun
                };
            });


            // localizer directive
            app.directive('localize', function() {
                var localizer = Instance.Localizer.Default;
                function linkFun($scope, $element, $attrs) {
                    AngularUtil.decorateScope($scope);
                    
                    function lookupTranslation() {
                        // if (!attrs.key && !attrs.hasOwnProperty('canBeEmpty')) {
                        //     // key is missing - We need some extra debugging info to find the culprit:
                        //     var key = attrs.key;
                        //     var rawHtml = element.parent().html();
                        //     setTimeout(function() {
                        //         var msg = 'Invalid `localize` directive.\n';
                        //         if (!key) {
                        //             msg += 'Empty `key` attribute ';
                        //         }
                        //         else {
                        //             msg += 'Interpolated `key` attribute `' + key + '` evaluated to empty string ';
                        //         }
                        //         msg += 'on page `' + $scope.page.name + '`:\n';
                        //         msg += rawHtml;
                        //         console.error(msg);

                        //         // go to page
                        //         $scope.gotoPage($scope.page.name);

                        //         // highlight parent element
                        //         // TODO: Parent element might not be visible
                        //         dimAllAndHighlightOne(element.parent());
                        //     });
                        //     return;
                        // }
                        if ($attrs.key) {
                            // actual translation
                            var key = $attrs.key;
                            var locale = $attrs.locale;
                            
                            $scope.translation = localizer.lookUpLocale(locale, key, $scope.args);
                            }
                            else {
                            $scope.translation = '';
                            }

                        if ($attrs.asHtml) {
                            $element.html($scope.translation);
                        }
                        else {
                            $element.text($scope.translation);
                        }
                    }

                    // lookup translation
                    lookupTranslation();

                    // re-compute value if locale or args change
                    $attrs.$observe('key', lookupTranslation);
                    $scope.bindAttrExpression($attrs, 'args', function(newArgs) {
                        if (!newArgs) return;

                        lookupTranslation();
                    });
                    $scope.$watch('locale', lookupTranslation);
                }

                return {
                    restrict: 'AE',
                    replace: false,
                    //template: '<span localized="1">{{translation}}</span>',
                    link: linkFun,
                    scope: true
                };
            });

            // Allows easily binding to the enter event
            // see: http://stackoverflow.com/questions/17470790/how-to-use-a-keypress-event-in-angularjs
            app.directive('ngEnter', function () {
                return function ($scope, $element, $attrs) {
                    $element.bind("keydown keypress", function (event) {
                        if(event.which === 13) {
                            $scope.$eval($attrs.ngEnter);
                            event.preventDefault();
                        }
                    });
                };
            });

            // Execute some code
            app.directive('code', function () {
                return function ($scope, $element, $attrs) {
                    // run code on every digest cycle
                    // see: http://stackoverflow.com/questions/17887869/execute-function-after-every-digest-loop-before-dom-render
                    $scope.$watch(function() {
                        // run code
                        $scope.$eval($attrs.code);
                    });
                };
            });

            app.directive('fileInputChanged', function() {
                var linkFun = function ($scope, $element, $attrs) {
                    // see: http://stackoverflow.com/a/19647381/2228771
                    $element.bind('change', function() {
                        if ($attrs.files) {
                            // update files binding
                            var files = $element[0].files;
                            $scope[$attrs.files] = files;
                        }

                        if ($attrs.fileInputChanged) {
                            // call event handler
                            $scope.$eval($attrs.fileInputChanged);
                        }
                        $scope.$digest();
                    });
                };

                return {
                    restrict: 'A',      // attribute
                    link: linkFun
                };
            });

            // /**
            //  * A jquery-UI slider with databinding.
            //  * @see http://stackoverflow.com/a/24732258/2228771
            //  * @see http://jsfiddle.net/vNfsm/50/
            //  */
            // app.directive('slider', function() {
            //     var linkFun = function($scope, element, attrs) {
            //         AngularUtil.decorateScope($scope);

            //         var $slider = jQuery(element);
            //         var option = attrs;
            //         var readIntOption = function(key, option) {
            //             if (option[key]) {
            //                 option[key] = parseInt(option[key]);
            //             }
            //         };

            //         // read default options
            //         readIntOption("min", option);
            //         readIntOption("max", option);
            //         readIntOption("step", option);

            //         // add `value` and `change` properties to slider for data-binding
            //         option = jQuery.extend({
            //             change: function(event, ui) {
            //                 if (!event.which) return;   // only trigger on UI events
            //                 if (ui.value != $scope.valueModel) {
            //                     // update value
            //                     $scope.valueModel = ui.value;

            //                     // update the value of the variable that is bound to `valueModel`
            //                     if (!$scope.$$phase) {
            //                         $scope.$digest();
            //                     }

            //                     // raise callback
            //                     if ($scope.valueChanged) {
            //                         $scope.valueChanged();
            //                     }
            //                 }
            //             }
            //         }, option);

            //         // data binding in the other direction
            //         $scope.$watch("valueModel", function(val) {
            //             if ($scope.valueModel != $slider.slider("value")) {
            //                 // update slider value
            //                 // this will not raise the `change` event above
            //                 $slider.slider("value", $scope.valueModel);
            //             }
            //         });

            //         // create slider
            //         $slider.slider(option);
            //     };
                
            //     return {
            //         restrict: 'E',
            //         replace: true,
            //         transclude: false,
            //         template: '<div />',
            //         scope: {
            //             valueModel: '=',
            //             valueChanged: '&'
            //         },
            //         link: linkFun
            //     };
            // });
        };

        var MainClient;
        return MainClient = {
            // ################################################################################################################
            // Main initialization

            __ctor: function() {
            },

            events: {
            },

            /**
             * SelectionState simply keeps track of a single selection from a list,
             * using some sort of id.
             */
            SelectionState: squishy.createClass(function(idProperty) {
                // ctor
                this.selectedId = 0;
                this.idProperty = idProperty;
            },{
                // methods

                /**
                 * Selects or deselects the given object
                 */
                toggleSelection: function(objOrId) {
                    if (!objOrId) return;
                    var id = objOrId[this.idProperty] || objOrId;

                    if (id == this.selectedId) {
                        // already selected -> deselect
                        this.selectedId = 0;
                    }
                    else {
                        // not selected -> select
                        this.selectedId = id;
                    }                            
                },

                /**
                 * Selects the given object
                 */
                setSelection: function(objOrId) {
                    if (!objOrId) return;
                    var id = objOrId[this.idProperty] || objOrId;

                    // set
                    this.selectedId = id;
                },

                /**
                 * Clears selection
                 */
                unsetSelection: function() {
                    // unset
                    this.selectedId = 0;
                },

                /**
                 * Whether the given object is currently selected
                 */
                isSelected: function(objOrId) {
                    if (!objOrId) return;
                    var id = objOrId[this.idProperty] || objOrId;

                    return this.selectedId == id;
                },

                /**
                 * Whether any object is currently selected
                 */
                hasSelection: function() {
                    return !!this.selectedId;
                }
            }),
            
            /**
             * 
             */
            initClient: function() {
                // bcrypt does some weird things... Need some fixing uppin` so it works the same on Node and in the browser
                squishy.getGlobalContext().bcrypt = dcodeIO.bcrypt;

                // initialize locals
                UserRole = Instance.User.UserRole;

                // start angular
                // Added modules:
                var includeModules = [
                    'ui.bootstrap',
                    'timespanPicker',
                    'flexgraphs'
                ];
                var angularApp = angular.module('app', includeModules);

                // add our custom directives
                addDirectives(angularApp);

                // add some general functions and objects to $rootScope
                angularApp.run(['$rootScope', function($rootScope) {
                    var localizer = Instance.Localizer.Default;

                    // JS core functions
                    $rootScope.Math = Math;
                    $rootScope.JSON = JSON;
                    $rootScope.Date = Date;
                    $rootScope.Object = Object;

                    // localize
                    $rootScope.localize = localizer.lookUp.bind(localizer);

                    // lodash
                    $rootScope._ = _;

                    // some additional, less universal utilities
                    $rootScope.util = {
                        /**
                         * Library for date + time representation.
                         * @see http://momentjs.com/
                         */
                        moment: moment,

                        /**
                         * Utility for managing simple selection states.
                         */
                        createSelectionState: function(idProperty) {
                            return new Instance.Main.SelectionState(idProperty);
                        },

                        getCountdown: function(date) {
                            var now = new Date();
                            var date = moment(date).toDate();
                            var millis = date.getTime() - now.getTime();

                            return this.formatTimeSpan(millis);
                        },

                        formatTimeSpan: function(millis) {
                            /**
                             * @see http://stackoverflow.com/a/8043056/2228771
                             */
                            var padOneZero = function(n) {
                                return n > 9 ? "" + n : "0" + n;
                            };

                            var days = Math.floor(millis / (1000 * 60 * 60 * 24));
                            millis -=  days * (1000 * 60 * 60 * 24);

                            var hours = Math.floor(millis / (1000 * 60 * 60));
                            millis -= hours * (1000 * 60 * 60);

                            var mins = Math.floor(millis / (1000 * 60));
                            millis -= mins * (1000 * 60);

                            var seconds = Math.floor(millis / (1000));
                            millis -= seconds * (1000);

                            var inDaySpan = '';
                            if (hours + mins + seconds > 0) {
                                inDaySpan = ' ' + padOneZero(hours) + ':' + padOneZero(mins) + ':' + padOneZero(seconds);
                        }
                            return days + Instance.Localizer.Default.lookUp('time.span.days') + ' ' + inDaySpan;
                        },
                    };
                }]);

                // Instance.UIMgr.events.pageActivated.addListener(function(newPage) {
                // });

                // add default page groups
                initDefaultPageGroups();

                // init UIMgr
                Instance.UIMgr.initUIMgr(
                    // title
                    Instance.AppConfig.getValue('title'),
                    angularApp 
                )
                .then(function() {
                    // event listener
                    this.updateTemplateData.bind(this)
                }.bind(this));
            },

            
            Public: {
                // ################################################################################################################
                // Events triggered directly by the server (or by client)

                setDefaultLocalizer: function(localizerData) {
                    Instance.Localizer.Default = Instance.Localizer.createLocalizer(localizerData);
                },

                updateTemplateData: function() {
                    // update template data in global scope:
                    Instance.UIMgr.scope.gotAllGroups = false;

                    // set user data
                    Instance.UIMgr.scope.currentUser = Instance.User.currentUser;
                    Instance.UIMgr.scope.currentUserIsStaff = Instance.User.isStaff();
                    Instance.UIMgr.scope.locale = Instance.User.getCurrentLocale();
                    Instance.UIMgr.scope.currentGroupGid = 
                        Instance.User.currentUser && Instance.User.currentUser.gid;

                    // set config
                    Instance.UIMgr.scope.config = Instance.AppConfig.getAll();
                },

                /**
                 * Invalidate certain aspects of the view
                 */
                onCurrentUserChanged: function(privsChanged) {
                    Instance.UIMgr.ready(function() {
                        // update user locale
                        var locale = Instance.User.getCurrentLocale();
                        Instance.Localizer.Default.setLocale(locale);

                        // update moment locale, too (for date + time formatting)
                        moment.locale(locale);


                        this.updateTemplateData();

                        if (privsChanged) {
                        // tell UIMgr module to re-check which buttons are enabled and
                        //  whether the user may stay on current page etc.
                            Instance.UIMgr.onCurrentUserChanged(privsChanged);
                        }
                    }.bind(this));
                }
            }
        };
    })
});