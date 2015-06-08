/**
 * All utilities required to verify and manage users.
 * TODO: Separate Account + User management
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
		var lastId = 0;
        return {

            // ####################################################
            // data + data definitions

            OwnerType: squishy.makeEnum({
                All: 1,
                Group: 2,
                Individual: 3
            }),

            initBase: function() {
            },

            Private: {
            	__ctor: function() {
                    this.learningPathTemplates = {
                        list: [],
                        byId: {}
                    };

            		this.genTestData();
            	},

            	createLearningPathTemplate: function(lpTemplateDef) {
            		// simulate DB insertion
            		lpTemplateDef.learningPathTemplateId = ++lastId;

            		if (lpTemplateDef.taskTemplates) {
            			var taskTemplates = lpTemplateDef.taskTemplates;
                        var taskTemplatesById = {};
            			//delete lpTemplateDef.taskTemplates;

                        // prepare all taskTemplates
                        for (var iTaskTemplate = 0; iTaskTemplate < taskTemplates.length; ++iTaskTemplate) {
                            var taskTemplate = taskTemplates[iTaskTemplate];
                            taskTemplatesById[taskTemplate.taskTemplateId] = taskTemplate;
                            //taskTemplate.taskTemplateId = ++lastId;

                            taskTemplate.learningPathTemplateId = lpTemplateDef.learningPathTemplateId;
                        }

                        // prepare adjacency list for task dependency graph
                        lpTemplateDef.taskDependencyEdges = [];
                        for (var iTaskTemplate = 0; iTaskTemplate < taskTemplates.length; ++iTaskTemplate) {
                            var taskTemplate = taskTemplates[iTaskTemplate];
                            if (taskTemplate.requiredTaskIds) {
                                for (var iTaskId = 0; iTaskId < taskTemplate.requiredTaskIds.length; ++iTaskId) {
                                    var requiredTaskId = taskTemplate.requiredTaskIds[iTaskId];
                                    lpTemplateDef.taskDependencyEdges.push({
                                        from: requiredTaskId,
                                        to: taskTemplate.taskTemplateId
                                    });
                                };
                            }
                        }

                        lpTemplateDef.taskTemplates = {
                            list: taskTemplates,
                            byId: taskTemplatesById
                        };
            		}

                    this.learningPathTemplates.list.push(lpTemplateDef);
                    this.learningPathTemplates.byId[taskTemplate.learningPathTemplateId] = lpTemplateDef;

            		return Promise.resolve(lpTemplateDef);
            	},

	            genTestData: function() {
	                var OwnerType = this.Shared.OwnerType;

                    // TODO: Proofs
	                this.TaskProofTypes = [{
	                	name: '',
	                	description: '',
	                	contentTypes: '',
	                	isOptional: false // TODO: really?
	                }];


	                this.createLearningPathTemplate({
	                    title: 'Scratch: Getting started!',
	                    description: 'hello',
	                    isEnabled: true,
	                    ownerType: OwnerType.Individual,
	                    startTime: null,
	                    endTime: null,

	                    taskTemplates: [{
	                    	taskTemplateId: 1,
	                        title: 'Task #1',
	                        description: 'Task #1 description',
	                        isRequired: true,

	                        proofTypeId: 0
	                    },{
	                    	taskTemplateId: 2,
	                        title: 'Task #2',
	                        description: 'Task #2 description',
	                        isRequired: true,

	                        proofTypeId: 0,
                            
                            requiredTaskIds: [1]
	                    },{
	                    	taskTemplateId: 3,
	                        title: 'Task #3',
	                        description: 'Task #3 description',
	                        isRequired: true,

	                        proofTypeId: 0,
                            
                            requiredTaskIds: [2]
	                    }],

                        // TODO: Who has this been assigned to? (teacher-centric)
                        // TODO: Who may choose this path? (student self-organization + optional paths)
                        usersWithAccess: [],
                        groupsWithAccess: [],

	                    learningPathOutcomes: [{
	                        // TODO?
	                    }]
	                });
	            },
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	return {

        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function () {
                ThisComponent = this;
            },
    	};
    })
});